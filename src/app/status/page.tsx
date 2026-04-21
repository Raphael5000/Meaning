import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StatusContent } from "./StatusContent";

export const metadata: Metadata = {
  title: "System Status",
  description: "Real-time status and uptime history for all Meaning data connectors.",
  alternates: { canonical: "/status" },
};

export default function StatusPage() {
  return (
    <div className="marketing min-h-screen" style={{ background: "var(--m-bg)" }}>
      <Navbar />
      <div className="mx-auto max-w-4xl px-6 pt-32 pb-24 md:pt-40">
        <StatusContent />
      </div>
      <Footer />
    </div>
  );
}
