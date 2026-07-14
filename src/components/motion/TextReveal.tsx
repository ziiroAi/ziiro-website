import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
} from "react";
import { animate, onScroll, splitText, stagger } from "animejs";

/**
 * Scroll-scrubbed statement reveal: words start dim and slightly blurred,
 * then sharpen and brighten one after another as the reader scrolls the
 * element through the viewport — the light-to-dark sweep from the
 * reference film. Built on anime.js v4 splitText + onScroll (sync).
 * Falls back to fully-visible text when reduced motion is preferred.
 */
export default function TextReveal({
  text,
  as = "h2",
  className,
  style,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let split: ReturnType<typeof splitText> | null = null;
    let anim: ReturnType<typeof animate> | null = null;

    try {
      split = splitText(el, { words: true, chars: false });
      const words = split.words as HTMLElement[];
      if (!words?.length) return;
      for (const w of words) w.style.display = "inline-block";

      anim = animate(words, {
        opacity: [0.14, 1],
        filter: ["blur(5px)", "blur(0px)"],
        y: ["0.18em", "0em"],
        ease: "out(2)",
        duration: 600,
        delay: stagger(140),
        autoplay: onScroll({
          target: el,
          enter: "bottom-=12% top",
          leave: "center+=10% top",
          sync: 0.28,
        }),
      });
    } catch {
      // If splitting fails for any reason, leave the text untouched
      split?.revert();
      return;
    }

    return () => {
      anim?.cancel();
      split?.revert();
    };
  }, [text]);

  return createElement(as, { ref, className, style }, text);
}
