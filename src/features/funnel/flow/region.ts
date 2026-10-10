/** (C) Where the visitor is, as far as the questions need: the device's time zone, and a dial code for S7 (§4.4, D10). */

let cachedZone: string | null | undefined;

/**
 * Asked on first use, never during the first render: the first Intl.DateTimeFormat loads ICU's
 * locale and zone data, ~30 ms on a phone profile (W15-E). S5's currency, S7's dial code and the saves ask.
 */
export function localTimeZone(): string | null {
  if (cachedZone === undefined) cachedZone = readTimeZone();
  return cachedZone;
}

function readTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** Dial codes for the countries visitors most likely come from, by ISO 3166 alpha-2. Others get no prefill. */
export const DIAL_CODES: Readonly<Record<string, string>> = {
  IN: "+91", US: "+1", CA: "+1", GB: "+44", AE: "+971", SA: "+966", QA: "+974", KW: "+965", OM: "+968", BH: "+973",
  SG: "+65", MY: "+60", ID: "+62", TH: "+66", VN: "+84", PH: "+63", HK: "+852", CN: "+86", JP: "+81", KR: "+82",
  TW: "+886", AU: "+61", NZ: "+64", NP: "+977", BD: "+880", LK: "+94", PK: "+92", DE: "+49", FR: "+33", ES: "+34",
  IT: "+39", NL: "+31", BE: "+32", CH: "+41", AT: "+43", IE: "+353", PT: "+351", SE: "+46", NO: "+47", DK: "+45",
  FI: "+358", PL: "+48", CZ: "+420", RO: "+40", GR: "+30", TR: "+90", RU: "+7", UA: "+380", IL: "+972", ZA: "+27",
  NG: "+234", KE: "+254", EG: "+20", MA: "+212", BR: "+55", MX: "+52", AR: "+54", CL: "+56", CO: "+57", PE: "+51",
};

const INDIA_ZONES: ReadonlySet<string> = new Set(["Asia/Kolkata", "Asia/Calcutta"]);

/** The country's code; India's when the country is unknown but the clock is India's; else "". */
export function dialCodeFor(country: string | null, timeZone: string | null): string {
  if (country) return DIAL_CODES[country.toUpperCase()] ?? "";
  return timeZone && INDIA_ZONES.has(timeZone) ? "+91" : "";
}
