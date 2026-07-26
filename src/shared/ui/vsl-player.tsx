import { useState } from "react";

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
  /** Poster frame: root-relative ("/vsl-poster.jpg") or absolute URL. */
  poster?: string;
  /** Human-readable runtime shown on the frame, e.g. "3 MIN". */
  runtime?: string;
}

const BASE_URL = "https://ziiro.work";

const embedUrl = (source: VslSource): string => {
  switch (source.kind) {
    case "youtube":
      // -nocookie so nothing is written until the viewer actually plays.
      return `https://www.youtube-nocookie.com/embed/${source.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    case "vimeo":
      return `https://player.vimeo.com/video/${source.id}?autoplay=1&title=0&byline=0&portrait=0`;
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
export const videoObjectSchema = (vsl: VslConfig) => {
  const { source } = vsl;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: vsl.title,
    description: vsl.description,
    uploadDate: vsl.uploadDate,
    ...(vsl.duration && { duration: vsl.duration }),
    ...(vsl.poster && { thumbnailUrl: [absolute(vsl.poster)] }),
    ...(source.kind === "file"
      ? { contentUrl: absolute(source.src) }
      : { embedUrl: embedUrl(source) }),
    publisher: { "@id": `${BASE_URL}/#organization` },
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
  children,
}: {
  label: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[var(--border)] pt-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
          {label}
        </p>
        {meta && (
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)]/70">
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
}: {
  vsl: VslConfig | null;
  label?: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (!vsl) {
    return (
      <Frame label={label} meta="Coming soon">
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

  const { source, title, poster, runtime } = vsl;

  return (
    <Frame label={label} meta={runtime}>
      {playing ? (
        source.kind === "file" ? (
          <video
            className="absolute inset-0 h-full w-full"
            src={source.src}
            poster={poster}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={embedUrl(source)}
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
