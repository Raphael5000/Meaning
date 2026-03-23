import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getValidLinkedInTokenForUser } from "@/lib/linkedin-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/linkedin/accessible-organizations
 *
 * Lists LinkedIn organizations the authenticated user is an admin of.
 * Uses the Community Management API to fetch organization roles,
 * then enriches with org names.
 */
export async function GET() {
  const session = await auth();
  const userId = (session as { userId?: string })?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const accessToken = await getValidLinkedInTokenForUser(userId);
  if (!accessToken) {
    return NextResponse.json(
      { error: "No LinkedIn account linked", needsReconnect: true },
      { status: 400 }
    );
  }

  try {
    // Fetch organizations where the user has ADMINISTRATOR role
    const rolesRes = await fetch(
      "https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=50",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Linkedin-Version": "202603",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    if (!rolesRes.ok) {
      const errorBody = await rolesRes.text();
      console.error("[linkedin-orgs] Roles fetch failed:", rolesRes.status, errorBody);
      return NextResponse.json(
        { error: "Failed to fetch organizations", detail: errorBody },
        { status: rolesRes.status }
      );
    }

    const rolesData = (await rolesRes.json()) as {
      elements?: Array<{ organization?: string }>;
    };

    // Extract organization URNs (e.g. "urn:li:organization:12345")
    const orgUrns = (rolesData.elements ?? [])
      .map((el) => el.organization)
      .filter(Boolean) as string[];

    if (orgUrns.length === 0) {
      return NextResponse.json({ organizations: [] });
    }

    // Fetch organization details (name, vanityName, logoUrl)
    const orgIds = orgUrns.map((urn) => urn.split(":").pop()!);
    const organizations: Array<{
      id: string;
      name: string;
      vanityName: string | null;
    }> = [];

    // Fetch each org's details (LinkedIn doesn't have a batch endpoint for this)
    await Promise.all(
      orgIds.map(async (orgId) => {
        try {
          const orgRes = await fetch(
            `https://api.linkedin.com/rest/organizations/${orgId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Linkedin-Version": "202603",
                "X-Restli-Protocol-Version": "2.0.0",
              },
            }
          );
          if (orgRes.ok) {
            const org = (await orgRes.json()) as {
              localizedName?: string;
              vanityName?: string;
            };
            organizations.push({
              id: orgId,
              name: org.localizedName ?? `Organization ${orgId}`,
              vanityName: org.vanityName ?? null,
            });
          } else {
            // Still include the org with just the ID
            organizations.push({
              id: orgId,
              name: `Organization ${orgId}`,
              vanityName: null,
            });
          }
        } catch {
          organizations.push({
            id: orgId,
            name: `Organization ${orgId}`,
            vanityName: null,
          });
        }
      })
    );

    return NextResponse.json({ organizations });
  } catch (err) {
    console.error("[linkedin-orgs] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
