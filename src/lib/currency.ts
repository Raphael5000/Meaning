import { BigQuery } from "@google-cloud/bigquery";

let _bqClient: BigQuery | null = null;

function getBqClient(): BigQuery {
  if (_bqClient) return _bqClient;
  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS env var is not set");
  const credentials = JSON.parse(raw);
  _bqClient = new BigQuery({ projectId: credentials.project_id, credentials });
  return _bqClient;
}

/**
 * Fetch the source currencies for connected ad accounts.
 * Returns a map like { "GOOGLE_ADS": "ZAR", "MICROSOFT_ADS": "USD" }
 */
export async function getSourceCurrencies(
  adsCustomerId: string | null,
  msAdsAccountId: string | null,
): Promise<Record<string, string>> {
  const bq = getBqClient();
  const currencies: Record<string, string> = {};

  const queries: Promise<void>[] = [];

  if (adsCustomerId) {
    queries.push(
      bq.query({ query: `SELECT currency_code FROM ads_${adsCustomerId.replace(/-/g, "")}.account_info LIMIT 1` })
        .then(([rows]) => {
          if (rows.length > 0) currencies["GOOGLE_ADS"] = (rows[0] as { currency_code: string }).currency_code;
        })
        .catch(() => {})
    );
  }

  if (msAdsAccountId) {
    queries.push(
      bq.query({ query: `SELECT currency_code FROM msads_${msAdsAccountId.replace(/-/g, "")}.account_info LIMIT 1` })
        .then(([rows]) => {
          if (rows.length > 0) currencies["MICROSOFT_ADS"] = (rows[0] as { currency_code: string }).currency_code;
        })
        .catch(() => {})
    );
  }

  await Promise.all(queries);
  return currencies;
}
