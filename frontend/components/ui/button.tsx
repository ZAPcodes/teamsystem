"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Perx Button — two variants only, per design.md §6.
 * Primary: Ink fill, white text, pill radius.
 * Ghost:   transparent, 1px Ink border, Ink text → inverts on hover.
 *
 * Violet NEVER appears here. Radius is always 100px.
 */
const buttonVariants = cva(
  // Base
  [
    "inline-flex items-center justify-center gap-1.5",
    "font-[family-name:var(--font-inter)] font-medium text-[15px] tracking-[-0.02em]",
    "px-5 py-3 rounded-[100px]",
    "border-0 cursor-pointer select-none",
    "transition-all duration-[120ms] ease-out",
    "focus-visible:outline-2 focus-visible:outline-[#635bff] focus-visible:outline-offset-2",
    "disabled:opacity-40 disabled:cursor-not-allowed",
    "@media (prefers-reduced-motion:reduce) { transition:none }",
  ],
  {
    variants: {
      variant: {
        /** Ink fill → slight lighten on hover */
        primary: [
          "bg-[#010110] text-white border-transparent",
          "hover:bg-[#1a1a22]",
        ],
        /** Transparent + 1px Ink border → fill Ink on hover */
        ghost: [
          "bg-transparent text-[#010110] border border-[#010110]",
          "hover:bg-[#010110] hover:text-white",
        ],
      },
      size: {
        default: "px-5 py-3 text-[15px]",
        sm: "px-4 py-2 text-[13px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
