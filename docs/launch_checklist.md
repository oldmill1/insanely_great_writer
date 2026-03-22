# Launch checklist

This checklist is for shipping Insanely Great Writer safely.

It focuses on two things:

1. making sure the app is actually ready for users
2. reducing avoidable security and anti-hacking mistakes during launch

## 1) Product readiness

- [ ] Confirm the production URL is correct: <https://insanely-great-writer-holy-fog-4587.fly.dev/>
- [ ] Confirm the latest launch branch has been merged to `main`
- [ ] Confirm the production deployment completed successfully on Fly.io
- [ ] Confirm the home page, login, registration, document flow, folders, notes, and shortcuts all work in production
- [ ] Confirm the `/up` health check returns success in production
- [ ] Confirm any launch copy, screenshots, and README links match the live product

## 2) Local verification before deploy

Run the expected checks from the repo root:

```bash
bin/rails test
bin/rubocop
bin/brakeman
```

Pre-launch verification:

- [ ] Test suite passes locally
- [ ] RuboCop passes or any remaining offenses are understood and intentionally deferred
- [ ] Brakeman results are reviewed and any high-severity findings are fixed before launch
- [ ] Database migrations are committed and `db/schema.rb` is up to date
- [ ] CSS builds cleanly with `bin/rails dartsass:build`

## 3) Authentication and account safety

This app uses Devise with `:confirmable`, so account flows matter for launch.

- [ ] Registration works end-to-end in production
- [ ] Confirmation emails are delivered successfully
- [ ] Password reset flow works end-to-end
- [ ] Login, logout, and session expiry behave as expected
- [ ] No test accounts, fake admins, or development shortcuts are left enabled
- [ ] Error messages do not leak sensitive details about accounts or the server

## 4) Secrets and configuration hardening

Do not launch until secrets and env vars are checked.

- [ ] `.env.development` is not committed
- [ ] No secrets appear in the git diff, repo files, screenshots, or PR text
- [ ] Fly secrets are set for all required mail and app values
- [ ] `SECRET_KEY_BASE` is set in Fly secrets
- [ ] Production uses the expected host and port values
- [ ] Any old, unused, or placeholder secrets have been removed or rotated
- [ ] Team members know not to share `.env.development` contents in issues, PRs, or chat

Required Fly secrets/config from current repo notes:

- `SMTP_ADDRESS`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_DOMAIN`
- `DEVISE_MAILER_SENDER`
- `SECRET_KEY_BASE`
- `APP_HOST=insanely-great-writer-holy-fog-4587.fly.dev`
- `APP_PORT=443`

## 5) Anti-hacking / security checks

These are the minimum anti-hacking checks worth doing before announcing the app publicly.

### App-level

- [ ] Run `bin/brakeman` and review findings seriously
- [ ] Verify authentication-required pages are not accessible when logged out
- [ ] Verify one user cannot access another user's documents, folders, notes, or shortcuts
- [ ] Verify deleted or hidden records are not still exposed through direct URLs
- [ ] Verify forms reject invalid input cleanly without stack traces or debug pages
- [ ] Verify Rails is not running with development settings in production
- [ ] Verify cookies are secure in production and the app is served over HTTPS only

### Abuse resistance

- [ ] Review login, registration, and password reset endpoints for brute-force risk
- [ ] Confirm there is no seeded/demo content in production that exposes internal information
- [ ] Confirm admin-only or maintenance-only scripts are not exposed via routes
- [ ] Confirm no debug endpoints, console tools, or development dashboards are public
- [ ] Confirm file uploads, attachments, or rich text inputs cannot be used to inject scripts

### Infrastructure

- [ ] Confirm Fly machine status is healthy after deploy
- [ ] Confirm logs do not contain secrets, passwords, tokens, or email credentials
- [ ] Confirm only expected ports/services are exposed publicly
- [ ] Confirm dependencies are current enough for launch and there are no known critical vulnerabilities left unaddressed

## 6) Email and domain safety

Because auth depends on email delivery:

- [ ] SMTP credentials are valid in production
- [ ] Registration and confirmation emails arrive in inboxes, not just spam
- [ ] Sender address is correct and intentional
- [ ] Domain/DNS mail records are configured correctly for the sending domain
- [ ] Email content does not expose internal environment details

## 7) Data safety and rollback readiness

The production app runs as a single Fly machine with SQLite on a Fly volume, so backup and rollback planning matter.

- [ ] Confirm there is a current backup plan for the Fly volume / SQLite data
- [ ] Confirm the team knows how to inspect production logs quickly
- [ ] Confirm the previous known-good deploy can be identified quickly if rollback is needed
- [ ] Confirm someone responsible is available during launch to respond to auth or deploy issues
- [ ] Confirm there is a plan for handling a bad migration or broken sign-in flow

## 8) Final launch gate

Only announce publicly when all of the following are true:

- [ ] Production deploy is live
- [ ] Core app flows were smoke-tested in production
- [ ] Auth emails work
- [ ] Security checks above were completed
- [ ] No critical Brakeman findings remain
- [ ] Secrets were reviewed and not exposed
- [ ] Backup / rollback plan is understood

## Suggested launch-day smoke test

1. Visit the production homepage.
2. Register a brand-new account.
3. Confirm the email arrives and the account can be confirmed.
4. Log in.
5. Create a document.
6. Create a folder and move through the desktop UI.
7. Log out and log back in.
8. Request a password reset and confirm it works.
9. Visit `/up` and confirm the app reports healthy.
10. Review Fly logs for any auth, mailer, or exception problems.

## Notes

This checklist is intentionally conservative. For a public launch, boring security hygiene beats cleanup-after-the-fact every time.
