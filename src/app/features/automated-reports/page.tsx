import type { Metadata } from "next";
import AutomatedReportsPage from "./AutomatedReportsContent";

export const metadata: Metadata = {
  title: "Scheduled Marketing Reports — Automated Email Alerts",
  description:
    "Scheduled email reports powered by AI. Write a prompt, set a cadence, and let Meaning deliver insights to your inbox automatically.",
  keywords: ["automated marketing reports"],
  alternates: { canonical: "/features/automated-reports" },
};

export default function Page() {
  return <AutomatedReportsPage />;
}
