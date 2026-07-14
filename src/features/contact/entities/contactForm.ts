/**
 * Contact form entity: the data shape and its validation rules,
 * independent of any UI or transport concern.
 */

export interface ContactForm {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  consent: boolean;
}

export const emptyContactForm: ContactForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  message: "",
  consent: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns a map of field -> error message; empty when the form is valid. */
export function validateContactForm(form: ContactForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.name.trim()) e.name = "Required";
  if (!form.email.trim() || !EMAIL_RE.test(form.email)) e.email = "Valid email required";
  if (!form.company.trim()) e.company = "Required";
  if (!form.message.trim()) e.message = "Required";
  if (!form.consent) e.consent = "Required";
  return e;
}
