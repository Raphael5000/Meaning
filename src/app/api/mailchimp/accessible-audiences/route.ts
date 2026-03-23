import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMailchimpCredentials } from "@/lib/mailchimp-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/mailchimp/accessible-audiences
 *
 * Lists Mailchimp audiences/lists for the authenticated user.
 */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const creds = await getMailchimpCredentials(userId);
  if (!creds) {
    return NextResponse.json(
      { error: "No Mailchimp account linked", needsReconnect: true },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${creds.apiEndpoint}/3.0/lists?count=50`, {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("[mailchimp-audiences] Lists fetch failed:", res.status, errorBody);
      return NextResponse.json(
        { error: "Failed to fetch audiences", detail: errorBody },
        { status: res.status }
      );
    }

    const data = (await res.json()) as {
      lists?: Array<{
        id: string;
        name: string;
        stats?: {
          member_count?: number;
          campaign_count?: number;
        };
      }>;
    };

    const audiences = (data.lists ?? []).map((list) => ({
      id: list.id,
      name: list.name,
      memberCount: list.stats?.member_count ?? 0,
      campaignCount: list.stats?.campaign_count ?? 0,
    }));

    return NextResponse.json({ audiences });
  } catch (err) {
    console.error("[mailchimp-audiences] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
