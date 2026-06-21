# Codex — Kickoff Prompt

> **How to use:** open Codex in `backend/` (the repo's backend folder) and paste everything below the `---`. The `context.md` file should already be at `backend/context.md` (move it there if it isn't). Claude Code is working on the frontend in parallel — this prompt is calibrated for that, and the boundary is enforced explicitly below.

---

## Welcome — you're the backend co-architect on Perx

You are the backend lead on a 48-hour build for **Perx**, a two-sided employee-benefits marketplace built for JunctionX Tirana 2026. A separate agent (Claude Code) is building the Next.js frontend in `frontend/` in parallel. Your job is the Express + MongoDB backend in `backend/`: all data modeling, business logic, money math, the AI inference endpoints, auth, and the API contracts the frontend consumes.

We are partners, not master/servant. I expect pushback when you see a sharper way to do something. I also expect discipline about the rules that are non-negotiable — they're called out in **bold** in `context.md` (especially §5 on the money model and §8 on AI). Everything else is open for refinement.

---

## Phase 0 — Read, then think, then propose. Do not code yet.

Before you write a single line, do these in order:

### 1. Read `backend/context.md` end-to-end.

It is the brief. It carries the strategic *why* behind every decision — not just *what* to build, but why we made the calls we made. Pay particular attention to:

- **§2 (the judging rubric)** — this is what we're optimizing for. Every architectural call should be defensible against it.
- **§4 (the core loop)** — this is what we demo on stage. If anything you build endangers this loop, that's a regression no matter how elegant.
- **§5 (the money model)** — wallets + an append-only ledger, with three rules that prevent half the bugs in this category. These rules are non-negotiable. Internalize them before modeling.
- **§6 (the Package as a first-class object)** — the design move that lets manual carts and AI bundles converge into one loop. Don't fragment them.
- **§8 (AI rules)** — structured output, the LLM never does money math, and a cached fallback is mandatory for the demo.
- **§11–§12 (data model and API surface)** — the agreed shape. This is the contract Claude Code is aligning the frontend to.

Read the whole document. Skimming it loses you the context that makes the rest of this prompt make sense.

### 2. Think hard, then write a **Proposal** document.

After reading, output a document — in chat, in markdown — titled `Perx Backend Proposal v0.1`. This is your design pass before any code. It should contain, in this order:

**A. Understanding check.** In ~150 words, state in your own words: what Perx is, what the core loop is, what the three money rules from §5 are, and what the AI rules from §8 are. If your understanding diverges from `context.md` anywhere, say so explicitly — that's the moment to surface it, not three commits in.

**B. Proposed data layer.** Mongoose schemas for every entity in `context.md` §11. For each, list: the fields with types, the indexes you'd add, and a one-line rationale for any field you've changed, added, or omitted from the spec. If you'd model something differently (e.g. a clearer way to express `Wallet` vs. `EmployeeAllowance`, a tighter way to track `held` against an allowance, a better shape for `LedgerEntry`'s `meta`), propose it here and explain why. Defaults should be sensible (timestamps, soft-delete flags only where they earn their place, `currency` paired with every money field).

**C. Proposed API contract.** Refine the surface from `context.md` §12 into a concrete OpenAPI-ish list: for each endpoint, the path, method, auth requirement, request shape, response shape, and error shapes. Keep names and field names stable with the spec — this is what Claude Code will type into `frontend/lib/api/contracts.ts`. If you think an endpoint shape is wrong, propose the change and call it out *explicitly* with a `⚠ contract change` tag so I notice and can sync the frontend.

**D. The money model, in your own words.** Walk through what happens to wallets and ledger entries during: (i) employer funds the company wallet, (ii) period reset creates allowances, (iii) employee submits a 3-line package, (iv) employer approves it, (v) employer rejects it, (vi) a voucher is redeemed (does money move here, or is that already done at settle?), (vii) a hold expires unconsumed. For each, list the ledger entries written and the balances mutated. If any of these is ambiguous in `context.md`, this is where you resolve it — and your resolution becomes the spec.

**E. The AI layer.** Describe how `/ai/concierge` and `/ai/bundle` work end-to-end: what context you load, what the system prompt looks like (paste a draft), how you constrain the output to JSON, how you validate offer IDs, how you handle the case where the LLM returns an over-budget bundle, and exactly what the cached-fallback path looks like for the demo. The Anthropic key is `ANTHROPIC_API_KEY` in env; never expose it client-side.

**F. Risks and questions.** A short list of things that worry you, ambiguities in the spec you couldn't resolve, and decisions you'd like me to make rather than guess at. Be honest — flagging a real risk is more valuable than papering over it.

**G. Proposed build order.** A refined version of `context.md` §17 in your own judgment. If you'd reorder, say why. Commit to a definition of "load-bearing wall green" — the moment after which everything else can be built in parallel by you or another agent.

### 3. Then STOP. Do not write code yet.

Wait for my signoff on the Proposal. I will read it, push back on the parts I disagree with, lock the contract, and tell you to proceed. Until then: **no models, no routes, no `npm install` beyond what's needed to lint the proposal itself**. The cost of an extra hour of thinking now is dwarfed by the cost of refactoring schemas after the frontend has started consuming them.

If you're unsure whether something belongs in the Proposal or in code, default to the Proposal. We can move fast once we've agreed; we can't move fast if we're un-agreeing later.

---

## Phase 1 — After my signoff, build in this order

(For reference — don't act on this section until I greenlight the Proposal.)

The principle: **the load-bearing wall first, the demo loop second, the rubric-boosters third.** Roughly:

1. **Foundation:** Express + TypeScript + Mongoose, env loading, structured logging, a `/healthz`, and a `mongo` connection. Add Zod (or your preferred validator) for request/response validation against the contract.
2. **Schemas + seed:** every model from your approved Proposal, plus a `npm run seed` that produces a realistic Albania-grounded dataset (`context.md` §13). Build the seed early — endpoints get tested against it.
3. **Auth + `/auth/me`:** seeded accounts, lightweight session token, role-aware middleware. No heavy auth framework.
4. **Catalog endpoints:** `GET /offers`, `GET /offers/drops`, `GET /offers/:id`. This unblocks Claude Code from fixtures and proves your shapes match the contract.
5. **Wallet + ledger service** (the load-bearing wall): the `fund / allocate / hold / settle / refund` operations as a single service with full reconciliation tests. **No money-moving endpoint goes live until this service is green.** Write the reconciliation check — for any wallet, sum the ledger entries and assert it equals the stored balance — and call it on every state-changing endpoint in dev.
6. **Allowance + `/me/allowance`** with the `available = total − used − held` derivation.
7. **Package CRUD + submit:** all validations from `context.md` §6, hold placement, and the auto-approve path for sub-threshold packages.
8. **Employer approval endpoints:** approve (settles split-payments per line), reject (refunds the hold).
9. **Voucher generation + redeem.** Loop is now closed end-to-end. **This is the moment we can demo.**
10. **AI: Concierge + Bundling** sharing one service. Structured JSON output, offer-ID validation, server-side total computation, **cached fallback for the demo path is mandatory.**
11. **Engagement:** drops, gifts, nudges, wrapped, notifications.
12. **Employer insights:** utilization, popular/unused, AI-suggested catalog additions.
13. **Demo seed + bug-bash:** harden the loop, scripted golden state for the stage run.

After step 9 the demo runs. Every step after that adds rubric points but is cuttable under time pressure.

---

## Phase 1+ — Working agreement while you and Claude Code build in parallel

These rules matter because we're shipping a real product on a deadline with two agents touching the same repo boundary.

### The contract is the only thing that can't drift silently.

The frontend reads from `frontend/lib/api/contracts.ts`. The backend's truth is your routes + Zod schemas. **If they diverge, the demo dies.** Two rules:

1. **Publish your shapes early.** As soon as the Proposal is signed off, generate a `backend/contracts/api.ts` (or equivalent — TypeScript types or a JSON schema) that mirrors every endpoint's request/response. Claude Code will import or mirror from it. Update it the moment a shape changes.
2. **No silent renames.** If you must change a field name or response shape after the Proposal is locked, flag it clearly in chat with `⚠ contract change: …` so I can sync the frontend before you ship the change. A 30-second heads-up prevents a 3-hour merge debugging session.

### The frontend is not your concern.

You do not touch `frontend/`. You do not "helpfully" write a sample React component to demonstrate an endpoint. You do not propose UI behavior. If you notice the frontend is doing something that contradicts backend reality (e.g. displaying `available` without subtracting `held`), flag it in chat — don't fix it, don't open the file.

### Money is computed here. Always.

Every total, every budget check, every settlement amount is computed in the backend and returned to the frontend as a number it displays. If you ever find yourself thinking "the frontend can just sum the lines" — no. Snapshot the total at submit-time, store it on the `Package`, and return it. This is both for correctness (prices can change between selection and submit) and for the architectural property we're scored on: the AI never does money math, and neither does the client.

### The AI must have a fallback path.

A cached, believable response that the Concierge endpoint can return when the Anthropic API is unreachable. This is not optional. Build it on day one with a flag like `?demo=1` or a fallback when the API errors. We will not lose the prize because of a flaky API on stage.

### Validation is at the door, not at the database.

Every endpoint validates its request with Zod against the contract before any business logic runs. Every response is validated against the contract before being sent. This catches contract drift the moment it happens and gives you free error messages the frontend can trust.

### Reconciliation is a feature, not a debug tool.

The ledger reconciliation check (for every wallet, summed entries = stored balance) runs on every money-moving endpoint in dev. If it fails, the endpoint returns a 500 with a clear error and refuses to commit. This makes financial bugs loud instead of silent — exactly what we want for a 48-hour build where a quiet bug compounds.

### Time honesty.

If you realize halfway through a feature that it's blocking the demo loop, stop and tell me. We cut features to protect the loop, not the other way around. The brief literally says "favor a working core loop over breadth" — that applies to you too.

---

## What I expect in your next message

Just the **Proposal** (sections A–G above), in chat, in markdown. No code. No `package.json`. No "I'll get started on schemas now."

Take the time to think before you write the Proposal — it's the highest-leverage hour of the whole 48. Quality of reasoning > speed.

When the Proposal is ready, post it. I'll read it carefully, push back where I disagree, lock the contract, and greenlight Phase 1.

Begin.
