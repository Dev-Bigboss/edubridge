---
inclusion: always
---

# Open blockers and PO decisions

This file is the single source of truth for unresolved decisions.
When a decision is made, move it to the **Resolved** section and update the relevant code/CONVENTIONS.md.
Kiro reads this every session so it never re-asks about resolved items and never builds against an unresolved
one without noting the assumption clearly.

---

## Unresolved (do not build these without a decision)

### PRC-6 — Tax handling
**Blocker for:** discount codes, tax in every price breakdown, multi-currency checkout.
**Question:** Does Stripe calculate tax automatically (Stripe Tax), or do admins set rates by country?
**Impact:** Stripe Tax is simpler and self-maintaining; manual rates need admin upkeep and carry compliance risk.
**Status:** Awaiting PO answer. Frontend placeholder `tax_amount: 0` exists in `PriceBreakdown`.

### COH-2 — Waiting lists
**Blocker for:** waitlist enrolment flow on full cohorts.
**Question:** Is the waiting list optional or required at launch? The COH-2 spec marks it optional.
**Status:** Awaiting PO answer.

### REC-4 — Recording transcripts
**Blocker for:** transcript display on recordings.
**Status:** Unblocked: Zoom confirmed (see Resolved). Transcripts come from Zoom's cloud recording audio transcript; needs Zoom cloud recording with transcription enabled on the account.

### OTO-11 — Calendar sync
**Blocker for:** `.ics` download is built. Full two-way calendar sync (Google/Outlook OAuth) needs:
1. Which calendar providers to support at launch?
2. Does the platform manage the OAuth flow, or does the user paste a webhook URL?
**Status:** Partial — `.ics` download exists. OAuth sync awaiting PO answer.

### COH-1 / teach/trainings — Who creates cohorts?
**Blocker for:** `/teach/trainings` page and instructor cohort-creation flow.
**Question:** Can instructors create their own cohorts, or only admins?
**Status:** Awaiting PO answer. Placeholder page is live at `/teach/trainings`.

---

## Resolved

### PRC-6 — Currencies (26 Nov 2026)
USD only at launch: prices are set, shown and charged in USD. Multi-currency display is not built for launch.
Tax handling (Stripe Tax vs admin-set rates) is still open, above.

### Video provider (26 Nov 2026)
Zoom. Meeting links, recordings and transcripts come from the Zoom API.

---

## Assumptions made where the SRS is silent

The full list of 79 choices is in `contracts/CONVENTIONS.md`. Key ones that affect the frontend:

- Commission rate placeholder: 15% (changeable in platform settings).
- Cancellation cut-offs: learner gets 100% refund >48 h before, 50% >24 h, 0% <24 h.
- Instructor cancellation: learner gets 100% refund regardless of timing.
- Booking expiry: 24 h for the instructor to accept (changeable in platform settings).
- Recording retention: 12 months (changeable in platform settings).
- Minimum payout: $50.
- Earnings hold: 7 days after session end before the instructor can pay out.

---

## Phase status

| Phase | Status |
|---|---|
| Phase 1 — Catalogue, cohorts, enrolments, payments | Shipped |
| Phase 2 — One-on-one bookings, pricing, resources, recordings | Shipped |
| Phase 3 — Earnings, messages, notifications, moderation, admin dashboard | Shipped (gaps filled) |
| Phase 3 remainder — PRC-6 (discounts, tax) | Tax blocked; currency settled as USD |
| Phase 4 — Calendar sync, instalments, waiting lists, transcripts, recommendations, resource tracking | In progress |

### Phase 4 items without blockers (build these now)
- **Training recommendations** — onboarding answers already stored; no PO dependency.
- **Resource download tracking (RES-5)** — small, no blockers.
- **Calendar sync `.ics`** — already built. Full OAuth sync is blocked; skip for now.

### Phase 4 items with blockers (skip until PO answers)
- Paying in instalments (PAY-3) — depends on PRC-6 currency/tax decisions.
- Waiting lists (COH-2) — PO optional/required question.
- Recording transcripts (REC-4) — video provider needed.
- Full calendar OAuth sync (OTO-11) — provider + OAuth flow decision.
