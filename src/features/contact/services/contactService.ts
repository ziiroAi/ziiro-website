/**
 * Contact service: external communication for the contact feature.
 * Posts to the Vercel serverless endpoint (/api/send-contact), which emails
 * the team via Resend. Stateless; throws on failure so the caller owns UI
 * error handling.
 */
import type { ContactForm } from "../entities/contactForm";

export async function sendContactMessage(form: ContactForm): Promise<void> {
  const res = await fetch("/api/send-contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company,
      message: form.message,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error ?? "Contact email failed");
  }
}
