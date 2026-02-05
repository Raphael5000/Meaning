"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background: "linear-gradient(180deg, #050505 0%, #080a09 40%, rgba(16, 163, 127, 0.04) 100%)",
      }}
    >
      <div
        className="relative mx-auto max-w-md overflow-hidden rounded-2xl p-8 text-center"
        style={{
          background:
            "linear-gradient(145deg, rgba(20, 24, 23, 0.98) 0%, rgba(15, 22, 20, 0.99) 45%, rgba(16, 163, 127, 0.08) 100%)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.45), 0 0 25px rgba(16, 163, 127, 0.12)",
        }}
      >
        <div className="card-noise" aria-hidden />
        <div className="relative z-10">
        <div className="mb-6">
          <Image
            className="mx-auto mb-4"
            src="/Logo.svg"
            alt="Meaning logo"
            width={120}
            height={43}
            priority
          />
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Chat with your Google Analytics data. Ask questions in plain English and get instant insights.
          </p>
        </div>

        <button
          onClick={() => signIn("google")}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-[100px] px-6 py-3 text-sm font-medium transition-colors"
          style={{
            background: "white",
            color: "#1f1f1f",
          }}
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
          Sign in with Google
        </button>

        <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
          We only request read-only access to your Analytics data.
        </p>
        </div>
      </div>
    </div>
  );
}
