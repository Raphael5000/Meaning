"use client";

import { useEffect, useState, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const card: React.CSSProperties = {
  background: "var(--m-surface)",
  border: "1px solid var(--border-color)",
  borderRadius: 16,
  padding: 24,
  overflow: "hidden",
  position: "relative",
};

const chatBubbleUser: React.CSSProperties = {
  background: "var(--user-bubble)",
  color: "var(--text-primary)",
  borderRadius: "16px 16px 4px 16px",
  padding: "10px 16px",
  maxWidth: "80%",
  alignSelf: "flex-end",
  fontSize: 14,
  lineHeight: 1.5,
};

const chatBubbleAi: React.CSSProperties = {
  color: "var(--text-primary)",
  borderRadius: "16px 16px 16px 4px",
  padding: "10px 16px",
  maxWidth: "90%",
  alignSelf: "flex-start",
  fontSize: 14,
  lineHeight: 1.5,
};

const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  color: "var(--text-muted)",
  marginBottom: 12,
};

/* ------------------------------------------------------------------ */
/*  Typing animation hook                                              */
/* ------------------------------------------------------------------ */

function useTypewriter(text: string, delay: number, speed = 35) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplay("");
    setDone(false);
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplay(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay, speed]);

  return { display, done };
}

/* ------------------------------------------------------------------ */
/*  Chat Intro Demo                                                    */
/* ------------------------------------------------------------------ */

function ChatIntroDemo() {
  const question = "How many sessions did we get this month?";
  const { display: typed, done: questionDone } = useTypewriter(question, 600, 30);
  const [showResponse, setShowResponse] = useState(false);

  useEffect(() => {
    if (questionDone) {
      const t = setTimeout(() => setShowResponse(true), 500);
      return () => clearTimeout(t);
    }
  }, [questionDone]);

  return (
    <div style={card}>
      <div style={label}>AI Chat</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 160,
        }}
      >
        {/* User message */}
        <div style={chatBubbleUser}>
          {typed}
          {!questionDone && <span className="docs-demo-cursor">|</span>}
        </div>

        {/* AI response */}
        {showResponse && (
          <div style={chatBubbleAi} className="docs-demo-fade-in">
            <div
              style={{
                background: "var(--m-surface-elevated)",
                borderRadius: 12,
                padding: 20,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: "var(--accent)",
                  lineHeight: 1.2,
                }}
              >
                12,847
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                Sessions this month
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--success)",
                  marginTop: 4,
                }}
              >
                +23% vs last month
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .docs-demo-cursor {
          animation: docs-demo-blink 0.8s step-end infinite;
          color: var(--accent);
          font-weight: 300;
        }
        @keyframes docs-demo-blink {
          50% { opacity: 0; }
        }
        .docs-demo-fade-in {
          animation: docs-demo-fade 0.4s ease-out both;
        }
        @keyframes docs-demo-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart Demo                                                         */
/* ------------------------------------------------------------------ */

function ChartDemo() {
  const question = "Show me daily users for the last 7 days";
  const { display: typed, done: questionDone } = useTypewriter(question, 400, 28);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    if (questionDone) {
      const t = setTimeout(() => setShowChart(true), 500);
      return () => clearTimeout(t);
    }
  }, [questionDone]);

  const bars = [64, 78, 52, 91, 85, 70, 96];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxBar = Math.max(...bars);

  return (
    <div style={card}>
      <div style={label}>AI Chat</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 220,
        }}
      >
        <div style={chatBubbleUser}>
          {typed}
          {!questionDone && <span className="docs-demo-cursor">|</span>}
        </div>

        {showChart && (
          <div style={chatBubbleAi} className="docs-demo-fade-in">
            <div
              style={{
                background: "var(--m-surface-elevated)",
                borderRadius: 12,
                padding: "16px 16px 8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 6,
                  height: 100,
                  justifyContent: "center",
                }}
              >
                {bars.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      flex: 1,
                    }}
                  >
                    <div
                      className="docs-demo-bar"
                      style={{
                        width: "100%",
                        maxWidth: 32,
                        height: `${(h / maxBar) * 80}px`,
                        background: "var(--accent)",
                        borderRadius: "4px 4px 0 0",
                        opacity: 0.85,
                        animationDelay: `${i * 80}ms`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  justifyContent: "center",
                  marginTop: 6,
                }}
              >
                {days.map((d) => (
                  <div
                    key={d}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 10,
                      color: "var(--text-muted)",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .docs-demo-cursor {
          animation: docs-demo-blink 0.8s step-end infinite;
          color: var(--accent);
          font-weight: 300;
        }
        @keyframes docs-demo-blink {
          50% { opacity: 0; }
        }
        .docs-demo-fade-in {
          animation: docs-demo-fade 0.4s ease-out both;
        }
        @keyframes docs-demo-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .docs-demo-bar {
          animation: docs-demo-grow 0.5s ease-out both;
        }
        @keyframes docs-demo-grow {
          from { transform: scaleY(0); transform-origin: bottom; }
          to   { transform: scaleY(1); transform-origin: bottom; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Platforms Demo                                                     */
/* ------------------------------------------------------------------ */

const platforms = [
  { name: "GA4", color: "#e37400" },
  { name: "Google Ads", color: "#4285f4" },
  { name: "Microsoft Ads", color: "#00a4ef" },
  { name: "LinkedIn", color: "#0a66c2" },
  { name: "Mailchimp", color: "#ffe01b" },
  { name: "Search Console", color: "#ea4335" },
];

function PlatformsDemo() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % platforms.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={card}>
      <div style={label}>Connected platforms</div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "center",
        }}
      >
        {platforms.map((p, i) => (
          <div
            key={p.name}
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid var(--border-color)",
              background:
                i === active ? p.color : "var(--m-surface-elevated)",
              color: i === active ? "#fff" : "var(--text-primary)",
              transition: "all 0.35s ease",
              boxShadow:
                i === active
                  ? `0 0 16px ${p.color}50`
                  : "none",
            }}
          >
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Question Examples Demo                                             */
/* ------------------------------------------------------------------ */

const exampleQuestions = [
  "How many sessions did we get this month?",
  "Show me daily users for the last 7 days",
  "Compare Google Ads vs Microsoft Ads clicks",
  "What are the top 10 landing pages?",
  "Plot weekly email open rates for Q1",
  "What is our LinkedIn follower count?",
];

function QuestionExamplesDemo() {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const question = exampleQuestions[idx];
    let charIndex = 0;
    setIsTyping(true);
    setText("");

    const typeInterval = setInterval(() => {
      charIndex++;
      setText(question.slice(0, charIndex));
      if (charIndex >= question.length) {
        clearInterval(typeInterval);
        setIsTyping(false);
        timeoutRef.current = setTimeout(() => {
          setIdx((prev) => (prev + 1) % exampleQuestions.length);
        }, 2000);
      }
    }, 40);

    return () => {
      clearInterval(typeInterval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [idx]);

  return (
    <div style={card}>
      <div style={label}>Try asking</div>
      <div
        style={{
          background: "var(--m-surface-elevated)",
          borderRadius: 12,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 44,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span style={{ fontSize: 14, color: "var(--text-primary)" }}>
          {text}
          {isTyping && <span className="docs-demo-cursor">|</span>}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 12,
          justifyContent: "center",
        }}
      >
        {exampleQuestions.map((_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background:
                i === idx ? "var(--accent)" : "var(--border-color)",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>

      <style>{`
        .docs-demo-cursor {
          animation: docs-demo-blink 0.8s step-end infinite;
          color: var(--accent);
          font-weight: 300;
        }
        @keyframes docs-demo-blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tips Demo (Before / After)                                         */
/* ------------------------------------------------------------------ */

function TipsDemo() {
  const [showAfter, setShowAfter] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowAfter(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={card}>
      <div style={label}>Better questions, better answers</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Before */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              background: "var(--m-surface-elevated)",
              fontSize: 14,
              color: "var(--text-muted)",
              textDecoration: "line-through",
              flex: 1,
            }}
          >
            How are we doing?
          </div>
        </div>

        {/* After */}
        {showAfter && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
            className="docs-demo-fade-in"
          >
            <div
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(16, 163, 127, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(16, 163, 127, 0.08)",
                border: "1px solid rgba(16, 163, 127, 0.2)",
                fontSize: 14,
                color: "var(--text-primary)",
                fontWeight: 500,
                flex: 1,
              }}
            >
              What was our bounce rate on /pricing last week?
            </div>
          </div>
        )}
      </div>

      <style>{`
        .docs-demo-fade-in {
          animation: docs-demo-fade 0.4s ease-out both;
        }
        @keyframes docs-demo-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Full Chat UI Demo                                                   */
/* ------------------------------------------------------------------ */

const FULL_DEMO_STEPS = [
  { type: "user" as const, text: "How many sessions did we get this month?", delay: 800 },
  { type: "thinking" as const, text: "Querying sessions...", delay: 1200 },
  { type: "scorecard" as const, value: "12,847", label: "Sessions this month", change: "+23%", delay: 800 },
  { type: "assistant" as const, text: "You had 12,847 sessions this month, up 23% compared to last month. Most of the growth came from organic search, which increased by 31%.", delay: 600 },
  { type: "pause" as const, text: "", delay: 2000 },
  { type: "user" as const, text: "Show me daily sessions as a chart", delay: 1500 },
  { type: "thinking" as const, text: "Building chart...", delay: 1000 },
  { type: "chart" as const, text: "", delay: 600 },
  { type: "assistant" as const, text: "Here are your daily sessions for the last 7 days. Thursday saw a spike at 2,180 sessions, likely driven by your latest blog post.", delay: 0 },
];

function FullChatDemo() {
  const [step, setStep] = useState(0);
  const [userTyping, setUserTyping] = useState("");
  const [typingTarget, setTypingTarget] = useState("");

  useEffect(() => {
    if (step >= FULL_DEMO_STEPS.length) {
      // Reset after a pause
      const t = setTimeout(() => {
        setStep(0);
        setUserTyping("");
        setTypingTarget("");
      }, 5000);
      return () => clearTimeout(t);
    }

    const s = FULL_DEMO_STEPS[step];

    if (s.type === "user") {
      // Typewriter for user messages
      setTypingTarget(s.text);
      setUserTyping("");
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setUserTyping(s.text.slice(0, i));
        if (i >= s.text.length) {
          clearInterval(interval);
          setTimeout(() => {
            setTypingTarget("");
            setStep((n) => n + 1);
          }, 400);
        }
      }, 30);
      return () => clearInterval(interval);
    }

    if (s.type === "pause") {
      const t = setTimeout(() => setStep((n) => n + 1), s.delay);
      return () => clearTimeout(t);
    }

    // All other steps just appear after their delay
    const t = setTimeout(() => setStep((n) => n + 1), s.delay);
    return () => clearTimeout(t);
  }, [step]);

  // Collect visible messages from completed steps
  const visibleMessages: typeof FULL_DEMO_STEPS = FULL_DEMO_STEPS.slice(0, step).filter(
    (s) => s.type !== "pause" && s.type !== "thinking"
  );
  const isThinking = step < FULL_DEMO_STEPS.length && FULL_DEMO_STEPS[step]?.type === "thinking";

  const bars = [410, 380, 420, 540, 490, 360, 450];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxBar = Math.max(...bars);

  return (
    <div style={{
      border: "1px solid var(--border-color)",
      borderRadius: 16,
      overflow: "hidden",
      background: "var(--bg-primary)",
      height: 480,
      display: "flex",
      fontSize: 13,
    }}>
      {/* Sidebar */}
      <div style={{
        width: 200,
        borderRight: "1px solid var(--border-color)",
        background: "var(--bg-secondary)",
        display: "flex",
        flexDirection: "column",
        padding: 0,
        flexShrink: 0,
      }}>
        {/* Account selector */}
        <div style={{
          padding: "14px 12px 10px",
          borderBottom: "1px solid var(--border-color)",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
            }}>DE</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Decentral Energy</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Pro plan</div>
            </div>
          </div>
        </div>

        {/* Nav buttons */}
        <div style={{ padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { icon: "M12 20h9", icon2: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z", label: "New chat", active: false },
            { icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9", icon2: "M13.73 21a2 2 0 0 1-3.46 0", label: "Alerts", active: false },
            { icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z", icon2: "", label: "Dashboards", active: false },
          ].map((item) => (
            <div key={item.label} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: 8,
              color: "var(--text-muted)",
              fontSize: 12,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
                {item.icon2 && <path d={item.icon2} />}
              </svg>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Chat history */}
        <div style={{ padding: "12px 8px 0", flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", padding: "0 10px", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Chat history
          </div>
          {["Monthly traffic review", "Top landing pages", "Ad spend analysis"].map((title, i) => (
            <div key={title} style={{
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: 12,
              color: i === 0 ? "var(--text-primary)" : "var(--text-muted)",
              background: i === 0 ? "var(--m-surface-elevated, rgba(128,128,128,0.08))" : "transparent",
              marginBottom: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {title}
            </div>
          ))}
        </div>

        {/* User avatar */}
        <div style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <div style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "var(--m-surface-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-muted)",
          }}>MQ</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Matt Quarta</div>
        </div>
      </div>

      {/* Main chat area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}>
        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          {visibleMessages.map((msg, i) => {
            if (msg.type === "user") {
              return (
                <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{
                    background: "var(--user-bubble)",
                    color: "var(--text-primary)",
                    borderRadius: "14px 14px 4px 14px",
                    padding: "8px 14px",
                    maxWidth: "75%",
                    fontSize: 13,
                    border: "1px solid var(--border-color)",
                  }} className="docs-demo-fade-in">{msg.text}</div>
                </div>
              );
            }
            if (msg.type === "scorecard") {
              return (
                <div key={i} className="docs-demo-fade-in" style={{ display: "flex" }}>
                  <div style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 14,
                    padding: "14px 18px",
                    display: "inline-flex",
                    flexDirection: "column",
                  }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>{msg.value}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{msg.label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--success)", marginTop: 2 }}>↑ +{msg.change}</span>
                  </div>
                </div>
              );
            }
            if (msg.type === "chart") {
              return (
                <div key={i} className="docs-demo-fade-in" style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 14,
                  padding: 16,
                  maxWidth: "85%",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Daily Sessions</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                    {bars.map((h, j) => (
                      <div key={j} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div className="docs-demo-bar" style={{
                          width: "100%",
                          height: `${(h / maxBar) * 65}px`,
                          background: "var(--accent)",
                          borderRadius: "3px 3px 0 0",
                          opacity: 0.85,
                          animationDelay: `${j * 60}ms`,
                        }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    {days.map((d) => (
                      <div key={d} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "var(--text-muted)" }}>{d}</div>
                    ))}
                  </div>
                </div>
              );
            }
            if (msg.type === "assistant") {
              return (
                <div key={i} style={{ maxWidth: "85%" }}>
                  <div style={{
                    color: "var(--text-primary)",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "14px 14px 14px 4px",
                    padding: "8px 14px",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }} className="docs-demo-fade-in">{msg.text}</div>
                </div>
              );
            }
            return null;
          })}

          {/* Typing user message */}
          {typingTarget && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{
                background: "var(--user-bubble)",
                color: "var(--text-primary)",
                borderRadius: "14px 14px 4px 14px",
                padding: "8px 14px",
                maxWidth: "75%",
                fontSize: 13,
                border: "1px solid var(--border-color)",
              }}>
                {userTyping}<span className="docs-demo-cursor">|</span>
              </div>
            </div>
          )}

          {/* Thinking indicator */}
          {isThinking && (
            <div className="docs-demo-fade-in" style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <div className="docs-demo-dots" style={{ display: "flex", gap: 4 }}>
                <div className="docs-demo-dot" style={{ animationDelay: "0ms" }} />
                <div className="docs-demo-dot" style={{ animationDelay: "150ms" }} />
                <div className="docs-demo-dot" style={{ animationDelay: "300ms" }} />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {FULL_DEMO_STEPS[step]?.text}
              </span>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{
          borderTop: "1px solid var(--border-color)",
          padding: "12px 16px",
        }}>
          <div style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Ask about your analytics...</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
        </div>
      </div>

      <style>{`
        .docs-demo-cursor { animation: docs-demo-blink 0.8s step-end infinite; color: var(--accent); font-weight: 300; }
        @keyframes docs-demo-blink { 50% { opacity: 0; } }
        .docs-demo-fade-in { animation: docs-demo-fade 0.4s ease-out both; }
        @keyframes docs-demo-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .docs-demo-bar { animation: docs-demo-grow 0.5s ease-out both; }
        @keyframes docs-demo-grow { from { transform: scaleY(0); transform-origin: bottom; } to { transform: scaleY(1); transform-origin: bottom; } }
        .docs-demo-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
          animation: docs-demo-bounce 1s ease-in-out infinite;
        }
        @keyframes docs-demo-bounce { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.1); } }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Full Dashboard Demo                                                */
/* ------------------------------------------------------------------ */

function FullDashboardDemo() {
  const [visibleWidgets, setVisibleWidgets] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 4; i++) {
      timers.push(setTimeout(() => setVisibleWidgets(i), 400 + i * 350));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const bars = [42, 68, 55, 82, 74, 60, 90];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxBar = Math.max(...bars);

  const tableRows = [
    { page: "/blog/analytics-guide", sessions: "2,841", bounce: "32%" },
    { page: "/pricing", sessions: "1,673", bounce: "41%" },
    { page: "/features", sessions: "1,290", bounce: "28%" },
    { page: "/docs/getting-started", sessions: "987", bounce: "19%" },
  ];

  const gripIcon = (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--text-muted)" opacity={0.5}>
      <circle cx="3" cy="2" r="1" /><circle cx="7" cy="2" r="1" />
      <circle cx="3" cy="5" r="1" /><circle cx="7" cy="5" r="1" />
      <circle cx="3" cy="8" r="1" /><circle cx="7" cy="8" r="1" />
    </svg>
  );

  const menuIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--text-muted)">
      <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
    </svg>
  );

  const widgetHeader = (title: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {gripIcon}
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{title}</span>
      </div>
      {menuIcon}
    </div>
  );

  return (
    <div style={{
      border: "1px solid var(--border-color)",
      borderRadius: 16,
      overflow: "hidden",
      background: "var(--bg-primary)",
      height: 480,
      display: "flex",
      flexDirection: "column",
      fontSize: 13,
    }}>
      {/* Header bar */}
      <div style={{
        borderBottom: "1px solid var(--border-color)",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--bg-secondary)",
        flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>Marketing Overview</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", background: "var(--m-surface)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "4px 10px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          Last 28 days
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--accent)", borderRadius: 8, padding: "4px 12px", whiteSpace: "nowrap" }}>+ Add Widget</div>
      </div>

      {/* Widget grid */}
      <div style={{ flex: 1, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 12, overflow: "hidden" }}>
        {/* Widget 1: Sessions scorecard */}
        <div className="docs-dash-widget" style={{
          background: "var(--m-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          padding: 14,
          opacity: visibleWidgets >= 1 ? 1 : 0,
          transform: visibleWidgets >= 1 ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}>
          {widgetHeader("Sessions")}
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>12,847</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Sessions</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)", marginTop: 4 }}>+23%</div>
        </div>

        {/* Widget 2: Bar chart */}
        <div className="docs-dash-widget" style={{
          background: "var(--m-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          padding: 14,
          opacity: visibleWidgets >= 2 ? 1 : 0,
          transform: visibleWidgets >= 2 ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}>
          {widgetHeader("Daily Sessions")}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{
                  width: "100%",
                  height: `${(h / maxBar) * 65}px`,
                  background: "var(--accent)",
                  borderRadius: "3px 3px 0 0",
                  opacity: 0.85,
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            {days.map((d) => (
              <div key={d} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "var(--text-muted)" }}>{d}</div>
            ))}
          </div>
        </div>

        {/* Widget 3: Ad Spend scorecard */}
        <div className="docs-dash-widget" style={{
          background: "var(--m-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          padding: 14,
          opacity: visibleWidgets >= 3 ? 1 : 0,
          transform: visibleWidgets >= 3 ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}>
          {widgetHeader("Ad Spend")}
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>R4,230.50</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Ad Spend</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--error)", marginTop: 4 }}>-8%</div>
        </div>

        {/* Widget 4: Table */}
        <div className="docs-dash-widget" style={{
          background: "var(--m-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          padding: 14,
          opacity: visibleWidgets >= 4 ? 1 : 0,
          transform: visibleWidgets >= 4 ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
          overflow: "hidden",
        }}>
          {widgetHeader("Top Pages")}
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                <th style={{ fontWeight: 600, paddingBottom: 6 }}>Page</th>
                <th style={{ fontWeight: 600, paddingBottom: 6, textAlign: "right" }}>Sessions</th>
                <th style={{ fontWeight: 600, paddingBottom: 6, textAlign: "right" }}>Bounce</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.page} style={{ borderTop: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "5px 4px 5px 0", color: "var(--text-primary)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.page}</td>
                  <td style={{ padding: "5px 0", textAlign: "right", color: "var(--text-primary)" }}>{row.sessions}</td>
                  <td style={{ padding: "5px 0", textAlign: "right", color: "var(--text-muted)" }}>{row.bounce}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Widget Types Demo                                                   */
/* ------------------------------------------------------------------ */

function WidgetTypesDemo() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setActive((prev) => (prev + 1) % 3), 2000);
    return () => clearInterval(interval);
  }, []);

  const miniBars = [40, 65, 50, 80, 60];

  return (
    <div style={card}>
      <div style={label}>Widget types</div>
      <div style={{ display: "flex", gap: 12 }}>
        {/* Scorecard */}
        <div style={{
          flex: 1,
          background: "var(--m-surface-elevated, var(--bg-secondary))",
          border: active === 0 ? "1.5px solid var(--accent)" : "1px solid var(--border-color)",
          borderRadius: 12,
          padding: 16,
          textAlign: "center",
          transition: "all 0.35s ease",
          boxShadow: active === 0 ? "0 0 16px rgba(16,163,127,0.15)" : "none",
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>8,421</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Users</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", marginTop: 4 }}>+12%</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginTop: 10, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Scorecard</div>
        </div>

        {/* Chart */}
        <div style={{
          flex: 1,
          background: "var(--m-surface-elevated, var(--bg-secondary))",
          border: active === 1 ? "1.5px solid var(--accent)" : "1px solid var(--border-color)",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transition: "all 0.35s ease",
          boxShadow: active === 1 ? "0 0 16px rgba(16,163,127,0.15)" : "none",
        }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56 }}>
            {miniBars.map((h, i) => (
              <div key={i} style={{
                width: 14,
                height: `${(h / 80) * 48}px`,
                background: "var(--accent)",
                borderRadius: "3px 3px 0 0",
                opacity: 0.85,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Daily trend</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginTop: 10, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Chart</div>
        </div>

        {/* Table */}
        <div style={{
          flex: 1,
          background: "var(--m-surface-elevated, var(--bg-secondary))",
          border: active === 2 ? "1.5px solid var(--accent)" : "1px solid var(--border-color)",
          borderRadius: 12,
          padding: 16,
          transition: "all 0.35s ease",
          boxShadow: active === 2 ? "0 0 16px rgba(16,163,127,0.15)" : "none",
        }}>
          {[
            { label: "/blog", value: "2,841" },
            { label: "/pricing", value: "1,673" },
            { label: "/features", value: "1,290" },
          ].map((row, i) => (
            <div key={row.label} style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "5px 0",
              borderTop: i > 0 ? "1px solid var(--border-color)" : "none",
              fontSize: 12,
            }}>
              <span style={{ color: "var(--text-primary)" }}>{row.label}</span>
              <span style={{ color: "var(--text-muted)" }}>{row.value}</span>
            </div>
          ))}
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginTop: 10, textTransform: "uppercase" as const, letterSpacing: "0.05em", textAlign: "center" }}>Table</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Drag & Resize Demo                                                  */
/* ------------------------------------------------------------------ */

function DragResizeDemo() {
  return (
    <div style={card}>
      <div style={label}>Drag &amp; resize widgets</div>
      <div style={{ position: "relative", height: 180, overflow: "hidden" }}>
        {/* Widget A */}
        <div className="docs-drag-widget-a" style={{
          position: "absolute",
          top: 0,
          width: "calc(50% - 6px)",
          height: 80,
          background: "var(--m-surface-elevated, var(--bg-secondary))",
          border: "1px solid var(--border-color)",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 11,
          boxSizing: "border-box" as const,
        }}>
          <div style={{ fontWeight: 600, color: "var(--text-muted)", fontSize: 10, marginBottom: 4 }}>Sessions</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>12,847</div>
        </div>

        {/* Widget B */}
        <div className="docs-drag-widget-b" style={{
          position: "absolute",
          top: 0,
          width: "calc(50% - 6px)",
          height: 80,
          background: "var(--m-surface-elevated, var(--bg-secondary))",
          border: "1px solid var(--border-color)",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 11,
          boxSizing: "border-box" as const,
        }}>
          <div style={{ fontWeight: 600, color: "var(--text-muted)", fontSize: 10, marginBottom: 4 }}>Ad Spend</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>R4,230</div>
        </div>

        {/* Animated cursor */}
        <div className="docs-drag-cursor" style={{
          position: "absolute",
          width: 20,
          height: 20,
          zIndex: 10,
          pointerEvents: "none",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)" opacity={0.9}>
            <path d="M4 1l16 11.5-6.6 1.1L18 22l-3.5 1.5-4.5-8.5L4 19z"/>
          </svg>
        </div>
      </div>

      <style>{`
        .docs-drag-widget-a {
          left: 0;
          animation: docs-drag-swap-a 6s ease-in-out infinite;
        }
        .docs-drag-widget-b {
          left: calc(50% + 6px);
          animation: docs-drag-swap-b 6s ease-in-out infinite;
        }
        .docs-drag-cursor {
          animation: docs-drag-cursor-move 6s ease-in-out infinite;
        }
        @keyframes docs-drag-swap-a {
          0%, 15% { left: 0; width: calc(50% - 6px); height: 80px; }
          30%, 50% { left: calc(50% + 6px); width: calc(50% - 6px); height: 80px; }
          65%, 85% { left: calc(50% + 6px); width: calc(50% - 6px); height: 80px; }
          100% { left: 0; width: calc(50% - 6px); height: 80px; }
        }
        @keyframes docs-drag-swap-b {
          0%, 15% { left: calc(50% + 6px); width: calc(50% - 6px); height: 80px; }
          30%, 50% { left: 0; width: calc(50% - 6px); height: 80px; }
          65%, 85% { left: 0; width: calc(50% - 6px); height: 80px; }
          100% { left: calc(50% + 6px); width: calc(50% - 6px); height: 80px; }
        }
        @keyframes docs-drag-cursor-move {
          0% { top: 30px; left: 25%; opacity: 0; }
          5% { top: 30px; left: 25%; opacity: 1; }
          15% { top: 30px; left: 25%; }
          30% { top: 30px; left: 70%; }
          50% { top: 30px; left: 70%; opacity: 1; }
          55% { top: 70px; left: calc(100% - 20px); opacity: 1; }
          70% { top: 70px; left: calc(100% - 20px); opacity: 1; }
          85% { top: 70px; left: calc(100% - 20px); opacity: 0; }
          100% { top: 30px; left: 25%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Date Range Demo                                                     */
/* ------------------------------------------------------------------ */

function DateRangeDemo() {
  const [phase, setPhase] = useState(0);
  // 0 = idle, 1 = dropdown open, 2 = selected "7d", 3 = skeleton flash, 4 = done

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1200),
      setTimeout(() => setPhase(2), 2600),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 4000),
      setTimeout(() => setPhase(0), 6500),
    ];
    // Restart loop
    const loop = setInterval(() => {
      setPhase(0);
      const lt = [
        setTimeout(() => setPhase(1), 1200),
        setTimeout(() => setPhase(2), 2600),
        setTimeout(() => setPhase(3), 3200),
        setTimeout(() => setPhase(4), 4000),
        setTimeout(() => setPhase(0), 6500),
      ];
      timers.push(...lt);
    }, 7500);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, []);

  const buttonText = phase >= 2 ? "Last 7 days" : "Last 28 days";

  return (
    <div style={card}>
      <div style={label}>Date range picker</div>
      <div style={{ position: "relative", minHeight: 220 }}>
        {/* Date button */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "var(--text-primary)",
          background: "var(--m-surface-elevated, var(--bg-secondary))",
          border: phase >= 1 && phase < 3 ? "1.5px solid var(--accent)" : "1px solid var(--border-color)",
          borderRadius: 8,
          padding: "6px 14px",
          transition: "all 0.2s ease",
          fontWeight: 500,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          {buttonText}
        </div>

        {/* Dropdown */}
        {phase >= 1 && phase < 3 && (
          <div className="docs-demo-fade-in" style={{
            position: "absolute",
            top: 42,
            left: 0,
            background: "var(--m-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 5,
            width: 220,
          }}>
            {[
              { label: "Last 7 days", active: phase >= 2 },
              { label: "Last 28 days", active: false },
              { label: "Last 90 days", active: false },
            ].map((opt) => (
              <div key={opt.label} style={{
                padding: "7px 10px",
                borderRadius: 6,
                fontSize: 12,
                color: opt.active ? "var(--accent)" : "var(--text-primary)",
                background: opt.active ? "rgba(16,163,127,0.08)" : "transparent",
                fontWeight: opt.active ? 600 : 400,
                transition: "all 0.2s ease",
              }}>
                {opt.label}
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border-color)", margin: "6px 0", padding: 0 }} />
            {/* Mini calendar */}
            <div style={{ padding: "4px 6px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textAlign: "center" }}>April 2026</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {["M","T","W","T","F","S","S"].map((d, i) => (
                  <div key={i} style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center" }}>{d}</div>
                ))}
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={`e${i}`} />
                ))}
                {Array.from({ length: 16 }, (_, i) => i + 1).map((d) => (
                  <div key={d} style={{
                    fontSize: 10,
                    textAlign: "center",
                    padding: "2px 0",
                    borderRadius: 4,
                    color: d <= 7 && phase >= 2 ? "var(--accent)" : "var(--text-primary)",
                    background: d <= 7 && phase >= 2 ? "rgba(16,163,127,0.1)" : "transparent",
                    fontWeight: d <= 7 && phase >= 2 ? 600 : 400,
                  }}>{d}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Skeleton flash */}
        {phase === 3 && (
          <div style={{ marginTop: 56, display: "flex", gap: 10 }}>
            {[1, 2].map((k) => (
              <div key={k} className="docs-date-skeleton" style={{
                flex: 1,
                height: 64,
                borderRadius: 10,
                background: "var(--border-color)",
                opacity: 0.5,
              }} />
            ))}
          </div>
        )}

        {/* Refreshed widgets */}
        {phase === 4 && (
          <div className="docs-demo-fade-in" style={{ marginTop: 56, display: "flex", gap: 10 }}>
            <div style={{
              flex: 1,
              background: "var(--m-surface-elevated, var(--bg-secondary))",
              border: "1px solid var(--border-color)",
              borderRadius: 10,
              padding: 12,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>Sessions</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>3,241</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--success)", marginTop: 2 }}>+18%</div>
            </div>
            <div style={{
              flex: 1,
              background: "var(--m-surface-elevated, var(--bg-secondary))",
              border: "1px solid var(--border-color)",
              borderRadius: 10,
              padding: 12,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>Bounce Rate</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>34.2%</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--error)", marginTop: 2 }}>+2.1%</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .docs-demo-fade-in {
          animation: docs-demo-fade 0.4s ease-out both;
        }
        @keyframes docs-demo-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .docs-date-skeleton {
          animation: docs-date-pulse 0.6s ease-in-out infinite alternate;
        }
        @keyframes docs-date-pulse {
          from { opacity: 0.3; }
          to   { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart Types Demo                                                    */
/* ------------------------------------------------------------------ */

const chartTypeCard: React.CSSProperties = {
  background: "var(--m-surface-elevated, var(--bg-secondary))",
  border: "1px solid var(--border-color)",
  borderRadius: 12,
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  overflow: "hidden",
};

function ChartTypesDemo() {
  return (
    <div style={card}>
      <div style={label}>Chart Types</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Bar Chart */}
        <div style={chartTypeCard}>
          <div style={{ width: "100%", height: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6 }}>
            {[65, 85, 45, 95, 55, 75].map((h, i) => (
              <div
                key={i}
                className="docs-ct-bar"
                style={{
                  width: 14,
                  height: `${h}%`,
                  background: "var(--accent)",
                  borderRadius: "3px 3px 0 0",
                  opacity: 0.8 + (i % 2) * 0.2,
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Bar Chart</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3, marginTop: 2 }}>
              Best for: Comparing categories — top pages, campaigns, keywords
            </div>
          </div>
        </div>

        {/* Line Chart */}
        <div style={chartTypeCard}>
          <div style={{ width: "100%", height: 100, position: "relative" }}>
            <svg width="100%" height="100%" viewBox="0 0 140 80" preserveAspectRatio="none" style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="docs-ct-line-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,60 C20,55 25,30 40,35 C55,40 60,15 80,10 C100,5 110,25 120,20 C130,15 135,25 140,22"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="docs-ct-line-path"
              />
              <path
                d="M0,60 C20,55 25,30 40,35 C55,40 60,15 80,10 C100,5 110,25 120,20 C130,15 135,25 140,22 L140,80 L0,80 Z"
                fill="url(#docs-ct-line-fill)"
                className="docs-ct-line-area"
              />
              {[[0,60],[40,35],[80,10],[120,20],[140,22]].map(([cx,cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="3" fill="var(--accent)" className="docs-ct-line-dot" style={{ animationDelay: `${1 + i * 0.15}s` }} />
              ))}
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Line Chart</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3, marginTop: 2 }}>
              Best for: Trends over time — daily sessions, weekly spend
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div style={chartTypeCard}>
          <div style={{ width: "100%", height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="80" height="80" viewBox="0 0 80 80" className="docs-ct-pie-svg">
              {/* Donut segments using stroke-dasharray on circles */}
              {/* Total circumference = 2 * PI * 28 ≈ 175.93 */}
              <circle cx="40" cy="40" r="28" fill="none" stroke="var(--accent)" strokeWidth="12"
                strokeDasharray="70.37 105.56" strokeDashoffset="0"
                transform="rotate(-90 40 40)" opacity="0.9" />
              <circle cx="40" cy="40" r="28" fill="none" stroke="#3b82f6" strokeWidth="12"
                strokeDasharray="43.98 131.95" strokeDashoffset="-70.37"
                transform="rotate(-90 40 40)" opacity="0.85" />
              <circle cx="40" cy="40" r="28" fill="none" stroke="#f97316" strokeWidth="12"
                strokeDasharray="35.19 140.74" strokeDashoffset="-114.35"
                transform="rotate(-90 40 40)" opacity="0.8" />
              <circle cx="40" cy="40" r="28" fill="none" stroke="var(--text-muted)" strokeWidth="12"
                strokeDasharray="26.39 149.54" strokeDashoffset="-149.54"
                transform="rotate(-90 40 40)" opacity="0.4" />
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Pie Chart</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3, marginTop: 2 }}>
              Best for: Proportions — traffic by device, channel split
            </div>
          </div>
        </div>

        {/* Sankey Diagram */}
        <div style={chartTypeCard}>
          <div style={{ width: "100%", height: 100, position: "relative" }}>
            <svg width="100%" height="100%" viewBox="0 0 140 80" preserveAspectRatio="xMidYMid meet">
              {/* Source nodes (left) */}
              <rect x="0" y="4" width="10" height="22" rx="3" fill="var(--accent)" opacity="0.9" />
              <rect x="0" y="30" width="10" height="18" rx="3" fill="var(--accent)" opacity="0.7" />
              <rect x="0" y="54" width="10" height="22" rx="3" fill="var(--accent)" opacity="0.5" />
              {/* Target nodes (right) */}
              <rect x="130" y="8" width="10" height="30" rx="3" fill="var(--accent)" opacity="0.85" />
              <rect x="130" y="46" width="10" height="28" rx="3" fill="var(--accent)" opacity="0.65" />
              {/* Flow paths */}
              <path d="M10,10 C60,10 80,18 130,18" fill="none" stroke="var(--accent)" strokeWidth="8" opacity="0.2" strokeLinecap="round" className="docs-ct-sankey-path" style={{ animationDelay: "0s" }} />
              <path d="M10,20 C60,20 80,55 130,55" fill="none" stroke="var(--accent)" strokeWidth="6" opacity="0.15" strokeLinecap="round" className="docs-ct-sankey-path" style={{ animationDelay: "0.2s" }} />
              <path d="M10,38 C60,38 80,28 130,28" fill="none" stroke="var(--accent)" strokeWidth="5" opacity="0.18" strokeLinecap="round" className="docs-ct-sankey-path" style={{ animationDelay: "0.4s" }} />
              <path d="M10,60 C60,60 80,60 130,60" fill="none" stroke="var(--accent)" strokeWidth="7" opacity="0.15" strokeLinecap="round" className="docs-ct-sankey-path" style={{ animationDelay: "0.3s" }} />
              <path d="M10,70 C60,70 80,22 130,22" fill="none" stroke="var(--accent)" strokeWidth="4" opacity="0.12" strokeLinecap="round" className="docs-ct-sankey-path" style={{ animationDelay: "0.5s" }} />
            </svg>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Sankey</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3, marginTop: 2 }}>
              Best for: User flows — page-to-page navigation paths
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Bar Chart - grow from bottom */
        .docs-ct-bar {
          animation: docs-ct-bar-grow 0.8s ease-out both;
          transform-origin: bottom;
        }
        @keyframes docs-ct-bar-grow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }

        /* Line Chart - draw path */
        .docs-ct-line-path {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: docs-ct-line-draw 1.5s ease-out 0.3s forwards;
        }
        .docs-ct-line-area {
          opacity: 0;
          animation: docs-ct-line-area-in 0.5s ease-out 1.5s forwards;
        }
        .docs-ct-line-dot {
          opacity: 0;
          animation: docs-ct-dot-in 0.3s ease-out forwards;
        }
        @keyframes docs-ct-line-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes docs-ct-line-area-in {
          to { opacity: 1; }
        }
        @keyframes docs-ct-dot-in {
          to { opacity: 1; }
        }

        /* Pie Chart - rotate in */
        .docs-ct-pie-svg {
          animation: docs-ct-pie-spin 1s ease-out 0.2s both;
        }
        @keyframes docs-ct-pie-spin {
          from { transform: rotate(-90deg); opacity: 0; }
          to { transform: rotate(0deg); opacity: 1; }
        }

        /* Sankey - fade in flow paths */
        .docs-ct-sankey-path {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: docs-ct-sankey-draw 1.2s ease-out forwards;
        }
        @keyframes docs-ct-sankey-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

type DemoType =
  | "chat-intro"
  | "chart-demo"
  | "platforms"
  | "question-examples"
  | "tips"
  | "full-chat"
  | "full-dashboard"
  | "widget-types"
  | "drag-resize"
  | "date-range"
  | "chart-types";

export function DocsDemo({ type }: { type: DemoType }) {
  switch (type) {
    case "chat-intro":
      return <ChatIntroDemo />;
    case "chart-demo":
      return <ChartDemo />;
    case "platforms":
      return <PlatformsDemo />;
    case "question-examples":
      return <QuestionExamplesDemo />;
    case "tips":
      return <TipsDemo />;
    case "full-chat":
      return <FullChatDemo />;
    case "full-dashboard":
      return <FullDashboardDemo />;
    case "widget-types":
      return <WidgetTypesDemo />;
    case "drag-resize":
      return <DragResizeDemo />;
    case "date-range":
      return <DateRangeDemo />;
    case "chart-types":
      return <ChartTypesDemo />;
    default:
      return null;
  }
}
