// §6.3: every "Book a call" opens the same Calendly event, with their name and email filled in.
import { INTERIM_BOOKING_URL } from "../../pricing/entities/rates";

export function calendlyUrl(name: string, email: string): string {
  const params = [["name", name.trim()], ["email", email.trim()]]
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return params.length === 0 ? INTERIM_BOOKING_URL : `${INTERIM_BOOKING_URL}?${params.join("&")}`;
}
