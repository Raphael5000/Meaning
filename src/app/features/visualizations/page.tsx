"use client";

import { Navbar } from "@/components/Navbar";
import { FadeInSection } from "@/components/FadeInSection";
import { CtaSection } from "@/components/CtaSection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Chart-type data                                                    */
/* ------------------------------------------------------------------ */
const chartTypes: {
  name: string;
  desc: string;
  mockup: React.ReactNode;
}[] = [
  {
    name: "Bar Charts",
    desc: "Compare values across categories at a glance.",
    mockup: (
      <div className="flex items-end gap-1 h-10">
        {[60, 80, 45, 90, 55, 70, 50].map((h, i) => (
          <div
            key={i}
            className="w-2 rounded-sm"
            style={{
              height: `${h}%`,
              background: `rgba(16,163,127,${0.5 + i * 0.07})`,
            }}
          />
        ))}
      </div>
    ),
  },
  {

    name: "Line Charts",
    desc: "Track trends and changes over time.",
    mockup: (
      <div className="relative h-10 w-full overflow-hidden">
        <svg viewBox="0 0 80 30" className="w-full h-full" fill="none">
          <polyline
            points="0,25 12,18 24,22 36,10 48,14 60,6 72,12 80,4"
            stroke="#10a37f"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10a37f" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10a37f" stopOpacity="0" />
          </linearGradient>
          <polygon
            points="0,25 12,18 24,22 36,10 48,14 60,6 72,12 80,4 80,30 0,30"
            fill="url(#lg)"
          />
        </svg>
      </div>
    ),
  },
  {

    name: "Pie Charts",
    desc: "Show proportions and part-to-whole relationships.",
    mockup: (
      <div
        className="h-10 w-10 rounded-full"
        style={{
          background:
            "conic-gradient(#10a37f 0deg 130deg, rgba(16,163,127,0.6) 130deg 230deg, rgba(16,163,127,0.3) 230deg 310deg, rgba(16,163,127,0.15) 310deg 360deg)",
        }}
      />
    ),
  },
  {

    name: "Scatter Plots",
    desc: "Reveal correlations between two variables.",
    mockup: (
      <div className="relative h-10 w-full">
        {[
          { x: 10, y: 20 },
          { x: 25, y: 60 },
          { x: 40, y: 35 },
          { x: 55, y: 70 },
          { x: 70, y: 45 },
          { x: 85, y: 80 },
          { x: 50, y: 15 },
          { x: 30, y: 50 },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute h-2 w-2 rounded-full"
            style={{
              left: `${p.x}%`,
              bottom: `${p.y}%`,
              background: `rgba(16,163,127,${0.5 + i * 0.06})`,
            }}
          />
        ))}
      </div>
    ),
  },
  {

    name: "Funnels",
    desc: "Visualize drop-off through conversion steps.",
    mockup: (
      <div className="flex flex-col items-center gap-0.5 h-10 justify-center">
        {[100, 75, 50, 30].map((w, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: `${w}%`,
              height: 3,
              background: `rgba(16,163,127,${0.9 - i * 0.2})`,
            }}
          />
        ))}
      </div>
    ),
  },
  {

    name: "Treemaps",
    desc: "Display hierarchical data as nested rectangles.",
    mockup: (
      <div className="grid grid-cols-3 grid-rows-2 gap-0.5 h-10 w-full">
        <div
          className="col-span-2 row-span-2 rounded-sm"
          style={{ background: "rgba(16,163,127,0.7)" }}
        />
        <div
          className="rounded-sm"
          style={{ background: "rgba(16,163,127,0.45)" }}
        />
        <div
          className="rounded-sm"
          style={{ background: "rgba(16,163,127,0.25)" }}
        />
      </div>
    ),
  },
  {

    name: "Heatmaps",
    desc: "Spot intensity patterns in two-dimensional data.",
    mockup: (
      <div className="grid grid-cols-5 grid-rows-3 gap-0.5 h-10 w-full">
        {[0.15, 0.3, 0.6, 0.4, 0.2, 0.4, 0.8, 0.9, 0.7, 0.3, 0.1, 0.35, 0.5, 0.25, 0.1].map(
          (o, i) => (
            <div
              key={i}
              className="rounded-[2px]"
              style={{ background: `rgba(16,163,127,${o})` }}
            />
          )
        )}
      </div>
    ),
  },
  {

    name: "Geographic Maps",
    desc: "Plot metrics by country or region on a map.",
    mockup: (
      <div className="relative h-10 w-full">
        {[
          { x: 20, y: 30, s: 6 },
          { x: 45, y: 25, s: 8 },
          { x: 55, y: 50, s: 5 },
          { x: 70, y: 35, s: 7 },
          { x: 30, y: 60, s: 4 },
          { x: 80, y: 55, s: 6 },
        ].map((d, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: d.s,
              height: d.s,
              background: `rgba(16,163,127,${0.4 + i * 0.1})`,
              boxShadow: "0 0 4px rgba(16,163,127,0.4)",
            }}
          />
        ))}
      </div>
    ),
  },
  {

    name: "Radar Charts",
    desc: "Compare multiple variables on radial axes.",
    mockup: (
      <div className="flex items-center justify-center h-10 w-full">
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none">
          <polygon
            points="20,4 35,15 30,34 10,34 5,15"
            stroke="rgba(16,163,127,0.3)"
            strokeWidth="0.5"
            fill="none"
          />
          <polygon
            points="20,10 30,17 27,30 13,30 10,17"
            stroke="#10a37f"
            strokeWidth="1"
            fill="rgba(16,163,127,0.2)"
          />
        </svg>
      </div>
    ),
  },
  {

    name: "Sankey Diagrams",
    desc: "Trace flows and distributions between stages.",
    mockup: (
      <div className="flex items-center h-10 w-full gap-1">
        <div className="flex flex-col gap-0.5 w-2">
          <div className="h-6 rounded-sm" style={{ background: "rgba(16,163,127,0.8)" }} />
          <div className="h-3 rounded-sm" style={{ background: "rgba(16,163,127,0.5)" }} />
        </div>
        <svg viewBox="0 0 30 20" className="flex-1 h-full" fill="none">
          <path d="M0,3 C15,3 15,2 30,2" stroke="rgba(16,163,127,0.7)" strokeWidth="2" />
          <path d="M0,7 C15,7 15,10 30,10" stroke="rgba(16,163,127,0.5)" strokeWidth="1.5" />
          <path d="M0,12 C15,12 15,17 30,17" stroke="rgba(16,163,127,0.3)" strokeWidth="1" />
        </svg>
        <div className="flex flex-col gap-0.5 w-2">
          <div className="h-3 rounded-sm" style={{ background: "rgba(16,163,127,0.7)" }} />
          <div className="h-4 rounded-sm" style={{ background: "rgba(16,163,127,0.5)" }} />
          <div className="h-2 rounded-sm" style={{ background: "rgba(16,163,127,0.3)" }} />
        </div>
      </div>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function VisualizationsPage() {
  const barHeights = [52, 78, 40, 95, 62, 85, 48];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div
      className="relative min-h-screen overflow-x-clip"
      style={{ background: "var(--page-bg)" }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div
          className="absolute left-1/4 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
          style={{ top: "8%", background: "var(--accent)" }}
        />
        <div
          className="absolute right-1/4 h-80 w-80 rounded-full opacity-[0.06] blur-3xl"
          style={{ top: "40%", background: "#6366f1" }}
        />
        <div
          className="absolute bottom-[20%] left-1/3 h-96 w-96 rounded-full opacity-[0.09] blur-3xl"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="absolute right-[15%] h-72 w-72 rounded-full opacity-[0.07] blur-3xl"
          style={{ top: "70%", background: "#8b5cf6" }}
        />
      </div>

      <Navbar />

      {/* ─── HERO ─── */}
      <section className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-6 pt-16 text-center">
        <FadeInSection>
          <div className="mx-auto max-w-4xl">
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
              style={{
                background: "rgba(16,163,127,0.1)",
                border: "1px solid rgba(16,163,127,0.3)",
                color: "var(--accent)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              See Your Data
            </div>

            <h1
              className="mb-6 text-5xl tracking-tight md:text-7xl"
              style={{ color: "var(--text-primary)" }}
            >
              Beautiful charts,{" "}
              <span style={{ color: "var(--accent)" }}>instantly</span>
            </h1>

            <p
              className="mx-auto mb-10 max-w-2xl text-lg md:text-xl"
              style={{ color: "var(--text-secondary)" }}
            >
              Ask a question and the AI picks the best visualization for your
              data automatically &mdash; bar charts, funnels, heatmaps, and
              more.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup">
                <Button className="rounded-full px-8 py-3 text-base font-semibold">
                  Get started free
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="outline"
                  className="rounded-full px-8 py-3 text-base font-semibold"
                >
                  View pricing
                </Button>
              </Link>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ─── CHART SHOWCASE ─── */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <FadeInSection>
          <div className="mx-auto max-w-3xl">
            <div
              className="relative overflow-hidden rounded-2xl p-8"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <p
                  className="mb-1 text-sm font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  Sessions by day
                </p>
                <p
                  className="mb-6 text-2xl font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  4,312{" "}
                  <span
                    className="text-sm font-normal"
                    style={{ color: "var(--accent)" }}
                  >
                    +12.4%
                  </span>
                </p>

                {/* Bar chart */}
                <div className="flex items-end gap-4 sm:gap-6" style={{ height: 180 }}>
                  {barHeights.map((h, i) => (
                    <div
                      key={i}
                      className="relative flex-1"
                      style={{ height: "100%" }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-md transition-all duration-700"
                        style={{
                          height: `${h}%`,
                          background: `linear-gradient(to top, rgba(16,163,127,${
                            0.6 + i * 0.05
                          }), rgba(16,163,127,${0.85 + i * 0.02}))`,
                          boxShadow: "0 0 12px rgba(16,163,127,0.15)",
                        }}
                      />
                    </div>
                  ))}
                </div>
                {/* X-axis labels */}
                <div className="mt-3 flex gap-4 sm:gap-6">
                  {days.map((d) => (
                    <span
                      key={d}
                      className="flex-1 text-center text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>
      </section>

      {/* ─── CHART TYPES GRID ─── */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="mb-16 text-center">
              <h2
                className="mb-4 text-3xl tracking-tight md:text-5xl"
                style={{ color: "var(--text-primary)" }}
              >
                Every chart you need
              </h2>
              <p
                className="mx-auto max-w-2xl text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                Ten visualization types, each chosen automatically by the AI
                based on your question and data shape.
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-5 sm:grid-cols-2">
            {chartTypes.map((ct, i) => (
              <FadeInSection key={ct.name} delay={i * 60} className="h-full">
                <div
                  className="relative h-full overflow-hidden rounded-2xl p-6"
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="card-noise" aria-hidden />
                  <div className="relative z-10 flex items-start gap-5">
                    {/* Mini mockup */}
                    <div
                      className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg p-2"
                      style={{
                        background: "rgba(16,163,127,0.06)",
                        border: "1px solid rgba(16,163,127,0.15)",
                      }}
                    >
                      {ct.mockup}
                    </div>

                    <div className="min-w-0">
                      <p
                        className="mb-1 text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {ct.name}
                      </p>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {ct.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI-POWERED SECTION ─── */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="grid items-center gap-12 md:grid-cols-2">
              {/* Text */}
              <div>
                <div
                  className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
                  style={{
                    background: "rgba(16,163,127,0.1)",
                    border: "1px solid rgba(16,163,127,0.3)",
                    color: "var(--accent)",
                  }}
                >
                  AI-Powered
                </div>
                <h2
                  className="mb-4 text-3xl tracking-tight md:text-5xl"
                  style={{ color: "var(--text-primary)" }}
                >
                  The AI chooses for you
                </h2>
                <p
                  className="mb-4 text-lg leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  You never have to pick a chart type. Just ask a question in
                  plain English and the AI analyzes your data shape, cardinality,
                  and intent to select the perfect visualization.
                </p>
                <p
                  className="text-lg leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Ask &ldquo;What are my top traffic sources?&rdquo; and get a
                  bar chart. Ask &ldquo;How has traffic changed this
                  quarter?&rdquo; and see a line chart. It just works.
                </p>
              </div>

              {/* Visual: question to chart */}
              <div className="flex flex-col items-center gap-4">
                {/* Question bubble */}
                <div
                  className="relative w-full max-w-sm overflow-hidden rounded-2xl p-5"
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="card-noise" aria-hidden />
                  <div className="relative z-10">
                    <p
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Your question
                    </p>
                    <p
                      className="mt-2 text-base font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      &ldquo;Show me traffic by country&rdquo;
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="h-8 w-px"
                    style={{ background: "var(--accent)" }}
                  />
                  <div
                    className="h-0 w-0"
                    style={{
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderTop: "8px solid var(--accent)",
                    }}
                  />
                </div>

                {/* Geographic visualization card */}
                <div
                  className="relative w-full max-w-sm overflow-hidden rounded-2xl p-5"
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="card-noise" aria-hidden />
                  <div className="relative z-10">
                    <p
                      className="mb-3 text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      AI-selected: Geographic Map
                    </p>
                    {/* Mock map visualization */}
                    <div
                      className="relative h-32 w-full overflow-hidden rounded-lg"
                      style={{ background: "rgba(16,163,127,0.04)" }}
                    >
                      {/* Stylized world regions */}
                      {[
                        { x: 22, y: 30, w: 14, h: 18, o: 0.7, label: "US" },
                        { x: 45, y: 22, w: 10, h: 14, o: 0.5, label: "EU" },
                        { x: 62, y: 28, w: 8, h: 12, o: 0.35, label: "IN" },
                        { x: 75, y: 35, w: 10, h: 10, o: 0.25, label: "AU" },
                        { x: 35, y: 55, w: 12, h: 16, o: 0.4, label: "BR" },
                        { x: 50, y: 50, w: 10, h: 18, o: 0.3, label: "AF" },
                      ].map((r, i) => (
                        <div
                          key={i}
                          className="absolute flex items-center justify-center rounded"
                          style={{
                            left: `${r.x}%`,
                            top: `${r.y}%`,
                            width: `${r.w}%`,
                            height: `${r.h}%`,
                            background: `rgba(16,163,127,${r.o})`,
                          }}
                        >
                          <span
                            className="text-[8px] font-bold"
                            style={{ color: "rgba(255,255,255,0.8)" }}
                          >
                            {r.label}
                          </span>
                        </div>
                      ))}
                      {/* Glow dots */}
                      {[
                        { x: 28, y: 36 },
                        { x: 48, y: 26 },
                        { x: 65, y: 32 },
                      ].map((d, i) => (
                        <div
                          key={`dot-${i}`}
                          className="absolute h-2 w-2 rounded-full"
                          style={{
                            left: `${d.x}%`,
                            top: `${d.y}%`,
                            background: "var(--accent)",
                            boxShadow: "0 0 8px rgba(16,163,127,0.6)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      <FadeInSection>
        <CtaSection
          heading="Ready to see your data?"
          description="Connect Google Analytics, ask a question, and get a beautiful chart in seconds. No configuration needed."
          primaryText="Start for free"
        />
      </FadeInSection>

      <Footer />
    </div>
  );
}
