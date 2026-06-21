/**
 * Minimal type shim for motion/react (motion v12).
 * The package ships types that reference framer-motion,
 * but the runtime is self-contained. We declare only what we use.
 */
declare module "motion/react" {
  import * as React from "react";

  type MotionStyle = React.CSSProperties & Record<string, unknown>;

  interface AnimationProps {
    initial?: boolean | MotionStyle | string;
    animate?: MotionStyle | string;
    exit?: MotionStyle | string;
    transition?: Record<string, unknown>;
    layout?: boolean | string;
    layoutId?: string;
    whileHover?: MotionStyle;
    whileTap?: MotionStyle;
  }

  type MotionProps = AnimationProps &
    Omit<React.HTMLAttributes<HTMLElement>, "style"> & {
      style?: MotionStyle;
    };

  type MotionDivProps = AnimationProps &
    Omit<React.HTMLAttributes<HTMLDivElement>, "style"> & {
      style?: MotionStyle;
    };

  type MotionSpanProps = AnimationProps &
    Omit<React.HTMLAttributes<HTMLSpanElement>, "style"> & {
      style?: MotionStyle;
    };

  interface MotionComponents {
    div: React.ForwardRefExoticComponent<MotionDivProps & React.RefAttributes<HTMLDivElement>>;
    span: React.ForwardRefExoticComponent<MotionSpanProps & React.RefAttributes<HTMLSpanElement>>;
    button: React.ForwardRefExoticComponent<
      AnimationProps &
        Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> & {
          style?: MotionStyle;
        } & React.RefAttributes<HTMLButtonElement>
    >;
  }

  export const motion: MotionComponents;

  export interface AnimatePresenceProps {
    children?: React.ReactNode;
    initial?: boolean;
    onExitComplete?: () => void;
    exitBeforeEnter?: boolean;
    mode?: "sync" | "wait" | "popLayout";
    presenceAffectsLayout?: boolean;
    custom?: unknown;
  }

  export const AnimatePresence: React.FC<AnimatePresenceProps>;

  export function useMotionValue<T>(initial: T): {
    get: () => T;
    set: (v: T) => void;
    on: (event: string, cb: (v: T) => void) => () => void;
  };

  export function useReducedMotion(): boolean | null;

  export function animate(
    element: Element | string,
    keyframes: Record<string, unknown>,
    options?: Record<string, unknown>
  ): { stop: () => void; finished: Promise<void> };
}
