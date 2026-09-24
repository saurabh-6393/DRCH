# Architecture

> Solution-level design. This is the map the AI reads before writing any code.
> Fill every `<...>` placeholder. Delete the example rows once you've written your own.

## 1. Overview
- **Product:** <one line — what does this app do and for whom>
- **Core value:** <the single most important thing it must get right>
- **Scale target (v1):** <e.g. 1k users, 100 req/min — keep it honest>

## 2. Tech stack
| Layer | Choice | Why |
|-------|--------|-----|
| Front-end | <e.g. Next.js + Tailwind> | <reason> |
| Back-end  | <e.g. Node/Express or FastAPI> | <reason> |
| Database  | <e.g. Postgres> | <reason> |
| Auth      | <e.g. Clerk / Supabase Auth / JWT> | <reason> |
| Hosting   | <e.g. Vercel + Railway> | <reason> |
| AI / LLM  | <e.g. Claude API> | <reason> |

## 3. System diagram (data flow)
Describe how a request travels front-end → back-end → data and back.
```
[ Client (browser/app) ]
        |  1. user action
        v
[ Front-end ]  --2. API call-->  [ Back-end / API ]
                                       |  3. query
                                       v
                                  [ Database ]
                                       |  4. result
        <--5. response------------------
```
- **Front-end responsibilities:** <UI, client state, calling APIs>
- **Back-end responsibilities:** <business logic, auth, validation, talking to DB/AI>
- **What NEVER happens on the client:** <secrets, DB access, trusting user input>

## 4. APIs (contract)
List every endpoint the front-end needs. Keep this in sync with the code.
| Method | Route | Purpose | Auth? |
|--------|-------|---------|-------|
| POST | `/auth/login` | Log a user in | no |
| POST | `/auth/signup` | Create account | no |
| GET  | `/me` | Current user profile | yes |
| POST | `/payments/charge` | Start a payment | yes |
| <...> | <...> | <...> | <...> |

## 5. Third-party integrations
- **Payments:** <Stripe / Razorpay — what triggers a charge>
- **Email/notifications:** <provider>
- **Other:** <analytics, storage, etc.>

## 6. Non-negotiables / constraints
- <e.g. must work offline-first, must be GDPR-safe, must load < 2s>

## 7. Open questions
- <things not decided yet — so the AI asks instead of guessing>
