import { NextRequest, NextResponse } from "next/server";
import { verifyEmbedToken, loadEmbedDashboards, loadEmbedDashboard } from "@/lib/embed";

export const dynamic = "force-dynamic";

/** GET /api/embed/:token — returns all dashboards for the org (no auth required)
 *  Optional ?dashboard=id query param to load a single dashboard */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const { orgId, dashboardId } = await verifyEmbedToken(token);

    // Single dashboard requested via token payload or query param
    const singleId = dashboardId || request.nextUrl.searchParams.get("dashboard");
    if (singleId) {
      const dashboard = await loadEmbedDashboard(orgId, singleId);
      if (!dashboard) {
        return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
      }
      return NextResponse.json({ dashboards: [dashboard] }, {
        headers: { "Cache-Control": "public, max-age=60" },
      });
    }

    // All dashboards for the org
    const dashboards = await loadEmbedDashboards(orgId);
    return NextResponse.json({ dashboards }, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
