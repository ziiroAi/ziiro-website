# Security Policy

This covers [ziiroai.com](https://ziiroai.com), ziiro.work, their subdomains, and the code in this repository.

## Reporting a vulnerability

Report it privately. Please do not open a public issue, and please do not post details anywhere public before a fix is live.

Two ways to reach us:

1. **Email** contact@ziiroai.com, with "Security" in the subject line.
2. **GitHub private vulnerability reporting.** If it is enabled on this repository, use the "Report a vulnerability" button on the Security tab. The report stays private to the maintainers.

<!--
TODO (maintainers), contact address:
The address above is the one published on the site, so it is known to be the
right destination. There is still no security@ alias on any domain as far as
this file's author could confirm. If you want that dedicated address, create or
alias it at the mail provider FIRST, check that someone actually reads it, and
only then swap it in here. Do not publish an address that does not deliver.

TODO (maintainers), GitHub reporting:
Private vulnerability reporting is a repository setting and it is off by
default. Someone with admin rights has to enable it in this repo's security
settings, or option 2 above sends people to a button that is not there.
-->

Useful things to include:

- What the issue is, and what someone could actually do with it.
- The exact URL, endpoint, or file.
- Steps to reproduce. A request, a short script, or a screenshot is ideal.
- Anything we need to match your setup, such as browser or operating system.

One clear paragraph beats a scanner export.

## What to expect

We are a small team, so here is what we can honestly commit to:

- A first response within a few business days.
- In that response: whether we could reproduce it, whether we think it is in scope, and what we plan to do.
- An update when it is fixed, and credit in the fix if you want it.

We do not run a bug bounty and we cannot pay for reports.

## Scope

**In scope**

- ziiroai.com, ziiro.work and their subdomains.
- The code in this repository, including the Vercel edge functions under `api/`.

**Out of scope**

- Volumetric denial of service, traffic floods, and any test that degrades the site for other visitors.
- Spam or rate-limit probing of the contact endpoint. The rate limiting there is deliberately best effort, so a report that it can be bypassed tells us nothing new.
- Raw automated scanner output with no demonstrated impact. That includes missing header and outdated dependency findings with no working exploit path against this site.
- Social engineering of staff, phishing, and anything aimed at a person rather than at the system.
- Physical attacks, and anything needing physical access to someone's device.
- Issues in third-party services we use but do not run, including Vercel, Resend, and Calendly. Report those to the vendor, who can actually fix them.
- Self-XSS, clickjacking on pages with no sensitive action, text or content injection, and mail configuration reports with no demonstrated spoofing.
- Anything that needs a compromised device, a modified browser, or a network position the attacker controls.

## What is actually at risk

Worth saying plainly, so you can judge severity before spending a weekend on this.

- There are no user accounts, no login, and no passwords.
- The site takes no payments. Booking goes to Calendly and anything payment related happens there, on their domain.
- There is no database. The site stores nothing about visitors, and it sets no analytics or tracking cookies.
- The site sends no email. There is one endpoint, and it does not take submissions of any kind.
- `GET /api/geo` returns a two-letter country code read from a Vercel request header, for regional pricing. It stores nothing.
- Server secrets live in Vercel environment variables and are not part of the client bundle.

So there is very little data at risk: the site collects nothing from visitors and stores nothing about them. The classes we care most about are anything that changes what visitors see and anything that reaches our build or deploy pipeline.

## Safe harbour

If you follow this policy, we will treat your research as authorised and we will not pursue legal action over it.

The conditions are the usual ones:

- Only touch data that is yours. If you come across anyone else's personal data, stop, do not keep a copy, and tell us.
- Do not degrade the service. No floods, no scanning heavy enough to hurt the site, nothing destructive.
- Use the least access needed to show the problem. Do not pivot further in, do not maintain access, and clean up anything you leave behind.
- Give us reasonable time to fix the issue before you publish, and tell us when you plan to disclose so we can work to it.
- Stay within the law.

This policy cannot grant you permission to test third-party services, and it does not override their terms.

If you are unsure whether something is allowed, ask first. We would rather answer a question than read an apology.

Last reviewed: 19 September 2026.
