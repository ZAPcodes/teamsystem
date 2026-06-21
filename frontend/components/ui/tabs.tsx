"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * Perx Filter Pills (built on Radix Tabs).
 * Inactive: 1px Ash border, Fog text, transparent fill.
 * Active:   Ink fill, white text.
 * Radius:   100px (pill). No violet in filter state per design.md accent discipline.
 */

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("flex flex-wrap gap-2", className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base pill
      "inline-flex items-center justify-center",
      "px-5 py-2 rounded-[100px]",
      "font-[family-name:var(--font-inter)] font-normal text-[14px] tracking-[-0.02em]",
      "border border-[#d9d9d9] text-[#73737c] bg-transparent",
      "cursor-pointer select-none whitespace-nowrap",
      "transition-all duration-[120ms] ease-out",
      "focus-visible:outline-2 focus-visible:outline-[#635bff] focus-visible:outline-offset-2",
      // Active state — Ink fill, white text
      "data-[state=active]:bg-[#010110] data-[state=active]:text-white data-[state=active]:border-[#010110]",
      "hover:border-[rgba(1,1,16,0.4)] hover:text-[#010110]",
      "data-[state=active]:hover:bg-[#1a1a22]",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
