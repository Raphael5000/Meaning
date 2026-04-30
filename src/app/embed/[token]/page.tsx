import { verifyEmbedToken, loadEmbedDashboard } from "@/lib/embed";
import { EmbedDashboard } from "./EmbedDashboard";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function EmbedPage({ params }: Props) {
  const { token } = await params;

  try {
    const { orgId, dashboardId } = await verifyEmbedToken(token);
    const dashboard = await loadEmbedDashboard(orgId, dashboardId);

    if (!dashboard) {
      return (
        <div className="flex h-screen items-center justify-center">
          <p className="text-[13px] text-muted-foreground">Dashboard not found.</p>
        </div>
      );
    }

    return <EmbedDashboard dashboard={dashboard} />;
  } catch {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-[13px] text-muted-foreground">Invalid or expired embed link.</p>
      </div>
    );
  }
}
