import { useEffect, useState } from "react";

/**
 * The reader's reduced-motion preference, followed live.
 *
 * On main the directory took this from framer-motion. This branch keeps
 * framer-motion off its routes (see MotionReveal for why), and the directory
 * only ever asked it this one question and for one opacity fade, so it reads
 * the media query itself and the fade is a CSS animation (index.css).
 *
 * False on the server and on the first client render, so hydration matches
 * the prerendered markup; the real answer lands one effect later.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}
