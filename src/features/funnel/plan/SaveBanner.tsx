// §10: at the top of the plan when /lead didn't save (sp.save.fail) or didn't answer in time (sp.save.unsure).
import { copy } from "../data";

export function SaveBanner({ notice }: { notice: "fail" | "unsure" | null }): JSX.Element | null {
  if (notice === null) return null;
  return (
    <p
      role="alert"
      className="mx-4 mt-4 rounded-xl border border-[color:var(--funnel-line)] bg-[color:var(--funnel-card)] px-4 py-3 text-sm text-[color:var(--funnel-fg)] sm:mx-6 lg:mx-10"
    >
      {copy(notice === "fail" ? "sp.save.fail" : "sp.save.unsure")}
    </p>
  );
}
