"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ChatV2 from "@/components/v2/ChatV2";
import LandingPage from "@/components/LandingPage";

export default function Home() {
  const { data: session, status } = useSession();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // Authenticated users land on chat regardless of tier. Free users get
  // gated server-side by FREE_TIER_LIMIT_REACHED / FREE_TIER_SOURCE_LIMIT
  // when they cross caps. No redirect to /onboarding here — that's only
  // reached via explicit upgrade CTAs.
  useEffect(() => {
    if (status !== "authenticated") return;
    setOnboarded(true);
  }, [status]);

  // Authenticated users: show spinner while checking subscription, then Chat
  if (status === "authenticated") {
    if (onboarded === null) {
      return (
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: "var(--bg-primary)" }}
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-current"
            style={{
              color: "var(--accent)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      );
    }
    return <ChatV2 />;
  }

  // Still loading session — show spinner to avoid flashing the landing page
  if (status === "loading") {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-current"
          style={{
            color: "var(--accent)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  // Unauthenticated — show landing page
  return <LandingPage onTryBeta={() => (window.location.href = "/signup")} />;
}
