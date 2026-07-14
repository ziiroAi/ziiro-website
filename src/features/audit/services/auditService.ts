/**
 * Audit service: external communication for the self-audit feature —
 * emailing results and checking a domain's mail records. Stateless.
 */
import { supabase } from "@/shared/services/supabase/client";
import type { AuditForm } from "../entities/audit";

interface AuditSubmission extends AuditForm {
  ratings: Record<string, number>;
}

export async function sendAuditEmail(submission: AuditSubmission): Promise<void> {
  const { data, error } = await supabase.functions.invoke("send-audit-email", {
    body: {
      name: submission.name,
      email: submission.email,
      industry: submission.industry,
      size: submission.size,
      ratings: submission.ratings,
    },
  });
  if (error || data?.success === false) {
    throw error ?? new Error("Audit email failed");
  }
}

/**
 * Whether a domain publishes MX records (can receive email), via
 * Cloudflare DNS-over-HTTPS. Resolves true on network failure so a
 * flaky lookup never blocks a legitimate address.
 */
export async function domainHasMX(domain: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`,
      { headers: { Accept: "application/dns-json" } },
    );
    const data = await res.json();
    return Boolean(data.Answer && data.Answer.length > 0);
  } catch {
    return true; // fall back to format-only validation
  }
}
