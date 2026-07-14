import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
} from "react";
import { animate, onScroll, stagger } from "animejs";

/**
 * Scroll-scrubbed statement reveal: words start dim and slightly blurred,
 * then sharpen and brighten one after another as the reader scrolls the
 * element through the viewport.
 *
 * The words are rendered as React-controlled spans (one clean copy of the
 * text in the DOM). We deliberately do NOT use anime's splitText, which
 * injects a duplicate accessibility copy that text extractors and AI
 * crawlers read as doubled text ("…sake.…sake."). Falls back to plain,
 * fully-visible text when reduced motion is preferred.
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

    const words = el.querySelectorAll<HTMLElement>("[data-tr-word]");
    if (!words.length) return;

    const anim = animate(words, {
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

    return () => anim.cancel();
  }, [text]);

  const parts = text.split(" ");
  const children = parts.map((word, i) => (
    <span
      key={i}
      data-tr-word
      style={{ display: "inline-block", willChange: "opacity, transform, filter" }}
    >
      {word}
      {i < parts.length - 1 ? " " : ""}
    </span>
  ));

  return createElement(as, { ref, className, style }, children);
}
