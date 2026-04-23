"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const v2ButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13.5px] font-medium tracking-[-0.005em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink focus-visible:ring-offset-2 focus-visible:ring-offset-v2-bg disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-v2-ink text-v2-ink-inverse border border-v2-ink font-semibold hover:opacity-90 active:opacity-80",
        outline:
          "bg-transparent text-v2-ink border border-v2-line-strong hover:bg-v2-surface-2 hover:border-v2-ink",
        ghost:
          "bg-transparent text-v2-ink border border-transparent hover:bg-v2-surface-2",
        subtle:
          "bg-v2-surface-2 text-v2-ink border border-v2-line hover:bg-v2-surface-3",
        brand:
          "bg-v2-brand-vivid text-v2-on-brand border border-v2-brand-vivid font-semibold hover:opacity-90 active:opacity-80",
      },
      size: {
        sm: "h-7 px-3 text-[12.5px] [&_svg]:size-3.5",
        md: "h-8 px-4 [&_svg]:size-4",
        lg: "h-10 px-6 [&_svg]:size-4",
        icon: "h-7 w-7 p-0 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface V2ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof v2ButtonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, V2ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(v2ButtonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "V2Button";

export { v2ButtonVariants };
