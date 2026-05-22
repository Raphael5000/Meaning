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
};

export const REDDIT_KEY_COLUMNS: Record<string, string[]> = {
  subreddit_stats: ["snapshot_date", "subreddit"],
  subreddit_posts: ["snapshot_date", "post_id"],
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
// Reddit public JSON helpers (no auth required)
// ---------------------------------------------------------------------------

const REDDIT_BASE = "https://www.reddit.com";
const USER_AGENT = "meaning:v1.0.0 (server-side analytics sync)";

async function redditPublicGet(path: string): Promise<unknown> {
  const url = `${REDDIT_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Reddit public JSON error ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Sync orchestrator
// ---------------------------------------------------------------------------

export interface RedditSyncResult {
  statsRows: number;
  postsRows: number;
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

  // ── 1. Subreddit stats ──
  let statsRows: Record<string, unknown>[] = [];
  try {
    const data = (await redditPublicGet(`/r/${subreddit}/about.json`)) as {
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
      const params = listing === "top" ? "?t=day&limit=100&raw_json=1" : "?limit=100&raw_json=1";
      const data = (await redditPublicGet(`/r/${subreddit}/${listing}.json${params}`)) as {
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

  console.log(
    `[reddit-sync] Fetched: ${statsRows.length} stats, ${postsRows.length} posts`
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

  await Promise.all(insertTasks);

  console.log(`[reddit-sync] Sync complete for r/${subreddit}`);
  return {
    statsRows: statsRows.length,
    postsRows: postsRows.length,
  };
}

// ---------------------------------------------------------------------------
// Validate a subreddit exists via public JSON
// ---------------------------------------------------------------------------

export async function validateRedditSubreddit(subreddit: string): Promise<boolean> {
  const data = (await redditPublicGet(`/r/${subreddit}/about.json`)) as {
    data?: { display_name?: string };
  };
  return !!data?.data?.display_name;
}
