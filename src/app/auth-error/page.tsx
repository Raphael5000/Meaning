"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "Default";

  const messages: Record<string, string> = {
    Configuration: "There's a problem with the server configuration.",
    AccessDenied: "Access was denied.",
    Verification: "The sign-in link has expired or was already used.",
    InvalidCheck:
      "Sign-in couldn't be completed—often due to cookies being blocked or a stale session. Clear cookies and try again, or use an incognito window.",
    Default:
      "Something went wrong during sign-in. This often happens when cookies are blocked or from a stale session.",
  };

  const message = messages[error] ?? messages.Default;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(180deg, #050505 0%, #080a09 40%, rgba(16, 163, 127, 0.04) 100%)",
      }}
    >
      <div
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl p-8 text-center"
        style={{
          background:
            "linear-gradient(145deg, rgba(20, 24, 23, 0.98) 0%, rgba(15, 22, 20, 0.99) 45%, rgba(16, 163, 127, 0.08) 100%)",
          border: "1px solid var(--border-color)",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.45), 0 0 25px rgba(16, 163, 127, 0.12)",
        }}
      >
        <Image
          className="mx-auto mb-6"
          src="/Logo.svg"
          alt="Meaning"
          width={120}
          height={43}
        />
        <h1
          className="mb-2 text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Sign-in problem
        </h1>
        <p
          className="mb-6 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {message}
        </p>
        <p
          className="mb-6 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Try clearing cookies for this site, then sign in again. Use an
          incognito window if the issue persists.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-[100px] px-6 py-3 text-sm font-medium transition-all"
          style={{
            background:
              "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)",
            color: "white",
          }}
        >
          Try again
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthErrorContent />
    </Suspense>
  );
}
