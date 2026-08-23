import { Link, useLocation } from "react-router-dom";
import SEO from "@/shared/components/SEO";
import MotionReveal from "@/shared/motion/MotionReveal";
import VslPlayer, { videoObjectSchema } from "@/shared/ui/vsl-player";
import { videoBySlug, watchPath } from "@/features/watch/videos";
import NotFound from "@/pages/NotFound";

/**
 * A watch page: one video, and the video is the subject.
 *
 * Everything here is shaped by what Google requires before it will index a
 * video (Search Console reports "Video isn't on a watch page" otherwise):
 * a dedicated URL per video, a real player element in the HTML rather than a
 * click-to-load facade, the player high on the page and large, the <h1> naming
 * the video, and descriptive copy adjacent to it. Supporting links sit below
 * the fold so nothing competes with the player for "main content".
 */
export default function Watch() {
  // Read from the location rather than useParams: this component is also
  // rendered directly by the SSG entry, outside a matched <Route>.
  const { pathname } = useLocation();
  const slug = pathname.split("/").filter(Boolean).pop();
  const video = videoBySlug(slug);

  if (!video) return <NotFound />;

  const { vsl, seoTitle, seoDescription, summary, covers } = video;
  const path = watchPath(video.slug);

  return (
    <div className="relative">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={path}
        schema={videoObjectSchema(vsl, path)}
        // Home → this video. There is no /watch index to sit in between.
        breadcrumb={[
          { name: "Home", path: "/" },
          { name: vsl.title, path },
        ]}
      />

      <article className="pt-36">
        <div className="mx-auto max-w-4xl px-6 md:px-10">
          <p className="mb-8 flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
            ( ZIIRO / WATCH )
          </p>

          {/* The <h1> is the video's own title: this URL is about this video. */}
          <h1
            className="font-display font-semibold text-[var(--text-primary)]"
            style={{
              fontSize: "clamp(2rem, 4.6vw, 3.4rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.06,
            }}
          >
            {vsl.title}
          </h1>

          <p className="mt-6 max-w-2xl leading-relaxed text-[var(--text-secondary)]">
            {summary}
          </p>

          {/* Player: as high as it can sit under the heading, full container
              width, no interaction required to make it exist. */}
          <div className="mt-10">
            <VslPlayer vsl={vsl} label="Watch" mode="embed" />
          </div>

          <p className="mt-10 max-w-2xl leading-relaxed text-[var(--text-secondary)]">
            {vsl.description}
          </p>

          <section className="mt-14 border-t border-[var(--border)] pt-10">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              What it covers
            </h2>
            <ul className="mt-7 space-y-4">
              {covers.map((item) => (
                <li
                  key={item}
                  className="flex gap-4 leading-relaxed text-[var(--text-primary)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-primary)]"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <MotionReveal>
            <section className="mb-24 mt-14 border-t border-[var(--border)] pt-10 md:mb-32">
              <p className="max-w-2xl leading-relaxed text-[var(--text-secondary)]">
                If that made sense, the next step is your numbers rather than
                ours.{" "}
                <Link
                  to="/contact"
                  className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  Book a 15-minute call
                </Link>
                , read{" "}
                <Link
                  to="/who-we-are"
                  className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  who we are
                </Link>
                , or see{" "}
                <Link
                  to="/process"
                  className="text-[var(--text-primary)] underline underline-offset-4 transition-opacity hover:opacity-70"
                >
                  the process
                </Link>{" "}
                step by step.
              </p>
            </section>
          </MotionReveal>
        </div>
      </article>
    </div>
  );
}
