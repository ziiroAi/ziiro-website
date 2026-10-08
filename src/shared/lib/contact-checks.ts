/**
 * (C) Contact checks shared by the S7 form and /api/funnel/lead (spec §4.4, §13.3).
 * No imports, so the browser bundle and the functions bundle the same file.
 */

/** Throwaway-mail domains, moved here unchanged from api/_lib.ts. */
export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email", "yopmail.com",
  "sharklasers.com", "guerrillamailblock.com", "grr.la", "guerrillamail.info", "spam4.me",
  "trashmail.com", "trashmail.me", "trashmail.net", "dispostable.com", "maildrop.cc",
  "10minutemail.com", "10minutemail.net", "10minutemail.org", "minutemail.com", "temp-mail.org",
  "fakeinbox.com", "mailnull.com", "spamgourmet.com", "spamgourmet.net", "discard.email",
  "mailnesia.com", "spamspot.com", "spamthisplease.com", "byom.de", "getnada.com",
  "anonaddy.com", "tempinbox.com", "tempr.email", "emailondeck.com", "getairmail.com",
  "filzmail.com", "zetmail.com", "mohmal.com", "owlpic.com", "cfl.fr",
  "spamfree24.org", "spamfree24.de", "spamfree24.eu", "spamfree24.info", "spaml.de",
  "spaml.com", "disigntime.com", "no-spam.ws", "antispam24.de", "wegwerfmail.de",
  "wegwerfmail.net", "wegwerfmail.org", "abcmail.email", "armyspy.com",
]);

const EMAIL_SHAPE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const MAX_EMAIL = 254;

export const isDisposableEmail = (email: string): boolean =>
  DISPOSABLE_DOMAINS.has((email.split("@")[1] ?? "").toLowerCase());

/** The rule /contact has always used, now shared with S7 and /api/funnel/lead. */
export const isValidEmail = (email: string): boolean =>
  EMAIL_SHAPE.test(email) && email.length <= MAX_EMAIL && !isDisposableEmail(email);

// eslint-disable-next-line no-control-regex -- matching control characters is the point: they're refused or stripped.
const CONTROL = /[\u0000-\u001f\u007f]/gu;
const LINK = /\b(?:https?:\/\/|www\.)\S*/giu;
const EMAIL_ADDRESS = /\S+@\S+/gu;
const WEB_ADDRESS = /[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,24}(?![\p{L}\p{N}])(?:\/\S*)?/gu;
const LONG_DIGITS = /(?:\p{Nd}[\s().-]?){7,}/gu;
const SPACES = /\s+/gu;

/**
 * §13.3: anyone can type any address, so an echo of their words or name must not carry
 * a link. Drops links, web and email addresses and runs of 7 or more digits, squeezes the
 * spaces, then cuts at max characters, the last one being "…".
 */
export const cleanEcho = (text: string, max: number): string => {
  const cleaned = text
    .replace(CONTROL, " ")
    .replace(LINK, " ")
    .replace(EMAIL_ADDRESS, " ")
    .replace(WEB_ADDRESS, " ")
    .replace(LONG_DIGITS, " ")
    .replace(SPACES, " ")
    .trim();
  const chars = Array.from(cleaned);
  return chars.length <= max ? cleaned : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
};

const MAX_NAME = 80;
const HAS_LETTER = /\p{L}/u;

/** The name as the emails print it (§13.3). */
export const cleanName = (raw: string): string => cleanEcho(raw, MAX_NAME);

/** 1 to 80 characters, with at least one letter left after cleaning (§13.2). */
export const isValidName = (raw: string): boolean => {
  const trimmed = raw.trim();
  return Array.from(trimmed).length <= MAX_NAME && HAS_LETTER.test(cleanName(trimmed));
};

const E164 = /^\+[1-9][0-9]{6,14}$/;
const PHONE_PUNCTUATION = /[\s().-]/gu;

export const isE164 = (value: string): boolean => E164.test(value);

/** "+91 98765 43210", "0091 98765 43210", or "098765 43210" with dialCode "+91" all give "+919876543210". */
export const toE164 = (raw: string, dialCode: string): string | null => {
  const compact = raw.replace(PHONE_PUNCTUATION, "");
  if (compact === "") return null;
  const international = compact.startsWith("+")
    ? compact
    : compact.startsWith("00")
      ? `+${compact.slice(2)}`
      : `${dialCode}${compact.replace(/^0+/u, "")}`;
  return isE164(international) ? international : null;
};
