# Codex — V1 Backend Slice: Auth, Marketplace, Basic Role Functions

> **How to use:** paste into Codex in `backend/`. This builds on the **approved `Perx Backend Proposal v0.1`** plus the signoff corrections already agreed (recapped in §0 below so nothing is lost). This prompt scopes down to a focused, shippable slice — **not** the full package/wallet/ledger/AI loop. That's the next prompt, after this one is solid and the frontend is talking to it.

---

## 0. Recap of signoff corrections (apply these to your schemas/contracts before building)

- `Company` gains a `locale` field.
- `User` gains `avatarUrl` (or `initials`).
- `Package.status` enum will eventually gain `"expired"` as distinct from `"rejected"` — not relevant to this slice, but don't model anything that would block it later.
- `Company.walletBalance` is a denormalized projection; the ledger service (next slice) is its sole writer. For this slice, just store it — don't let any endpoint here mutate it directly except `POST /employer/wallet/fund` (see below), which writes a placeholder value for now (no ledger yet — that's next slice. Comment this clearly as temporary).
- Zod validation on every request/response. Not optional.
- `backend/contracts/api.ts` is the published contract mirror — keep it current as you build, this slice included.

---

## 1. Scope of this slice

Build and ship:

1. **Foundation** — Express + TypeScript + Mongoose + MongoDB connection, env, logging, `/healthz`, global error shape, auth middleware.
2. **Auth** — signup (for a new company, and for an employee joining an existing company) + login. Session tokens, role guards.
3. **Marketplace (employee)** — browse offers, view one offer, view active drops.
4. **Basic employer functions** — view own company + policy, list employees, a simple wallet "fund" action (placeholder, no ledger yet), view a static utilization stub (real numbers come once packages exist).
5. **Basic provider functions** — CRUD on the provider's own offers, list own offers.
6. **Seed script** producing a realistic, Albania-grounded dataset across all three roles.

### Explicitly OUT of scope for this slice (do not build)
- Package, PackageLine, Wallet, LedgerEntry, Voucher, Gift, Drop creation logic beyond seeding, Notification, AI endpoints.
- Any settlement, hold, or money-movement logic beyond the placeholder fund action noted above.
- Employer approval queue (there's nothing to approve yet).

This keeps the slice tight and demoable on its own: **you can sign up, log in, browse the catalog as an employee, see your company as an employer, and manage offers as a provider — fully real, fully wired.** The money loop is the next slice on top of this foundation.

---

## 2. Auth — signup and login

Two signup flows, because Company can be employer, provider, or both, and an employee must join an *existing* company rather than create one.

### `POST /auth/signup/company`

Creates a new Company (as employer and/or provider) plus its first admin User.

Request:
```ts
{
  companyName: string,
  country: string,
  currency: string,
  locale: string,
  roles: ("employer" | "provider")[],   // company can pick both — dual-role
  admin: {
    name: string,
    email: string,
    password: string
  },
  // only required if roles includes "employer":
  employerPolicy?: {
    perEmployeeAllowance: number,
    resetPeriod: "monthly" | "quarterly" | "annual",
    allowedCategories: string[],
    autoApproveThreshold: number
  },
  // only required if roles includes "provider":
  providerProfile?: {
    category: string,
    description: string,
    logoUrl?: string
  }
}
```

Behavior:
- Creates `Company` with `employerProfile` and/or `providerProfile` populated per `roles`.
- If `roles` includes `"employer"`, also creates the `EmployerPolicy` document.
- If `roles` includes `"provider"`, also creates a `Provider` document linked to the company (Provider stays a separate entity per the approved proposal).
- Creates the admin `User` with `roles` set to `employer_admin` and/or `provider_admin` matching the company's roles, `companyId` set.
- Returns a session token + the created user, same shape as login.
- Validation errors: `VALIDATION_ERROR`, `EMAIL_TAKEN`, `MISSING_EMPLOYER_POLICY`, `MISSING_PROVIDER_PROFILE`.

### `POST /auth/signup/employee`

An employee joins an *existing* employer company.

Request:
```ts
{
  name: string,
  email: string,
  password: string,
  companyId: string   // selected from a public list endpoint — see below
}
```

Behavior:
- Validates the target company exists and has an `employerProfile`.
- Creates the `User` with `roles: ["employee"]`.
- Creates an `EmployeeAllowance` for them immediately, using the company's `EmployerPolicy.perEmployeeAllowance` as `total`, `used: 0`, `held: 0`, `periodResetAt` computed from `resetPeriod` (now + 1 month/quarter/year as appropriate).
- Returns session token + user.
- Errors: `VALIDATION_ERROR`, `EMAIL_TAKEN`, `COMPANY_NOT_FOUND`, `COMPANY_NOT_EMPLOYER`.

### `GET /auth/companies?role=employer`

Public-ish (no auth required) — lets the signup screen list employer companies an employee can join. Returns `{ companies: Array<{ id, name, logoUrl? }> }`. Keep it minimal; don't leak policy details pre-auth.

### `POST /auth/login`, `GET /auth/me`

As specified in the approved proposal. No changes.

### Passwords

Hash with `bcrypt` (or `argon2` if you prefer — your call), never store plaintext, never return `passwordHash` in any DTO.

---

## 3. Marketplace — employee browse

As specified in the approved proposal, build now:

- `GET /offers?category=&q=` — auth: any logged-in user (employee primarily, but employer/provider admins may browse too).
  - Filter: `isActive: true`, unexpired, and if the requester is an employee, further filter to `category` ∈ their company's `EmployerPolicy.allowedCategories` and `currency` matching their company's currency. Employer/provider admins see the full unfiltered catalog (they're not constrained by a policy).
- `GET /offers/drops` — currently-active drops (`startsAt <= now <= endsAt`), same filtering rule as above for employees.
- `GET /offers/:id` — single offer with provider name populated.

`OfferDTO` exactly as specified in the approved proposal.

`GET /me/allowance` — as specified. This slice can compute `available = total - used - held` (held will always be 0 until the next slice adds package submission — that's fine, it's still correct).

---

## 4. Basic employer functions

- `GET /employer/company` — auth: `employer_admin`. Returns the company, its `EmployerPolicy`, and `walletBalance`.
  ```ts
  {
    company: { id, name, country, currency, locale, walletBalance },
    policy: { perEmployeeAllowance, resetPeriod, allowedCategories, autoApproveThreshold, currency }
  }
  ```
- `GET /employer/employees` — auth: `employer_admin`. Returns employees in the company with their allowance summary.
  ```ts
  {
    employees: Array<{
      id, name, email, avatarUrl?,
      allowance: { total, used, held, available, currency, periodResetAt }
    }>
  }
  ```
- `POST /employer/wallet/fund` — auth: `employer_admin`. Request `{ amount: number }`. **Temporary placeholder** — directly increments `Company.walletBalance` with no ledger entry (comment clearly: `// TEMP: replace with ledger fund operation in money-loop slice`). This exists so the employer demo isn't staring at a zero balance with no way to change it.
- `GET /employer/insights` — auth: `employer_admin`. For this slice, return only what's honestly computable without packages existing yet:
  ```ts
  {
    utilization: { totalAllocated: number, totalUsed: 0, totalHeld: 0, currency: string },
    popularCategories: [],   // empty for now — real data needs packages
    unusedCategories: [],
    suggestions: []
  }
  ```
  Don't fake numbers. An honest empty state is correct; a fabricated chart is a bug. The frontend will design around this explicitly (see the paired frontend prompt).

---

## 5. Basic provider functions

- `GET /provider/offers` — auth: `provider_admin`. Returns offers belonging to the requester's provider(s) (a company may have one Provider record — fetch via `companyId`).
- `POST /provider/offers` — auth: `provider_admin`. Request: `{ title, description, category, price, currency, imageUrl?, isLimited?, expiresAt? }`. Creates an `Offer` linked to the requester's `Provider`. Default `isActive: true`.
- `PATCH /provider/offers/:id` — auth: `provider_admin`, must own the offer. Partial update.
- `DELETE /provider/offers/:id` — auth: `provider_admin`, must own the offer. Soft-delete via `isActive: false` — **do not hard-delete**, vouchers/packages will reference offers in the next slice and we don't want dangling refs later.
- `GET /provider/company` — auth: `provider_admin`. Returns the company + provider profile (mirrors the employer one, simpler — no policy/wallet needed).

---

## 6. Seed script

Update/extend the seed to produce, deterministically:

- **~12 providers** across categories (Tirana-grounded, ALL pricing), each with 2–3 offers, matching what was used in the frontend's earlier fixtures (the names should ideally **match** what Claude Code already seeded in `frontend/lib/fixtures/offers.ts` — check that file if accessible, or use comparable Albania-grounded names, so the demo doesn't visibly "change" when fixtures are swapped for live data).
- **1 employer company** ("Acme Albania") with a funded wallet (2,000,000 ALL), policy (perEmployeeAllowance 20,000 ALL/quarter, autoApproveThreshold 3,000 ALL, broad allowedCategories), locale `sq`.
- **1 dual-role company** (employer + provider) demonstrating the internal-benefits case.
- **6 employees** under Acme Albania with varying allowance utilization (vary `used` even though packages don't exist yet — seed it directly for now so the employer dashboard isn't all-zero; comment that this is seed-only and will be derived from real ledger data once packages exist).
- **1–2 active Drops.**
- Known seeded login credentials for at least one user per role, printed to console on seed completion so they're easy to grab for manual testing and for the frontend's login screen demo affordance.

Provide `npm run seed` (full reset) — `seed:demo` can wait until the money loop slice where it actually matters more.

---

## 7. Contract publishing

Update `backend/contracts/api.ts` with every endpoint in this slice — Zod schemas for request/response, matching DTOs. This is what Claude Code will mirror into `frontend/lib/api/contracts.ts`. Keep field names identical to what's specified above; if you must deviate, flag it with `⚠ contract change` before shipping.

---

## 8. Definition of done for this slice

- `npm run seed` produces the dataset described above.
- Can `POST /auth/signup/company` as an employer, `POST /auth/signup/company` as a provider (or both at once), and `POST /auth/signup/employee` joining an existing employer — all three produce a working login.
- `POST /auth/login` + `GET /auth/me` work for every seeded account.
- `GET /offers` returns the seeded catalog with correct category/currency filtering by company policy.
- `GET /offers/drops` returns only currently-active drops.
- `GET /employer/company`, `GET /employer/employees`, `POST /employer/wallet/fund` all work and reflect in subsequent reads.
- `GET /provider/offers`, `POST /provider/offers`, `PATCH /provider/offers/:id`, `DELETE /provider/offers/:id` (soft) all work and are scoped to the requester's own provider — verify cross-provider access is rejected with `FORBIDDEN`.
- `backend/contracts/api.ts` is current and exported cleanly.
- No money-loop entities (Package, Wallet, LedgerEntry, Voucher) are touched by anything in this slice beyond schema existence if already created — if you haven't created those schemas yet, don't create them in this slice either; they belong to the next one.

When done, report back: the endpoints built, any `⚠ contract change` flags, the printed seed credentials, and anything you'd flag as a risk for the next slice (the money loop) given what you learned building this one.

Begin.
