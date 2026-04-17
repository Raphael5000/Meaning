import { cn } from "@/lib/utils";
import { DisplayHeading } from "@/components/marketing/system/DisplayHeading";
import { GlowPill } from "@/components/marketing/system/MonoLabel";

export function MarketingSection({
  children,
  className,
  eyebrow,
  heading,
  subhead,
  center = false,
  maxWidth = "6xl",
}: {
  children?: React.ReactNode;
  className?: string;
  eyebrow?: string;
  heading?: React.ReactNode;
  subhead?: React.ReactNode;
  center?: boolean;
  maxWidth?: "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
}) {
  const maxW = {
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
  }[maxWidth];

  return (
    <section className={cn("relative z-10 px-6 py-24 md:px-12", className)}>
      <div className={cn("mx-auto", maxW)}>
        {(eyebrow || heading || subhead) && (
          <div className={cn("mb-12", center && "text-center")}>
            {eyebrow && (
              <GlowPill dot={false} className="mb-4">
                {eyebrow}
              </GlowPill>
            )}
            {heading && (
              <DisplayHeading size="lg" className="mb-4">
                {heading}
              </DisplayHeading>
            )}
            {subhead && (
              <p
                className={cn(
                  "text-lg text-[color:var(--m-text-secondary)]",
                  center && "mx-auto max-w-2xl",
                )}
              >
                {subhead}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
