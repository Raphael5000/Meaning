"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen"
      style={{ background: "var(--page-bg)" }}
    >
      {/* Background orbs */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
      >
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

      <section className="relative z-10 flex flex-col items-center px-6 pt-16 pb-24 text-center">
        <div className="mx-auto w-full max-w-lg">
          <h1
            className="mb-4 text-4xl font-bold md:text-5xl"
            style={{ color: "var(--text-primary)" }}
          >
            Get in touch
          </h1>
          <p
            className="mx-auto mb-12 max-w-md text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Interested in Meaning for teams? Drop us a message and
            we&apos;ll get back to you.
          </p>

          <div
            className="relative overflow-hidden rounded-2xl p-8 text-left"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="card-noise" aria-hidden />
            <div className="relative z-10">
              {success ? (
                <div className="py-8 text-center">
                  <p
                    className="mb-2 text-lg font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    Message sent!
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Thanks for reaching out. We&apos;ll get back to you soon.
                  </p>
                  <a
                    href="/docs"
                    className="btn-primary-gradient mt-6 inline-block font-semibold"
                    style={{ boxShadow: "var(--shadow-button)" }}
                  >
                    Explore our docs
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1.5 block text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--accent)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--border-color)")
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--accent)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--border-color)")
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="mb-1.5 block text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Subject
                    </label>
                    <input
                      id="subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What's this about?"
                      required
                      className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--accent)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--border-color)")
                      }
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="mb-1.5 block text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us more..."
                      required
                      rows={5}
                      className="w-full resize-none rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--accent)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--border-color)")
                      }
                    />
                  </div>

                  {error && (
                    <p
                      className="text-sm"
                      style={{ color: "var(--error)" }}
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary-gradient w-full font-semibold"
                    style={{ boxShadow: "var(--shadow-button)" }}
                  >
                    {loading ? "Sending..." : "Send message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer
        className="px-6 py-8 md:px-12"
        style={{ borderTop: "1px solid var(--border-color)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
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
            <Link href="/terms" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              Terms
            </Link>
            <span>Copyright © 2026 - All rights reserved | A product by <a href="https://www.hivory.io" target="_blank" rel="noopener noreferrer" className="transition-colors hover:opacity-80" style={{ color: "var(--text-secondary)" }}>Hivory</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
