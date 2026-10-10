-- Saved queries (Neon console). Bot-flagged visits are left out wherever visits are counted.
-- 1. New leads, last 7 days
select c.created_at, c.name, c.email, c.phone_e164, c.flag, v.business_type, v.team_band, v.revenue_band,
       v.template, v.tier, v.agent_ids, p.status as plan_email
from contacts c join visits v on v.id = c.visit_id left join plan_emails p on p.contact_id = c.id
where c.created_at > now() - interval '7 days' order by c.created_at desc;
-- 2. Drop-off by step, last 30 days
select last_step, count(*) from visits
where created_at > now() - interval '30 days' and not bot_flag group by last_step order by last_step;
-- 3. Plan emails to send by hand: failed, or held because the lead was flagged (check a flagged one first)
select c.name, c.email, c.flag, p.status, p.created_at, p.error_name
from plan_emails p join contacts c on c.id = p.contact_id
where p.status in ('failed','held') order by p.created_at;
-- 4. Contact-step rule (decision 23, D23): share of real visitors reaching S7 who never sent it, first 30 days
select round(100.0 * count(*) filter (where last_step = 'S7') / nullif(count(*), 0), 1) as pct_leave_at_s7
from visits
where last_step in ('S7','S8','S9') and not bot_flag
  and created_at < (select min(created_at) from visits where not bot_flag) + interval '30 days';
-- 5. Leads and booked calls by template and tier, last 30 days
select v.template, v.tier, count(c.id) as leads, count(v.call_booked_at) as calls_booked
from visits v left join contacts c on c.visit_id = v.id
where v.created_at > now() - interval '30 days' and not v.bot_flag and v.template is not null
group by v.template, v.tier order by v.template, v.tier;
-- 6. Mark a plan email sent by hand ($1 = the lead's email)
update plan_emails set status = 'sent_by_hand', updated_at = now()
where contact_id = (select id from contacts where lower(email) = lower($1) order by created_at desc limit 1);
-- 7. Mark a call booked (D21): the Calendly booking's email matches a funnel lead
update visits set call_booked_at = now(), updated_at = now()
where id = (select visit_id from contacts where lower(email) = lower($1) order by created_at desc limit 1);
-- 8. Delete a person (D20); their plan-email row goes with it
delete from contacts where lower(email) = lower($1);
-- 9. Monthly clean-up (retention, D20)
delete from contacts where created_at < now() - interval '12 months';
delete from visits   where created_at < now() - interval '24 months';
