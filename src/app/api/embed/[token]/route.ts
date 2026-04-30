import { NextRequest, NextResponse } from "next/server";
import { verifyEmbedToken, loadEmbedDashboard } from "@/lib/embed";

export const dynamic = "force-dynamic";

/** GET /api/embed/:token — returns dashboard data for embedding (no auth required) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const { orgId, dashboardId } = await verifyEmbedToken(token);
    const dashboard = await loadEmbedDashboard(orgId, dashboardId);

    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
    }

    return NextResponse.json(dashboard, {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
