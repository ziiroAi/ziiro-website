// Block 3 (§6.2): one stop per department in the plan, in scroll order (§5.5). Stop i is plan_depth i.
import { copy } from "../data";
import type { Job } from "../data/contract";
import { markOf, type StopView } from "./planView";
import { DESKTOP_ONLY, PHONE_ONLY, Swap } from "./Swap";

const MICRO = "font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--funnel-muted)]";

function JobList({ jobs }: { jobs: readonly Job[] }): JSX.Element {
  return (
    <ul className="mt-2 flex flex-col gap-1 text-sm">
      {jobs.map((job) => {
        const mark = markOf(job.status);
        return (
          <li key={job.id} className="flex gap-2">
            <span role="img" aria-label={mark.label}>{mark.glyph}</span>
            <span>{job.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function PartStop({ stop }: { stop: StopView }): JSX.Element {
  const titleId = `plan-stop-${stop.depth}`;
  return (
    <section
      data-depth={stop.depth}
      aria-labelledby={titleId}
      className="border-t border-[color:var(--funnel-line)] px-4 py-16 sm:px-6 lg:px-10 lg:py-20"
    >
      <Swap as="p" lines={stop.count} className={MICRO} />
      <h2 id={titleId} className="mt-3 text-3xl font-medium lg:text-4xl">{stop.heading}</h2>
      <p className={`mt-2 text-[color:var(--funnel-muted)] ${DESKTOP_ONLY}`}>{stop.tag}</p>
      <p className="mt-6 max-w-2xl text-lg">{stop.body}</p>
      <h3 className={`mt-10 ${MICRO}`}>{copy("sp.part.agents")}</h3>
      <ul className="mt-4 grid gap-4 lg:grid-cols-3">
        {stop.agents.map((agent) => (
          <li key={agent.id} className="rounded-2xl border border-[color:var(--funnel-line)] bg-[color:var(--funnel-card)] p-5">
            <p className="font-medium">{agent.name}</p>
            <p className="mt-1 text-sm text-[color:var(--funnel-muted)]">{agent.line}</p>
            <div className={`mt-4 ${DESKTOP_ONLY}`}>
              <p className={MICRO}>{copy("sp.part.jobs")}</p>
              <JobList jobs={agent.jobs} />
            </div>
            <details className={`mt-4 ${PHONE_ONLY}`}>
              <summary className="flex min-h-11 cursor-pointer items-center text-sm">{agent.jobsToggle}</summary>
              <JobList jobs={agent.jobs} />
            </details>
          </li>
        ))}
      </ul>
      {stop.rest.length > 0 && (
        <>
          <h3 className={`mt-10 ${MICRO}`}>{copy("sp.part.rest")}</h3>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[color:var(--funnel-muted)]">
            {stop.rest.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
