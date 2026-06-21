# Perx — Design System

> **One line:** Ink-on-marble editorial, adapted for benefits. A near-monochrome white canvas, compressed high-contrast serif headlines, one violet accent, hairline borders, flat surfaces — but where Privy is cold crypto-fintech, Perx lets *offer imagery* carry warmth while the UI chrome stays disciplined. The restraint is what makes it not look AI-generated.

This file is the single source of truth for all frontend visual decisions. Derive every color, type, and spacing choice from here. If something isn't specified, choose the option most faithful to the thesis below — never reach for a generic default.

---

## 1. Design thesis

Perx is an employee-benefits marketplace that has to feel like a **consumer app people want to reopen**, not an HR portal opened once a quarter. The Privy reference gives us the anti-AI foundation: editorial typography, monochrome discipline, one accent. We keep that frame religiously. What we add is **life inside the frame** — real offer imagery, a tactile "benefit stub," and a few precise moments of motion.

**The personality:** quiet authority + small delight. The chrome whispers (ink, marble, hairlines); the content sings (a spa photo, a violet "approved" seal, a Wrapped recap). Boldness is spent in exactly one place — the **stub** (see §7 Signature) — and everything around it stays disciplined.

**Three deliberate deviations from Privy** (a senior designer's judgment, stated so they're intentional, not drift):
1. **Imagery is allowed — but only as content, never as chrome.** Offer cards carry real photography of gyms, food, spas, travel. This is the color and warmth a benefits app needs. The UI *around* the image stays pure ink-on-marble. (Privy bans lifestyle imagery; Perx's product *is* experiences, so the offer is the image.)
2. **Status is communicated typographically, not with a rainbow.** No green/red/orange status fills. Pending = Fog outline, Approved/Settled = Ink + a violet seal-dot, Rejected = Fog + strikethrough. More premium, stays monochrome.
3. **Dark sections are reserved for two surfaces only:** the employer dashboard and the Wrapped recap. Everywhere else is light. Dark is a sectional choice, never a theme toggle.

---

## 2. Color tokens

```css
--color-canvas:        #ffffff;  /* page bg, card surfaces, inputs */
--color-obsidian-ink:  #010110;  /* text, borders, icon strokes, PRIMARY buttons */
--color-carbon:        #111117;  /* dark section bg (employer dash, Wrapped) */
--color-graphite:      #22222a;  /* elevated dark cards */
--color-fog:           #73737c;  /* muted/secondary text, pending status */
--color-ash:           #d9d9d9;  /* hairline dividers, dot patterns, tracks */
--color-iris-pulse:    #635bff;  /* THE accent — links, active state, seals, key moments */
--color-deep-teal:     #072723;  /* artwork/illustration fills only — no UI role */
```

**Accent discipline (the rule that keeps it non-generic):** `#635bff` appears in exactly these contexts and nowhere else — the Drop band fill, link hover, active filter/tab, the "approved/settled" seal-dot, budget-meter fill, chart strokes, and the violet wax-seal on the stub. **Never** as a primary button fill (primary is always Ink `#010110`), never as body text, never as a large background wash.

**Surfaces:**
| Level | Use | Value |
|---|---|---|
| 0 Canvas | page background | `#ffffff` |
| 1 Card | offer cards, panels — distinguished by 1px hairline + 8px radius, not shadow | `#ffffff` |
| 2 Wash | dividers, dot patterns, meter tracks, inactive | `#d9d9d9` |
| 3 Carbon | dark section band | `#111117` |
| 4 Graphite | dark elevated card | `#22222a` |

**Elevation is never a shadow.** Hierarchy comes from tone shifts and hairline borders. No `box-shadow` on cards or buttons, ever. (One exception: a barely-there lift on offer-card hover via a 1px border darkening + 1px translateY — see §8 Motion.)

---

## 3. Typography

Two faces. The pairing *is* the brand — do not substitute the display face with a sans at large sizes.

- **Display / headings → `Fraunces`** (Google Fonts, free, variable). A high-contrast serif with real personality at display sizes; set it at a **restrained weight (400–450)** with **tight tracking (-0.03em)** and **tight leading (1.03–1.15)** so headlines read as dense blocks of ink — exactly Privy's compressed editorial feel, achieved with a free face. Use optical sizing (`opsz`) so large sizes get the high-contrast cut. *(Alternative if you want even more editorial bite: `Instrument Serif`.)*
- **Body / UI / data → `Inter`** (Google Fonts, free). Paragraphs, nav, buttons, captions, numbers. Tracking -0.02em. Weight 400 default, 500 for emphasis, 700 only for small all-caps labels/tags.

Load both via `next/font/google` and expose as `--font-display` and `--font-inter`.

### Type scale
| Role | Face | Size | Line-height | Tracking | Token |
|---|---|---|---|---|---|
| display | Fraunces 400 | 76px | 1.03 | -2.28px | `--text-display` |
| heading-lg | Fraunces 400 | 56px | 1.07 | -1.68px | `--text-heading-lg` |
| heading | Fraunces 400 | 38px | 1.15 | -1.14px | `--text-heading` |
| heading-sm | Fraunces 450 | 26px | 1.13 | -0.78px | `--text-heading-sm` |
| subheading | Inter 500 | 20px | 1.4 | -0.4px | `--text-subheading` |
| body | Inter 400 | 16px | 1.5 | -0.32px | `--text-body` |
| body-sm | Inter 400 | 14px | 1.5 | -0.28px | `--text-body-sm` |
| caption | Inter 400 | 12px | 1.4 | -0.24px | `--text-caption` |
| label | Inter 700 | 12px | 1.2 | 0.04em (UPPERCASE) | `--text-label` |

**Rules:** Display sizes (26px+) are always Fraunces — never Inter. Never bold the display face past 450; the tight tracking + light weight is the signature. Numbers in budgets/prices use Inter with `font-variant-numeric: tabular-nums` so ledgers align.

---

## 4. Spacing, radius, layout

**Spacing scale (px):** 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 48, 64, 80. Density: comfortable.

**Radius — only two values, never anything between:**
- **8px** → cards, images, inputs, panels, the offer card.
- **100px (full pill)** → all buttons and tags.
- (2px allowed for icon detail only.)
Mixing radii is the fastest way to look templated. Cards = 8, buttons = pill. That's it.

**Layout:**
- Page max-width **1200px**, centered, with full-bleed background bands (the Drop band and dark sections break the bleed).
- Section gap **80px**. Card padding **24px**. Element gap **12–16px**.
- Borders: hairline **1px** in `--color-obsidian-ink` at **10–15% opacity** for dividers/card edges. Colored borders are not used.

---

## 5. Voice & copy (copy is design material)

Write from the user's side of the screen. Plain verbs, sentence case, no filler.
- Buttons say what happens: **"Send for approval"**, **"Approve & pay"**, **"Add to package"** — not "Submit".
- An action keeps its name through the flow: the button that says "Approve & pay" produces a toast that says "Approved — paid to 3 providers".
- Empty states invite action: *"Nothing in your package yet. Start with something relaxing →"* not "No items."
- Errors are specific and unapologetic: *"That's 1,200 ALL over your remaining budget. Remove an item or swap for something cheaper."*
- The Concierge speaks like a sharp, warm colleague, never a chatbot: no "I'm happy to help!", no emoji walls.

---

## 6. Core components

Specs below are the contract. Build them once as primitives, reuse everywhere.

### Primary button
Fill `--color-obsidian-ink`, text `#fff` Inter 500 at 15px, tracking -0.02em. Padding 12px 20px. Radius 100px. No border, no shadow. Optional `→` glyph at 14px, 6px gap. Hover: slight fill lighten (to ~#1a1a22) + 120ms ease.

### Ghost button
Transparent fill, 1px `--color-obsidian-ink` border, Ink text Inter 500 15px. Same padding/radius. Hover: fill Ink, text inverts to white.

### Nav (per role)
White bg, 1px bottom border Ink @15%, height 64px. Logo left: 8px violet dot + "perx" in Inter 700 16px, tracking -0.02em. Center: role nav items (Inter 14–15px Ink). Right: account + role-switch pill (ghost). Employer/provider navs swap the center items but keep the frame identical.

### Offer card *(the workhorse — imagery lives here)*
8px radius, 1px hairline border, white surface, no shadow. Top: **offer image** (8px radius, 16:10), the only color in the component. Below, 16px padding: provider name in `--text-label` (uppercase Fog), offer title in Fraunces 450 ~20px, one-line description in body-sm Fog, then a footer row: price in Inter 500 tabular-nums + an "Add" ghost-pill. Hover: border darkens Ink @25% + 1px translateY, 120ms. Category shown as a single monochrome pill, violet only when it's the active filter.

### Filter pills
Pill (100px), 1px Ash border, Inter 14px Fog. Active: Ink fill, white text — OR violet fill for the single selected category. One active at a time reads cleanest.

### Budget meter *(editorial ledger line)*
A hairline horizontal track (Ash) with a violet (`--color-iris-pulse`) fill for spent/held, and a thin Ink tick for "held but not settled". Above it, tabular-nums: `12,400 / 20,000 ALL` with the label "remaining this quarter" in caption Fog. No rounded gauge, no donut chart — a flat ledger line. This is part of the editorial signature.

### Package builder
A right-side panel or sheet styled as the **stub** (§7). Each line = provider name (label), offer title, price (tabular-nums, right-aligned). Hairline dividers between lines. Total row in Fraunces. If AI-built, a small violet "Composed by concierge" label sits at the top. Primary action: **"Send for approval"** (or "Add & pay" if under the auto-approve threshold).

### Concierge surface
Editorial, not bubbly. User input in a single clean Inter field with a pill "Ask" button. Responses render as **real offer cards + one line of Fraunces reasoning** ("A quiet reset, comfortably under budget."), never a wall of chat text. Loading state: a hairline shimmer on placeholder cards, not a spinner.

### Approval card (employer)
White card, hairline border. Employee name (Fraunces 450 20px), their remaining budget as a mini budget-meter, the package lines, total. Two actions: **"Approve & pay"** (primary Ink) and **"Decline"** (ghost). On approve, animate the violet seal-dot stamping onto each line as the split-payment fires.

### Drop band (engagement)
Full-bleed violet `--color-iris-pulse` band above the nav, Inter 500 13px white, centered: limited-time copy + a countdown + a white-outline pill link. This is the *only* place a full violet fill is allowed. Reuse for "The Drop" feed header.

### Dark feature card (employer dashboard / Wrapped only)
Graphite `#22222a` on Carbon `#111117` section. 8px radius, 24–32px padding. Heading Inter 500 18–20px white, body Inter 400 14px Fog. Chart strokes in violet. Isometric line-art only if used — geometric, near-black-on-near-black, never playful.

---

## 7. Signature element — "The Stub"

Every product needs one thing it's remembered by. For Perx it's **the benefit stub**: vouchers and package summaries rendered as an **editorial perforated ticket** in ink-on-marble.

- A white card, 8px radius, with a **perforated edge** (a row of small Ash circles / dashed cut-line) separating the "benefit" half from the "code" half.
- Provider + offer set in Fraunces; price + dates in tabular Inter; the redemption **QR** sits in the stub half.
- A small **violet wax-seal dot** marks status: outline = pending, filled violet = approved & paid.
- Subtle paper texture allowed *only here* (a faint Ash dot pattern at ~8% opacity), nowhere else.

The stub ties the whole system to the real-world thing the app is about — a benefit you actually hold — and it's the one place we spend boldness. Wrapped reuses the stub language for its shareable recap.

---

## 8. Motion

Restraint is the brand. Too much motion is what makes UI feel AI-generated.
- **Page load:** headline settles in (8px rise + fade, 400ms, once). Nothing else animates on load.
- **Hover:** offer cards lift 1px + border darkens (120ms ease). Buttons shift fill (120ms).
- **The seal stamp:** when an employer approves, the violet seal-dot stamps onto each line in sequence (~80ms stagger) as the split-payment fires — this is the one orchestrated "moment". 
- **Drop countdown:** quiet tick, no flashing.
- Always respect `prefers-reduced-motion`: disable rises/stamps, keep instant state changes.

---

## 9. Quality floor (non-negotiable, every screen)

- Responsive to mobile (the employee experience is **mobile-first** — it shines on a phone).
- Visible keyboard focus rings (use a 2px violet ring, offset 2px).
- Reduced motion respected.
- Tabular numerals everywhere money appears.
- No raw spinners on the happy path — use hairline shimmer placeholders.
- Empty / loading / error states designed, not default.

---

## 10. Anti-AI-look checklist (run before calling any screen done)

- [ ] Headlines are **Fraunces at weight ≤450 with tight tracking** — not a bold sans.
- [ ] Exactly **one** accent (violet) on the screen, used only in its allowed contexts.
- [ ] **No drop shadows.** Hierarchy is tone + hairline.
- [ ] Only **two radii** (8px cards, 100px pills).
- [ ] No rainbow status colors — status is typographic + seal-dot.
- [ ] Color/warmth comes from **offer imagery**, not UI chrome or gradients.
- [ ] Copy is specific and active-voice, not "Submit / Learn more" filler.
- [ ] There's a clear **signature** moment on key screens (stub / seal / ledger meter).
- [ ] Generic hero pattern avoided (no "big number + gradient + three feature cards" default).
- [ ] Screenshot it (Playwright) and ask: *could this be any other app?* If yes, push one element further.
