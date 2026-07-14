import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { smoothEase } from "@/lib/animations";

interface MotionRevealProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right" | "none";
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  amount?: number;
}

const offsets = {
  up: { y: 40 },
  down: { y: -30 },
  left: { x: -50 },
  right: { x: 50 },
  none: {},
};

export default function MotionReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.8,
  className,
  once = true,
  amount = 0.2,
}: MotionRevealProps) {
  const shouldReduce = useReducedMotion();

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offsets[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: smoothEase }}
    >
      {children}
    </motion.div>
  );
}
