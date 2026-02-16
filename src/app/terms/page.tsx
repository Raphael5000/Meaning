import Image from "next/image";
import Link from "next/link";

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

      <nav className="relative z-50 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="shrink-0">
          <Image
            src="/Logo.svg"
            alt="Meaning"
            width={120}
            height={42}
            className="h-8 w-auto sm:h-9"
            priority
          />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
          <Link
            href="/pricing"
            className="text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            Pricing
          </Link>
          <Link
            href="/resources"
            className="text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            Resources
          </Link>
          <Link
            href="/login"
            className="text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="shrink-0 rounded-[100px] px-4 py-1.5 text-sm font-medium transition-all duration-200 sm:px-5 sm:py-2"
            style={{
              background:
                "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)",
              color: "white",
            }}
          >
            Get started
          </Link>
        </div>
      </nav>

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
              By accessing or using Meaning (&quot;Service&quot;), a product by Hivory,
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
              of your Google Analytics account.
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
                We reserve the right to modify pricing with reasonable notice
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
            </ul>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Intellectual Property
            </h2>
            <p>
              The Service, including its design, features, and content (excluding
              your data), is owned by Hivory and protected by intellectual
              property laws. You retain ownership of your data; we do not claim
              rights over your Google Analytics data or queries.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Disclaimer
            </h2>
            <p>
              The Service is provided &quot;as is&quot;. AI-generated insights and
              recommendations are for informational purposes and should not be
              considered as professional advice. You are responsible for
              verifying any insights before making business decisions.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Hivory shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Changes
            </h2>
            <p>
              We may update these Terms from time to time. Continued use of the
              Service after changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 style={{ color: "var(--text-primary)" }}>
              Contact
            </h2>
            <p>
              For questions about these Terms, contact us at{" "}
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
            <Link href="/privacy" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:opacity-80" style={{ color: "var(--accent)" }}>
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
