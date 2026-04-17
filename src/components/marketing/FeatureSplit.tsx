import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DisplayHeading } from "@/components/marketing/system/DisplayHeading";
import { GlowPill } from "@/components/marketing/system/MonoLabel";

export function FeatureSplit({
  eyebrow,
  heading,
  subhead,
  bullets,
  visual,
  reverse = false,
  href,
  linkLabel = "Learn more",
}: {
  eyebrow?: string;
  heading: React.ReactNode;
  subhead: React.ReactNode;
  bullets?: string[];
  visual: React.ReactNode;
  reverse?: boolean;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="grid items-center gap-12 md:grid-cols-2">
      <div className={cn(reverse && "md:order-2")}>
        {eyebrow && (
          <GlowPill dot={false} className="mb-4">
            {eyebrow}
          </GlowPill>
        )}
        <DisplayHeading size="md" className="mb-4">
          {heading}
        </DisplayHeading>
        <p className="mb-6 text-lg leading-relaxed text-[color:var(--m-text-secondary)]">
          {subhead}
        </p>
        {bullets && (
          <ul className="mb-6 flex flex-col gap-2">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2 text-sm text-[color:var(--m-text-secondary)]"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand)]"
                />
                {b}
              </li>
            ))}
          </ul>
        )}
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--brand)] transition-opacity hover:opacity-80"
          >
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className={cn(reverse && "md:order-1")}>{visual}</div>
    </div>
  );
}
