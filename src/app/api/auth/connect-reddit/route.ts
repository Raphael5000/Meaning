import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateRedditSubreddit } from "@/lib/reddit-transfer";

export const dynamic = "force-dynamic";

// Matt-only gate
const ALLOWED_USER_ID = process.env.REDDIT_ALLOWED_USER_ID;

/**
 * POST /api/auth/connect-reddit
 *
 * Validates that Reddit env-var credentials work by making a test API call.
 * Body: { subreddit?: string } — optional subreddit to validate
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (ALLOWED_USER_ID && userId !== ALLOWED_USER_ID) {
    return NextResponse.json({ error: "Reddit connector is not available for your account" }, { status: 403 });
  }

  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET ||
      !process.env.REDDIT_USERNAME || !process.env.REDDIT_PASSWORD) {
    return NextResponse.json(
      { error: "Reddit credentials not configured on server" },
      { status: 500 }
    );
  }

  let body: { subreddit?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body is fine — just validate credentials
  }

  try {
    const testSub = body.subreddit || "reddit";
    await validateRedditSubreddit(testSub);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[connect-reddit] Validation failed:", err);
    return NextResponse.json(
      { error: "Failed to authenticate with Reddit. Check server credentials." },
      { status: 400 }
    );
  }
}
