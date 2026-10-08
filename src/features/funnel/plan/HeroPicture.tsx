// §6.6: one <picture> for the hero still. AVIF first, then WebP. The phone band under 600 px, the landscape still
// from 600 px. Only the visitor's theme loads. No preload and no high priority: the plan is never the first screen.
// Lane A mounts HeroPicturePrefetch at S5, so this file takes copy from the light entry, never from ../data.
import { copy } from "../data/light";
import type { Theme } from "../data/contract";
import { useHtmlTheme } from "./useHtmlTheme";

const STILL_WIDTHS = [1280, 1920, 2560] as const;
const BAND_WIDTHS = [828, 1170] as const;
const STILL_SIZE = { width: 2560, height: 1440 } as const;
const BAND_SIZE = { width: 1170, height: 1230 } as const;
const BAND_MEDIA = "(max-width: 599px)";
const STILL_MEDIA = "(min-width: 600px)";
const FORMATS = ["avif", "webp"] as const;

const folder = (theme: Theme): string => `/spine/r17/${theme}/hero`;
const srcSet = (theme: Theme, name: "hero" | "phone", widths: readonly number[], ext: string): string =>
  widths.map((w) => `${folder(theme)}/${name}-${w}.${ext} ${w}w`).join(", ");

export function HeroPicture({ className }: { className?: string }): JSX.Element {
  const theme = useHtmlTheme();
  return (
    <picture>
      {FORMATS.flatMap((ext) => [
        <source key={`${ext}-band`} type={`image/${ext}`} media={BAND_MEDIA} sizes="100vw"
          srcSet={srcSet(theme, "phone", BAND_WIDTHS, ext)} {...BAND_SIZE} />,
        <source key={`${ext}-still`} type={`image/${ext}`} media={STILL_MEDIA} sizes="100vw"
          srcSet={srcSet(theme, "hero", STILL_WIDTHS, ext)} {...STILL_SIZE} />,
      ])}
      <img src={`${folder(theme)}/hero-1920.webp`} {...STILL_SIZE} decoding="async"
        alt={copy(theme === "dark" ? "hx.alt.dark" : "hx.alt.light")} className={className} />
    </picture>
  );
}

/** §6.6, "at S5 the funnel mounts the hero <picture> out of sight": the browser fetches and caches the file S9 shows. */
export function HeroPicturePrefetch(): JSX.Element {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden opacity-0">
      <HeroPicture />
    </div>
  );
}
