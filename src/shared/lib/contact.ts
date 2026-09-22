/**
 * The one address the site publishes.
 *
 * There used to be two, aniket@ and govind@ on ziiro.work, hard-coded as a
 * two-element array in four separate files. Docs' copy carried the comment
 * "Copied from src/pages/Contact.tsx", which is the drift problem stating
 * itself out loud: four places to edit and no way to tell whether they still
 * agreed. With a single address that duplication is no longer worth keeping,
 * so every client-side consumer reads this.
 *
 * NOTE THE DOMAIN. This is ziiroai.com, and the site is ziiro.work. That is
 * deliberate per the request, but it has one consequence nobody can fix from
 * this file: Resend will only send FROM a domain verified in its dashboard, so
 * `RESEND_FROM` cannot become this address until ziiroai.com is verified there.
 * Until then the endpoint falls back to Resend's sandbox sender. Receiving is
 * unaffected: TEAM_INBOX can be this address today.
 *
 * api/_lib.ts keeps its own copy on purpose. It is a Vercel edge function
 * outside tsconfig.app.json and it cannot resolve the `@/` alias, so importing
 * this would break the build rather than sharing anything.
 */
export const CONTACT_EMAIL = "contact@ziiroai.com";

/** `mailto:` for the one address, with an optional subject. */
export const mailto = (subject?: string) =>
  subject
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${CONTACT_EMAIL}`;
