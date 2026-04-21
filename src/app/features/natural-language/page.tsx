import type { Metadata } from "next";
import NaturalLanguagePage from "./NaturalLanguageContent";

export const metadata: Metadata = {
  title: "Natural Language Analytics — Ask Your Marketing Data Anything",
  description:
    "Type a question the way you'd ask a teammate. Meaning queries GA4, Google Ads, LinkedIn, Mailchimp and more — the AI marketing analytics tool that understands English.",
  keywords: ["ai marketing analytics", "marketing analytics tools"],
  alternates: { canonical: "/features/natural-language" },
};

export default function Page() {
  return <NaturalLanguagePage />;
}
