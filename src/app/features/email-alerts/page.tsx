import type { Metadata } from "next";
import EmailAlertsPage from "./EmailAlertsContent";

export const metadata: Metadata = {
  title: "Automated Marketing Reports — AI Email Alerts on Any Schedule",
  description:
    "Write a prompt, pick a schedule and recipients. Meaning emails the answer with an AI summary, chart, and next steps. Automated marketing reports without the manual work.",
  keywords: ["automated marketing reports", "marketing report template"],
  alternates: { canonical: "/features/email-alerts" },
};

export default function Page() {
  return <EmailAlertsPage />;
}
