import type { Metadata } from "next";
import ConnectorsPage from "./ConnectorsContent";

export const metadata: Metadata = {
  title: "Marketing Data Connectors — GA4, Google Ads, Ahrefs, LinkedIn & More",
  description:
    "Connect GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, Search Console, and Ahrefs. Cross-channel marketing analytics in one chat, one dashboard, one alert system.",
  keywords: ["cross channel marketing analytics", "multi channel analytics", "ahrefs integration", "seo analytics"],
  alternates: { canonical: "/features/connectors" },
};

export default function Page() {
  return <ConnectorsPage />;
}
