import type { Metadata } from "next";
import AiInsightsPage from "./AiInsightsContent";

export const metadata: Metadata = {
  title: "AI Marketing Insights — Not Just Answers, Next Steps",
  description:
    "Every answer comes with a plain-English summary of what changed, why it matters, and what to try next. AI marketing analytics grounded in your actual data.",
  keywords: ["ai marketing analytics"],
  alternates: { canonical: "/features/ai-insights" },
};

export default function Page() {
  return <AiInsightsPage />;
}
