// Every copy line by its ID (§4.5, copy.md), and copy(), which fills a line's placeholders (00-index §1.3).
import type { CopyVars } from "./contract";
import { EMAIL_COPY } from "./copy/email";
import { FLOW_COPY } from "./copy/flow";
import { PLAN_COPY } from "./copy/plan";
import { SEO_COPY } from "./copy/seo";
import { SITE_COPY } from "./copy/site";

export const COPY_LINES: Readonly<Record<string, string>> = {
  ...FLOW_COPY, ...SITE_COPY, ...PLAN_COPY, ...EMAIL_COPY, ...SEO_COPY,
};

const PLACEHOLDER = /\{([^{}]+)\}/g;
const has = (record: object, key: string): boolean => Object.prototype.hasOwnProperty.call(record, key);

/** The line with every {placeholder} filled. An unknown ID or a placeholder with no value is a bug, so it throws. */
export function copy(id: string, vars: CopyVars = {}): string {
  if (!has(COPY_LINES, id)) throw new Error(`copy: unknown ID "${id}"`);
  return COPY_LINES[id].replace(PLACEHOLDER, (_, key: string) => {
    if (!has(vars, key)) throw new Error(`copy: "${id}" needs {${key}}`);
    return String(vars[key]);
  });
}
