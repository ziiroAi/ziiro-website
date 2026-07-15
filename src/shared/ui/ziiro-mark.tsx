/**
 * The Ziiro brand mark — the original dot-art monogram (public/logo/), painted
 * with currentColor via a CSS mask so it stays crisp and correct in both themes
 * (near-black on light, near-white on dark) and matches the adjacent wordmark.
 * Single source of truth for the mark (navbar, footer). The asset is portrait
 * (~2:3), so size it by HEIGHT — width follows from aspect-ratio.
 */
const MARK_URL = "/logo/ziiro-mark.webp";

export default function ZiiroMark({ className = "h-9" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Ziiro"
      className={className}
      style={{
        display: "inline-block",
        aspectRatio: "476 / 721",
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${MARK_URL})`,
        maskImage: `url(${MARK_URL})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
