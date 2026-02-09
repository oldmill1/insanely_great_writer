# Mail Deliverability Checklist (Porkbun)

## Goal
- Improve inbox placement for Devise emails (confirmation, reset password, unlock).

## 1) Sender Identity
- [ ] Use a real sender on your domain (example: `hey@manuscriptos.com`).
- [ ] Keep `DEVISE_MAILER_SENDER` on the same domain as `SMTP_USERNAME`.
- [ ] Prefer a dedicated sender (`no-reply@` or `auth@`) for auth traffic.

## 2) SPF
- [ ] In Porkbun DNS, add/update TXT record for SPF on root (`@`).
- [ ] Ensure exactly one SPF TXT record exists for the domain.
- [ ] Include the provider-authorized sending hosts only.
- [ ] End with `~all` during rollout, then consider `-all` once stable.

## 3) DKIM
- [ ] Enable DKIM in your email provider panel.
- [ ] Add the DKIM TXT/CNAME records exactly as provided.
- [ ] Wait for DNS propagation, then verify DKIM status is "enabled/passing."

## 4) DMARC
- [ ] Add TXT record at `_dmarc.yourdomain.com`.
- [ ] Start with monitoring mode:
  - `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; adkim=s; aspf=s`
- [ ] After observing healthy pass rates, move to `p=quarantine`, then `p=reject`.

## 5) App Config Checks
- [ ] `DEVISE_MAILER_SENDER` set to domain sender.
- [ ] `SMTP_ADDRESS`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_DOMAIN` are correct.
- [ ] `APP_HOST` points to the real app domain in production for valid confirmation links.

## 6) Content & Sending Hygiene
- [ ] Keep subject lines clear and not spammy.
- [ ] Keep HTML simple; include text alternative.
- [ ] Avoid link shorteners in auth emails.
- [ ] Use consistent From name/address over time.

## 7) Validation & Monitoring
- [ ] Send test confirmations to Gmail/Outlook/iCloud.
- [ ] Check headers for `SPF=pass`, `DKIM=pass`, `DMARC=pass`.
- [ ] Track spam placement over multiple days.
- [ ] Monitor DMARC aggregate reports (`rua`) and adjust policy.

## 8) Operational Notes
- [ ] If emails still land in spam, warm up sender volume gradually.
- [ ] Do not rotate sender addresses frequently.
- [ ] Re-check DNS after provider/domain changes.
