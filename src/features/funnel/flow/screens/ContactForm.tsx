/**
 * (C) S7 (spec §4.3, §4.4, §10, §11.6): where the plan goes. Name and email required; phone optional, with its code
 * prefilled; an unticked consent box; the spam check. One self-contained piece, so it can move onto the plan (D23).
 * It stays mounted, hidden, while S8 plays, so a failed send comes back with every field kept.
 */
import { useEffect, type FormEvent } from "react";
import { LIMITS, TURNSTILE_ACTION, copy } from "@/features/funnel/data/light";
import { useTurnstile } from "@/shared/hooks/useTurnstile";
import { TURNSTILE_SITE_KEY } from "@/shared/lib/turnstile";
import { checkContact } from "../contact";
import { dialCodeFor, localTimeZone } from "../region";
import type { ContactField } from "../state";
import { PrivacyLink, Question, TopRow } from "../ui";
import type { ScreenProps } from "./types";

const ORDER: readonly ContactField[] = ["name", "email", "phone", "consent"];
const ID: Readonly<Record<ContactField, string>> = { name: "f-name", email: "f-email", phone: "f-phone", consent: "f-consent" };

export function ContactForm({ state, edit, env }: ScreenProps) {
  const widget = useTurnstile({
    siteKey: TURNSTILE_SITE_KEY, action: TURNSTILE_ACTION, appearance: "interaction-only", theme: env.boot.theme,
  });
  const dialCode = dialCodeFor(env.country, localTimeZone());
  const { contact, fieldErrors } = state;
  const firstError = ORDER.find((field) => fieldErrors.includes(field));
  const errorFor = (field: ContactField) => (fieldErrors.includes(field) ? copy(`s7.err.${field}`) : "");
  const focusFirst = (field: ContactField) => (firstError === field ? "" : undefined);
  const [privacy, adults] = copy("s7.links").split(" · ");

  useEffect(() => {
    // §4.4: the country code is prefilled from the visitor's country and stays editable.
    if (!contact.phone && dialCode) edit({ type: "contact", patch: { phone: `${dialCode} ` } });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- when a code becomes known
  }, [dialCode]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const check = checkContact(contact, dialCode);
    if ("fields" in check) {  // narrows under tsconfig.app.json (strict: false), where !check.ok does not
      edit({ type: "contactInvalid", fields: check.fields });
      document.getElementById(ID[check.fields[0]])?.focus();
      return;
    }
    env.send(widget, check.contact);
  };

  return (
    <form className="f-form" data-dir={state.dir} hidden={state.screen !== "s7"} noValidate onSubmit={onSubmit} aria-labelledby="f-s7-q">
      <TopRow screen="s7" />
      <Question id="f-s7-q">{copy("s7.q")}</Question>
      <p className="f-hint">{copy("s7.sub")}</p>

      <label className="f-label" htmlFor={ID.name}>{copy("s7.name")}</label>
      <input
        id={ID.name} className="f-field" type="text" autoComplete="name" maxLength={LIMITS.nameChars}
        placeholder={copy("s7.name.ph")} value={contact.name} aria-invalid={fieldErrors.includes("name")}
        aria-describedby="f-name-err" data-focus-first={focusFirst("name")}
        onChange={(event) => edit({ type: "contact", patch: { name: event.target.value } })}
      />
      <p id="f-name-err" className="f-err" aria-live="polite">{errorFor("name")}</p>

      <label className="f-label" htmlFor={ID.email}>{copy("s7.email")}</label>
      <input
        id={ID.email} className="f-field" type="email" inputMode="email" autoComplete="email" maxLength={LIMITS.emailChars}
        placeholder={copy("s7.email.ph")} value={contact.email} aria-invalid={fieldErrors.includes("email")}
        aria-describedby="f-email-err" data-focus-first={focusFirst("email")}
        onChange={(event) => edit({ type: "contact", patch: { email: event.target.value } })}
      />
      <p id="f-email-err" className="f-err" aria-live="polite">{errorFor("email")}</p>

      <label className="f-label" htmlFor={ID.phone}>{copy("s7.phone")}</label>
      <input
        id={ID.phone} className="f-field" type="tel" inputMode="tel" autoComplete="tel"
        value={contact.phone} aria-invalid={fieldErrors.includes("phone")}
        aria-describedby="f-phone-why f-phone-err" data-focus-first={focusFirst("phone")}
        onChange={(event) => edit({ type: "contact", patch: { phone: event.target.value } })}
      />
      <p id="f-phone-why" className="f-small">{copy("s7.phone.why")}</p>
      <p id="f-phone-err" className="f-err" aria-live="polite">{errorFor("phone")}</p>

      <div className="f-consent">
        <input
          id={ID.consent} type="checkbox" checked={contact.consent} aria-invalid={fieldErrors.includes("consent")}
          aria-describedby="f-consent-err" data-focus-first={focusFirst("consent")}
          onChange={(event) => edit({ type: "contact", patch: { consent: event.target.checked } })}
        />
        <label htmlFor={ID.consent} className="f-small">{copy("s7.consent")}</label>
      </div>
      <p id="f-consent-err" className="f-err" aria-live="polite">{errorFor("consent")}</p>

      <p className="f-small"><PrivacyLink label={privacy} /> · {adults}</p>
      <div ref={widget.hostRef} className="f-turnstile" />
      <p className="f-err" role="alert">{state.sendLine ? copy(state.sendLine) : ""}</p>
      <button type="submit" className="f-act">{copy("s7.btn")}</button>
    </form>
  );
}
