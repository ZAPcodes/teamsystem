"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Perx Input — 8px radius, 1px Ink hairline border, Inter 400 16px.
 * No shadow. Focus: violet 2px ring.
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "w-full h-11 px-4",
        "font-[family-name:var(--font-inter)] text-[16px] text-[#010110] tracking-[-0.02em]",
        "bg-white border border-[rgba(1,1,16,0.15)] rounded-[8px]",
        "placeholder:text-[#73737c]",
        "outline-none transition-colors duration-[120ms]",
        "focus:border-[#010110]",
        "focus-visible:outline-2 focus-visible:outline-[#635bff] focus-visible:outline-offset-2",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
