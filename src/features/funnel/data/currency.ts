// §5.3 and D10: rupees or dollars. It sits in the light entry, because S5 needs it before the plan loads.
import type { Currency } from "./contract.js";

const INDIA_TIME_ZONES: ReadonlySet<string> = new Set(["Asia/Kolkata", "Asia/Calcutta"]);

/** Rupees when the country is India. With no country, the device's time zone decides. */
export function currencyFor(country: string | null, timeZone: string | null): Currency {
  const code = (country ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) return code === "IN" ? "INR" : "USD";
  return timeZone !== null && INDIA_TIME_ZONES.has(timeZone) ? "INR" : "USD";
}
