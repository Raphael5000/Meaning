import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meaning | Chat with Your Google Analytics Data – AI-Powered Insights",
  description:
    "Ask questions in plain English and get instant answers from your GA4 data. Meaning turns Google Analytics into a conversational interface—no dashboards, no setup. Try the beta free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
