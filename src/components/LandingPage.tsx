"use client";

export default function LandingPage({ onTryBeta }: { onTryBeta: () => void }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12"
        style={{
          background: "rgba(33, 33, 33, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(58, 58, 58, 0.5)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--accent)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Meaning
          </span>
        </div>
        <button
          onClick={onTryBeta}
          className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium transition-all duration-200"
          style={{
            background: "var(--accent)",
            color: "white",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--accent-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--accent)")
          }
        >
          Try the beta
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center">
        {/* Background gradient orbs */}
        <div
          className="landing-glow-1 absolute top-1/4 left-1/4 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="landing-glow-2 absolute right-1/4 bottom-1/3 h-80 w-80 rounded-full opacity-10 blur-3xl"
          style={{ background: "#6366f1" }}
        />

        <div className="landing-fade-up relative z-10 mx-auto max-w-4xl">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
            style={{
              background: "rgba(16, 163, 127, 0.1)",
              border: "1px solid rgba(16, 163, 127, 0.3)",
              color: "var(--accent)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            Now in Beta
          </div>

          <h1
            className="mb-6 text-5xl leading-tight font-bold tracking-tight md:text-7xl md:leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Chat with your
            <br />
            <span style={{ color: "var(--accent)" }}>Google Analytics</span>
            <br />
            data
          </h1>

          <p
            className="mx-auto mb-10 max-w-2xl text-lg md:text-xl"
            style={{ color: "var(--text-secondary)", lineHeight: "1.7" }}
          >
            Meaning turns your Google Analytics properties into a conversational
            interface. Ask questions in plain English and get instant,
            AI-powered insights.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={onTryBeta}
              className="cursor-pointer rounded-xl px-8 py-4 text-base font-semibold transition-all duration-200"
              style={{
                background: "var(--accent)",
                color: "white",
                boxShadow: "0 0 30px rgba(16, 163, 127, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-hover)";
                e.currentTarget.style.boxShadow =
                  "0 0 40px rgba(16, 163, 127, 0.5)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.boxShadow =
                  "0 0 30px rgba(16, 163, 127, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Try the beta
            </button>
            <span
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Free &middot; Read-only access
            </span>
          </div>
        </div>

        {/* Hero visual - chat mockup */}
        <div className="landing-fade-up-delay relative z-10 mx-auto mt-16 w-full max-w-3xl px-4">
          <div
            className="overflow-hidden rounded-2xl"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(16, 163, 127, 0.1)",
            }}
          >
            {/* Mock title bar */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500 opacity-70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500 opacity-70" />
                <div className="h-3 w-3 rounded-full bg-green-500 opacity-70" />
              </div>
              <span
                className="ml-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                Meaning
              </span>
            </div>
            {/* Mock chat content */}
            <div className="p-6">
              <div className="mb-4 flex justify-end">
                <div
                  className="rounded-2xl rounded-br-md px-4 py-2.5 text-sm"
                  style={{
                    background: "var(--user-bubble)",
                    color: "var(--text-primary)",
                    maxWidth: "80%",
                  }}
                >
                  What were my top 5 pages by pageviews last month?
                </div>
              </div>
              <div className="flex justify-start">
                <div
                  className="text-sm"
                  style={{
                    color: "var(--text-secondary)",
                    maxWidth: "85%",
                    lineHeight: "1.7",
                  }}
                >
                  <p style={{ color: "var(--text-primary)", marginBottom: "8px" }}>
                    Here are your top 5 pages by pageviews for last month:
                  </p>
                  <div
                    className="overflow-hidden rounded-lg text-xs"
                    style={{ border: "1px solid var(--border-color)" }}
                  >
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: "var(--bg-tertiary)" }}>
                          <th
                            className="px-3 py-2 text-left font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            Page
                          </th>
                          <th
                            className="px-3 py-2 text-right font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            Views
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["/", "12,847"],
                          ["/pricing", "8,234"],
                          ["/blog/getting-started", "6,102"],
                          ["/features", "4,891"],
                          ["/docs/api", "3,456"],
                        ].map(([page, views], i) => (
                          <tr
                            key={i}
                            style={{
                              borderTop: "1px solid var(--border-color)",
                            }}
                          >
                            <td
                              className="px-3 py-2"
                              style={{ color: "var(--accent)" }}
                            >
                              {page}
                            </td>
                            <td
                              className="px-3 py-2 text-right"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {views}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="landing-bounce absolute bottom-8 z-10">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: "var(--text-muted)" }}
          >
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2
              className="mb-4 text-3xl font-bold md:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              Everything you need to
              <br />
              <span style={{ color: "var(--accent)" }}>
                understand your data
              </span>
            </h2>
            <p
              className="mx-auto max-w-2xl text-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              Stop digging through dashboards. Ask Meaning anything about your
              analytics and get clear, actionable answers.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature Card 1 */}
            <FeatureCard
              icon={
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              }
              title="Natural Language Queries"
              description="Ask questions in plain English. No need to learn complex query languages or navigate confusing dashboards."
            />

            {/* Feature Card 2 */}
            <FeatureCard
              icon={
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              }
              title="Real-time Analytics"
              description="Get live data from your Google Analytics properties. See what's happening on your site right now."
            />

            {/* Feature Card 3 */}
            <FeatureCard
              icon={
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                  <path d="M20 12a8 8 0 0 0-8-8v8h8z" />
                </svg>
              }
              title="Instant Insights"
              description="AI-powered analysis that surfaces the metrics that matter. Get summaries, trends, and recommendations."
            />

            {/* Feature Card 4 */}
            <FeatureCard
              icon={
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              }
              title="GA4 Integration"
              description="Connects directly to your Google Analytics 4 properties. Switch between multiple properties seamlessly."
            />

            {/* Feature Card 5 */}
            <FeatureCard
              icon={
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              title="Privacy First"
              description="We only request read-only access to your analytics. Your data is never stored or used for training."
            />

            {/* Feature Card 6 */}
            <FeatureCard
              icon={
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
              title="Conversational Interface"
              description="Have a natural conversation with your data. Ask follow-ups, dive deeper, and explore your metrics intuitively."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h2
              className="mb-4 text-3xl font-bold md:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              How it works
            </h2>
            <p
              className="mx-auto max-w-2xl text-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              Get started in seconds. No setup, no configuration.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              number="1"
              title="Sign in with Google"
              description="Connect your Google account with read-only analytics access."
            />
            <StepCard
              number="2"
              title="Select your property"
              description="Choose which GA4 property you want to explore."
            />
            <StepCard
              number="3"
              title="Start asking questions"
              description="Type your question in plain English and get instant answers."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 md:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="rounded-3xl p-12 md:p-16"
            style={{
              background:
                "linear-gradient(135deg, rgba(16, 163, 127, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)",
              border: "1px solid rgba(16, 163, 127, 0.2)",
            }}
          >
            <h2
              className="mb-4 text-3xl font-bold md:text-4xl"
              style={{ color: "var(--text-primary)" }}
            >
              Ready to talk to your data?
            </h2>
            <p
              className="mx-auto mb-8 max-w-lg text-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              Join the beta and start getting insights from your Google Analytics
              data in seconds.
            </p>
            <button
              onClick={onTryBeta}
              className="cursor-pointer rounded-xl px-8 py-4 text-base font-semibold transition-all duration-200"
              style={{
                background: "var(--accent)",
                color: "white",
                boxShadow: "0 0 30px rgba(16, 163, 127, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-hover)";
                e.currentTarget.style.boxShadow =
                  "0 0 40px rgba(16, 163, 127, 0.5)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.boxShadow =
                  "0 0 30px rgba(16, 163, 127, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Try the beta
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-8 md:px-12"
        style={{ borderTop: "1px solid var(--border-color)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "var(--accent)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Meaning
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            We only request read-only access to your analytics data.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="landing-feature-card rounded-2xl p-6 transition-all duration-300"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(16, 163, 127, 0.4)";
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow =
          "0 10px 40px rgba(0,0,0,0.3), 0 0 20px rgba(16, 163, 127, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-color)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
        style={{
          background: "rgba(16, 163, 127, 0.1)",
          color: "var(--accent)",
        }}
      >
        {icon}
      </div>
      <h3
        className="mb-2 text-lg font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
        style={{
          background: "rgba(16, 163, 127, 0.1)",
          color: "var(--accent)",
          border: "2px solid rgba(16, 163, 127, 0.3)",
        }}
      >
        {number}
      </div>
      <h3
        className="mb-2 text-lg font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>
    </div>
  );
}
