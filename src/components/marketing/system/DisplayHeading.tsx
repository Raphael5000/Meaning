import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Size = "2xl" | "xl" | "lg" | "md";

export function DisplayHeading({
  children,
  size = "xl",
  as = "h2",
  className,
  balance = true,
}: {
  children: ReactNode;
  size?: Size;
  as?: "h1" | "h2" | "h3";
  className?: string;
  balance?: boolean;
}) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        "text-[color:var(--m-text)]",
        size === "2xl" && "display-2xl",
        size === "xl" && "display-xl",
        size === "lg" && "display-lg",
        size === "md" && "display-md",
        className,
      )}
      style={balance ? { textWrap: "balance" as never } : undefined}
    >
      {children}
    </Tag>
  );
}
