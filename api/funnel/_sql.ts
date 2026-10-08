// The SQL behind api/funnel/_db.ts (spec Appendix C). Each statement takes its row as one
// jsonb parameter, so a column's name and type live in one place: the record list.

const STEP_ORDER = "array['S0','S1','S1b','S2','S3','S4','S5','S6','S7','S8','S9']";

/**
 * One row per visit. A null leaves its column alone, last_step only moves forward, and the
 * row's taps come back for the lead alert (§7: "every answer").
 */
export const VISIT_UPSERT = `
insert into visits as v (
  id, landing_path, entry_intent, referrer_host, utm, country, timezone, locale, day_part, theme, device_class,
  is_returning, segment, non_owner_reason, business_type, years_band, team_band, revenue_band, revenue_currency,
  chips, input_mode, bucket_primary, bucket_secondary, bucket_scores, template, order_variant, tier, agent_ids,
  job_ids, classifier_version, agents_version, last_step, seconds_to_result, contact_errors, plan_depth,
  film_played, film_pct, cta_clicked_at, cta_from, plan_view, still_reason, discs_opened, bot_flag, notice_version
)
select
  r.id, r.landing_path, r.entry_intent, r.referrer_host, r.utm, r.country, r.timezone, r.locale, r.day_part, r.theme,
  r.device_class, coalesce(r.is_returning, false), r.segment, r.non_owner_reason, r.business_type, r.years_band,
  r.team_band, r.revenue_band, r.revenue_currency, r.chips, r.input_mode, r.bucket_primary, r.bucket_secondary,
  r.bucket_scores, r.template, r.order_variant, r.tier, r.agent_ids, r.job_ids, r.classifier_version, r.agents_version,
  r.last_step, r.seconds_to_result, r.contact_errors, r.plan_depth, coalesce(r.film_played, false), r.film_pct,
  case when r.cta_clicked then now() end, r.cta_from, r.plan_view, r.still_reason, r.discs_opened,
  coalesce(r.bot_flag, false), r.notice_version
from jsonb_to_record($1::jsonb) as r(
  id uuid, landing_path text, entry_intent text, referrer_host text, utm jsonb, country text, timezone text,
  locale text, day_part text, theme text, device_class text, is_returning boolean, segment text,
  non_owner_reason text, business_type text, years_band text, team_band text, revenue_band text,
  revenue_currency text, chips text[], input_mode text, bucket_primary text, bucket_secondary text,
  bucket_scores jsonb, template text, order_variant text, tier text, agent_ids text[], job_ids text[],
  classifier_version text, agents_version text, last_step text, seconds_to_result integer, contact_errors text[],
  plan_depth smallint, film_played boolean, film_pct smallint, cta_clicked boolean, cta_from text, plan_view text,
  still_reason text, discs_opened text[], bot_flag boolean, notice_version text
)
on conflict (id) do update set
  updated_at         = now(),
  landing_path       = coalesce(excluded.landing_path, v.landing_path),
  entry_intent       = coalesce(excluded.entry_intent, v.entry_intent),
  referrer_host      = coalesce(excluded.referrer_host, v.referrer_host),
  utm                = coalesce(excluded.utm, v.utm),
  country            = coalesce(excluded.country, v.country),
  timezone           = coalesce(excluded.timezone, v.timezone),
  locale             = coalesce(excluded.locale, v.locale),
  day_part           = coalesce(excluded.day_part, v.day_part),
  theme              = coalesce(excluded.theme, v.theme),
  device_class       = coalesce(excluded.device_class, v.device_class),
  is_returning       = v.is_returning or excluded.is_returning,
  segment            = coalesce(excluded.segment, v.segment),
  non_owner_reason   = coalesce(excluded.non_owner_reason, v.non_owner_reason),
  business_type      = coalesce(excluded.business_type, v.business_type),
  years_band         = coalesce(excluded.years_band, v.years_band),
  team_band          = coalesce(excluded.team_band, v.team_band),
  revenue_band       = coalesce(excluded.revenue_band, v.revenue_band),
  revenue_currency   = coalesce(excluded.revenue_currency, v.revenue_currency),
  chips              = coalesce(excluded.chips, v.chips),
  input_mode         = coalesce(excluded.input_mode, v.input_mode),
  bucket_primary     = coalesce(excluded.bucket_primary, v.bucket_primary),
  bucket_secondary   = case when excluded.bucket_primary is null then v.bucket_secondary else excluded.bucket_secondary end,
  bucket_scores      = coalesce(excluded.bucket_scores, v.bucket_scores),
  template           = coalesce(excluded.template, v.template),
  order_variant      = coalesce(excluded.order_variant, v.order_variant),
  tier               = coalesce(excluded.tier, v.tier),
  agent_ids          = coalesce(excluded.agent_ids, v.agent_ids),
  job_ids            = coalesce(excluded.job_ids, v.job_ids),
  classifier_version = coalesce(excluded.classifier_version, v.classifier_version),
  agents_version     = coalesce(excluded.agents_version, v.agents_version),
  last_step          = case
                         when coalesce(array_position(${STEP_ORDER}, excluded.last_step), 0)
                            > coalesce(array_position(${STEP_ORDER}, v.last_step), 0)
                         then excluded.last_step else v.last_step end,
  seconds_to_result  = coalesce(excluded.seconds_to_result, v.seconds_to_result),
  contact_errors     = coalesce(excluded.contact_errors, v.contact_errors),
  plan_depth         = greatest(v.plan_depth, excluded.plan_depth),
  film_played        = v.film_played or excluded.film_played,
  film_pct           = greatest(v.film_pct, excluded.film_pct),
  cta_clicked_at     = coalesce(v.cta_clicked_at, excluded.cta_clicked_at),
  cta_from           = coalesce(excluded.cta_from, v.cta_from),
  plan_view          = coalesce(excluded.plan_view, v.plan_view),
  still_reason       = coalesce(excluded.still_reason, v.still_reason),
  discs_opened       = coalesce(excluded.discs_opened, v.discs_opened),
  bot_flag           = v.bot_flag or excluded.bot_flag,
  notice_version     = excluded.notice_version
returning segment, business_type, years_band, team_band, revenue_band, revenue_currency`;

/** A visit's lead, if it has one, and its plan email's status (§13.2, the replay check). */
export const FIND_LEAD = `
select c.id, p.status
from contacts c left join plan_emails p on p.contact_id = c.id
where c.visit_id = $1::uuid`;

/** One contact per visit. A second insert for the same visit returns no row. */
export const CONTACT_INSERT = `
insert into contacts (visit_id, name, email, phone_e164, business_other, problem_text, matched_phrases,
                      consent_version, consent_at, flag)
select r.visit_id, r.name, r.email, r.phone_e164, r.business_other, r.problem_text, r.matched_phrases,
       r.consent_version, now(), r.flag
from jsonb_to_record($1::jsonb) as r(
  visit_id uuid, name text, email text, phone_e164 text, business_other text, problem_text text,
  matched_phrases text[], consent_version text, flag text
)
on conflict (visit_id) do nothing
returning id`;

/** Flagged contacts saved in the last hour, for the flood ceiling on team alerts (review H1). */
export const COUNT_RECENT_FLAGGED = `
select count(*)::int as n from contacts where flag is not null and created_at > now() - interval '1 hour'`;

/** One row per lead: sent, failed or held (§13.2, write 4). */
export const PLAN_EMAIL_INSERT = `
insert into plan_emails (contact_id, resend_id, status, agent_ids, job_ids, error_name)
select r.contact_id, r.resend_id, r.status, r.agent_ids, r.job_ids, r.error_name
from jsonb_to_record($1::jsonb) as r(
  contact_id uuid, resend_id text, status text, agent_ids text[], job_ids text[], error_name text
)
on conflict (contact_id) do nothing`;
