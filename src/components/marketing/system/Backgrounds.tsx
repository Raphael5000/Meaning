import { cn } from "@/lib/utils";

export function DottedGrid({
  className,
  fade = true,
}: {
  className?: string;
  fade?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 dotted-grid",
        fade && "[mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_40%,transparent_100%)]",
        className,
      )}
    />
  );
}

export function AmbientRay({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 h-[90vh] ambient-ray",
        className,
      )}
    />
  );
}

export function NoiseLayer({ className }: { className?: string }) {
  return <div aria-hidden className={cn("noise", className)} />;
}
