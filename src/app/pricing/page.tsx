import type { Metadata } from "next";
import PricingPage from "./PricingContent";

export const metadata: Metadata = {
  title: "Pricing — $9.99/mo, Everything Included",
  description:
    "One plan at $9.99 per month with a 14-day free trial. All connectors, unlimited queries, dashboards, alerts, and team members included.",
  alternates: { canonical: "/pricing" },
};

export default function Page() {
  return <PricingPage />;
}
