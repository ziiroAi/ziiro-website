/** (C) S7's checks (spec §4.4, D19): shape only, with the checks the server runs, imported from lane B's module. */
import { isValidEmail, isValidName, toE164 } from "@/shared/lib/contact-checks";
import type { CheckedContact } from "./screens/types";
import type { ContactDraft, ContactField } from "./state";

export type PhoneRead = { kind: "blank" } | { kind: "ok"; e164: string } | { kind: "bad" };

/** The phone box: blank (empty, or only the prefilled code), a number in E.164, or one that doesn't look right. */
export function readPhone(raw: string, dialCode: string): PhoneRead {
  const typed = raw.trim();
  if (typed === "" || typed === dialCode) return { kind: "blank" };
  const e164 = toE164(typed, dialCode);
  return e164 ? { kind: "ok", e164 } : { kind: "bad" };
}

export type ContactCheck = { ok: true; contact: CheckedContact } | { ok: false; fields: ContactField[] };

/** Every field at once, in the form's order, so focus can go to the first that failed (§10). */
export function checkContact(draft: ContactDraft, dialCode: string): ContactCheck {
  const name = draft.name.trim();
  const email = draft.email.trim();
  const phone = readPhone(draft.phone, dialCode);
  const fields: ContactField[] = [
    ...(isValidName(name) ? [] : (["name"] as const)),
    ...(isValidEmail(email) ? [] : (["email"] as const)),   // the disposable-address list included (§13.2)
    ...(phone.kind === "bad" ? (["phone"] as const) : []),
    ...(draft.consent ? [] : (["consent"] as const)),
  ];
  if (fields.length > 0) return { ok: false, fields };
  return { ok: true, contact: { name, email, ...(phone.kind === "ok" ? { phone: phone.e164 } : {}) } };
}
