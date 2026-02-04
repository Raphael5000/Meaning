"use client";

import { useSession } from "next-auth/react";
import SignIn from "@/components/SignIn";
import Chat from "@/components/Chat";

export default function Home() {
  const { data: session, status } = useSession();

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

  if (!session) {
    return <SignIn />;
  }

  return <Chat />;
}
