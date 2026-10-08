begin;

-- (C) Funnel schema v3.1, 7 Oct 2026. Neon Postgres via the Vercel Marketplace, aws-ap-southeast-1.
-- v3 (worker-4) replaced worker-4-schema.sql v2: email required, phone optional, no WhatsApp, typed text
-- in contacts, plan_emails added, calculator columns dropped (decision 18).
-- v3.1 (the merge) adds contacts.flag, plan_emails 'held' and 'sent_by_hand', and the visit columns
-- contact_errors, plan_depth, cta_from, plan_view, still_reason and discs_opened.
create table visits (
  id                 uuid primary key,                 -- crypto.randomUUID() in the browser
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  landing_path       text check (char_length(landing_path) <= 200),
  entry_intent       text check (char_length(entry_intent) <= 60),   -- search-page slug (phase 3)
  referrer_host      text check (char_length(referrer_host) <= 120),
  utm                jsonb,
  country            char(2),                          -- x-vercel-ip-country
  timezone           text check (char_length(timezone) <= 64),
  locale             text check (char_length(locale) <= 35),
  day_part           text check (day_part in ('morning','afternoon','evening')),
  theme              text check (theme in ('light','dark')),
  device_class       text check (device_class in ('mobile','tablet','desktop')),
  is_returning       boolean not null default false,
  segment            text check (segment in ('business','agency','freelance','starting','student')),
  non_owner_reason   text,                             -- S1b option id, never typed text
  business_type      text,                             -- S2 option id; 'other' when they typed one
  years_band         text,
  team_band          text,
  revenue_band       text,
  revenue_currency   char(3),
  chips              text[] check (cardinality(chips) <= 3),         -- chip ids, tap order
  input_mode         text check (input_mode in ('typed','chips','mixed','voice')),
  bucket_primary     text,
  bucket_secondary   text,
  bucket_scores      jsonb,
  template           char(1) check (template in ('A','B')),
  order_variant      text,
  tier               char(1) check (tier in ('S','M','L')),
  agent_ids          text[] check (cardinality(agent_ids) <= 9),     -- the plan's agents, scroll order
  job_ids            text[],
  classifier_version text,
  agents_version     text,
  last_step          text check (last_step in ('S0','S1','S1b','S2','S3','S4','S5','S6','S7','S8','S9')),
  seconds_to_result  integer check (seconds_to_result >= 0),
  contact_errors     text[] check (cardinality(contact_errors) <= 10 and contact_errors
                       <@ array['name','email','phone','consent','bot','rate','server','timeout']::text[]),
  plan_depth         smallint check (plan_depth >= 0), -- furthest block: 0 = "you need only", i = stop i, stops + 1 = close
  film_played        boolean not null default false,
  film_pct           smallint check (film_pct between 0 and 100),
  cta_clicked_at     timestamptz,
  cta_from           text check (cta_from in ('header','hero','close')),
  call_booked_at     timestamptz,                      -- set by hand (D21) until a booking tool reports back
  plan_view          text check (plan_view in ('motion','still')),                                  -- phase 1b
  still_reason       text check (still_reason in ('reduced_motion','save_data','slow_connection','unsupported','failed')),
  discs_opened       text[] check (cardinality(discs_opened) <= 7),  -- department ids, phase 1b
  bot_flag           boolean not null default false,
  notice_version     text not null
);

create table contacts (
  id                 uuid primary key default gen_random_uuid(),
  visit_id           uuid not null unique references visits(id) on delete cascade,
  created_at         timestamptz not null default now(),
  name               text not null check (char_length(name) between 1 and 80),
  email              text not null check (char_length(email) between 3 and 254),
  phone_e164         text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  business_other     text check (char_length(business_other) <= 80),   -- S2 "Other (type it)"
  problem_text       text check (char_length(problem_text) <= 600),    -- S6, typed
  matched_phrases    text[],
  consent_version    text not null,                    -- version of the exact s7.consent wording
  consent_at         timestamptz not null,
  flag               text check (flag in ('turnstile_unverified','turnstile_failed','rate_limited')),
  withdrawn_at       timestamptz
);

create table plan_emails (
  id                 uuid primary key default gen_random_uuid(),
  contact_id         uuid not null unique references contacts(id) on delete cascade,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  resend_id          text,
  status             text not null check (status in ('sent','failed','held','sent_by_hand','delivered','bounced','complained')),
  agent_ids          text[] not null,
  job_ids            text[] not null,
  error_name         text                              -- Resend's error name only, never a body
);

create index visits_created_idx      on visits (created_at desc);
create index visits_step_idx         on visits (last_step);
create index contacts_created_idx    on contacts (created_at desc);
create index contacts_email_idx      on contacts (lower(email));
create index contacts_flag_idx       on contacts (flag) where flag is not null;
create index plan_emails_status_idx  on plan_emails (status);

commit;
