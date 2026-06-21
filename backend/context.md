# Perx — Project Context (for Codex)

> **Read this end-to-end before writing any backend code.** It carries the strategic *why* behind every architectural decision, not just the *what*. Once you understand the reasoning, you'll be able to make sound calls on edge cases Claude Code and the frontend can't anticipate.
>
> **Your lane:** the Express + MongoDB backend, all business logic, all money math, all AI inference endpoints, auth, and the API contracts the frontend consumes. The Next.js frontend in `frontend/` is owned by Claude Code — do not touch it. The boundary lives in `frontend/lib/api/contracts.ts`; align to it.

---

## 1. What we're building and why

**Perx** is a two-sided employee-benefits marketplace built for JunctionX Tirana 2026, sponsored by TeamSystem. We chose this challenge out of five because it has the highest *business* ceiling (greenfield category in Albania, fintech upside, network effects) while still being executable in 48 hours.

The single-sentence product: **employees browse offers and build packages (single deals or multi-provider bundles); employers fund and approve those packages; payment routes directly from the employer to the providers — money never touches the employee.** That last clause is the entire economic engine of the category: in most of Europe, benefits delivered this way are tax-advantaged versus equivalent salary. Albania has almost none of this infrastructure yet, which is the market opening.

**Three things to internalize about the goal:**

1. **It must be Albania-grounded but globally architected.** Prices in **ALL (Albanian Lek, integer, no decimals)**, Tirana-realistic providers, sq/en strings, but the data model treats currency/locale/market as *configuration*, not assumptions. Hardcoding ALL or Albania anywhere is a bug.
2. **It must feel like a consumer app people reopen weekly.** The brief explicitly calls out that most benefits apps get opened once a quarter, and graded 15% on "would I reopen this next week?". This drives several backend features (drops, gifts, budget nudges) that look optional but are not.
3. **AI has to earn its place.** Graded 20%. We use it for two real things: a Concierge (conversational discovery) and Smart Bundling (multi-provider package optimization to budget + goal). Neither is a chatbot bolted on.

---

## 2. The judging rubric (this drives priorities)

We are scored on six criteria. The percentages are why we make the tradeoffs we make.

| Weight | Criterion | What it means for the backend |
|---|---|---|
| 20% | AI integration | Concierge + bundling must return real, structured, useful output — not vibes. |
| 20% | Innovation & creativity | The clever architectural moves (e.g. AI never does money math, packages as first-class objects, the wallet+ledger model) live here. |
| 20% | Implementation & technical execution | The loop must be **bulletproof**. A broken settlement on stage loses us the prize. |
| 15% | Experience & engagement | Drops, gifts, nudges, Wrapped — the "would I reopen this" features. |
| 15% | Two-sided marketplace flow | Browse → approve → split-pay → confirm must be complete and coherent. |
| 10% | International-ready, Albania-focused | Currency/locale as config; ALL + Tirana providers in the seed. |

**The hardest single rule we've adopted, derived from the rubric:** the backend is the load-bearing wall. If the AI hiccups live, the loop must still close. If a single feature is half-built, it must not break the loop. **A bulletproof core loop with two strong features beats a wobbly app with ten features.** Sequence accordingly.

---

## 3. The three actors and how they relate

There are three roles, but **a single Company entity can hold more than one role.** This is important.

- **Employee** — browses, builds packages, submits them, redeems vouchers. Has an *allowance* (credit), not cash.
- **Employer** — a Company that funds benefits for its staff. Has a wallet (real money it has put in), a policy (rules), and an approval queue. Approves or auto-approves packages.
- **Provider** — a Company that lists offers (gym, spa, restaurant, telecom, …). Receives settled payments when a package containing its offer is approved.

**Dual-role companies are explicitly supported.** A gym chain can be both an employer (funding perks for its own staff) *and* a provider (selling memberships to other companies' employees on the marketplace). A restaurant group can offer its own services to its own employees as a benefit — money loops internally; the company funds a wallet that pays itself-as-provider. This is realistic, a real go-to-market unlock ("a company with zero external providers can launch Perx day one"), and the data model should make it trivial — a Company has optional `employerProfile` and `providerProfile` sub-objects, either or both.

---

## 4. The core loop (what must work end-to-end)

```
1. Employee browses the marketplace                    GET  /offers
2. Employee builds a Package (1..N lines from 1..N providers — manually or via AI)
3. Employee submits the Package                        POST /packages/:id/submit
   → backend places a HOLD on their allowance equal to the package total
4. Employer reviews the Package                        GET  /approvals (employer)
   ├── if total ≤ employer policy auto-approve threshold → auto-approved instantly
   └── else employer approves or rejects               POST /packages/:id/approve | /reject
5. On approve:
   - HOLD is consumed
   - The total is SPLIT and SETTLED into N provider wallets, one per line
   - One Voucher is generated per line (code + QR payload)
   - Employee is notified, package status = settled
6. Employee shows voucher → provider scans → redeemed   POST /vouchers/:code/redeem
```

**This loop is what we demo on stage.** Every other feature (Concierge, Drops, Gifting, Wrapped, employer insights) sits *around* it. If forced to cut, cut the periphery; never weaken the loop.

---

## 5. The money model — the most important architectural decision

We model money as **wallets + an append-only ledger**. Balances are derived from / reconciled against the ledger; the ledger is the source of truth.

**Wallet types:**
- **Company wallet** — real funded balance the employer has put in (simulated; we don't connect a real payment rail).
- **Employee allowance** — *credit*, not cash. Has `total`, `used`, `held`, and a `periodResetAt`. The employee can never withdraw it; they can only spend it through the loop.
- **Provider wallet** — receivable balance, accumulates from settlements.

**Ledger operations (every one writes an immutable `LedgerEntry`):**
| Op | When | Effect |
|---|---|---|
| `fund` | employer tops up | company wallet ↑ |
| `allocate` | period reset / onboarding | employee allowance.total ↑ |
| `hold` | package submitted | employee allowance.held ↑ (reduces *available*); no money moves yet |
| `settle` | package approved | hold consumed; company wallet ↓; provider wallet ↑ — **one settle entry per package line** (this is the split) |
| `refund` | package rejected or voucher expired | hold released; if money already moved, reverse it |

**Available allowance = total − used − held.** This is what the frontend should display as "remaining"; never compute it client-side.

**Three rules that prevent half the bugs in this category:**

1. **Money never touches the employee wallet.** It moves company → (held against the employee allowance, which is just credit) → provider. The employee allowance is an *entitlement counter*, not a balance of cash.
2. **All settlements split per provider line.** A package with three lines from three providers produces three `settle` entries. The frontend says "paid to 3 providers" because the backend genuinely did three separate moves.
3. **The AI never does money math.** The LLM picks offers and writes reasoning; the backend computes every total, validates against budget, places the hold, settles. If the API hiccups, totals are still correct. This is in `CLAUDE.md` for the frontend too — it's a system-wide rule.

**A reconciliation check should be cheap to run:** for every wallet, sum the ledger entries and assert it equals the stored balance. Run it on every state-changing endpoint in development. It's the cheapest correctness tool you'll ever build.

---

## 6. The Package — a first-class object

A Package is the unit of intent that flows through the loop. **AI-bundled packages and manually-built carts produce the same object** — this is a deliberate convergence so the loop is built once.

**Lifecycle:**
`draft` → `pending` → (`approved` | `rejected`) → `settled` → (`redeemed` partially or fully)

- A package has 1..N `PackageLine`s. Each line = `{ offerId, providerId, price, currency }` (price snapshotted at selection time so offer-price changes don't break submitted packages).
- A package has a `source` field: `manual | ai`. This is shown in the UI as a quiet "Composed by Concierge" label; it also lets us track AI engagement.
- **Approval is all-or-nothing on the package**, not per line. Settlement splits per line. (Partial line approval is a nice stretch; not for V1.)
- A package is *the* unit you hold against. The total is `sum(lines.price)`; the hold is exactly that.

**Validation on submit (do not skip any):**
1. The package belongs to a real employee.
2. Total ≤ employee available allowance.
3. Every line's category is permitted by the employer policy.
4. Every line's offer is still active and not expired.
5. The company wallet has at least the package total (otherwise the employer hasn't actually funded the benefit and approval would fail).

If any check fails, reject with a specific human-readable reason — the frontend will show it verbatim.

---

## 7. The employer policy

Each Company-as-employer carries a `Policy` object that governs everything about its budget. This is what gives the employer their real role in the system; without it, "employer approval" is decorative.

```
EmployerPolicy {
  companyId,
  perEmployeeAllowance: integer,          // e.g. 20000 ALL
  resetPeriod: 'monthly'|'quarterly'|'annual',
  allowedCategories: Category[],          // e.g. ['wellness','food','learning']
  autoApproveThreshold: integer,          // e.g. 3000 ALL — packages ≤ this skip manual approval
  currency: 'ALL'|'EUR'|...               // per-market config
}
```

**The auto-approve threshold is doing more work than it looks.** It lets us demo *both* an instant frictionless purchase (under threshold) *and* a manager-routed approval (over threshold) in the same 90-second run. It's not just a feature — it's a stage choreography device. Make sure the seeded company has a threshold that produces both behaviors in the demo path.

---

## 8. AI — what we actually want from it

Two real surfaces. Both share the same engine.

### The Concierge
A conversational endpoint. Employee types something like *"plan me a relaxing weekend under 8,000 ALL"*. The backend:
1. Loads the employee's preferences, available allowance, allowed categories, and the catalog (filtered to what they can actually buy).
2. Calls the Anthropic API (Claude) with a system prompt that constrains it to **return JSON only**: a list of offer IDs, an overall one-line reason in editorial voice ("A quiet reset, comfortably under budget."), and a per-line reason for each.
3. **Validates every returned offer ID against the catalog** (filter out hallucinated IDs).
4. **Computes the total itself.** If the total exceeds the budget, the backend trims the lowest-priority line and retries — never asks the LLM to do the math.
5. Materializes the result as a real `Package(status=draft, source=ai)` that the employee can edit before submitting. It flows through the normal loop after that.

### Smart Bundling
Same engine, different prompt — given a goal ("relaxing weekend", "learning push", "family dinner") and a budget, optimize a multi-provider bundle. There's a single shared service; the Concierge is the chat surface, Bundling is the goal-and-budget surface. **Build one service, expose two endpoints.**

### Hard rules for AI code
- **Structured output is non-negotiable.** Use a JSON schema in the prompt, parse strictly, reject malformed responses with a fallback.
- **The LLM never computes prices, budgets, totals, or any number that gets shown to the user as truth.** It picks and explains; you calculate.
- **There must be a cached fallback** for the demo path. If the Anthropic API fails live on stage, the Concierge still returns a believable canned package and the loop still closes. This is a hard requirement, not a nice-to-have.
- **The Anthropic key lives server-side only.** Never exposed to the client.

---

## 9. Engagement features (the "reopen weekly" mechanics)

The brief grades stickiness explicitly. We build exactly four mechanics, each tied back to the spend loop (a side-game that doesn't drive spending is noise):

1. **The Drop** — time-boxed offers with a real `expiresAt`. Backend exposes a `GET /offers/drops` endpoint returning currently-active drops. Drops are seeded with realistic windows so some are active during the demo.
2. **Gifting** — an employee sends a credit or specific offer to a teammate, with a message. Settles through the same ledger (the sender's allowance.held increases; on claim, it moves to the recipient as either a credit or a redeemable voucher). Generates a notification — that notification *is* the re-engagement hook.
3. **Budget-burn nudges** — a background check that finds employees with significant unused allowance near a period reset and emits a notification suggesting 2–3 relevant offers. This *directly* cures the disease the brief calls out (people forgetting they have budget). Cheap to implement, high-rubric-payoff.
4. **Perx Wrapped** — a computed recap endpoint (saved amount, top category, "explorer" persona derived from category diversity). The frontend renders it as a shareable card. The backend only needs to compute the aggregates from the ledger; the visual is the frontend's job.

**Notifications** are an entity. Every gift, nudge, drop, and approval status change writes a `Notification`. The frontend polls or subscribes; you decide the transport (polling is fine for the demo — don't over-engineer with websockets unless trivial).

---

## 10. International readiness (the 10% that's mostly free)

We don't *build* multi-currency or multi-market — we *architect* for it and demo with Albania.

- Currency is a field on `Company` and `Offer`, not a constant. Display formatting is the frontend's job; backend stores integers in the smallest unit (ALL has no subdivision, so this is trivial).
- All user-facing strings are externalized — the backend returns codes/keys where text matters, or accepts a `locale` header on endpoints that return prose (e.g. AI reasoning is generated in the user's locale).
- The seed includes one extra Company configured for `EUR` and a different locale, so we can demo "flip a config, no rewrite" in the pitch. **We do not build full multi-market UI** — the architecture and the seed are the points we score.

---

## 11. Data model — entities and relationships

This is the agreed shape. Treat it as the contract. (Adapt to Mongoose schemas; keep field names and types stable.)

```
Company         { _id, name, country, currency, walletBalance,
                  employerProfile?: { ... }, providerProfile?: { ... } }

EmployerPolicy  { _id, companyId, perEmployeeAllowance, resetPeriod,
                  allowedCategories[], autoApproveThreshold, currency }

User            { _id, name, email, passwordHash, locale, preferences[],
                  roles: ('employee'|'employer_admin'|'provider_admin')[],
                  companyId }

EmployeeAllowance { _id, userId, companyId, total, used, held, periodResetAt }

Provider        { _id, companyId, name, category, country, logoUrl, description }
                  // a Provider belongs to a Company (because of dual-role)

Offer           { _id, providerId, title, description, category, price, currency,
                  imageUrl, isLimited, expiresAt, isActive }

Package         { _id, employeeId, status, source: 'manual'|'ai',
                  totalSnapshot, currency, aiReason?, createdAt, decidedAt? }

PackageLine     { _id, packageId, offerId, providerId, price, currency, aiReason? }

Wallet          { _id, ownerType: 'company'|'provider', ownerId, balance, currency }
                  // employee allowance is its own entity (it's credit, not a wallet)

LedgerEntry     { _id, type, amount, currency, fromWalletId?, toWalletId?,
                  packageId?, employeeAllowanceId?, createdAt, meta }

Voucher         { _id, packageLineId, code, qrPayload, status, redeemedAt? }

Gift            { _id, fromUserId, toUserId, offerId?, amount, currency,
                  message, status: 'sent'|'claimed'|'expired', createdAt }

Drop            { _id, offerId, startsAt, endsAt, badgeLabel }

Notification    { _id, userId, type, payload, read, createdAt }
```

**A few principles:**
- Money fields are **integer in the smallest unit** of their currency, paired with a `currency` field. No floats. ALL is already an integer-only currency, which is convenient.
- Every monetary state change writes a `LedgerEntry`. Balances without a corresponding ledger entry are bugs.
- Status enums use strings, not numbers — easier for the frontend to display and for you to grep.

---

## 12. API surface (the contract with the frontend)

The frontend reads from `frontend/lib/api/contracts.ts`. Keep request/response shapes in sync. A rough surface to plan against (you can add internals freely; don't change names/shapes without coordination):

**Auth**
- `POST /auth/login` — seeded accounts, returns session token + user with roles.
- `GET /auth/me` — current session.

**Catalog**
- `GET /offers?category=&q=` — filtered offers.
- `GET /offers/drops` — active drops.
- `GET /offers/:id`.

**Employee**
- `GET /me/allowance` — total/used/held/available, periodResetAt, allowedCategories.
- `GET /me/packages?status=` — history.
- `GET /me/notifications`.

**Packages**
- `POST /packages` — create a draft from a list of `offerId`s.
- `PATCH /packages/:id` — edit lines while `status=draft`.
- `POST /packages/:id/submit` — draft → pending, places the hold (or auto-approves + settles if under threshold).

**Employer**
- `GET /employer/approvals?status=pending`.
- `POST /packages/:id/approve` — settles to providers.
- `POST /packages/:id/reject` — releases the hold.
- `GET /employer/insights` — utilization, popular/unused categories, AI-suggested catalog additions.

**AI**
- `POST /ai/concierge` `{ message }` → `{ packageDraft, reason }` (server creates a real draft package, returns its id + the editorial reason).
- `POST /ai/bundle` `{ goal, budget }` → same shape.

**Vouchers**
- `POST /vouchers/:code/redeem` — provider-side redemption.

**Engagement**
- `POST /gifts` — send a gift; `POST /gifts/:id/claim`.
- `GET /me/wrapped` — computed recap from the ledger.

Everything returns JSON; errors use a consistent `{ error: { code, message } }` shape so the frontend can show specific reasons.

---

## 13. Seed data (the 90-second demo depends on it)

Seed Albania-first with:

- **~12 providers** across categories (wellness gym, spa, restaurants ×2, travel agency, language school, clinic, telecom, grocery, cinema, coworking) — real-feeling Tirana names, each with 2–3 offers priced in **ALL**.
- **One employer Company** ("Acme Albania") with a funded wallet (e.g. 2,000,000 ALL), a policy: perEmployeeAllowance 20,000 ALL/quarter, autoApproveThreshold 3,000 ALL, allowedCategories covering most of the catalog.
- **One dual-role Company** (e.g. a restaurant chain) demonstrating internal benefits.
- **6 employees** with allowances at varying utilization (one near reset with significant unused budget — for the burn-nudge demo).
- **1–2 active Drops** during the demo window.
- **One pending package** in the employer approval queue for the demo opener.

Provide a `npm run seed` for full reset, and a `npm run seed:demo` that produces the deterministic golden state for the stage run.

---

## 14. The 90-second demo this all serves

```
Employee logs in → personalized home + active Drop visible
→ opens Concierge: "plan me a relaxing weekend under 8,000 ALL"
→ AI returns a 3-provider package with reasoning, materialized as a draft
→ Employee submits
→ Switch to Employer: sees the pending package with the employee's budget meter
→ (Optional beat: a sub-threshold package auto-approves instantly to show both behaviors)
→ Employer approves
→ Backend settles split-payments to all 3 providers (3 ledger entries)
→ Employee sees 3 vouchers / stubs with QR
→ Flash Wrapped + employer insights
→ Close on the founder-vision pitch
```

**Everything you build should be in service of this run executing flawlessly.** When in doubt about scope: does this make the demo more reliable or more impressive? If not, defer it.

---

## 15. Working agreement with Claude Code (frontend)

- The contract is `frontend/lib/api/contracts.ts`. If you need to change a shape, *coordinate* — don't silently rename a field.
- The frontend may temporarily read from typed fixtures while your endpoints are still being built. That's fine — the fixtures mirror your shapes. When an endpoint goes live, the frontend swaps the fixture for a real call with no other change.
- Money is *displayed* by the frontend, *computed* by you. If you see a frontend file doing arithmetic on prices or budgets, that's a bug — flag it.
- The frontend has its own design system (`frontend/design.md`) — don't touch it. You may, however, push back on UI behavior that contradicts backend reality (e.g. "showing 'available' without subtracting holds is wrong").

---

## 16. Non-goals (saying these explicitly saves time)

- **No real payment integration.** All settlements are simulated through the ledger. The "payment" is a state transition + ledger entries.
- **No real KYC / production-grade auth.** Seeded accounts + a simple session token are enough. Do not pull in a heavy auth framework.
- **No real-time websockets.** Polling is fine for notifications during the demo. Skip the complexity unless trivially cheap.
- **No multi-currency UI** — currency is a field, the seed includes a non-ALL company to prove the architecture, but we don't ship a market-switcher.
- **No mobile app.** Web only. Frontend is mobile-responsive, which is enough.
- **No production hardening** beyond not embarrassing ourselves: input validation, parameterized queries, basic rate limits on AI endpoints. Skip the rest.

---

## 17. Order of build (suggested, adjust to your judgment)

1. **Schemas + connection + a healthy `/healthz`.** Models for everything in §11.
2. **Seed script** — the demo depends on it; build it early so endpoints can be tested against realistic data.
3. **Auth + `/auth/me`** — every other endpoint needs a session.
4. **Catalog endpoints** (`/offers`, `/offers/drops`). Unblocks the frontend.
5. **Wallet + ledger service** with reconciliation tests. **This is the load-bearing wall** — build it before anything that moves money.
6. **Allowance + `/me/allowance`.**
7. **Package CRUD + submit** (places the hold, runs all validations from §6).
8. **Approval endpoints** (auto-approve under threshold; manual otherwise; settle on approve; refund on reject).
9. **Voucher generation + redeem.**
10. **AI Concierge + Bundling** (with the cached fallback).
11. **Engagement: drops, gifts, nudges, wrapped, notifications.**
12. **Employer insights** (utilization, popular/unused, AI-suggested additions).
13. **Demo seed** + bug-bash on the full loop.

Stop at any point and the app should still demo through whatever's built — the loop closes by step 9, every step after that adds rubric points.

---

## 18. Brainstorm freely

This document is the brief, not a cage. If you see a sharper way to model something — a cleaner ledger schema, a better validation order, a smarter AI prompt structure, a tighter way to express the auto-approve choreography — propose it. The principles to hold onto are the ones in **bold** throughout this doc (especially §5's three money rules and §8's AI rules). Everything else is up for refinement.

The one thing not to over-engineer: **demo robustness beats elegance.** If a slightly uglier solution is more bulletproof under stage conditions, take it.
