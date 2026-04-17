"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Chat from "@/components/Chat";
import LandingPage from "@/components/LandingPage";

export default function Home() {
  const { data: session, status } = useSession();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // For authenticated users, enforce onboarding order: subscription → GA → chat
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/onboarding-status")
      .then((res) => res.json())
      .then((data) => {
        if (!data.hasSubscription) {
          window.location.href = "/pricing";
          return;
        }
        // Users can connect sources from within the chat — no redirect needed
        setOnboarded(true);
      })
      .catch(() => {
        setOnboarded(true);
      });
  }, [status]);

  if (status === "loading" || (status === "authenticated" && onboarded === null)) {
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

  if (session && onboarded) {
    return <Chat />;
  }

  return <LandingPage onTryBeta={() => (window.location.href = "/signup")} />;
}
