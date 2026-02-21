import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Privacy Policy | Meaning",
  description:
    "Meaning's privacy policy explains how we collect, use, and protect your data when you use our AI-powered Google Analytics chat.",
};

export default function PrivacyPage() {
  return (
    <div
      className="relative min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #050505 0%, #080a09 40%, rgba(16, 163, 127, 0.04) 100%)",
      }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div
          className="absolute left-1/4 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
          style={{ top: "10%", background: "var(--accent)" }}
        />
        <div
          className="absolute right-1/4 h-80 w-80 rounded-full opacity-[0.06] blur-3xl"
          style={{ top: "45%", background: "#6366f1" }}
        />
      </div>

      <Navbar />

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1
          className="mb-2 text-3xl font-bold sm:text-4xl"
          style={{ color: "var(--text-primary)" }}
        >
          Privacy Policy
        </h1>
        <p
          className="mb-12 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Last updated: February 2026
        </p>

        <div
          className="article-body space-y-8"
          style={{ color: "var(--text-secondary)" }}
        >
          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Introduction
            </h2>
            <p>
              Meaning (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is a product by Hivory.
              This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our AI-powered analytics
              chat service.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Information We Collect
            </h2>
            <p>We collect information you provide directly, including:</p>
            <ul>
              <li>Account information (name, email address, password)</li>
              <li>Payment and billing information for subscription management</li>
              <li>Questions and queries you submit to our chat interface</li>
              <li>Usage data related to your interaction with our service</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Use of Google APIs and Analytics Data
            </h2>
            <p>
              Meaning uses the Google Analytics Data API to access your GA4
              property data. When you connect your Google account:
            </p>
            <ul>
              <li>
                We access only the Google Analytics data you authorize us to
                use
              </li>
              <li>
                Your analytics data is used solely to answer your questions and
                provide AI-powered insights within our service
              </li>
              <li>
                We do not share your Google Analytics data with third parties
                for advertising or marketing
              </li>
              <li>
                Use of information received from Google APIs adheres to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                  className="underline hover:no-underline"
                >
                  Google API Services User Data Policy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our service</li>
              <li>Process your subscription and payments</li>
              <li>Respond to your questions and support requests</li>
              <li>Send service-related communications</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Data Security
            </h2>
            <p>
              We implement appropriate technical and organisational measures to
              protect your personal information against unauthorised access,
              alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Contact Us
            </h2>
            <p>
              For questions about this Privacy Policy, contact us at{" "}
              <a
                href="mailto:support@meaning.ai"
                style={{ color: "var(--accent)" }}
                className="underline hover:no-underline"
              >
                support@meaning.ai
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer
        className="relative z-10 mt-16 px-4 py-6 sm:px-6 sm:py-8 md:px-12"
        style={{ borderTop: "1px solid var(--border-color)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <div className="flex items-center gap-2">
            <Image
              src="/Logo.svg"
              alt="Meaning"
              width={90}
              height={32}
              className="h-6 w-auto"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
            <Link href="/privacy" className="transition-colors hover:opacity-80" style={{ color: "var(--accent)" }}>
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Terms
            </Link>
            <span>
              Copyright &copy; 2026 - All rights reserved | A product by Hivory
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
