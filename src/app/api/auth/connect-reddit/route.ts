import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateRedditSubreddit } from "@/lib/reddit-transfer";

export const dynamic = "force-dynamic";

// Matt-only gate
const ALLOWED_USER_ID = process.env.REDDIT_ALLOWED_USER_ID;

/**
 * POST /api/auth/connect-reddit
 *
 * Validates a subreddit exists via Reddit's public JSON endpoint.
 * Body: { subreddit?: string }
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

  let body: { subreddit?: string } = {};
  try {
    body = await req.json();
  } catch {
    // No body is fine — just validate connectivity
  }

  try {
    const testSub = body.subreddit || "reddit";
    await validateRedditSubreddit(testSub);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[connect-reddit] Validation failed:", err);
    return NextResponse.json(
      { error: "Failed to reach Reddit. The subreddit may not exist." },
      { status: 400 }
    );
  }
}
