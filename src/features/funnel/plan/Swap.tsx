// §6.4: the desktop line from 600 px, the phone line under it. Both are in the page and CSS shows one,
// so nothing jumps and no line waits for JavaScript to measure the screen.
import type { ElementType } from "react";
import type { Lines } from "./planView";

/** Shown under 600 px only. */
export const PHONE_ONLY = "min-[600px]:hidden";
/** Shown from 600 px only. */
export const DESKTOP_ONLY = "max-[600px]:hidden";

export interface SwapProps {
  lines: Lines;
  as?: ElementType;
  className?: string;
}

export function Swap({ lines, as: Tag = "span", className = "" }: SwapProps): JSX.Element {
  if (lines.desktop === lines.phone) return <Tag className={className || undefined}>{lines.desktop}</Tag>;
  return (
    <>
      <Tag className={`${className} ${DESKTOP_ONLY}`.trim()}>{lines.desktop}</Tag>
      <Tag className={`${className} ${PHONE_ONLY}`.trim()}>{lines.phone}</Tag>
    </>
  );
}
