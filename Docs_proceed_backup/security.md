# Security

> The security practices, tools and configs your app must apply. The AI reads this so
> security is built in from Phase 1 — not bolted on after a breach.
> Treat every checkbox as a gate before shipping.

## Authentication
- [ ] Auth provider: <Clerk / Supabase / Auth0 / custom JWT>
- [ ] Passwords hashed with <bcrypt / argon2> — never stored plain
- [ ] Sessions/tokens expire (<access: 15m, refresh: 7d>)
- [ ] Password reset + email verification flow

## Authorization
- [ ] Every protected route checks the user's role/ownership
- [ ] Users can only access their own data (row-level checks / RLS)
- [ ] Admin actions gated behind `role = admin`

## Input validation
- [ ] Validate + sanitize ALL input server-side (<zod / pydantic / joi>)
- [ ] Never trust client-side validation alone
- [ ] Parameterized queries / ORM only — no string-built SQL (SQL injection)
- [ ] Escape output to prevent XSS

## Secrets & config
- [ ] All secrets in `.env` / secret manager — never committed
- [ ] `.env` in `.gitignore`; provide `.env.example`
- [ ] Different keys for dev / staging / prod
- [ ] Rotate keys if ever exposed

## Transport & headers
- [ ] HTTPS everywhere (redirect http → https)
- [ ] CORS locked to known origins (not `*` in prod)
- [ ] Security headers: HSTS, X-Content-Type-Options, CSP
- [ ] Rate limiting on auth + write endpoints

## Payments / sensitive data (if applicable)
- [ ] Never store raw card data — use <Stripe / Razorpay> tokens
- [ ] PII encrypted at rest where required
- [ ] Audit log for sensitive actions

## Dependencies
- [ ] `npm audit` / `pip-audit` clean before release
- [ ] Dependabot / renovate enabled

## Pre-launch checklist
- [ ] No secrets in the repo history
- [ ] No debug/verbose errors leaked to users (see `error-handling.md`)
- [ ] Rate limits tested
