"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ArticlePageNav() {
  const pathname = usePathname();

  return (
    <nav className="relative z-50 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 sm:gap-4">
      <Link href="/" className="shrink-0">
        <Image
          src="/Logo.svg"
          alt="Meaning"
          width={120}
          height={42}
          className="h-8 w-auto sm:h-9"
          priority
        />
      </Link>
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
        <Link
          href="/pricing"
          className="text-sm transition-colors"
          style={{
            color:
              pathname === "/pricing" ? "var(--accent)" : "var(--text-secondary)",
          }}
        >
          Pricing
        </Link>
        <Link
          href="/docs"
          className="text-sm transition-colors"
          style={{
            color:
              pathname?.startsWith("/docs")
                ? "var(--accent)"
                : "var(--text-secondary)",
          }}
        >
          Docs
        </Link>
        <Link
          href="/login"
          className="text-sm transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="shrink-0 rounded-[100px] px-4 py-1.5 text-sm font-medium transition-all duration-200 sm:px-5 sm:py-2"
          style={{
            background:
              "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)",
            color: "white",
          }}
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}
