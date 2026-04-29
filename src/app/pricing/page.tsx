import type { Metadata } from "next";
import PricingPage from "./PricingContent";

export const metadata: Metadata = {
  title: "Pricing — Free forever, or $9.99/mo for unlimited",
  description:
    "Free forever for 2 sources and 20 AI messages per month. Upgrade to Pro at $9.99/month for unlimited connectors, queries, dashboards, alerts, and team members.",
  alternates: { canonical: "/pricing" },
};

export default function Page() {
  return <PricingPage />;
}
