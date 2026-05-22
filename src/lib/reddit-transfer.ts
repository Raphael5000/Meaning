import { BigQuery } from "@google-cloud/bigquery";
import { safeDelete } from "@/lib/bq-helpers";

// ---------------------------------------------------------------------------
// Client singletons
// ---------------------------------------------------------------------------

let _bqClient: BigQuery | null = null;

function getBqClient(): BigQuery {
  if (_bqClient) return _bqClient;
  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS env var is not set");
  const credentials = JSON.parse(raw);
  _bqClient = new BigQuery({ projectId: credentials.project_id, credentials });
  return _bqClient;
}

function getProjectId(): string {
  const raw = process.env.GOOGLE_BIGQUERY_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_BIGQUERY_CREDENTIALS env var is not set");
  return JSON.parse(raw).project_id;
}

// ---------------------------------------------------------------------------
// Dataset helpers
// ---------------------------------------------------------------------------

export function getRedditDataset(orgId: string): string {
  return `reddit_${orgId.replace(/[^a-zA-Z0-9]/g, "")}`;
}

export async function ensureDataset(datasetId: string): Promise<void> {
  const bq = getBqClient();
  const dataset = bq.dataset(datasetId);
  const [exists] = await dataset.exists();
  if (!exists) {
    let location = "EU";
    try {
      const [meta] = await bq.dataset("dbt_meaning").getMetadata();
      location = meta.location || "EU";
    } catch {
      /* Default to EU */
    }
    await bq.createDataset(datasetId, { location });
    console.log(`[reddit-transfer] Created dataset: ${datasetId} in ${location}`);
  }
}

// ---------------------------------------------------------------------------
// Table schemas
// ---------------------------------------------------------------------------

const TABLE_SCHEMAS: Record<
  string,
  { fields: { name: string; type: string }[]; partition?: string }
> = {
  subreddit_stats: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "subreddit", type: "STRING" },
      { name: "subscribers", type: "INT64" },
      { name: "active_accounts", type: "INT64" },
      { name: "created_utc", type: "TIMESTAMP" },
      { name: "description", type: "STRING" },
      { name: "public_description", type: "STRING" },
    ],
  },
  subreddit_posts: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "subreddit", type: "STRING" },
      { name: "post_id", type: "STRING" },
      { name: "title", type: "STRING" },
      { name: "author", type: "STRING" },
      { name: "score", type: "INT64" },
      { name: "upvote_ratio", type: "FLOAT64" },
      { name: "num_comments", type: "INT64" },
      { name: "created_utc", type: "TIMESTAMP" },
      { name: "url", type: "STRING" },
      { name: "selftext_preview", type: "STRING" },
      { name: "link_flair_text", type: "STRING" },
      { name: "is_stickied", type: "BOOLEAN" },
    ],
  },
  subreddit_traffic: {
    partition: "snapshot_date",
    fields: [
      { name: "snapshot_date", type: "DATE" },
      { name: "subreddit", type: "STRING" },
      { name: "period_date", type: "DATE" },
      { name: "period_type", type: "STRING" },
      { name: "uniques", type: "INT64" },
      { name: "pageviews", type: "INT64" },
      { name: "subscriptions", type: "INT64" },
    ],
  },
};

export const REDDIT_KEY_COLUMNS: Record<string, string[]> = {
  subreddit_stats: ["snapshot_date", "subreddit"],
  subreddit_posts: ["snapshot_date", "post_id"],
  subreddit_traffic: ["snapshot_date", "subreddit", "period_date", "period_type"],
};

// ---------------------------------------------------------------------------
// Table management
// ---------------------------------------------------------------------------

export async function ensureRedditTables(datasetId: string): Promise<void> {
  const bq = getBqClient();
  const dataset = bq.dataset(datasetId);

  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    const table = dataset.table(tableName);
    const [exists] = await table.exists();
    if (exists) continue;

    const options: Record<string, unknown> = {
      schema: { fields: schema.fields },
    };

    if (schema.partition) {
      options.timePartitioning = {
        type: "DAY",
        field: schema.partition,
      };
    }

    await table.create(options);
    console.log(`[reddit-transfer] Created table: ${datasetId}.${tableName}`);
  }
}

// ---------------------------------------------------------------------------
// Reddit API helpers
// ---------------------------------------------------------------------------

const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_API_BASE = "https://oauth.reddit.com";
const USER_AGENT = "meaning:v1.0.0 (by /u/meaningbot)";

async function getRedditToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error("Reddit env vars not configured (REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD)");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Reddit token request failed ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Reddit token response missing access_token");
  }

  return data.access_token;
}

async function redditGet(token: string, path: string): Promise<unknown> {
  const res = await fetch(`${REDDIT_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Reddit API error ${res.status} on ${path}: ${body}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Sync orchestrator
// ---------------------------------------------------------------------------

export interface RedditSyncResult {
  statsRows: number;
  postsRows: number;
  trafficRows: number;
}

export async function syncRedditData(
  subreddit: string,
  orgId: string,
): Promise<RedditSyncResult> {
  const datasetId = getRedditDataset(orgId);
  const bq = getBqClient();
  const projectId = getProjectId();
  const today = new Date().toISOString().split("T")[0];

  console.log(`[reddit-sync] Starting sync for r/${subreddit}, snapshot ${today}`);

  await ensureDataset(datasetId);
  await ensureRedditTables(datasetId);

  const token = await getRedditToken();

  // ── 1. Subreddit stats ──
  let statsRows: Record<string, unknown>[] = [];
  try {
    const data = (await redditGet(token, `/r/${subreddit}/about`)) as {
      data?: Record<string, unknown>;
    };
    const d = data?.data;
    if (d) {
      statsRows = [
        {
          snapshot_date: today,
          subreddit,
          subscribers: d.subscribers ?? 0,
          active_accounts: d.accounts_active ?? 0,
          created_utc: d.created_utc
            ? new Date((d.created_utc as number) * 1000).toISOString()
            : null,
          description: typeof d.description === "string"
            ? d.description.slice(0, 10000)
            : null,
          public_description: typeof d.public_description === "string"
            ? d.public_description.slice(0, 5000)
            : null,
        },
      ];
    }
  } catch (err) {
    console.warn(`[reddit-sync] Stats fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 2. Posts (hot + top/day, deduplicated) ──
  let postsRows: Record<string, unknown>[] = [];
  try {
    const seenIds = new Set<string>();
    const allPosts: Record<string, unknown>[] = [];

    for (const listing of ["hot", "top"]) {
      const params = listing === "top" ? "?t=day&limit=100" : "?limit=100";
      const data = (await redditGet(token, `/r/${subreddit}/${listing}${params}`)) as {
        data?: { children?: Array<{ data: Record<string, unknown> }> };
      };
      for (const child of data?.data?.children ?? []) {
        const p = child.data;
        const postId = p.id as string;
        if (!postId || seenIds.has(postId)) continue;
        seenIds.add(postId);
        allPosts.push(p);
      }
    }

    for (const p of allPosts) {
      const selftext = typeof p.selftext === "string" ? p.selftext.slice(0, 500) : null;
      postsRows.push({
        snapshot_date: today,
        subreddit,
        post_id: p.id ?? "",
        title: typeof p.title === "string" ? p.title.slice(0, 1000) : "",
        author: (p.author as string) ?? "[deleted]",
        score: p.score ?? 0,
        upvote_ratio: p.upvote_ratio ?? 0,
        num_comments: p.num_comments ?? 0,
        created_utc: p.created_utc
          ? new Date((p.created_utc as number) * 1000).toISOString()
          : null,
        url: typeof p.url === "string" ? p.url.slice(0, 2000) : null,
        selftext_preview: selftext,
        link_flair_text: (p.link_flair_text as string) ?? null,
        is_stickied: p.stickied ?? false,
      });
    }
  } catch (err) {
    console.warn(`[reddit-sync] Posts fetch failed (non-fatal):`, (err as Error).message);
  }

  // ── 3. Traffic (mod-only endpoint) ──
  let trafficRows: Record<string, unknown>[] = [];
  try {
    const data = (await redditGet(token, `/r/${subreddit}/about/traffic`)) as {
      day?: Array<[number, number, number, number]>;
    };

    // day entries: [timestamp, uniques, pageviews, subscriptions]
    for (const entry of data?.day ?? []) {
      const [ts, uniques, pageviews, subscriptions] = entry;
      const periodDate = new Date(ts * 1000).toISOString().split("T")[0];
      trafficRows.push({
        snapshot_date: today,
        subreddit,
        period_date: periodDate,
        period_type: "day",
        uniques: uniques ?? 0,
        pageviews: pageviews ?? 0,
        subscriptions: subscriptions ?? 0,
      });
    }
  } catch (err) {
    console.warn(`[reddit-sync] Traffic fetch failed (non-fatal, may need mod access):`, (err as Error).message);
  }

  console.log(
    `[reddit-sync] Fetched: ${statsRows.length} stats, ${postsRows.length} posts, ${trafficRows.length} traffic entries`
  );

  // ── Write to BigQuery ──
  const fqDataset = `\`${projectId}.${datasetId}\``;
  const dataset = bq.dataset(datasetId);
  const insertTasks: Promise<unknown>[] = [];

  if (statsRows.length > 0) {
    const ok = await safeDelete(
      bq,
      `DELETE FROM ${fqDataset}.subreddit_stats WHERE snapshot_date = '${today}' AND subreddit = '${subreddit}'`,
      "reddit-sync"
    );
    if (ok) insertTasks.push(dataset.table("subreddit_stats").insert(statsRows));
  }
  if (postsRows.length > 0) {
    const ok = await safeDelete(
      bq,
      `DELETE FROM ${fqDataset}.subreddit_posts WHERE snapshot_date = '${today}' AND subreddit = '${subreddit}'`,
      "reddit-sync"
    );
    if (ok) insertTasks.push(dataset.table("subreddit_posts").insert(postsRows));
  }
  if (trafficRows.length > 0) {
    const ok = await safeDelete(
      bq,
      `DELETE FROM ${fqDataset}.subreddit_traffic WHERE snapshot_date = '${today}' AND subreddit = '${subreddit}'`,
      "reddit-sync"
    );
    if (ok) insertTasks.push(dataset.table("subreddit_traffic").insert(trafficRows));
  }

  await Promise.all(insertTasks);

  console.log(`[reddit-sync] Sync complete for r/${subreddit}`);
  return {
    statsRows: statsRows.length,
    postsRows: postsRows.length,
    trafficRows: trafficRows.length,
  };
}

// ---------------------------------------------------------------------------
// Validate Reddit credentials by testing a subreddit about endpoint
// ---------------------------------------------------------------------------

export async function validateRedditSubreddit(subreddit: string): Promise<boolean> {
  const token = await getRedditToken();
  const data = (await redditGet(token, `/r/${subreddit}/about`)) as {
    data?: { display_name?: string };
  };
  return !!data?.data?.display_name;
}
