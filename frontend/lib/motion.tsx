"use client";

/**
 * lib/motion.tsx
 *
 * Local shim that replaces "motion/react" (which requires framer-motion
 * peer dep — currently broken in this install). Implements the subset of
 * the API we actually use:
 *   motion.div / motion.span / motion.button
 *   AnimatePresence (enter + exit animations via CSS transitions)
 *   useMotionValue (stub)
 *
 * Animation strategy:
 *   - Enter: start at `initial` values (no transition), then CSS-transition
 *     to `animate` values after the first two rAFs.
 *   - Exit:  IsExitingCtx set by AnimatePresence signals the component to
 *     CSS-transition to `exit` values. AnimatePresence removes the element
 *     after `transition.duration * 1000 + 50` ms.
 *   - initial=false: immediately in "animate" phase (no enter animation).
 *
 * Effect-ordering invariant:
 *   Effect A (sync tracked <-> incoming, dep=[keyStr]) is declared BEFORE
 *   Effect B (update historyRef, no dep). React runs effects in declaration
 *   order, so Effect A always reads historyRef from the PREVIOUS render, and
 *   Effect B updates it afterwards. This lets Effect A get the ReactElement
 *   snapshot for any key that just disappeared.
 */

import * as React from "react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type AnimVals = {
  opacity?: number;
  y?: number;
  x?: number;
  scale?: number;
};

type AnimTransition = {
  duration?: number;
  ease?: string;
};

interface MotionPropsBase {
  initial?: AnimVals | false;
  animate?: AnimVals;
  exit?: AnimVals;
  transition?: AnimTransition;
}

// ─────────────────────────────────────────────────────────────
// Context: tells motion components they are being exited
// ─────────────────────────────────────────────────────────────

const IsExitingCtx = React.createContext(false);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function valsToStyle(v: AnimVals | undefined): React.CSSProperties {
  if (!v) return {};
  const transforms: string[] = [];
  if (v.y !== undefined) transforms.push(`translateY(${v.y}px)`);
  if (v.x !== undefined) transforms.push(`translateX(${v.x}px)`);
  if (v.scale !== undefined) transforms.push(`scale(${v.scale})`);
  return {
    ...(v.opacity !== undefined ? { opacity: v.opacity } : {}),
    ...(transforms.length ? { transform: transforms.join(" ") } : {}),
  };
}

function toEaseStr(tr?: AnimTransition): string {
  const e = tr?.ease;
  if (e === "easeOut") return "ease-out";
  if (e === "easeIn") return "ease-in";
  if (e === "linear") return "linear";
  return "ease";
}

// ─────────────────────────────────────────────────────────────
// Motion component factory
// ─────────────────────────────────────────────────────────────

function makeMotion<T extends "div" | "span" | "button">(tag: T) {
  type HtmlProps = React.ComponentPropsWithRef<T>;
  type Props = MotionPropsBase &
    Omit<HtmlProps, keyof MotionPropsBase | "style"> & {
      style?: React.CSSProperties;
      children?: React.ReactNode;
    };

  function Motion({
    initial,
    animate,
    exit,
    transition,
    style: externalStyle,
    children,
    ...rest
  }: Props) {
    const isExiting = React.useContext(IsExitingCtx);

    // "pre" = sitting at initial values, no transition applied
    // "in"  = CSS-transitioning toward animate values
    // "out" = CSS-transitioning toward exit values
    const [phase, setPhase] = React.useState<"pre" | "in" | "out">(
      initial === false ? "in" : "pre"
    );

    // Enter: advance from pre -> in after two rAFs (ensures a paint at
    // initial values so the transition is visible).
    React.useEffect(() => {
      if (phase !== "pre") return;
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setPhase("in"))
      );
      return () => cancelAnimationFrame(id);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Exit
    React.useEffect(() => {
      if (isExiting && phase !== "out") setPhase("out");
    }, [isExiting]); // eslint-disable-line react-hooks/exhaustive-deps

    const dur = transition?.duration ?? 0.3;
    const ease = toEaseStr(transition);

    const targetVals: AnimVals | undefined =
      phase === "out"
        ? exit
        : phase === "in"
        ? animate
        : initial === false
        ? animate
        : (initial as AnimVals | undefined);

    const motionStyle: React.CSSProperties = {
      ...valsToStyle(targetVals),
      transition:
        phase === "pre"
          ? "none"
          : `opacity ${dur}s ${ease}, transform ${dur}s ${ease}`,
    };

    const combinedStyle: React.CSSProperties = { ...externalStyle, ...motionStyle };

    return React.createElement(
      tag,
      { style: combinedStyle, ...rest } as unknown as object,
      children
    );
  }

  Motion.displayName = `motion.${tag}`;
  return Motion;
}

// ─────────────────────────────────────────────────────────────
// motion namespace
// ─────────────────────────────────────────────────────────────

export const motion = {
  div: makeMotion("div"),
  span: makeMotion("span"),
  button: makeMotion("button"),
};

// ─────────────────────────────────────────────────────────────
// AnimatePresence
// ─────────────────────────────────────────────────────────────

interface APProps {
  children?: React.ReactNode;
  mode?: "wait" | "popLayout" | "sync";
  initial?: boolean;
}

type TrackedEntry = { el: React.ReactElement; isExiting: boolean };
type TrackedMap = Map<string, TrackedEntry>;

export function AnimatePresence({
  children,
  mode: _mode,
  initial: _initial,
}: APProps) {
  const incoming = (
    React.Children.toArray(children) as React.ReactElement[]
  ).filter(React.isValidElement);

  const incomingMap = new Map(incoming.map((el) => [String(el.key), el]));
  const incomingKeyStr = [...incomingMap.keys()].join(",");

  const [tracked, setTracked] = React.useState<TrackedMap>(() =>
    new Map(incoming.map((el) => [String(el.key), { el, isExiting: false }]))
  );
  const trackedRef = React.useRef(tracked);
  trackedRef.current = tracked;

  // historyRef holds the ReactElements from the PREVIOUS render.
  // We read it in Effect A to get the element snapshot of a just-removed key.
  // It must be updated AFTER Effect A runs (see Effect B below).
  const historyRef = React.useRef<Map<string, React.ReactElement>>(
    new Map(incoming.map((el) => [String(el.key), el]))
  );

  // ── Effect A: sync tracked <-> incoming keys ──────────────────
  // Declared FIRST so it runs before Effect B and reads the old historyRef.
  React.useEffect(() => {
    const cur = trackedRef.current;
    const curKeys = new Set(cur.keys());
    const newKeys = new Set(incomingMap.keys());

    const removed = [...curKeys].filter(
      (k) => !newKeys.has(k) && !cur.get(k)?.isExiting
    );
    const added = incoming.filter((el) => !curKeys.has(String(el.key)));

    if (removed.length === 0 && added.length === 0) return;

    setTracked((prev) => {
      const next = new Map(prev);
      // Add newly appeared elements
      for (const el of added) {
        next.set(String(el.key), { el, isExiting: false });
      }
      // Mark removed elements as exiting
      for (const key of removed) {
        const entry = next.get(key);
        if (entry) next.set(key, { ...entry, isExiting: true });
      }
      return next;
    });

    // Schedule cleanup for each exiting element
    for (const key of removed) {
      const el = historyRef.current.get(key);
      const durMs =
        (
          (el?.props as Record<string, unknown>)
            ?.transition as AnimTransition | undefined
        )?.duration ?? 0.3;
      setTimeout(() => {
        setTracked((prev) => {
          if (!prev.has(key)) return prev;
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }, durMs * 1000 + 50);
    }
  }, [incomingKeyStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect B: keep historyRef up to date ──────────────────────
  // Declared AFTER Effect A so it runs after Effect A in the same render.
  // No deps — updates on every render so historyRef always has fresh elements.
  React.useEffect(() => {
    historyRef.current = new Map(incoming.map((el) => [String(el.key), el]));
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {[...tracked.entries()].map(([key, { el, isExiting }]) => {
        // For live (non-exiting) elements, always use the latest incoming
        // element so its props stay fresh across parent re-renders.
        // For exiting elements, use the snapshot captured at exit time.
        const element = isExiting ? el : (incomingMap.get(key) ?? el);
        return (
          <IsExitingCtx.Provider key={key} value={isExiting}>
            {element}
          </IsExitingCtx.Provider>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// useMotionValue stub
// ─────────────────────────────────────────────────────────────

export function useMotionValue(initial: number) {
  return React.useRef(initial);
}
