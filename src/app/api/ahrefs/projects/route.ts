import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAhrefsApiKey } from "@/lib/ahrefs-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/ahrefs/projects
 *
 * Returns the user's Ahrefs projects (saved domains).
 */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiKey = await getAhrefsApiKey(userId);
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Ahrefs account connected" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      "https://api.ahrefs.com/v3/management/projects",
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[ahrefs/projects] API error:", res.status, text);
      return NextResponse.json(
        { error: "Failed to fetch projects from Ahrefs" },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      projects?: Array<{ target: string; title?: string }>;
    };

    const projects = (data.projects ?? []).map((p) => ({
      domain: p.target,
      title: p.title || p.target,
    }));

    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[ahrefs/projects] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch Ahrefs projects" },
      { status: 500 }
    );
  }
}
