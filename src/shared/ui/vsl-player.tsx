import { useEffect, useState } from "react";

export type VslSource =
  | { kind: "youtube"; id: string }
  | { kind: "vimeo"; id: string }
  /** Self-hosted file: root-relative ("/vsl.mp4") or absolute URL. */
  | { kind: "file"; src: string };

export interface VslConfig {
  source: VslSource;
  title: string;
  description: string;
  /** ISO 8601 date, e.g. "2026-08-01". Required for VideoObject schema. */
  uploadDate: string;
  /** ISO 8601 duration, e.g. "PT3M42S". */
  duration?: string;
  /**
   * Optional poster override: root-relative ("/vsl-poster.jpg") or absolute
   * URL. Leave it unset and the thumbnail is pulled from the video itself, so
   * re-cutting the video or swapping the ID updates the frame with no asset to
   * re-export and no stale JPG left behind in public/.
   */
  poster?: string;
  /** Human-readable runtime shown on the frame, e.g. "3 MIN". */
  runtime?: string;
}

const BASE_URL = "https://ziiro.work";

/**
 * YouTube publishes derived stills at fixed paths. `maxresdefault` is the 1280w
 * frame but only exists for videos uploaded above 720p, so callers fall back to
 * `hqdefault` (always present) when it 404s.
 */
const youtubeThumb = (id: string, quality: "maxres" | "hq") =>
  `https://i.ytimg.com/vi/${id}/${quality}default.jpg`;

/**
 * Best thumbnail known without a network round-trip. Explicit poster wins;
 * YouTube resolves synchronously; Vimeo needs oEmbed, so it resolves later in
 * the component and returns undefined here.
 */
export const resolvePoster = (vsl: VslConfig): string | undefined => {
  if (vsl.poster) return vsl.poster;
  if (vsl.source.kind === "youtube") return youtubeThumb(vsl.source.id, "maxres");
  return undefined;
};

/**
 * Every thumbnail we can offer, best first. Google wants a fetchable
 * thumbnailUrl and accepts several; hqdefault always exists, so listing it
 * behind maxresdefault means a sub-720p upload still resolves to something.
 */
export const resolvePosters = (vsl: VslConfig): string[] => {
  if (vsl.poster) return [vsl.poster];
  if (vsl.source.kind === "youtube") {
    return [
      youtubeThumb(vsl.source.id, "maxres"),
      youtubeThumb(vsl.source.id, "hq"),
    ];
  }
  return [];
};

/**
 * `autoplay` belongs on the click-to-play path only: the viewer already asked
 * for it. The watch page embeds on load, where autoplay would be hostile, and
 * the schema's embedUrl should be the plain, shareable player URL.
 */
const embedUrl = (source: VslSource, autoplay = false): string => {
  const play = autoplay ? "autoplay=1&" : "";
  switch (source.kind) {
    case "youtube":
      // -nocookie so nothing is written until the viewer actually plays.
      return `https://www.youtube-nocookie.com/embed/${source.id}?${play}rel=0&modestbranding=1&playsinline=1`;
    case "vimeo":
      return `https://player.vimeo.com/video/${source.id}?${play}title=0&byline=0&portrait=0`;
    case "file":
      return source.src;
  }
};

const absolute = (url: string) =>
  url.startsWith("http") ? url : `${BASE_URL}${url}`;

/**
 * VideoObject JSON-LD for the VSL. Only emit this once a real video exists.
 * Schema for a video that isn't there is a structured-data penalty, not a win.
 */
export const videoObjectSchema = (vsl: VslConfig, watchPath?: string) => {
  const { source } = vsl;
  // Uses the resolved thumbnails, not the raw config field, so the schema still
  // carries a thumbnailUrl when the poster is derived rather than hardcoded.
  const posters = resolvePosters(vsl);
  const pageUrl = watchPath ? `${BASE_URL}${watchPath}` : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    ...(pageUrl && { "@id": `${pageUrl}#video`, url: pageUrl }),
    name: vsl.title,
    description: vsl.description,
    uploadDate: vsl.uploadDate,
    ...(vsl.duration && { duration: vsl.duration }),
    ...(posters.length && { thumbnailUrl: posters.map(absolute) }),
    ...(source.kind === "file"
      ? { contentUrl: absolute(source.src) }
      : { embedUrl: embedUrl(source) }),
    publisher: { "@id": `${BASE_URL}/#organization` },
    // Tells Google the video is the point of this URL rather than decoration
    // on a page about something else.
    ...(pageUrl && { mainEntityOfPage: { "@id": `${pageUrl}#webpage` } }),
  };
};

/** Dot-grid fill used when no poster image is supplied. */
const dotFill = {
  backgroundImage:
    "radial-gradient(var(--text-secondary) 0.8px, transparent 0.8px)",
  backgroundSize: "14px 14px",
  opacity: 0.18,
};

function Frame({
  label,
  meta,
  flush,
  children,
}: {
  label: string;
  meta?: string;
  /** Section above already draws a hairline: skip ours, don't stack two. */
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={flush ? "pt-6" : "border-t border-[var(--border)] pt-4"}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
          {label}
        </p>
        {meta && (
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
            [ {meta} ]
          </p>
        )}
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]">
        {children}
      </div>
    </div>
  );
}

/**
 * Click-to-load VSL player.
 *
 * The poster is a plain, static frame: no YouTube/Vimeo iframe, no third-party
 * script, no cookie is loaded until the viewer presses play. That keeps the
 * page's LCP and CWV clean while still giving a one-click watch.
 *
 * Pass `vsl={null}` before the video exists and it renders a quiet placeholder
 * instead of a broken embed.
 */
export default function VslPlayer({
  vsl,
  label = "The video",
  flush = false,
  mode = "facade",
}: {
  vsl: VslConfig | null;
  label?: string;
  /** Drop the frame's own top hairline when the section above supplies one. */
  flush?: boolean;
  /**
   * "facade" trades indexability for speed: no iframe exists until the viewer
   * clicks. Googlebot renders the page but never clicks, so it sees a button
   * and an image, not a video, and the page fails Google's watch-page test.
   *
   * "embed" puts the real iframe in the server-rendered HTML. Use it on watch
   * pages, where the video is the reason the page exists and the third-party
   * payload is the point rather than a tax.
   */
  mode?: "facade" | "embed";
}) {
  const [playing, setPlaying] = useState(false);
  // Starts at whatever is known synchronously so the first paint already has a
  // frame; Vimeo fills in after oEmbed, YouTube downgrades on a 404.
  const [poster, setPoster] = useState<string | undefined>(() =>
    vsl ? resolvePoster(vsl) : undefined,
  );

  const source = vsl?.source;
  const explicitPoster = vsl?.poster;

  useEffect(() => {
    if (!vsl) return;
    setPoster(resolvePoster(vsl));

    // Vimeo doesn't expose a guessable still URL, so ask oEmbed for it. No key,
    // no SDK, one cached GET.
    if (!explicitPoster && source?.kind === "vimeo") {
      const ctrl = new AbortController();
      fetch(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(
          `https://vimeo.com/${source.id}`,
        )}&width=1280`,
        { signal: ctrl.signal },
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.thumbnail_url) setPoster(d.thumbnail_url as string);
        })
        // A missing thumbnail is not worth surfacing: the dot-grid fill below
        // is a perfectly good frame to fall back to.
        .catch(() => {});
      return () => ctrl.abort();
    }
  }, [vsl, explicitPoster, source?.kind, source && "id" in source ? source.id : ""]);

  if (!vsl) {
    return (
      <Frame label={label} meta="Coming soon" flush={flush}>
        <div className="absolute inset-0" style={dotFill} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border)]">
            <span
              className="ml-1 block h-0 w-0 opacity-40"
              style={{
                borderTop: "9px solid transparent",
                borderBottom: "9px solid transparent",
                borderLeft: "14px solid var(--text-primary)",
              }}
            />
          </span>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
            ( Video dropping soon )
          </p>
        </div>
      </Frame>
    );
  }

  const { title, runtime } = vsl;
  const vslSource = vsl.source;
  // In embed mode the player is present from the first render, including the
  // server-rendered HTML, so a crawler finds a real <iframe>/<video> element.
  const showPlayer = mode === "embed" || playing;

  return (
    <Frame label={label} meta={runtime} flush={flush}>
      {showPlayer ? (
        vslSource.kind === "file" ? (
          <video
            className="absolute inset-0 h-full w-full"
            src={vslSource.src}
            poster={poster}
            controls
            autoPlay={playing}
            preload={mode === "embed" ? "metadata" : undefined}
            playsInline
          />
        ) : (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={embedUrl(vslSource, playing)}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 h-full w-full cursor-pointer"
        >
          {poster ? (
            <img
              src={poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              onError={() => {
                // maxresdefault only exists above 720p. Step down to hqdefault
                // once, then give up and let the dot-grid fill take over.
                if (!explicitPoster && vslSource.kind === "youtube") {
                  const hq = youtubeThumb(vslSource.id, "hq");
                  setPoster((p) => (p === hq ? undefined : hq));
                } else {
                  setPoster(undefined);
                }
              }}
            />
          ) : (
            <span className="absolute inset-0 block" style={dotFill} />
          )}

          {/* Scrim keeps the play button legible over any poster */}
          <span className="absolute inset-0 block bg-[var(--background)] opacity-30 transition-opacity duration-300 group-hover:opacity-20" />

          <span className="absolute inset-0 flex flex-col items-center justify-center gap-5">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--text-primary)] transition-transform duration-300 group-hover:scale-105">
              <span
                className="ml-1.5 block h-0 w-0"
                style={{
                  borderTop: "11px solid transparent",
                  borderBottom: "11px solid transparent",
                  borderLeft: "17px solid var(--background)",
                }}
              />
            </span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-primary)]">
              Play
            </span>
          </span>
        </button>
      )}
    </Frame>
  );
}
