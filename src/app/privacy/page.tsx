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
          "var(--page-bg)",
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
              Meaning (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is a product by Hivory (Pty) Ltd.
              This Privacy Policy explains how we collect, use, store, share, and
              safeguard your information when you use our AI-powered analytics
              chat service at usemeaning.io (&quot;Service&quot;).
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Information We Collect
            </h2>
            <p>We collect information you provide directly, including:</p>
            <ul>
              <li>
                <strong>Account information:</strong> Your name, email address, and password
              </li>
              <li>
                <strong>Payment and billing information:</strong> Processed securely through our payment provider for subscription management
              </li>
              <li>
                <strong>Google Analytics data:</strong> When you connect your Google account, we access your GA4 property data via the Google Analytics Data API to answer your queries
              </li>
              <li>
                <strong>Chat queries:</strong> The questions and prompts you submit to our chat interface
              </li>
              <li>
                <strong>Usage data:</strong> Information related to your interaction with our Service, such as session activity and feature usage
              </li>
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
                We access only the Google Analytics data you authorise us to
                use
              </li>
              <li>
                Your analytics data is queried live from Google each time you submit a question; we do not cache or permanently store your raw Google Analytics data
              </li>
              <li>
                Your analytics data is used solely to answer your questions and
                provide AI-powered insights within our Service
              </li>
              <li>
                We do not use your Google Analytics data for advertising, marketing, or any purpose other than providing and improving the Service
              </li>
              <li>
                We do not sell your Google Analytics data to third parties
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
                , including the Limited Use requirements
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our Service</li>
              <li>Process your queries by sending anonymised analytics data to our AI provider for analysis</li>
              <li>Process your subscription and payments</li>
              <li>Send service-related communications, such as account notifications and updates</li>
              <li>Respond to your questions and support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Data Sharing, Transfer, and Disclosure
            </h2>
            <p>
              We do not sell, rent, or trade your personal information or Google user data to third parties. We share your information only with the following categories of service providers, strictly for the purpose of operating and delivering the Service:
            </p>
            <ul>
              <li>
                <strong>AI processing provider (Anthropic):</strong> Your Google Analytics query data is sent to Anthropic&apos;s API to generate AI-powered insights and responses. Only analytics data relevant to your query is transmitted; your personal account information (name, email, password) is not shared with Anthropic.
              </li>
              <li>
                <strong>Payment processor (Paystack/Stripe):</strong> Your payment and billing information is processed by Paystack (a Stripe company) to manage subscriptions and transactions. We do not store your full payment card details.
              </li>
              <li>
                <strong>Hosting provider (Code Capsules):</strong> Our Service is hosted on Code Capsules&apos; infrastructure, which processes data as necessary to deliver the Service.
              </li>
              <li>
                <strong>Email service provider (Resend):</strong> We use Resend to send transactional and service-related emails to you.
              </li>
            </ul>
            <p>
              These service providers are contractually obligated to use your data only for the purposes of providing their services to us and are required to protect your information in accordance with applicable data protection laws.
            </p>
            <p>
              We may also disclose your information if required to do so by law, regulation, or legal process, or if we believe in good faith that disclosure is necessary to protect our rights, your safety, or the safety of others.
            </p>
            <p>
              We do not transfer or disclose Google user data to third parties for purposes other than those described above, including but not limited to targeted advertising, data brokering, information reselling, credit assessment, or training AI models unrelated to the Service.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Data Retention and Deletion
            </h2>
            <p>We retain your information as follows:</p>
            <ul>
              <li>
                <strong>Account and chat data:</strong> Retained for the duration of your active subscription. If you cancel your subscription, your account data, chat history, and all associated information is retained for 30 days following the end of your billing period, after which it is permanently deleted.
              </li>
              <li>
                <strong>Google Analytics data:</strong> Queried live and not permanently stored. Query results are held only for the duration of your active session.
              </li>
              <li>
                <strong>Payment records:</strong> Retained as required by applicable tax and accounting regulations.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Requesting Data Deletion
            </h2>
            <p>
              You may request deletion of your data at any time by contacting us at{" "}
              <a
                href="mailto:hi@hivory.io"
                style={{ color: "var(--accent)" }}
                className="underline hover:no-underline"
              >
                hi@hivory.io
              </a>
              . Upon receiving a verified deletion request, we will delete your personal data and associated information within 30 days, except where retention is required by law.
            </p>
            <p>
              When the data retention period expires or a deletion request is fulfilled, we will permanently delete or destroy the relevant data from our systems.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Data Security
            </h2>
            <p>
              We implement appropriate technical and organisational measures to
              protect your personal information against unauthorised access,
              alteration, disclosure, or destruction. These measures include encryption of data in transit, secure authentication protocols, and access controls limiting data access to authorised personnel only.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Your Rights
            </h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing of your data</li>
              <li>Receive your data in a portable format</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{" "}
              <a
                href="mailto:hi@hivory.io"
                style={{ color: "var(--accent)" }}
                className="underline hover:no-underline"
              >
                hi@hivory.io
              </a>
              .
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on our website and, where appropriate, by email. Your continued use of the Service after changes are posted constitutes your acceptance of the revised Privacy Policy.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Contact Us
            </h2>
            <p>
              For questions about this Privacy Policy or our data practices, contact us at{" "}
              <a
                href="mailto:hi@hivory.io"
                style={{ color: "var(--accent)" }}
                className="underline hover:no-underline"
              >
                hi@hivory.io
              </a>
              .
            </p>
            <p>
              Hivory (Pty) Ltd
              <br />
              South Africa
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
              className="h-6 w-auto invert dark:invert-0"
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
