"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      window.location.href = callbackUrl;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(180deg, #050505 0%, #080a09 40%, rgba(16, 163, 127, 0.04) 100%)",
      }}
    >
      <div
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl p-8"
        style={{
          background:
            "linear-gradient(145deg, rgba(20, 24, 23, 0.98) 0%, rgba(15, 22, 20, 0.99) 45%, rgba(16, 163, 127, 0.08) 100%)",
          border: "1px solid var(--border-color)",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.45), 0 0 25px rgba(16, 163, 127, 0.12)",
        }}
      >
        <div className="card-noise" aria-hidden />
        <div className="relative z-10">
          <div className="mb-6 text-center">
            <Image
              className="mx-auto mb-4"
              src="/Logo.svg"
              alt="Meaning logo"
              width={120}
              height={43}
              priority
            />
            <h1
              className="text-xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Welcome back
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Log in to your Meaning account
            </p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-[100px] px-6 py-3 text-sm font-medium transition-colors"
            style={{ background: "white", color: "#1f1f1f" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Log in with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div
              className="h-px flex-1"
              style={{ background: "var(--border-color)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              or
            </span>
            <div
              className="h-px flex-1"
              style={{ background: "var(--border-color)" }}
            />
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm"
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
                htmlFor="password"
                className="mb-1 block text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
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

            {error && (
              <p className="text-sm" style={{ color: "var(--error)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer rounded-[100px] px-6 py-3 text-sm font-medium transition-all duration-200 disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)",
                color: "white",
              }}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p
            className="mt-6 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="underline-offset-4 hover:underline"
              style={{ color: "var(--accent)" }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
