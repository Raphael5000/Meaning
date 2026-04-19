"use client";

import Link from "next/link";
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
    <div className="relative flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      {/* Back link */}
      <Link
        href="/"
        className="absolute left-5 top-5 inline-flex items-center gap-1.5 text-sm text-[rgba(255,255,255,0.4)] transition-colors hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Home
      </Link>

      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <svg width="28" height="28" viewBox="0 0 436 436" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M352.65 128.054L234.755 58.7598C225.248 53.1732 213.469 53.0716 203.872 58.516L84.8758 125.941C75.2785 131.376 69.308 141.523 69.2171 152.554L68.1261 289.273C68.0351 300.304 73.844 310.543 83.3503 316.14L201.255 385.454C210.772 391.041 222.541 391.143 232.138 385.698L351.134 318.273C360.732 312.839 366.702 302.691 366.793 291.66L367.874 154.931C367.965 143.9 362.156 133.661 352.65 128.074V128.054ZM362.611 187.303L338.82 308.816C336.9 318.618 329.899 326.653 320.443 329.893L203.276 370.046C193.82 373.286 183.364 371.234 175.828 364.672L82.4512 283.311C74.9149 276.749 71.4598 266.663 73.3793 256.861L97.1805 135.357C99.1 125.555 106.101 117.521 115.557 114.281L232.724 74.128C242.18 70.8878 252.636 72.9396 260.172 79.5013L353.539 160.842C361.075 167.404 364.53 177.49 362.611 187.292V187.303Z" />
            <path d="M340.65 191.158L274.712 109.055C269.388 102.433 260.942 99.1519 252.547 100.442L148.442 116.481C140.047 117.771 132.975 123.449 129.894 131.361L91.7273 229.493C88.646 237.405 90.0301 246.364 95.354 252.987L161.302 335.1C166.626 341.722 175.072 345.013 183.467 343.713L287.572 327.685C295.967 326.395 303.039 320.717 306.12 312.804L344.277 214.652C347.358 206.74 345.974 197.771 340.65 191.158ZM324.769 244.404L270.843 317.477C266.488 323.368 259.326 326.496 252.042 325.674L161.777 315.526C154.493 314.704 148.2 310.072 145.27 303.358L108.932 220.127C106.002 213.413 106.871 205.643 111.225 199.751L165.151 126.689C169.506 120.797 176.668 117.669 183.952 118.492L274.217 128.649C281.501 129.472 287.784 134.104 290.724 140.818L327.062 224.028C329.992 230.742 329.123 238.512 324.769 244.404Z" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-semibold text-white">
          Sign-in problem
        </h1>
        <p className="mb-6 text-sm text-[rgba(255,255,255,0.5)]">
          {message}
        </p>
        <p className="mb-6 text-xs text-[rgba(255,255,255,0.3)]">
          Try clearing cookies for this site, then sign in again. Use an
          incognito window if the issue persists.
        </p>
        <Link
          href="/login"
          className="inline-block w-full rounded-lg py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
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
