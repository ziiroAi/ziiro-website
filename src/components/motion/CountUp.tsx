import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useTransform, motion, animate } from "framer-motion";

interface CountUpProps {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export default function CountUp({
  to,
  duration = 2,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;

    const controls = animate(motionValue, to, {
      duration,
      ease: [0.25, 0.4, 0.25, 1],
      onUpdate(value) {
        setDisplay(value.toFixed(decimals));
      },
    });

    return controls.stop;
  }, [isInView, to, duration, decimals, motionValue]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {isInView ? display : "0"}
      {suffix}
    </span>
  );
}
