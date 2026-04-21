import type { Metadata } from "next";
import VisualizationsPage from "./VisualizationsContent";

export const metadata: Metadata = {
  title: "Marketing Data Visualization — 14 Chart Types, Auto-Chosen",
  description:
    "Meaning reads the question, understands the shape of the answer, and renders the right marketing data visualization every time. 14 chart types, zero configuration.",
  keywords: ["marketing data visualization"],
  alternates: { canonical: "/features/visualizations" },
};

export default function Page() {
  return <VisualizationsPage />;
}
