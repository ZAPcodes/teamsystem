"use client";

import * as React from "react";
import { NG } from "@/lib/new-genre/tokens";

interface EmployeePageShellProps {
  children: React.ReactNode;
  /** Narrow content column (progress, gift) vs wide marketplace */
  narrow?: boolean;
  /** Omit top padding when page sits directly under hero */
  flushTop?: boolean;
}

export function EmployeePageShell({ children, narrow, flushTop }: EmployeePageShellProps) {
  return (
    <div
      style={{
        maxWidth: narrow ? "720px" : NG.maxWidth,
        margin: "0 auto",
        padding: flushTop ? "0 24px 96px" : "48px 24px 96px",
      }}
    >
      {children}
    </div>
  );
}

interface EmployeeDisplayTitleProps {
  children: React.ReactNode;
  gradientTail?: string;
}

export function EmployeeDisplayTitle({ children, gradientTail }: EmployeeDisplayTitleProps) {
  return (
    <h1
      className="animate-settle"
      style={{
        fontFamily: NG.fontDisplay,
        fontSize: "clamp(36px, 6vw, 56px)",
        fontWeight: 400,
        lineHeight: 1.05,
        letterSpacing: "-0.02em",
        color: NG.onyx,
        margin: "0 0 12px",
      }}
    >
      {children}
      {gradientTail ? (
        <>
          {" "}
          <span className="ng-gradient-text">{gradientTail}</span>
        </>
      ) : null}
    </h1>
  );
}
