import type { Metadata } from "next";
import TeamCollaborationPage from "./TeamCollaborationContent";

export const metadata: Metadata = {
  title: "Team Marketing Analytics — Roles, Permissions & Shared Dashboards",
  description:
    "Invite your team, assign roles, share dashboards and alerts. Client reporting software built for collaboration.",
  keywords: ["client reporting software"],
  alternates: { canonical: "/features/team-collaboration" },
};

export default function Page() {
  return <TeamCollaborationPage />;
}
