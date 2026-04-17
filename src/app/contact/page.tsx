"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DisplayHeading } from "@/components/marketing/system/DisplayHeading";
import { Reveal } from "@/components/marketing/system/Reveal";
import { DottedGrid } from "@/components/marketing/system/Backgrounds";

const inputClass =
  "w-full rounded-lg bg-[color:var(--m-surface-elevated)] px-4 py-2.5 text-sm text-[color:var(--m-text)] outline-none transition-colors border border-[color:var(--m-hairline)] focus:border-[color:var(--brand)]";

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
      className="marketing relative min-h-screen"
      style={{ background: "var(--m-bg)" }}
    >
      <DottedGrid />

      <Navbar />

      <section className="relative z-10 flex flex-col items-center px-6 pt-32 pb-24 md:pt-40 text-center">
        <div className="mx-auto w-full max-w-lg">
          <Reveal>
            <DisplayHeading size="xl" as="h1" className="mb-4">
              Get in touch
            </DisplayHeading>
            <p className="mx-auto mb-12 max-w-md text-lg text-[color:var(--m-text-secondary)]">
              Interested in Meaning for your company? Drop us a message and
              we&apos;ll get back to you.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="liquid-glass relative overflow-hidden rounded-2xl p-8 text-left">
              <span className="liquid-glass-shimmer" aria-hidden />
              <div className="relative z-10">
                {success ? (
                  <div className="py-8 text-center">
                    <p className="mb-2 text-lg font-semibold text-[color:var(--brand)]">
                      Message sent!
                    </p>
                    <p className="text-sm text-[color:var(--m-text-secondary)]">
                      Thanks for reaching out. We&apos;ll get back to you soon.
                    </p>
                    <a
                      href="/docs"
                      className="btn-display mt-6 inline-block font-semibold"
                    >
                      Explore our docs
                    </a>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="mb-1.5 block text-sm font-medium text-[color:var(--m-text-secondary)]"
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
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="mb-1.5 block text-sm font-medium text-[color:var(--m-text-secondary)]"
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
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="subject"
                        className="mb-1.5 block text-sm font-medium text-[color:var(--m-text-secondary)]"
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
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="mb-1.5 block text-sm font-medium text-[color:var(--m-text-secondary)]"
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
                        className={`${inputClass} resize-none`}
                      />
                    </div>

                    {error && (
                      <p className="text-sm" style={{ color: "var(--error)" }}>
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-display w-full font-semibold"
                    >
                      {loading ? "Sending..." : "Send message"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
