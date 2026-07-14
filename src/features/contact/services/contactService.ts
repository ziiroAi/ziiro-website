/**
 * Contact service: external communication for the contact feature.
 * Stateless; throws on failure so the caller owns UI error handling.
 */
import { supabase } from "@/shared/services/supabase/client";
import type { ContactForm } from "../entities/contactForm";

export async function sendContactMessage(form: ContactForm): Promise<void> {
  const { data, error } = await supabase.functions.invoke("send-contact-email", {
    body: {
      name: form.name,
      email: form.email,
      phone: form.phone,
      company: form.company,
      message: form.message,
    },
  });
  if (error || data?.success === false) {
    throw error ?? new Error("Contact email failed");
  }
}
