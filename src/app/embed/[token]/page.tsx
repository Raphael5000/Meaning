import { verifyEmbedToken, loadEmbedDashboards } from "@/lib/embed";
import { EmbedDashboard } from "./EmbedDashboard";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function EmbedPage({ params }: Props) {
  const { token } = await params;

  try {
    const { orgId } = await verifyEmbedToken(token);
    const dashboards = await loadEmbedDashboards(orgId);

    if (dashboards.length === 0) {
      return (
        <div className="flex h-screen items-center justify-center">
          <p className="text-[13px] text-muted-foreground">No dashboards found.</p>
        </div>
      );
    }

    return <EmbedDashboard dashboards={dashboards} />;
  } catch {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-[13px] text-muted-foreground">Invalid or expired embed link.</p>
      </div>
    );
  }
}
