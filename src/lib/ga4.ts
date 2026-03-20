import { google } from "googleapis";

const analyticsData = google.analyticsdata("v1beta");
const analyticsAdmin = google.analyticsadmin("v1beta");
const analyticsAdminAlpha = google.analyticsadmin("v1alpha");

function getAuthClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

// ---------- List GA4 properties the user has access to ----------

export async function listProperties(accessToken: string) {
  const auth = getAuthClient(accessToken);

  const res = await analyticsAdmin.accountSummaries.list({
    auth,
    pageSize: 50,
  });

  const properties: { propertyId: string; displayName: string; account: string }[] = [];

  for (const account of res.data.accountSummaries || []) {
    for (const prop of account.propertySummaries || []) {
      if (prop.property && prop.displayName) {
        properties.push({
          propertyId: prop.property.replace("properties/", ""),
          displayName: prop.displayName,
          account: account.displayName || "",
        });
      }
    }
  }

  return properties;
}

// ---------- Run a GA4 report ----------

export interface RunReportParams {
  propertyId: string;
  metrics: string[];
  dimensions?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
  dimensionFilter?: Record<string, unknown>;
  metricFilter?: Record<string, unknown>;
  orderBys?: { field: string; direction?: "ASCENDING" | "DESCENDING"; type?: "metric" | "dimension" }[];
}

export async function runReport(accessToken: string, params: RunReportParams) {
  const auth = getAuthClient(accessToken);

  const orderBys = params.orderBys?.map((o) => {
    if (o.type === "dimension") {
      return {
        dimension: { dimensionName: o.field, orderType: "ALPHANUMERIC" as const },
        desc: o.direction === "DESCENDING",
      };
    }
    return {
      metric: { metricName: o.field },
      desc: o.direction === "DESCENDING",
    };
  });

  const res = await analyticsData.properties.runReport({
    property: `properties/${params.propertyId}`,
    auth,
    requestBody: {
      dateRanges: [
        {
          startDate: params.startDate || "28daysAgo",
          endDate: params.endDate || "today",
        },
      ],
      metrics: params.metrics.map((m) => ({ name: m })),
      dimensions: params.dimensions?.map((d) => ({ name: d })),
      limit: String(params.limit || 10),
      dimensionFilter: params.dimensionFilter as never,
      metricFilter: params.metricFilter as never,
      orderBys,
    },
  });

  const dimensionHeaders =
    res.data.dimensionHeaders?.map((h) => h.name) || [];
  const metricHeaders = res.data.metricHeaders?.map((h) => h.name) || [];

  const rows = (res.data.rows || []).map((row) => {
    const obj: Record<string, string> = {};
    row.dimensionValues?.forEach((v, i) => {
      obj[dimensionHeaders[i] || `dim_${i}`] = v.value || "";
    });
    row.metricValues?.forEach((v, i) => {
      obj[metricHeaders[i] || `met_${i}`] = v.value || "";
    });
    return obj;
  });

  return {
    dimensions: dimensionHeaders,
    metrics: metricHeaders,
    rows,
    rowCount: res.data.rowCount || 0,
    metadata: res.data.metadata,
  };
}

// ---------- Run a realtime report ----------

export interface RunRealtimeReportParams {
  propertyId: string;
  metrics: string[];
  dimensions?: string[];
  limit?: number;
}

export async function runRealtimeReport(
  accessToken: string,
  params: RunRealtimeReportParams
) {
  const auth = getAuthClient(accessToken);

  const res = await analyticsData.properties.runRealtimeReport({
    property: `properties/${params.propertyId}`,
    auth,
    requestBody: {
      metrics: params.metrics.map((m) => ({ name: m })),
      dimensions: params.dimensions?.map((d) => ({ name: d })),
      limit: String(params.limit || 10),
    },
  });

  const dimensionHeaders =
    res.data.dimensionHeaders?.map((h) => h.name) || [];
  const metricHeaders = res.data.metricHeaders?.map((h) => h.name) || [];

  const rows = (res.data.rows || []).map((row) => {
    const obj: Record<string, string> = {};
    row.dimensionValues?.forEach((v, i) => {
      obj[dimensionHeaders[i] || `dim_${i}`] = v.value || "";
    });
    row.metricValues?.forEach((v, i) => {
      obj[metricHeaders[i] || `met_${i}`] = v.value || "";
    });
    return obj;
  });

  return {
    dimensions: dimensionHeaders,
    metrics: metricHeaders,
    rows,
    rowCount: res.data.rowCount || 0,
  };
}

// ---------- Get metadata (available metrics/dimensions) ----------

export async function getMetadata(accessToken: string, propertyId: string) {
  const auth = getAuthClient(accessToken);

  const res = await analyticsData.properties.getMetadata({
    name: `properties/${propertyId}/metadata`,
    auth,
  });

  return {
    metrics: (res.data.metrics || []).map((m) => ({
      apiName: m.apiName,
      uiName: m.uiName,
      description: m.description,
      category: m.category,
    })),
    dimensions: (res.data.dimensions || []).map((d) => ({
      apiName: d.apiName,
      uiName: d.uiName,
      description: d.description,
      category: d.category,
    })),
  };
}

// ---------- Check BigQuery export link status ----------

export interface BigQueryLink {
  name: string;
  project: string;
  dataset: string;
  dailyExportEnabled: boolean;
  streamingExportEnabled: boolean;
}

export async function listBigQueryLinks(
  accessToken: string,
  propertyId: string
): Promise<BigQueryLink[]> {
  const auth = getAuthClient(accessToken);

  const res = await analyticsAdminAlpha.properties.bigQueryLinks.list({
    parent: `properties/${propertyId}`,
    auth,
  });

  return (res.data.bigqueryLinks || []).map((link) => ({
    name: link.name || "",
    project: link.project || "",
    dataset: link.datasetLocation || "",
    dailyExportEnabled: link.dailyExportEnabled ?? false,
    streamingExportEnabled: link.streamingExportEnabled ?? false,
  }));
}

// ---------- Create BigQuery export link ----------

export async function createBigQueryLink(
  accessToken: string,
  propertyId: string,
  gcpProjectId: string,
): Promise<BigQueryLink> {
  const auth = getAuthClient(accessToken);

  const res = await analyticsAdminAlpha.properties.bigQueryLinks.create({
    parent: `properties/${propertyId}`,
    auth,
    requestBody: {
      project: gcpProjectId,
      dailyExportEnabled: true,
      streamingExportEnabled: false,
      freshDailyExportEnabled: false,
      includeAdvertisingId: false,
      exportStreams: [],
    },
  });

  const link = res.data;
  return {
    name: link.name || "",
    project: link.project || "",
    dataset: link.datasetLocation || "",
    dailyExportEnabled: link.dailyExportEnabled ?? false,
    streamingExportEnabled: link.streamingExportEnabled ?? false,
  };
}
