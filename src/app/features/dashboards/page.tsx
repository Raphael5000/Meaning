import type { Metadata } from "next";
import DashboardsPage from "./DashboardsContent";

export const metadata: Metadata = {
  title: "AI Marketing Dashboards — Build Dashboards in Plain English",
  description:
    "Describe the widget you want. Meaning generates it with the right chart from 14 types on a drag-and-drop grid. The digital marketing dashboard that builds itself.",
  keywords: [
    "digital marketing dashboard",
    "marketing kpi dashboard",
    "marketing performance dashboard",
  ],
  alternates: { canonical: "/features/dashboards" },
};

export default function Page() {
  return <DashboardsPage />;
}
