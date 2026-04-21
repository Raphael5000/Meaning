import type { Metadata } from "next";
import RealTimeAnalyticsPage from "./RealTimeAnalyticsContent";

export const metadata: Metadata = {
  title: "Real-Time Marketing Analytics — Daily Syncs Across Every Source",
  description:
    "Meaning syncs every connected source daily. Every answer is built on current marketing data analytics, not a stale cache.",
  keywords: ["marketing data analytics"],
  alternates: { canonical: "/features/real-time-analytics" },
};

export default function Page() {
  return <RealTimeAnalyticsPage />;
}
