import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const EMBED_SECRET = process.env.EMBED_SECRET;

function getKey() {
  if (!EMBED_SECRET) throw new Error("EMBED_SECRET not configured");
  return new TextEncoder().encode(EMBED_SECRET);
}

export interface EmbedPayload {
  orgId: string;
  dashboardId: string;
}

/** Verify an embed JWT and return the payload. */
export async function verifyEmbedToken(token: string): Promise<EmbedPayload> {
  const { payload } = await jwtVerify(token, getKey(), {
    algorithms: ["HS256"],
  });

  const orgId = payload.orgId as string;
  const dashboardId = payload.dashboardId as string;

  if (!orgId || !dashboardId) {
    throw new Error("Invalid embed token payload");
  }

  return { orgId, dashboardId };
}

/** Sign an embed JWT (used by the client portal). */
export async function signEmbedToken(
  orgId: string,
  dashboardId: string
): Promise<string> {
  return new SignJWT({ orgId, dashboardId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(getKey());
}

/** Load a dashboard with widgets for embedding. Strips sensitive fields. */
export async function loadEmbedDashboard(orgId: string, dashboardId: string) {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: dashboardId },
    include: { widgets: true },
  });

  if (!dashboard) return null;
  if (dashboard.orgId !== orgId) return null;

  return {
    id: dashboard.id,
    title: dashboard.title,
    layout: dashboard.layout,
    dateRange: dashboard.dateRange,
    dateFrom: dashboard.dateFrom,
    dateTo: dashboard.dateTo,
    widgets: dashboard.widgets.map((w) => ({
      id: w.id,
      widgetType: w.widgetType,
      title: w.title,
      displayConfig: w.displayConfig,
      cachedData: w.cachedData,
      cachedAt: w.cachedAt,
    })),
  };
}
