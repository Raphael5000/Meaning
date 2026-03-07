"use client";

import { useState, useEffect, use } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [inviteData, setInviteData] = useState<{
    email: string;
    teamName: string;
    inviterName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid invite");
        } else {
          setInviteData(data);
        }
      })
      .catch(() => setError("Failed to validate invite"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to accept invite");
        setSubmitting(false);
        return;
      }

      // Sign in with the new credentials
      const result = await signIn("credentials", {
        email: inviteData!.email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign-in failed. Please log in manually.");
        setSubmitting(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--page-bg)" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={{ background: "var(--page-bg)" }}
      >
        <div
          className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl p-8 text-center"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="card-noise" aria-hidden />
          <div className="relative z-10">
            <h2 className="mb-2 text-xl text-foreground">
              Invalid Invite
            </h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--page-bg)" }}
    >
      <div
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl p-8"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="card-noise" aria-hidden />
        <div className="relative z-10">
          <div className="mb-6 flex justify-center">
            <Image
              src="/Hivory icon.svg"
              alt="Meaning"
              width={40}
              height={40}
              className="invert dark:invert-0"
            />
          </div>

          <h2 className="mb-1 text-center text-xl text-foreground">
            Join {inviteData?.teamName}
          </h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            {inviteData?.inviterName} invited you to join their team on Meaning.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={inviteData?.email || ""}
                disabled
                className="w-full rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground"
                style={{ borderColor: "var(--border-color)" }}
              />
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Your name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                style={{ borderColor: "var(--border-color)" }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                style={{ borderColor: "var(--border-color)" }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !name.trim() || password.length < 8}
              className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Accept Invite & Create Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
