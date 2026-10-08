/** (C) What shows when a page can't render (review M4, M5): one line, the booking link, and a reload. */
import { copy } from "@/features/funnel/data/light";

export function ErrorNote({ line, bookingHref }: { line: string; bookingHref: string }) {
  return (
    <div role="alert" className="mx-auto max-w-md px-4 py-16">
      <p className="f-err">{line}</p>
      <a className="f-act" href={bookingHref} target="_blank" rel="noopener noreferrer">{copy("nav.btn")}</a>
      <button type="button" className="f-link mt-4 block" onClick={() => window.location.reload()}>{copy("g.reload")}</button>
    </div>
  );
}
