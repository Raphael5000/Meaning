"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaSection({
  heading,
  description,
  primaryText = "Get started free",
  primaryHref = "/signup?plan=free",
  secondaryText = "View pricing",
  secondaryHref = "/pricing",
}: {
  heading: string;
  description: string;
  primaryText?: string;
  primaryHref?: string;
  secondaryText?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="relative z-10 px-6 py-24 md:px-12">
      <div className="mx-auto max-w-4xl">
        <div
          className="relative overflow-hidden rounded-3xl p-12 text-center md:p-16"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="card-noise" aria-hidden />
          <div className="relative z-10">
            <h2
              className="mb-4 text-3xl tracking-tight md:text-5xl"
              style={{ color: "var(--text-primary)" }}
            >
              {heading}
            </h2>
            <p
              className="mx-auto mb-8 max-w-xl text-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              {description}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href={primaryHref}>
                <Button className="rounded-full px-8 py-3 text-base font-semibold">
                  {primaryText}
                </Button>
              </Link>
              <Link href={secondaryHref}>
                <Button
                  variant="outline"
                  className="rounded-full px-8 py-3 text-base font-semibold"
                >
                  {secondaryText}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
