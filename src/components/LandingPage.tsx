"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect, type MouseEvent as ReactMouseEvent } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowRight, ArrowUpRight, Sparkles, GripVertical, Share2, MessageCircle, BarChart3, LayoutGrid, Users, Search, Check, Minus } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

import { DisplayHeading } from "@/components/marketing/system/DisplayHeading";
import { MonoLabel } from "@/components/marketing/system/MonoLabel";
import {
  DottedGrid,
  AmbientRay,
} from "@/components/marketing/system/Backgrounds";
import { Reveal } from "@/components/marketing/system/Reveal";

import { AnimatePresence } from "framer-motion";
import { Bento, BentoTile } from "@/components/marketing/archetypes/Bento";
import { NumberedSteps } from "@/components/marketing/archetypes/NumberedSteps";
import { MonoFeatureTable } from "@/components/marketing/archetypes/MonoFeatureTable";
import {
  FullBleedStatement,
  DisplayStatement,
} from "@/components/marketing/archetypes/Statements";
import { HeroChat } from "@/components/marketing/archetypes/HeroChat";
import { StickyScroll } from "@/components/marketing/archetypes/StickyScroll";
import { HorizontalScroll } from "@/components/marketing/archetypes/HorizontalScroll";
import { HeroPanels } from "@/components/marketing/HeroPanels";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ============================================================
   Shared mini visual components
   ============================================================ */

function TerminalFrame({
  title = "meaning",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hairline overflow-hidden rounded-2xl bg-[color:var(--m-surface-elevated)]">
      <div className="hairline-b flex items-center gap-2 px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--m-text-muted)] opacity-40" />
          <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--m-text-muted)] opacity-40" />
          <div className="h-2.5 w-2.5 rounded-full bg-[color:var(--m-text-muted)] opacity-40" />
        </div>
        <span className="mono ml-2 text-[10px] tracking-wider text-[color:var(--m-text-muted)]">
          {title}
        </span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function QueryRow({
  source,
  question,
  answer,
  metric,
}: {
  source: string;
  question: string;
  answer: string;
  metric: string;
}) {
  return (
    <div className="hairline rounded-xl bg-[color:var(--m-surface)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="mono text-[10px] tracking-[0.15em] text-[color:var(--brand)]">
          {source}
        </span>
        <span className="h-px flex-1 bg-[color:var(--m-hairline)]" />
        <span className="mono text-[10px] text-[color:var(--m-text-muted)]">
          200 OK
        </span>
      </div>
      <p className="mb-2 text-sm text-[color:var(--m-text-muted)]">
        &quot;{question}&quot;
      </p>
      <div className="flex items-baseline justify-between">
        <p className="text-base text-[color:var(--m-text)]">{answer}</p>
        <p
          className="text-lg text-[color:var(--brand)]"
          style={{ fontFamily: "var(--font-martel), serif", fontWeight: 300 }}
        >
          {metric}
        </p>
      </div>
    </div>
  );
}

function MiniChart() {
  const bars = [72, 58, 44, 30, 22, 14];
  return (
    <div className="flex h-20 items-end gap-1.5">
      {bars.map((h, i) => (
        <div
          key={i}
          className="glass-bar flex-1"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

/* ============================================================
   Hero — scroll-linked, word-by-word, interactive chat
   ============================================================ */

const HERO_LINE_1 = ["Never", "build", "another"];

function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.88]);
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.25]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-[85vh] items-center overflow-hidden px-6 py-32 md:px-12 md:py-40"
    >
      <DottedGrid />

      <HeroPanels className="pointer-events-none absolute right-0 top-1/2 z-0 hidden h-[58vh] w-[50vw] -translate-y-1/2 hero-glow lg:block" />

      <motion.div
        style={{ scale, opacity, y }}
        className="relative z-10 mx-auto w-full max-w-6xl origin-top"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.7, ease: EASE }}
          className="mb-6"
        >
          <span className="launch-pill">
            <span className="launch-pill-star">
              <Sparkles size={14} />
            </span>
            Launch Offer
          </span>
        </motion.div>

        <h1 className="display-xl max-w-[9ch] text-[clamp(2.25rem,5.2vw,4rem)] lg:max-w-[10ch]">
          <span className="block">
            {HERO_LINE_1.map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.15 + i * 0.09,
                  duration: 0.9,
                  ease: EASE,
                }}
                className="mr-[0.28em] inline-block"
              >
                {word}
              </motion.span>
            ))}
          </span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 1, ease: EASE }}
            className="display-italic block"
          >
            dashboard.
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.9, ease: EASE }}
          className="mt-8 max-w-xl text-base leading-relaxed text-[color:var(--m-text-secondary)] md:text-lg lg:max-w-lg"
        >
          Meaning is the AI analyst for your marketing stack. Ask anything in
          plain English across GA4, Google Ads, LinkedIn, Mailchimp and more —
          get charts, dashboards, and alerts in seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.88, duration: 0.9, ease: EASE }}
          className="mt-12 flex flex-wrap items-center gap-3"
        >
          <Link href="/signup" className="btn-display">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="#chat" className="btn-display-ghost">
            See it in action
          </Link>
        </motion.div>

      </motion.div>
    </section>
  );
}

/* ============================================================
   Try it — interactive chat as its own section
   ============================================================ */

function TryItSection() {
  return (
    <section className="hairline-t relative overflow-hidden px-6 py-32 md:px-12 md:py-40">
      <div className="relative z-10 mx-auto max-w-3xl">
        <Reveal>
          <HeroChat />
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   Connector grid — all your data, one place
   ============================================================ */

type Connector = {
  name: string;
  src?: string;
  initial?: string;
  description: string;
  dataTypes: string[];
  status: "live" | "soon";
};

const CONNECTORS: Connector[] = [
  {
    name: "Google Analytics 4",
    src: "/Google Analytics.svg",
    description:
      "Event-level data via your BigQuery export. No sampling, unlimited history.",
    dataTypes: ["SESSIONS", "EVENTS", "FUNNELS", "CONVERSIONS"],
    status: "live",
  },
  {
    name: "Google Ads",
    src: "/Google Ads.svg",
    description:
      "Campaigns, ad groups, keywords, and conversions across every ad account.",
    dataTypes: ["SPEND", "CPC", "CTR", "ROAS"],
    status: "live",
  },
  {
    name: "Microsoft Ads",
    src: "/Microsoft Ads.svg",
    description:
      "Full campaign and ad group performance, synced daily from every account.",
    dataTypes: ["SPEND", "CAMPAIGNS", "KEYWORDS"],
    status: "live",
  },
  {
    name: "LinkedIn",
    src: "/Linkedin.svg",
    description:
      "Company page posts, impressions, engagement, and follower growth over time.",
    dataTypes: ["POSTS", "ENGAGEMENT", "FOLLOWERS"],
    status: "live",
  },
  {
    name: "Mailchimp",
    src: "/Mailchimp.svg",
    description:
      "Campaign opens, clicks, list growth, and revenue attribution per send.",
    dataTypes: ["OPENS", "CLICKS", "LISTS", "REVENUE"],
    status: "live",
  },
  {
    name: "Search Console",
    src: "/Search Console.svg",
    description:
      "Queries, pages, devices, and countries with CTR and average position.",
    dataTypes: ["QUERIES", "IMPRESSIONS", "CTR", "POSITION"],
    status: "live",
  },
  {
    name: "Meta Ads",
    src: "/Meta.svg",
    description:
      "Facebook and Instagram ad performance across every connected ad account.",
    dataTypes: ["SPEND", "REACH", "ROAS"],
    status: "soon",
  },
];

function ConnectorLogo({ connector }: { connector: Connector }) {
  if (connector.src) {
    return (
      <Image
        src={connector.src}
        alt={connector.name}
        width={36}
        height={36}
        className="h-9 w-9 object-contain"
      />
    );
  }
  return (
    <div className="hairline-strong flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--m-surface-elevated)] text-xs font-semibold text-[color:var(--m-text)]">
      {connector.initial}
    </div>
  );
}

function ConnectorCard({
  connector,
  index,
}: {
  connector: Connector;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isSoon = connector.status === "soon";

  function handleMove(e: ReactMouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    ref.current.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ delay: index * 0.05, duration: 0.7, ease: EASE }}
      className="liquid-glass spotlight spotlight-white relative flex h-full flex-col rounded-[20px] p-7"
    >
      <div className="mb-6 flex items-start justify-between">
        <ConnectorLogo connector={connector} />
        <span
          className={`mono rounded-full px-2 py-0.5 text-[9px] tracking-[0.15em] ${
            isSoon
              ? "hairline text-[color:var(--m-text-muted)]"
              : "text-[color:var(--brand)]"
          }`}
          style={
            isSoon
              ? undefined
              : {
                  background: "var(--brand-soft)",
                  border: "1px solid var(--brand-ring)",
                }
          }
        >
          {isSoon ? "SOON" : "LIVE"}
        </span>
      </div>
      <h3 className="mb-3 text-xl font-medium text-[color:var(--m-text)]">
        {connector.name}
      </h3>
      <p className="text-sm leading-relaxed text-[color:var(--m-text-secondary)]">
        {connector.description}
      </p>
    </motion.div>
  );
}

function DatabaseShimmerIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <defs>
        <linearGradient id="db-shimmer" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f5f5f4" />
          <stop offset="100%" stopColor="#c7c7c4" />
        </linearGradient>
      </defs>
      <ellipse cx="12" cy="5" rx="9" ry="3" stroke="url(#db-shimmer)" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" stroke="url(#db-shimmer)" />
      <path d="M3 12A9 3 0 0 0 21 12" stroke="url(#db-shimmer)" />
    </svg>
  );
}

function UnifiedLayerCallout() {
  const liveConnectors = CONNECTORS.filter((c) => c.status === "live");
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
      className="hairline-strong relative mt-5 overflow-hidden rounded-2xl p-8 md:p-10"
    >
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto_auto]">
        {/* Left: connectors fanning in */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {liveConnectors.map((c) => (
              <div
                key={c.name}
                className="hairline flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--m-surface)]"
              >
                {c.src ? (
                  <Image
                    src={c.src}
                    alt={c.name}
                    width={22}
                    height={22}
                    className="h-5 w-5 object-contain"
                  />
                ) : (
                  <span className="text-[10px] font-semibold text-[color:var(--m-text)]">
                    {c.initial}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Animated flow line + arrow */}
        <div className="hidden items-center gap-5 md:flex">
          <div className="flow-line w-56" />
          <ArrowRight
            className="h-5 w-5 text-[color:var(--brand)]"
            style={{ filter: "drop-shadow(0 0 8px var(--brand-ring))" }}
          />
        </div>
        <div className="flex items-center justify-center md:hidden">
          <div className="flow-line-v h-16" />
        </div>

        {/* Right: dark BigQuery pill with shimmer-gradient icon */}
        <div
          className="inline-flex items-center gap-5 rounded-2xl px-7 py-6"
          style={{
            background: "var(--m-surface)",
            border: "1px solid var(--m-hairline-strong)",
            boxShadow: "var(--m-shadow-md)",
          }}
        >
          <div
            className="shrink-0"
            style={{
              filter:
                "drop-shadow(0 0 10px rgba(10, 123, 94, 0.25)) drop-shadow(0 0 20px rgba(10, 123, 94, 0.1))",
            }}
          >
            <DatabaseShimmerIcon />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold text-[color:var(--m-text)]">
              BigQuery
            </span>
            <span className="text-xs text-[color:var(--m-text-muted)]">Unified data layer</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ConnectorGrid() {
  return (
    <section className="relative px-6 py-40 md:px-12 md:py-56">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <DisplayHeading size="lg" className="mb-20 max-w-[20ch]">
            All your marketing data, one place.
          </DisplayHeading>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CONNECTORS.map((c, i) => (
            <ConnectorCard key={c.name} connector={c} index={i} />
          ))}
        </div>

        <UnifiedLayerCallout />
      </div>
    </section>
  );
}

/* ============================================================
   Widget demo — looping "type → generate → pie chart" animation
   ============================================================ */

const DEMO_PROMPT = "Revenue by channel, last 30 days";
const DEMO_SLICES = [
  { label: "Organic Search", value: 38, color: "#1ef0b4" },
  { label: "Paid Search",    value: 26, color: "#14d89e" },
  { label: "Direct",         value: 18, color: "#0ab47e" },
  { label: "Social",         value: 12, color: "#0a9068" },
  { label: "Email",          value: 6,  color: "#0a7b5e" },
];

// Donut arc — outer + inner radius, with a small gap between segments.
const PIE_CX = 80;
const PIE_CY = 80;
const PIE_R_OUTER = 64;
const PIE_R_INNER = 38;

function donutArc(
  startAngle: number,
  endAngle: number,
): string {
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const ox1 = PIE_CX + PIE_R_OUTER * Math.cos(rad(startAngle));
  const oy1 = PIE_CY + PIE_R_OUTER * Math.sin(rad(startAngle));
  const ox2 = PIE_CX + PIE_R_OUTER * Math.cos(rad(endAngle));
  const oy2 = PIE_CY + PIE_R_OUTER * Math.sin(rad(endAngle));
  const ix1 = PIE_CX + PIE_R_INNER * Math.cos(rad(endAngle));
  const iy1 = PIE_CY + PIE_R_INNER * Math.sin(rad(endAngle));
  const ix2 = PIE_CX + PIE_R_INNER * Math.cos(rad(startAngle));
  const iy2 = PIE_CY + PIE_R_INNER * Math.sin(rad(startAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${ox1} ${oy1}`,
    `A ${PIE_R_OUTER} ${PIE_R_OUTER} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${PIE_R_INNER} ${PIE_R_INNER} 0 ${largeArc} 0 ${ix2} ${iy2}`,
    "Z",
  ].join(" ");
}

const DEMO_PIE = (() => {
  const total = DEMO_SLICES.reduce((s, x) => s + x.value, 0);
  const GAP = 1.5; // degrees of gap between slices
  let cum = 0;
  return DEMO_SLICES.map((s) => {
    const start = (cum / total) * 360 + GAP / 2;
    cum += s.value;
    const end = (cum / total) * 360 - GAP / 2;
    return { ...s, path: donutArc(start, end) };
  });
})();

type DemoPhase = "typing" | "generating" | "drawing" | "done";

function WidgetDemoBody() {
  const [phase, setPhase] = useState<DemoPhase>("typing");
  const [typed, setTyped] = useState("");

  // Typing phase
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(DEMO_PROMPT.slice(0, i));
      if (i >= DEMO_PROMPT.length) {
        clearInterval(id);
        setTimeout(() => setPhase("generating"), 500);
      }
    }, 55);
    return () => clearInterval(id);
  }, []);

  // Phase transitions after typing
  useEffect(() => {
    if (phase === "generating") {
      const t = setTimeout(() => setPhase("drawing"), 1000);
      return () => clearTimeout(t);
    }
    if (phase === "drawing") {
      const t = setTimeout(() => setPhase("done"), 1400);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <div className="liquid-glass relative overflow-hidden rounded-2xl p-6 md:p-7">
      <span className="liquid-glass-shimmer" aria-hidden />

      {/* Prompt input with typing animation — same style as hero chat input */}
      <div className="hero-chat-input mb-5 rounded-2xl px-5 py-4">
        <p className="text-sm text-[color:var(--m-text)]">
          {typed}
          {phase === "typing" && (
            <motion.span
              className="ml-0.5 inline-block h-[14px] w-[2px] translate-y-[2px]"
              style={{ background: "var(--brand)" }}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          )}
        </p>
      </div>

      {/* Phase swap: generating → chart */}
      <div className="min-h-[200px]">
        <AnimatePresence mode="wait">
          {phase === "generating" && (
            <motion.div
              key="gen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex h-[200px] items-center justify-center gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full"
                  style={{ background: "var(--brand)" }}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
              <span className="ml-3 text-xs text-[color:var(--m-text-muted)]">
                Generating widget…
              </span>
            </motion.div>
          )}

          {(phase === "drawing" || phase === "done") && (
            <motion.div
              key="chart"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-5"
            >
              {/* Donut chart — clean stroke-based rings */}
              <svg
                viewBox="0 0 160 160"
                className="h-44 w-44 flex-shrink-0"
                style={{ filter: "drop-shadow(0 0 18px rgba(30,240,180,0.3))" }}
                aria-hidden
              >
                {/* Background track */}
                <circle cx="80" cy="80" r="54" fill="none" stroke="var(--m-hairline)" strokeWidth="22" opacity="0.3" />

                {/* Slices as stroke-dasharray arcs */}
                {(() => {
                  const total = DEMO_SLICES.reduce((s, x) => s + x.value, 0);
                  const C = 2 * Math.PI * 54; // circumference
                  const gap = 4; // px gap between slices
                  let offset = 0;
                  return DEMO_SLICES.map((slice, i) => {
                    const len = (slice.value / total) * C - gap;
                    const dash = `${Math.max(0, len)} ${C - Math.max(0, len)}`;
                    const rot = (offset / C) * 360 - 90;
                    offset += (slice.value / total) * C;
                    return (
                      <motion.circle
                        key={slice.label}
                        cx="80" cy="80" r="54"
                        fill="none"
                        stroke={slice.color}
                        strokeWidth="22"
                        strokeDasharray={dash}
                        strokeLinecap="round"
                        transform={`rotate(${rot} 80 80)`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      />
                    );
                  });
                })()}

                {/* Center label */}
                <text
                  x="80" y="76" textAnchor="middle"
                  className="fill-[color:var(--m-text-muted)]"
                  style={{ fontSize: 7, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}
                >
                  TOTAL
                </text>
                <text
                  x="80" y="92" textAnchor="middle"
                  className="fill-[color:var(--m-text)]"
                  style={{ fontSize: 16, fontWeight: 500 }}
                >
                  4,812
                </text>
              </svg>

              {/* Legend */}
              <div className="flex flex-1 flex-col gap-2.5">
                {DEMO_SLICES.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.5 + i * 0.08,
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: s.color }}
                      />
                      <span className="truncate text-xs text-[color:var(--m-text-secondary)]">
                        {s.label}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-[color:var(--m-text)]">
                      {s.value}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function WidgetDemo() {
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), 8500);
    return () => clearInterval(id);
  }, []);
  return <WidgetDemoBody key={cycle} />;
}

/* ============================================================
   Pain / chat section
   ============================================================ */

function TelemetrySection() {
  return (
    <section id="chat" className="px-6 py-40 md:px-12 md:py-56">
      <div className="mx-auto grid max-w-6xl items-center gap-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Reveal>
            <DisplayHeading size="md" className="max-w-[14ch]">
              Dashboards take days. Answers take seconds.
            </DisplayHeading>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[color:var(--m-text-secondary)] md:text-[15px]">
              Marketing teams spend hours stitching together reports that are
              outdated before anyone opens them. Meaning skips the building —
              ask in plain English and get an answer with the right chart
              attached, instantly.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link
              href="/features/natural-language"
              className="mt-10 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)] hover:opacity-80"
            >
              Learn more <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Reveal>
        </div>
        <div className="md:col-span-7">
          <WidgetDemo />
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Bento — product capabilities (dark band)
   ============================================================ */

function ProductBento() {
  return (
    <section className="px-6 py-40 md:px-12 md:py-56">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <DisplayHeading size="lg" className="mb-20 max-w-[18ch]">
            Everything you need. Nothing you don&apos;t.
          </DisplayHeading>
        </Reveal>

        <Bento>
          <BentoTile colSpan="4" index={0}>
            <h3 className="bento-heading mb-3">Ask. Don&apos;t build.</h3>
            <p className="bento-sub mb-8 max-w-md">
              Natural language across every source.
            </p>
            <div className="mt-auto space-y-3">
              {/* User bubble — right aligned */}
              <div className="flex justify-end">
                <div className="hairline max-w-[78%] rounded-2xl rounded-br-sm bg-[color:var(--m-surface-elevated)] px-4 py-2.5">
                  <p className="text-sm text-[color:var(--m-text)]">
                    Which channel drove the most signups last week?
                  </p>
                </div>
              </div>
              {/* AI bubble — left aligned with sparkle */}
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[color:var(--brand)]" />
                <div className="hairline max-w-[78%] rounded-2xl rounded-bl-sm bg-[color:var(--m-surface)] px-4 py-2.5">
                  <p className="text-sm text-[color:var(--m-text-secondary)]">
                    Organic search — <span className="text-[color:var(--m-text)]">1,204 signups</span>, up 21% WoW.
                  </p>
                </div>
              </div>
            </div>
          </BentoTile>

          <BentoTile colSpan="2" index={1}>
            <h3 className="bento-heading mb-3">Build themselves.</h3>
            <p className="bento-sub mb-6">AI-generated widgets, drag &amp; drop.</p>
            <div className="mt-auto">
              <MiniChart />
            </div>
          </BentoTile>

          <BentoTile colSpan="2" index={2}>
            <h3 className="bento-heading mb-3">Delivered.</h3>
            <p className="bento-sub mb-6">Scheduled email reports with AI summaries.</p>
            <div className="mt-auto space-y-2">
              {["Weekly recap", "Spend anomaly", "SEO opportunity"].map((n) => (
                <div
                  key={n}
                  className="hairline flex items-center justify-between rounded-md px-3 py-2"
                >
                  <span className="text-xs text-[color:var(--m-text)]">{n}</span>
                  <span className="mono text-[9px] text-[color:var(--brand)]">ACTIVE</span>
                </div>
              ))}
            </div>
          </BentoTile>

          <BentoTile colSpan="4" index={3}>
            <h3 className="bento-heading mb-3">Not just answers. Next steps.</h3>
            <p className="bento-sub mb-6 max-w-md">
              Recommendations grounded in real data. Never fabricated.
            </p>
            <div className="mt-auto">
              <div className="hairline flex items-center gap-3 rounded-xl bg-[color:var(--m-surface-elevated)] p-5">
                <Sparkles className="h-4 w-4 shrink-0 text-[color:var(--brand)]" />
                <p className="text-sm leading-relaxed text-[color:var(--m-text)]">
                  Paid social CPA dropped <strong>18%</strong> this week, driven by a
                  creative refresh on the Spring launch.
                </p>
              </div>
            </div>
          </BentoTile>

          <BentoTile colSpan="3" index={4}>
            <h3 className="bento-heading mb-3">Every source, one chat.</h3>
            <div className="mt-auto flex flex-wrap items-center gap-3">
              {[
                { src: "/Google Analytics.svg", alt: "Google Analytics" },
                { src: "/Google Ads.svg", alt: "Google Ads" },
                { src: "/Linkedin.svg", alt: "LinkedIn" },
                { src: "/Meta.svg", alt: "Meta" },
              ].map((p) => (
                <div
                  key={p.alt}
                  className="hairline flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--m-surface-elevated)]"
                >
                  <Image
                    src={p.src}
                    alt={p.alt}
                    width={22}
                    height={22}
                    className="h-[22px] w-[22px] object-contain"
                  />
                </div>
              ))}
              <span className="mono text-[10px] text-[color:var(--m-text-muted)]">+ MORE</span>
            </div>
          </BentoTile>

          <BentoTile colSpan="3" index={5}>
            <h3 className="bento-heading mb-3">Built to share.</h3>
            <div className="mt-auto flex items-center gap-2">
              {["SC", "JW", "AR", "LO"].map((n, i) => (
                <div
                  key={n}
                  className="hairline flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--m-surface-elevated)] text-[10px] font-semibold text-[color:var(--m-text)]"
                  style={{ marginLeft: i > 0 ? "-8px" : 0, zIndex: 4 - i }}
                >
                  {n}
                </div>
              ))}
              <span className="mono ml-3 text-[10px] text-[color:var(--m-text-muted)]">
                4 / 5 SEATS
              </span>
            </div>
          </BentoTile>
        </Bento>
      </div>
    </section>
  );
}

/* ============================================================
   B — Dashboards deep-dive (StickyScroll)
   ============================================================ */

/* Visuals for DashboardsDeepDive sticky-scroll steps */

function StepVisualAsk() {
  return (
    <div className="liquid-glass relative overflow-hidden rounded-2xl p-6" style={{ width: "100%", maxWidth: "520px" }}>
      <span className="liquid-glass-shimmer" aria-hidden />
      <p className="mono-label mb-4">ASK FOR A GRAPH</p>
      {/* Chat prompt */}
      <div className="mb-4 rounded-xl border border-[color:var(--m-hairline)] bg-[color:var(--m-surface)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[color:var(--m-text-muted)]">
          <Search className="h-3 w-3" />
          <span className="font-mono">Ask Meaning anything…</span>
        </div>
      </div>
      {/* Typed question */}
      <div className="mb-4 rounded-xl bg-[color:var(--m-surface-elevated)] px-4 py-3">
        <p className="text-sm text-[color:var(--m-text)]">
          &ldquo;Show me a bar chart of revenue by channel this quarter&rdquo;
        </p>
      </div>
      {/* Result preview — glass bars */}
      <div className="hairline rounded-xl bg-[color:var(--m-surface-elevated)] p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--m-text-muted)]">
          Revenue by channel
        </p>
        <div className="flex h-20 items-end gap-2">
          {[65, 85, 50, 72, 38].map((h, i) => (
            <div key={i} className="glass-bar flex-1" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-[color:var(--m-text-muted)]">
        <Sparkles className="h-3 w-3" />
        <span>Revenue is up 23% QoQ, led by Paid Search.</span>
      </div>
    </div>
  );
}

function StepVisualGrid() {
  return (
    <div className="liquid-glass relative overflow-hidden rounded-2xl p-6" style={{ width: "100%", maxWidth: "520px" }}>
      <span className="liquid-glass-shimmer" aria-hidden />
      <p className="mono-label mb-4">DROP IT ON THE GRID</p>
      {/* Mini dashboard grid */}
      <div className="grid grid-cols-3 grid-rows-2 gap-2">
        {/* Large donut chart widget */}
        <div className="col-span-2 row-span-2 flex flex-col rounded-xl border border-[color:var(--m-hairline)] bg-[color:var(--m-surface)] p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <GripVertical className="h-3 w-3 text-[color:var(--m-text-muted)]" />
            <span className="text-[10px] font-medium text-[color:var(--m-text)]">Revenue by Channel</span>
          </div>
          <div className="flex flex-1 items-center justify-center">
            {(() => {
              const segs = [
                { pct: 42, color: "#1ef0b4" },
                { pct: 28, color: "#14d89e" },
                { pct: 18, color: "#0ab47e" },
                { pct: 12, color: "#0a9068" },
              ];
              const r = 30;
              const C = 2 * Math.PI * r;
              const gap = 3;
              let off = 0;
              return (
                <svg viewBox="0 0 80 80" className="h-20 w-20" style={{ filter: "drop-shadow(0 0 10px rgba(30,240,180,0.3))" }}>
                  <circle cx="40" cy="40" r={r} fill="none" stroke="var(--m-hairline-strong)" strokeWidth="10" opacity="0.12" />
                  {segs.map((s, i) => {
                    const len = (s.pct / 100) * C - gap;
                    const dash = `${Math.max(0, len)} ${C - Math.max(0, len)}`;
                    const rot = (off / C) * 360 - 90;
                    off += (s.pct / 100) * C;
                    return (
                      <circle key={i} cx="40" cy="40" r={r} fill="none" stroke={s.color} strokeWidth="10" strokeDasharray={dash} strokeLinecap="round" transform={`rotate(${rot} 40 40)`} />
                    );
                  })}
                </svg>
              );
            })()}
          </div>
        </div>
        {/* Scorecard widgets */}
        <div className="rounded-xl border border-[color:var(--m-hairline)] bg-[color:var(--m-surface)] p-3">
          <span className="block text-[9px] text-[color:var(--m-text-muted)]">Sessions</span>
          <span className="block text-lg font-semibold text-[color:var(--m-text)]">12.4k</span>
          <span className="text-[9px] text-[color:var(--brand)]">+18%</span>
        </div>
        <div className="rounded-xl border border-[color:var(--m-hairline)] bg-[color:var(--m-surface)] p-3">
          <span className="block text-[9px] text-[color:var(--m-text-muted)]">Conv. Rate</span>
          <span className="block text-lg font-semibold text-[color:var(--m-text)]">3.2%</span>
          <span className="text-[9px] text-[color:var(--brand)]">+0.4pp</span>
        </div>
      </div>
      {/* Drag hint */}
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[color:var(--m-text-muted)]">
        <LayoutGrid className="h-3 w-3" />
        <span>Drag to rearrange · Resize any widget</span>
      </div>
    </div>
  );
}

function StepVisualShare() {
  return (
    <div className="liquid-glass relative overflow-hidden rounded-2xl p-6" style={{ width: "100%", maxWidth: "520px" }}>
      <span className="liquid-glass-shimmer" aria-hidden />
      <p className="mono-label mb-4">SHARE WITH YOUR TEAM</p>
      {/* Share dialog mock */}
      <div className="mb-3 flex items-center gap-2">
        <Share2 className="h-4 w-4 text-[color:var(--brand)]" />
        <span className="text-sm font-medium text-[color:var(--m-text)]">Share dashboard</span>
      </div>
      {/* Team members */}
      <div className="space-y-2">
        {[
          { name: "Sarah Chen", role: "Editor", initials: "SC" },
          { name: "Mark Rivera", role: "Viewer", initials: "MR" },
          { name: "Alex Kim", role: "Viewer", initials: "AK" },
        ].map((m) => (
          <div key={m.name} className="flex items-center justify-between rounded-lg border border-[color:var(--m-hairline)] bg-[color:var(--m-surface)] px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--brand)] text-[9px] font-bold text-white">
                {m.initials}
              </div>
              <span className="text-xs text-[color:var(--m-text)]">{m.name}</span>
            </div>
            <span className="text-[10px] text-[color:var(--m-text-muted)]">{m.role}</span>
          </div>
        ))}
      </div>
      {/* Scheduled report */}
      <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-[color:var(--m-hairline-strong)] px-3 py-2 text-[10px] text-[color:var(--m-text-muted)]">
        <Users className="h-3 w-3" />
        <span>Weekly PDF report scheduled — every Monday 9 AM</span>
      </div>
    </div>
  );
}

function StepVisualChat() {
  return (
    <div className="liquid-glass relative overflow-hidden rounded-2xl p-6" style={{ width: "100%", maxWidth: "520px" }}>
      <span className="liquid-glass-shimmer" aria-hidden />
      <p className="mono-label mb-4">ASK YOUR DATA ANYTHING</p>
      {/* Conversation thread */}
      <div className="space-y-3">
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-br-md bg-[color:var(--m-surface-elevated)] px-4 py-2.5">
            <p className="text-xs text-[color:var(--m-text)]">Which campaigns had the highest ROAS last month?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-[color:var(--brand)]" />
          <div className="rounded-2xl rounded-bl-md border border-[color:var(--m-hairline)] bg-[color:var(--m-surface)] px-4 py-2.5">
            <p className="text-xs text-[color:var(--m-text)]">Your top 3 by ROAS were <strong>Brand Search</strong> (8.4x), <strong>Retargeting</strong> (6.1x), and <strong>Shopping</strong> (4.7x).</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-br-md bg-[color:var(--m-surface-elevated)] px-4 py-2.5">
            <p className="text-xs text-[color:var(--m-text)]">Break down Brand Search by week</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Sparkles className="mt-1 h-3.5 w-3.5 shrink-0 text-[color:var(--brand)]" />
          <div className="space-y-2 rounded-2xl rounded-bl-md border border-[color:var(--m-hairline)] bg-[color:var(--m-surface)] px-4 py-2.5">
            <p className="text-xs text-[color:var(--m-text)]">Here&apos;s the weekly trend:</p>
            <div className="flex h-10 items-end gap-1">
              {[40, 55, 68, 80].map((h, i) => (
                <div key={i} className="glass-bar flex-1" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardsDeepDive() {
  return (
    <section className="px-6 py-40 md:px-12 md:py-56">
      <div className="mx-auto max-w-6xl">
        <div className="mb-24">
          <Reveal>
            <DisplayHeading size="lg" className="max-w-[18ch]">
              Dashboards that build themselves.
            </DisplayHeading>
          </Reveal>
        </div>
        <StickyScroll
          steps={[
            {
              id: "ask",
              label: "STEP 01",
              title: "Ask for a graph.",
              description:
                "Type a question in plain English — \"show me revenue by channel\" — and Meaning queries across GA4, Google Ads, LinkedIn, and more. The right chart type is picked automatically.",
              visual: <StepVisualAsk />,
            },
            {
              id: "grid",
              label: "STEP 02",
              title: "Drop it on the grid.",
              description:
                "Pin any answer as a dashboard widget with one click. Drag, resize, and arrange your layout exactly the way you want — no templates, no config files.",
              visual: <StepVisualGrid />,
            },
            {
              id: "share",
              label: "STEP 03",
              title: "Share it with your team.",
              description:
                "Invite teammates as editors or viewers. Schedule automated PDF reports and email alerts so everyone stays in sync — no more Monday-morning screenshot Slacks.",
              visual: <StepVisualShare />,
            },
            {
              id: "explore",
              label: "STEP 04",
              title: "Ask your data anything.",
              description:
                "Keep the conversation going. Drill down, compare time periods, pivot across platforms — every follow-up builds on the last. It's like having an analyst on call.",
              visual: <StepVisualChat />,
            },
          ]}
        />
      </div>
    </section>
  );
}

/* ============================================================
   C — Chart gallery (HorizontalScroll)
   ============================================================ */

// Robinhood-inspired glass SVG chart illustrations — translucent 3D glass bars with emerald gradients
// Shared SVG defs for the glass effect are inlined per-SVG to avoid cross-component dep

/** Shared glass gradient defs — call inside each <svg> */
function GlassBarDefs({ id = "gb" }: { id?: string }) {
  return (
    <defs>
      {/* Main body gradient: neon green top → transparent bottom */}
      <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#1ef0b4" stopOpacity="0.92" />
        <stop offset="22%" stopColor="#1edca6" stopOpacity="0.7" />
        <stop offset="45%" stopColor="#14c896" stopOpacity="0.42" />
        <stop offset="70%" stopColor="#0ab47e" stopOpacity="0.16" />
        <stop offset="90%" stopColor="#0a9068" stopOpacity="0.04" />
        <stop offset="100%" stopColor="#0a7b5e" stopOpacity="0" />
      </linearGradient>
      {/* Horizontal cylinder shading — left-lit, darker right edge */}
      <linearGradient id={`${id}-depth`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
        <stop offset="18%" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="80%" stopColor="#000000" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
      </linearGradient>
      {/* Specular highlight — bright spot near top-left */}
      <radialGradient id={`${id}-spec`} cx="35%" cy="12%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      {/* Neon glow filter — stronger blur for the bloom effect */}
      <filter id={`${id}-glow`} x="-50%" y="-30%" width="200%" height="170%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );
}

/** Glass-style area fill gradient */
function GlassAreaDefs({ id = "ga" }: { id?: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#1ef0b4" stopOpacity="0.65" />
        <stop offset="50%" stopColor="#14d89e" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#0ab47e" stopOpacity="0.02" />
      </linearGradient>
      <linearGradient id={`${id}-stroke`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stopColor="#1ef0b4" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#14d89e" stopOpacity="0.75" />
      </linearGradient>
      <filter id={`${id}-glow`} x="-10%" y="-20%" width="120%" height="150%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );
}

/** Glass pie/donut gradient */
function GlassPieDefs({ id = "gp" }: { id?: string }) {
  return (
    <defs>
      <radialGradient id={`${id}-fill`} cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#1ef0b4" stopOpacity="0.92" />
        <stop offset="50%" stopColor="#14d89e" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#0ab47e" stopOpacity="0.2" />
      </radialGradient>
      <filter id={`${id}-glow`} x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );
}

const hairlineColor = "var(--m-hairline-strong)";

function BarSvg() {
  const bars = [80, 105, 60, 90, 45, 70];
  return (
    <svg viewBox="0 0 240 140" className="h-24 w-full">
      <GlassBarDefs id="bar" />
      {bars.map((h, i) => {
        const x = 20 + i * 35;
        const y = 130 - h;
        return (
          <g key={i} filter="url(#bar-glow)">
            <rect x={x} y={y} width="22" height={h} fill="url(#bar-fill)" rx="4" ry="4" />
            <rect x={x} y={y} width="22" height={h} fill="url(#bar-depth)" rx="4" ry="4" />
            <rect x={x} y={y} width="22" height={h} fill="url(#bar-spec)" rx="4" ry="4" />
          </g>
        );
      })}
    </svg>
  );
}
function LineSvg() {
  const pts = [100, 80, 85, 55, 65, 30, 40];
  const xs = [10, 45, 80, 115, 150, 185, 220];
  return (
    <svg viewBox="0 0 240 140" className="h-24 w-full">
      <GlassAreaDefs id="line" />
      <polyline
        fill="none"
        stroke="url(#line-stroke)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={xs.map((x, i) => `${x},${pts[i]}`).join(" ")}
        filter="url(#line-glow)"
      />
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={pts[i]} r="6" fill="#1ef0b4" opacity="0.15" />
          <circle cx={x} cy={pts[i]} r="3" fill="#1ef0b4" opacity="0.9" />
          <circle cx={x} cy={pts[i]} r="1.5" fill="#ffffff" opacity="0.45" />
        </g>
      ))}
    </svg>
  );
}
function AreaSvg() {
  return (
    <svg viewBox="0 0 240 140" className="h-24 w-full">
      <GlassAreaDefs id="area" />
      <path
        d="M10,100 45,80 80,85 115,55 150,65 185,30 220,40 L220,130 L10,130 Z"
        fill="url(#area-fill)"
      />
      <polyline
        fill="none"
        stroke="url(#area-stroke)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points="10,100 45,80 80,85 115,55 150,65 185,30 220,40"
        filter="url(#area-glow)"
      />
    </svg>
  );
}
function PieSvg() {
  // Clean stroke-based segmented ring (pie represented as thick donut)
  const segs = [
    { pct: 45, color: "#1ef0b4" },
    { pct: 30, color: "#14d89e" },
    { pct: 25, color: "#0ab47e" },
  ];
  const C = 2 * Math.PI * 42;
  const gap = 3;
  let off = 0;
  return (
    <svg viewBox="0 0 140 140" className="h-24 w-full" style={{ filter: "drop-shadow(0 0 12px rgba(30,240,180,0.3))" }}>
      <circle cx="70" cy="70" r="42" fill="none" stroke="var(--m-hairline-strong)" strokeWidth="24" opacity="0.12" />
      {segs.map((s, i) => {
        const len = (s.pct / 100) * C - gap;
        const dash = `${Math.max(0, len)} ${C - Math.max(0, len)}`;
        const rot = (off / C) * 360 - 90;
        off += (s.pct / 100) * C;
        return (
          <circle key={i} cx="70" cy="70" r="42" fill="none" stroke={s.color} strokeWidth="24" strokeDasharray={dash} strokeLinecap="round" transform={`rotate(${rot} 70 70)`} />
        );
      })}
    </svg>
  );
}
function DonutSvg() {
  // Clean stroke-based multi-segment donut
  const segs = [
    { pct: 40, color: "#1ef0b4" },
    { pct: 28, color: "#14d89e" },
    { pct: 20, color: "#0ab47e" },
    { pct: 12, color: "#0a9068" },
  ];
  const C = 2 * Math.PI * 38; // circumference at r=38
  const gap = 3;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="h-24 w-full" style={{ filter: "drop-shadow(0 0 14px rgba(30,240,180,0.3))" }}>
      {/* Track */}
      <circle cx="70" cy="70" r="38" fill="none" stroke="var(--m-hairline-strong)" strokeWidth="14" opacity="0.15" />
      {/* Segments */}
      {segs.map((s, i) => {
        const len = (s.pct / 100) * C - gap;
        const dash = `${Math.max(0, len)} ${C - Math.max(0, len)}`;
        const rot = (offset / C) * 360 - 90;
        offset += (s.pct / 100) * C;
        return (
          <circle
            key={i} cx="70" cy="70" r="38" fill="none"
            stroke={s.color} strokeWidth="14"
            strokeDasharray={dash} strokeLinecap="round"
            transform={`rotate(${rot} 70 70)`}
          />
        );
      })}
      <text x="70" y="78" textAnchor="middle" fill="var(--m-text)" fontSize="20" fontFamily="var(--font-martel), serif" fontWeight="300">
        68%
      </text>
    </svg>
  );
}
function ScatterSvg() {
  const pts = [[30,100],[50,80],[70,90],[90,60],[110,70],[130,45],[150,55],[170,35],[190,40],[210,25]];
  return (
    <svg viewBox="0 0 240 140" className="h-24 w-full">
      <defs>
        <radialGradient id="dot-glass">
          <stop offset="0%" stopColor="#1ef0b4" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#14d89e" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0ab47e" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="6" fill="url(#dot-glass)" opacity={0.5 + (i / pts.length) * 0.5} />
          <circle cx={x-1} cy={y-1} r="2" fill="#ffffff" opacity="0.25" />
        </g>
      ))}
    </svg>
  );
}
function FunnelSvg() {
  const rows = [
    { w: 200, y: 20 },
    { w: 160, y: 48 },
    { w: 110, y: 76 },
    { w: 60, y: 104 },
  ];
  return (
    <svg viewBox="0 0 240 140" className="h-24 w-full">
      <GlassBarDefs id="funnel" />
      {rows.map((r, i) => {
        const x = (240 - r.w) / 2;
        return (
          <g key={i} filter="url(#funnel-glow)">
            <rect x={x} y={r.y} width={r.w} height="20" rx="4" fill="url(#funnel-fill)" opacity={1 - i * 0.15} />
            <rect x={x} y={r.y} width={r.w} height="20" rx="4" fill="url(#funnel-depth)" />
            <rect x={x} y={r.y} width={r.w} height="20" rx="4" fill="url(#funnel-spec)" />
          </g>
        );
      })}
    </svg>
  );
}
function TreemapSvg() {
  const rects = [
    { x: 10, y: 10, w: 130, h: 80 },
    { x: 150, y: 10, w: 80, h: 50 },
    { x: 150, y: 70, w: 80, h: 60 },
    { x: 10, y: 100, w: 60, h: 30 },
    { x: 80, y: 100, w: 60, h: 30 },
  ];
  return (
    <svg viewBox="0 0 240 140" className="h-24 w-full">
      <GlassBarDefs id="tree" />
      {rects.map((r, i) => (
        <g key={i} filter="url(#tree-glow)">
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#tree-fill)" rx="4" opacity={1 - i * 0.12} />
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#tree-depth)" rx="4" />
          <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#tree-spec)" rx="4" />
        </g>
      ))}
    </svg>
  );
}
function HeatmapSvg() {
  // Use a seeded layout instead of Math.random to avoid hydration mismatches
  const opacities = [0.85,0.35,0.6,0.2,0.9,0.45,0.3,0.75,0.5,0.15,
    0.4,0.7,0.25,0.8,0.55,0.1,0.65,0.35,0.9,0.5,
    0.3,0.6,0.15,0.45,0.8,0.7,0.25,0.55,0.4,0.85,
    0.5,0.2,0.7,0.35,0.6,0.9,0.15,0.45,0.75,0.3,
    0.65,0.4,0.8,0.55,0.25,0.7,0.1,0.5,0.85,0.35];
  return (
    <svg viewBox="0 0 240 140" className="h-24 w-full">
      <GlassBarDefs id="heat" />
      {Array.from({ length: 50 }).map((_, i) => {
        const x = (i % 10) * 22 + 10;
        const y = Math.floor(i / 10) * 22 + 15;
        return (
          <rect key={i} x={x} y={y} width="18" height="18" rx="3" fill="url(#heat-fill)" opacity={opacities[i]} />
        );
      })}
    </svg>
  );
}
function RadarSvg() {
  return (
    <svg viewBox="0 0 140 140" className="h-24 w-full">
      <GlassPieDefs id="radar" />
      {[50, 35, 20].map((r) => (
        <polygon
          key={r}
          points={`70,${70 - r} ${70 + r * 0.95},${70 - r * 0.3} ${70 + r * 0.58},${70 + r * 0.81} ${70 - r * 0.58},${70 + r * 0.81} ${70 - r * 0.95},${70 - r * 0.3}`}
          fill="none"
          stroke={hairlineColor}
          strokeWidth="0.5"
        />
      ))}
      <polygon
        points="70,30 108,56 96,110 46,105 34,50"
        fill="url(#radar-fill)"
        opacity="0.5"
        stroke="#1ef0b4"
        strokeWidth="1.5"
        filter="url(#radar-glow)"
      />
    </svg>
  );
}
function GaugeSvg() {
  return (
    <svg viewBox="0 0 160 100" className="h-24 w-full">
      <defs>
        <linearGradient id="gauge-glass" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#1ef0b4" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#14d89e" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0ab47e" stopOpacity="0.4" />
        </linearGradient>
        <filter id="gauge-glow" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#0ab47e" strokeWidth="14" strokeLinecap="round" opacity="0.1" />
      <path d="M 20 80 A 60 60 0 0 1 120 35" fill="none" stroke="url(#gauge-glass)" strokeWidth="14" strokeLinecap="round" filter="url(#gauge-glow)" />
      <text x="80" y="90" textAnchor="middle" fill="var(--m-text)" fontSize="22" fontFamily="var(--font-martel), serif" fontWeight="300">
        78%
      </text>
    </svg>
  );
}
function SankeySvg() {
  return (
    <svg viewBox="0 0 240 140" className="h-24 w-full">
      <GlassBarDefs id="sankey" />
      <g filter="url(#sankey-glow)">
        <rect x="10" y="20" width="14" height="100" fill="url(#sankey-fill)" rx="4" />
        <rect x="10" y="20" width="14" height="100" fill="url(#sankey-depth)" rx="4" />
        <rect x="10" y="20" width="14" height="100" fill="url(#sankey-spec)" rx="4" />
      </g>
      <g filter="url(#sankey-glow)">
        <rect x="216" y="15" width="14" height="50" fill="url(#sankey-fill)" rx="4" opacity="0.8" />
        <rect x="216" y="15" width="14" height="50" fill="url(#sankey-depth)" rx="4" />
        <rect x="216" y="15" width="14" height="50" fill="url(#sankey-spec)" rx="4" />
      </g>
      <g filter="url(#sankey-glow)">
        <rect x="216" y="75" width="14" height="45" fill="url(#sankey-fill)" rx="4" opacity="0.6" />
        <rect x="216" y="75" width="14" height="45" fill="url(#sankey-depth)" rx="4" />
        <rect x="216" y="75" width="14" height="45" fill="url(#sankey-spec)" rx="4" />
      </g>
      <path d="M24,30 C120,30 120,35 216,35" stroke="#14d89e" strokeWidth="28" fill="none" opacity="0.2" />
      <path d="M24,100 C120,100 120,95 216,95" stroke="#14d89e" strokeWidth="20" fill="none" opacity="0.12" />
    </svg>
  );
}
function GeoSvg() {
  // Use fixed positions/sizes to avoid hydration mismatches
  const dots = [
    {x:10,y:15,r:5},{x:34,y:15,r:3},{x:58,y:15,r:7},{x:82,y:15,r:4},{x:106,y:15,r:6},
    {x:130,y:15,r:3},{x:154,y:15,r:5},{x:178,y:15,r:8},{x:202,y:15,r:4},{x:226,y:15,r:3},
    {x:10,y:45,r:4},{x:34,y:45,r:6},{x:58,y:45,r:3},{x:82,y:45,r:7},{x:106,y:45,r:5},
    {x:130,y:45,r:4},{x:154,y:45,r:6},{x:178,y:45,r:3},{x:202,y:45,r:5},{x:226,y:45,r:7},
    {x:10,y:75,r:6},{x:34,y:75,r:4},{x:58,y:75,r:5},{x:82,y:75,r:3},{x:106,y:75,r:7},
    {x:130,y:75,r:5},{x:154,y:75,r:4},{x:178,y:75,r:6},{x:202,y:75,r:3},{x:226,y:75,r:5},
    {x:10,y:105,r:3},{x:34,y:105,r:7},{x:58,y:105,r:4},{x:82,y:105,r:5},{x:106,y:105,r:6},
    {x:130,y:105,r:3},{x:154,y:105,r:5},{x:178,y:105,r:4},{x:202,y:105,r:7},{x:226,y:105,r:4},
  ];
  const ops = [0.7,0.35,0.85,0.5,0.6,0.3,0.75,0.9,0.4,0.2,0.55,0.8,0.25,0.65,0.45,0.7,0.3,0.5,0.85,0.4,
    0.6,0.35,0.75,0.2,0.9,0.5,0.4,0.65,0.3,0.8,0.45,0.7,0.55,0.25,0.85,0.3,0.6,0.4,0.75,0.5];
  return (
    <svg viewBox="0 0 240 140" className="h-24 w-full">
      <defs>
        <radialGradient id="geo-dot">
          <stop offset="0%" stopColor="#1ef0b4" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#14d89e" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0ab47e" stopOpacity="0.08" />
        </radialGradient>
      </defs>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="url(#geo-dot)" opacity={ops[i]} />
      ))}
    </svg>
  );
}
function SunburstSvg() {
  return (
    <svg viewBox="0 0 140 140" className="h-24 w-full" style={{ filter: "drop-shadow(0 0 12px rgba(30,240,180,0.25))" }}>
      {/* Inner core */}
      <circle cx="70" cy="70" r="16" fill="#1ef0b4" opacity="0.7" />
      {/* Middle ring — two segments */}
      <circle cx="70" cy="70" r="30" fill="none" stroke="var(--m-hairline-strong)" strokeWidth="10" opacity="0.1" />
      <circle cx="70" cy="70" r="30" fill="none" stroke="#14d89e" strokeWidth="10" strokeDasharray="110 78" strokeLinecap="round" transform="rotate(-90 70 70)" />
      <circle cx="70" cy="70" r="30" fill="none" stroke="#0ab47e" strokeWidth="10" strokeDasharray="60 128" strokeLinecap="round" transform="rotate(120 70 70)" />
      {/* Outer ring — three segments */}
      <circle cx="70" cy="70" r="48" fill="none" stroke="var(--m-hairline-strong)" strokeWidth="12" opacity="0.08" />
      <circle cx="70" cy="70" r="48" fill="none" stroke="#1ef0b4" strokeWidth="12" strokeDasharray="80 221" strokeLinecap="round" transform="rotate(-90 70 70)" />
      <circle cx="70" cy="70" r="48" fill="none" stroke="#14d89e" strokeWidth="12" strokeDasharray="60 241" strokeLinecap="round" transform="rotate(60 70 70)" />
      <circle cx="70" cy="70" r="48" fill="none" stroke="#0a9068" strokeWidth="12" strokeDasharray="50 251" strokeLinecap="round" transform="rotate(165 70 70)" />
    </svg>
  );
}

const CHART_CARDS = [
  { id: "bar", label: "BAR", title: "Compare categories", visual: <BarSvg /> },
  { id: "line", label: "LINE", title: "Trends over time", visual: <LineSvg /> },
  { id: "area", label: "AREA", title: "Volume under a trend", visual: <AreaSvg /> },
  { id: "pie", label: "PIE", title: "Composition of a whole", visual: <PieSvg /> },
  { id: "donut", label: "DONUT", title: "KPI in context", visual: <DonutSvg /> },
  { id: "scatter", label: "SCATTER", title: "Correlation between metrics", visual: <ScatterSvg /> },
  { id: "funnel", label: "FUNNEL", title: "Step-by-step drop-off", visual: <FunnelSvg /> },
  { id: "treemap", label: "TREEMAP", title: "Nested comparison", visual: <TreemapSvg /> },
  { id: "heatmap", label: "HEATMAP", title: "Density across dimensions", visual: <HeatmapSvg /> },
  { id: "radar", label: "RADAR", title: "Multi-dimensional fit", visual: <RadarSvg /> },
  { id: "gauge", label: "GAUGE", title: "Progress toward a target", visual: <GaugeSvg /> },
  { id: "sankey", label: "SANKEY", title: "Flows between categories", visual: <SankeySvg /> },
  { id: "geo", label: "GEO", title: "Regional distribution", visual: <GeoSvg /> },
  { id: "sunburst", label: "SUNBURST", title: "Hierarchical composition", visual: <SunburstSvg /> },
];

function ChartGallery() {
  return (
    <section className="relative py-40 md:py-56">
      <div className="mx-auto mb-12 max-w-6xl px-6 md:px-12">
        <Reveal>
          <DisplayHeading size="lg" className="max-w-[18ch]">
            A growing library of charts.
          </DisplayHeading>
        </Reveal>
        <Reveal>
          <p className="mt-5 max-w-xl text-base text-[color:var(--m-text-secondary)]">
            Describe what you want to see and the AI picks the right visualisation — bar, line, sankey, geo, and everything in between. No config, no chart-picker dropdowns.
          </p>
        </Reveal>
        <Reveal>
          <Link href="/features/visualizations" className="btn-display mt-6">
            Explore visualisations
          </Link>
        </Reveal>
      </div>
      <HorizontalScroll cards={CHART_CARDS} />
    </section>
  );
}

/* ============================================================
   Numbered steps
   ============================================================ */

function HowItWorks() {
  return (
    <section className="px-6 py-40 md:px-12 md:py-56">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <DisplayHeading size="lg" className="mb-20 max-w-[16ch]">
            Three steps. One afternoon.
          </DisplayHeading>
        </Reveal>
        <NumberedSteps
          steps={[
            {
              number: "01",
              label: "CONNECT",
              title: "Link your sources.",
              description:
                "Sign in and authorise the connectors you already use — GA4, Google Ads, LinkedIn, or any combination. OAuth for most, guided BigQuery export setup for GA4.",
            },
            {
              number: "02",
              label: "ASK",
              title: "Type your first question.",
              description:
                "Plain English works. Meaning routes to the right data source, runs the query, and returns a chart with a summary in seconds.",
            },
            {
              number: "03",
              label: "SHARE",
              title: "Pin it or schedule it.",
              description:
                "Turn any answer into a dashboard widget or a scheduled email alert. Invite your team and give everyone a way to self-serve.",
            },
          ]}
        />
      </div>
    </section>
  );
}

/* ============================================================
   Comparison — side-by-side liquid-glass cards
   ============================================================ */

const COMPARE_ROWS = [
  { label: "Works out of the box", left: false, right: true },
  { label: "Cross-platform queries", left: false, right: true },
  { label: "AI-generated summaries", left: false, right: true },
  { label: "No SQL or metric-picking", left: false, right: true },
  { label: "Drag-and-drop layout", left: true, right: true },
  { label: "Scheduled email reports", left: true, right: true },
  { label: "Currency-aware revenue", left: false, right: true },
  { label: "Prompt-driven widgets", left: false, right: true },
];

function ComparisonSection() {
  return (
    <section className="px-6 py-40 md:px-12 md:py-56">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <DisplayHeading size="lg" className="mb-6 max-w-[18ch]">
            Meaning vs. dashboards.
          </DisplayHeading>
        </Reveal>
        <Reveal>
          <p className="mb-16 max-w-xl text-base text-[color:var(--m-text-secondary)]">
            Traditional BI tools need weeks of setup and constant maintenance. Meaning works the moment you connect.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left card — Dashboards (the old way) */}
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-[color:var(--m-hairline)] bg-[color:var(--m-surface)] p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--m-surface-elevated)]">
                  <BarChart3 className="h-4 w-4 text-[color:var(--m-text-muted)]" />
                </div>
                <span className="text-sm font-semibold text-[color:var(--m-text-muted)]">Traditional dashboards</span>
              </div>
              <div className="space-y-0">
                {COMPARE_ROWS.map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3 border-b border-[color:var(--m-hairline)] py-3.5 last:border-0"
                  >
                    {row.left ? (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--m-surface-elevated)]">
                        <Check className="h-3 w-3 text-[color:var(--m-text-muted)]" />
                      </div>
                    ) : (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--m-surface-elevated)]">
                        <Minus className="h-3 w-3 text-[color:var(--m-text-muted)] opacity-40" />
                      </div>
                    )}
                    <span className={`text-sm ${row.left ? "text-[color:var(--m-text)]" : "text-[color:var(--m-text-muted)] line-through decoration-[color:var(--m-hairline-strong)]"}`}>
                      {row.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Right card — Meaning (the new way) */}
          <Reveal delay={0.1}>
            <div className="liquid-glass relative overflow-hidden rounded-2xl p-6 md:p-8">
              <span className="liquid-glass-shimmer" aria-hidden />
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(30,240,180,0.12)" }}>
                  <Sparkles className="h-4 w-4 text-[color:var(--brand)]" />
                </div>
                <span className="text-sm font-semibold text-[color:var(--brand)]">Meaning</span>
              </div>
              <div className="space-y-0">
                {COMPARE_ROWS.map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3 py-3.5"
                    style={{ borderBottom: i < COMPARE_ROWS.length - 1 ? "1px solid rgba(30,240,180,0.08)" : "none" }}
                  >
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "rgba(30,240,180,0.15)" }}
                    >
                      <Check className="h-3 w-3 text-[color:var(--brand)]" />
                    </div>
                    <span className="text-sm text-[color:var(--m-text)]">{row.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FAQ
   ============================================================ */

const FAQS = [
  {
    q: "Which platforms does Meaning connect to?",
    a: "GA4 (via BigQuery export), Google Ads, Microsoft Ads, LinkedIn Company Pages, Mailchimp, and Google Search Console. Meta Ads is next on the roadmap.",
  },
  {
    q: "Is my data stored or used for training?",
    a: "We query your data on demand and never use it to train any model. Read-only access means we can't change anything in your source accounts either.",
  },
  {
    q: "What LLM powers Meaning?",
    a: "Anthropic's Claude. Chosen specifically for accuracy — Meaning is built to refuse rather than fabricate numbers.",
  },
  {
    q: "How do email alerts work?",
    a: "Write a prompt, pick a schedule and recipients, and Meaning runs it on its own cadence, emailing the answer with an AI summary and chart.",
  },
  {
    q: "How does team billing work?",
    a: "Per seat at $9.99/month. Admins can add or remove members at any time, prorated. Every team starts with a 14-day free trial.",
  },
  {
    q: "Can I self-host Meaning?",
    a: "Not today. Meaning is a managed cloud product so we can ship connectors and features quickly.",
  },
];

function FaqSection() {
  return (
    <section className="px-6 py-40 md:px-12 md:py-56">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <DisplayHeading size="lg" className="mb-16">
            Frequently asked.
          </DisplayHeading>
        </Reveal>
        <FaqAccordion
          faqs={FAQS.map((f) => ({ question: f.q, answer: f.a }))}
        />
      </div>
    </section>
  );
}

/* ============================================================
   Landing Page
   ============================================================ */

export default function LandingPage(_: { onTryBeta?: () => void } = {}) {
  return (
    <div className="marketing relative min-h-screen overflow-x-clip">
      <Navbar />

      <Hero />
      <TryItSection />
      <ConnectorGrid />
      <TelemetrySection />

      <section className="relative overflow-hidden px-6 py-40 md:px-12 md:py-56">
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <Reveal>
            <h2 className="shimmer-text display-lg mx-auto" style={{ textWrap: "balance" as never }}>
              Building marketing dashboards suck, never do it again.
            </h2>
          </Reveal>
        </div>
      </section>

      <ProductBento />

      <DashboardsDeepDive />

      <ChartGallery />

      <ComparisonSection />

      <FaqSection />

      <FullBleedStatement
        invert={false}
        submeta={
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-display">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        }
      >
        Never build another dashboard again.
      </FullBleedStatement>

      <Footer />
    </div>
  );
}
