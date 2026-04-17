import Link from "next/link";
import { DisplayHeading } from "@/components/marketing/system/DisplayHeading";

export function MarketingCta({
  heading = "Ready to try Meaning?",
  subtitle = "Start your 14-day free trial. Cancel anytime.",
  primaryText = "Get started free",
  primaryHref = "/signup",
  secondaryText = "View pricing",
  secondaryHref = "/pricing",
}: {
  heading?: string;
  subtitle?: string;
  primaryText?: string;
  primaryHref?: string;
  secondaryText?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="relative z-10 px-6 py-24 md:px-12">
      <div className="mx-auto max-w-4xl">
        <div className="liquid-glass relative overflow-hidden rounded-3xl p-12 text-center md:p-16">
          <span className="liquid-glass-shimmer" aria-hidden />
          <div className="relative z-10">
            <DisplayHeading size="lg" className="mb-4">
              {heading}
            </DisplayHeading>
            <p className="mx-auto mb-8 max-w-xl text-lg text-[color:var(--m-text-secondary)]">
              {subtitle}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href={primaryHref} className="btn-display">
                {primaryText}
              </Link>
              <Link href={secondaryHref} className="btn-display btn-display-ghost">
                {secondaryText}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
