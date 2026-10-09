// §6.6: one <picture> for the hero still. AVIF first, then WebP. Only the visitor's theme loads. W18-C: r18, drawn by
// the live 3D itself (m4, discs unlit) at the frame it starts on, one per stage shape: the phone band under 600 px
// (phone mesh), the 1290:1356 band from 600 px (desktop mesh), the landscape stage from 1024 px (r17's camera, drawn
// on a 1440 x 816 stage). The 3D fades in over it and then lights its discs, so the handover reads as one picture. No preload and no high priority: the plan is never the first screen.
// Lane A mounts HeroPicturePrefetch at S5, so this file takes copy from the light entry, never from ../data.
import { copy } from "../data/light";
import type { Theme } from "../data/contract";
import { useHtmlTheme } from "./useHtmlTheme";

const STILL_WIDTHS = [1280, 1920, 2880] as const;
const TABLET_WIDTHS = [1024, 1536] as const;
const BAND_WIDTHS = [585] as const;
const STILL_SIZE = { width: 2880, height: 1632 } as const;
const TABLET_SIZE = { width: 1536, height: 1614 } as const;
const BAND_SIZE = { width: 585, height: 615 } as const;
const BAND_MEDIA = "(max-width: 599px)";
const TABLET_MEDIA = "(min-width: 600px) and (max-width: 1023px)";
const STILL_MEDIA = "(min-width: 1024px)";
const FORMATS = ["avif", "webp"] as const;

const folder = (theme: Theme): string => `/spine/r18/${theme}/hero`;
const srcSet = (theme: Theme, name: "hero" | "tablet" | "phone", widths: readonly number[], ext: string): string =>
  widths.map((w) => `${folder(theme)}/${name}-${w}.${ext} ${w}w`).join(", ");

export function HeroPicture({ className }: { className?: string }): JSX.Element {
  const theme = useHtmlTheme();
  return (
    <picture>
      {FORMATS.flatMap((ext) => [
        <source key={`${ext}-band`} type={`image/${ext}`} media={BAND_MEDIA} sizes="100vw"
          srcSet={srcSet(theme, "phone", BAND_WIDTHS, ext)} {...BAND_SIZE} />,
        <source key={`${ext}-tablet`} type={`image/${ext}`} media={TABLET_MEDIA} sizes="100vw"
          srcSet={srcSet(theme, "tablet", TABLET_WIDTHS, ext)} {...TABLET_SIZE} />,
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
