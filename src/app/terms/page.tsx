import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "Terms and Conditions | Meaning",
  description:
    "Terms and conditions for using Meaning, the AI-powered Google Analytics chat service.",
};

export default function TermsPage() {
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
          Terms and Conditions
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
              Agreement to Terms
            </h2>
            <p>
              By accessing or using Meaning (&quot;Service&quot;), a product by Hivory (Pty) Ltd,
              you agree to be bound by these Terms and Conditions. If you
              disagree with any part of these terms, you may not access the
              Service.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Description of Service
            </h2>
            <p>
              Meaning provides an AI-powered chat interface that allows you to
              query and analyse your Google Analytics (GA4) data using natural
              language. The Service requires a paid subscription and connection
              of your Google Analytics account. Analytics data is queried live from Google each time you submit a question and is processed using third-party AI technology to generate insights.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Account and Subscription
            </h2>
            <ul>
              <li>
                You must create an account and maintain accurate information
              </li>
              <li>
                Subscription fees are billed monthly and are non-refundable
              </li>
              <li>
                You may cancel your subscription at any time; access continues
                until the end of the billing period
              </li>
              <li>
                Upon cancellation, your data is retained for 30 days and then permanently deleted
              </li>
              <li>
                We reserve the right to modify pricing with reasonable notice
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Google Account Connection
            </h2>
            <p>When you connect your Google Analytics account to the Service:</p>
            <ul>
              <li>
                You authorise Meaning to access your GA4 property data via the Google Analytics Data API
              </li>
              <li>
                You may revoke access at any time through your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                  className="underline hover:no-underline"
                >
                  Google Account permissions
                </a>
              </li>
              <li>
                Revoking access will prevent the Service from querying your analytics data
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any illegal or unauthorised purpose</li>
              <li>
                Attempt to gain unauthorised access to our systems or other
                users&apos; accounts
              </li>
              <li>
                Use the Service to transmit malware or harmful code
              </li>
              <li>
                Resell, redistribute, or commercially exploit the Service
                without our written permission
              </li>
              <li>
                Use the Service in any way that violates Google&apos;s Terms of Service or API usage policies
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Intellectual Property
            </h2>
            <p>
              The Service, including its design, features, and content (excluding
              your data), is owned by Hivory (Pty) Ltd and protected by intellectual
              property laws. You retain ownership of your data; we do not claim
              rights over your Google Analytics data or queries.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Data Handling
            </h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <Link
                href="/privacy"
                style={{ color: "var(--accent)" }}
                className="underline hover:no-underline"
              >
                Privacy Policy
              </Link>
              , which describes how we collect, use, store, share, and delete your information. By using the Service, you consent to the data practices described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Disclaimer
            </h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot;. AI-generated insights and
              recommendations are for informational purposes only and should not be
              considered professional advice. You are responsible for
              verifying any insights before making business decisions. We do not guarantee the accuracy, completeness, or reliability of AI-generated responses.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Hivory (Pty) Ltd shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages arising from your use of the Service, including but not limited to loss of data, revenue, or business opportunities.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your account if you breach these Terms. Upon termination, your right to use the Service ceases immediately, and your data will be handled in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Changes
            </h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms on our website. Continued use of the
              Service after changes are posted constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Governing Law
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the Republic of South Africa, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Contact
            </h2>
            <p>
              For questions about these Terms, contact us at{" "}
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
            <Link href="/privacy" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:opacity-80" style={{ color: "var(--accent)" }}>
              Terms
            </Link>
            <span>
              Copyright &copy; 2026 - All rights reserved | A product by <a href="https://www.hivory.io" target="_blank" rel="noopener noreferrer" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>Hivory</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
