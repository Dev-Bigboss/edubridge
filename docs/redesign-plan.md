# EduBridge → LMP redesign plan (frontend-first)

Source of truth: *Software Requirements Specification: Learning Management Portal (LMP) v0.1, 2 Oct 2026*.
Every screen, component and API call in this plan traces back to an SRS requirement ID (TRN, COH, OTO, PRC, ONB, PAY, REC, RES, FDB, MSG, NTF, ADM). If something is not in the SRS, it does not ship without a written decision.

---

## 1. Where we are today

| Area | Current EduBridge | SRS expects | Gap |
|---|---|---|---|
| Stack | Next 13.4 pages router, JS, Eduvalt theme (Bootstrap + 10 template CSS files, AOS, WOW, GSAP, slick, swiper, cursor effect, 1 s fake preloader) | Responsive, WCAG 2.2 AA, p95 < 3 s, i18n-ready | Template weight and a11y debt; not worth incremental fixing |
| State | Redux (template leftovers) + 2 identical Zustand stores + `react-query` v3 **and** `@tanstack/react-query` v5 | n/a | Duplicated libraries |
| Auth | JWT in a JS-readable cookie, token logged to console, no route guards, admin redirect points to a page that does not exist | RBAC, MFA for Admin/Instructor, email verification, Google login, consent capture (ONB-1, ONB-4) | Security rework |
| Domain | Mentor/mentee + "subjects"; booking status `confirmed`/`cancelled` | Training × Category × Modality, Cohorts, Sessions, 1:1 booking state machine | Core model is different |
| Money | Internal wallet (fund wallet, stored cards, withdraw) | Gateway checkout, authorise/capture for 1:1, refunds, receipts, instructor earnings ledger (PAY-1..8) | **Wallet is not in the SRS** (see decision D3) |
| Pricing | None | PricingRule matrix, overrides, versioning, discounts, breakdown (PRC-1..7) | Missing |
| Admin | All 7 pages use hard-coded mock data | Config screens, reporting, audit log (ADM-1..5) | Missing |
| Missing entirely | | Catalogue with filters, cohorts, availability, recordings, resources, feedback/reviews, notifications, onboarding wizards, audit log | |

**Conclusion:** the reusable parts are small (some page layouts, API wiring pattern, lucide icons, sonner). Recommendation is a **clean rebuild in the same repo** on a long-lived branch, not a refactor of the template.

---

## 2. Decisions

**Status (19 Nov 2026): D1–D10 confirmed.** The Product Owner wants to keep the current visual design, so the rebuild ports the existing look onto the new stack (see §5). Open questions in §8 remain open.

| # | Decision | Agreed approach | Why |
|---|---|---|---|
| D1 | Rebuild vs refactor | Rebuild on branch `redesign/lmp` in this repo, keep old app on `main` until cutover. Keep the current visual design | Domain model and stack both change; PO approves the existing look |
| D2 | Stack | Next.js 16 (App Router, Turbopack, Cache Components) + React 19 + TypeScript on Node 22 LTS, Tailwind v4 + shadcn/ui (Radix primitives), TanStack Query v5, react-hook-form + zod, `next-intl`, `date-fns` + `@date-fns/tz`, MSW, Vitest + Testing Library, Playwright + axe | Radix gives accessible dialogs/menus for WCAG 2.2 AA; TS + zod lets API types be shared with backend; MSW lets us build before the backend exists |
| D3 | Wallet | Remove. Replace with gateway checkout, learner payment history + receipts, and instructor earnings ledger | SRS PAY-1/2/4 require gateway capture; a wallet adds a stored-value liability not in scope. Confirm with Product Owner |
| D4 | Auth tokens | Backend sets httpOnly, Secure, SameSite cookies (access + refresh); frontend never touches the token | NFR Security, OWASP |
| D5 | Role names | Use SRS names in UI and API: `LEARNER`, `INSTRUCTOR`, `ADMIN` (drop `teacher`/`student`/`mentor`/`mentee`) | One vocabulary across FE, BE, QA |
| D6 | API style | REST + OpenAPI 3.1 (SRS allows REST or GraphQL and requires OpenAPI docs) | Simplest contract to mock and hand over |
| D7 | Realtime | WebSocket for messaging (MSG-3); notifications via the same socket with polling fallback | One connection |
| D8 | Payment gateway / video provider | **Stripe, USD** (likely; confirmed enough to build on). Cohorts: Stripe Checkout (hosted, SAQ-A). 1:1: PaymentIntent with `capture_method=manual` via Stripe-hosted Checkout or Payment Element. Video: provider-agnostic, `join_url` + signed playback URL only | Video provider still open |
| D9 | 1:1 pricing model | **Per hour**, carried over from the current EduBridge model (see §2.1) | SRS open question 2 not answered in the doc; PO chose existing behaviour |
| D10 | Wallet migration | Nothing to migrate: the product has not gone live, so there are no balances | Wallet is simply dropped |

### 2.1 Pricing model (fills SRS open question 2)

Carried over from the current app (`ratePerHour` on tutor profile, admin default rate, 1–4 h duration picker) and mapped onto SRS PRC-1..5:

- **Cohort:** unit `PER_SEAT`. Price = resolved seat price.
- **One-on-one:** unit `PER_HOUR`. Learner picks duration from **1 h to 4 h in 30-minute steps** (default 60 min). Price = resolved hourly rate × hours.
- **Resolution order (PRC-4):**
  1. Training-level override (admin), else
  2. Instructor hourly rate (`TrainingInstructor.custom_rate`, falling back to the instructor's profile rate, as `ratePerHour` works today), else
  3. Modality × Category `PricingRule` (replaces today's single admin "default hourly rate").
- Currency USD, amounts in cents. Price is frozen on the booking/enrolment at purchase (PRC-5, BR-4).
- `PER_SESSION` stays in the enum (PRC-2) but is not exposed in the admin UI until someone needs it.

**Stripe constraint to agree with backend:** a card authorisation lasts about 7 days. The 24 h instructor response window fits, but the counter-proposal step (OTO-6) also needs a learner response deadline, so the whole request → accept flow finishes well inside 7 days. Proposal: learner has 48 h to answer a counter-proposal, then the request expires and the authorisation is voided.

---

## 3. How frontend and backend work in parallel (contract-first)

Because the frontend is built first, the frontend **owns the first draft of the API contract** and the backend implements it.

1. **Per module**, write the contract in `contracts/openapi/<module>.yaml` (endpoints, request/response, errors, enums). Mirror it as zod schemas in `src/api/schemas/`.
2. **MSW handlers** in `src/mocks/` serve realistic fixtures from that contract, including state transitions (e.g. accepting a booking moves it to `ACCEPTED`). The app runs fully on mocks with `NEXT_PUBLIC_API_MOCKING=on`.
3. **Contract review** with the backend developer before the module's UI is considered done. Changes go through the YAML, never ad hoc.
4. Backend implements; we flip the module off mocks and run the same Playwright flows against the real API.

**API conventions (agree once, in Phase 0):**

- Timestamps: ISO 8601 UTC (`start_utc`); the user's IANA time zone lives on `User.timezone`. Display always converts (SRS §2, NFR Localisation).
- Money: integer minor units + ISO currency (`{ amount: 500000, currency: "NGN" }`). Never floats.
- Enums: uppercase as written in the SRS (`COHORT`, `ONE_ON_ONE`, `PENDING_INSTRUCTOR`, `PER_SEAT`...).
- Errors: `{ code, message, field_errors?: { [field]: string[] } }` so forms can show inline errors without losing input.
- Pagination: cursor-based `{ items, next_cursor }`; list filters as query params.
- Mutations that move money or state send an `Idempotency-Key` header.
- Every state-changing response returns the full updated resource so the UI can update without refetch guesswork.
- Prices are resolved by the backend and returned as a quote with its breakdown; the frontend never computes tax or discounts (PRC-4, PRC-7).
- Full detail: `contracts/CONVENTIONS.md`.

---

## 4. Route map (with requirement traceability)

### Public (Guest)
| Route | Purpose | Req |
|---|---|---|
| `/` | Landing: value, featured trainings, how cohort vs 1:1 works | TRN-6 |
| `/trainings` | Catalogue: search, filters (category, modality, price, instructor, language), sort | TRN-6, TRN-7 |
| `/trainings/[slug]` | Detail: cohorts with seats/deadline or 1:1 instructors, price with unit, category metadata | TRN-1/4, COH-2, PRC-2/7 |
| `/instructors/[id]` | Bio, qualifications, trainings, reviews | ONB-3, FDB-4 |
| `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | Email/password + Google, verification | ONB-1 |
| `/legal/terms`, `/legal/privacy` | Versioned documents referenced by consent | ONB-4 |

### Onboarding and checkout
| Route | Purpose | Req |
|---|---|---|
| `/onboarding/learner` | Wizard: profile (photo, time zone, country), goals, interests, education level, exam target date; resumable | ONB-2, ONB-6 |
| `/onboarding/instructor` | Wizard: profile, bio, qualifications, subjects, ID/credential upload, payout details, availability; "awaiting approval" state | ONB-3, ONB-6, OTO-1 |
| `/checkout/cohort/[cohortId]` | Price breakdown (subtotal, discount, tax, total), discount code, redirect to gateway | PRC-6/7, PAY-1/2 |
| `/checkout/return` | Pending → confirmed (webhook-verified) or failed with retry | PAY-2 |

### Learner (`/learn`)
| Route | Purpose | Req |
|---|---|---|
| `/learn` | Next session with join link, pending requests, new feedback/resources | NTF-1 |
| `/learn/trainings` | My enrolments (cohort and 1:1), including archived trainings | TRN-7 |
| `/learn/trainings/[enrolmentId]` | Tabs: Sessions, Recordings, Resources, Feedback, Announcements, Roster; post-enrolment checklist | COH-4/6, REC-2/3/4, RES-2/3, FDB-2, ONB-5 |
| `/learn/book/[trainingId]` | Pick instructor, pick slot in **viewer's time zone**, see price + authorisation notice, submit | OTO-2/3/7, PAY-4 |
| `/learn/bookings` and `/learn/bookings/[id]` | Status timeline per state machine; accept/decline counter-proposal; reschedule/cancel with policy and refund preview | OTO-5/6/9 |
| `/learn/payments` | Payment history, PDF receipts, refunds | PAY-5/6 |
| `/learn/recordings/[id]` | Player: speed, resume position, captions; recording notice | REC-1/4/6 |

### Instructor (`/teach`)
| Route | Purpose | Req |
|---|---|---|
| `/teach` | Pending requests with expiry countdown, today's sessions, balance | OTO-4/5, PAY-7 |
| `/teach/requests` | Accept / Decline / Propose alternative time | OTO-4, OTO-6 |
| `/teach/schedule` | Calendar of all sessions (cohort + 1:1), conflict warnings | OTO-10 |
| `/teach/availability` | Weekly recurring slots, one-off exceptions, blocked dates, time zone | OTO-1, OTO-11 (later) |
| `/teach/trainings`, `/teach/cohorts/[id]` | Sessions, attendance, roster, announcements, resource upload, recording management | COH-1/4/6, RES-1..4, REC-5 |
| `/teach/sessions/[id]/feedback` | Feedback form: comments, strengths, areas to improve, rubric, next steps, attachment | FDB-1/3/5 |
| `/teach/earnings` | Ledger: commission, pending vs available, payout requests, history | PAY-7 |

### Shared (all signed-in roles)
Mounted inside each role area (`/learn/messages`, `/teach/messages`, `/admin/...`) so every page keeps its role's sidebar and guard; the page components are shared.

| Route | Purpose | Req |
|---|---|---|
| `<area>/messages`, `<area>/messages/[conversationId]` | 1:1 and cohort channels, unread counts, read receipts, attachments, report/block | MSG-1..6 |
| `<area>/notifications` | In-app notification centre | NTF-1 |
| `<area>/settings/*` | Profile, time zone, notification preferences per channel/event, security (password, MFA), privacy (data export, delete account) | NTF-2, NFR Security/Privacy |

### Admin (`/admin`)
| Route | Purpose | Req |
|---|---|---|
| `/admin` | Users, enrolments, revenue, active cohorts, pending 1:1 requests, instructor response times | ADM-1 |
| `/admin/trainings` (+ `/new`, `/[id]`) | CRUD, publish/archive, instructors, category metadata fields | TRN-1/4/5/7 |
| `/admin/cohorts` | Create/manage cohorts, status flow, cancel → auto-refund | COH-1/3/5 |
| `/admin/catalog/categories` | Add, rename, disable; configure metadata fields | TRN-3/4 |
| `/admin/catalog/modalities` | Manage modalities table | TRN-2 |
| `/admin/pricing` | Modality × Category matrix, units, versions with effective dates, training/instructor overrides, resolution preview | PRC-1..5 |
| `/admin/discounts` | Codes: % or fixed, expiry, usage limits | PRC-6 |
| `/admin/bookings` | Pending/expired 1:1 requests | ADM-1, OTO-5 |
| `/admin/users` (+ `/[id]`) | View, suspend, impersonate (audited), reset access; instructor approval queue | ADM-2, ONB-3 |
| `/admin/payments`, `/admin/payouts` | Refunds (full/partial), reconciliation, payouts | PAY-5/7/8 |
| `/admin/moderation` | Reviews, reported messages, recordings | FDB-4, MSG-6, REC-3 |
| `/admin/reports` | CSV exports: revenue, payouts, attendance, refunds | ADM-4 |
| `/admin/settings` | Cancellation policy, commission %, expiry window, retention, currency/tax | ADM-3, OTO-5/9, REC-5 |
| `/admin/audit-log` | Admin actions, price/policy changes | ADM-5 |

---

## 5. Design system

**Direction: keep the current EduBridge look.** The PO approves the existing design, so we port its visual language into Tailwind tokens instead of inventing a new one. Users and the PO should recognise the new app immediately; what changes is the structure, accessibility and behaviour underneath.

**Tokens carried over from `public/assets/css/main.css`:**

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#1363df` | Primary buttons, links, active nav |
| `--color-secondary` / heading | `#082a5e` | Headings, dark sections |
| `--color-ink` | `#061e43` | Footer, darkest surfaces |
| `--color-body` | `#39557e` | Body text (7:1 on white) |
| `--color-accent` | `#fab123` | Highlights, badges; **dark text only on it** (white on yellow fails contrast) |
| `--color-success` / `--color-danger` | `#12bb6a` / `#ff2e2e` | Status; darken for text use to reach 4.5:1 |
| `--surface-1/2` | `#f4f7fb`, `#e7effc` | Section and panel backgrounds |
| `--border` | `#d0dae9`, `#ececec` | Dividers, inputs |
| Fonts | Lexend Deca (headings), Hind (body), via `next/font` | Same as today, self-hosted |
| Radii | 6, 10, 20 px; pill (50 px) for buttons and badges, as today | Normalise the template's 3/4/8/30 px strays into this scale |

**What we port vs replace:**
- Port the look of: header, mobile menu, footer, landing sections in use (`Banner1`, `Brand1`, `About1`, `Categories1`, `Testimonial1`, `FeaturedTutors`, `Cta1`), breadcrumb, dashboard layouts, cards, buttons, forms.
- Replace underneath: Bootstrap grid → Tailwind; Font Awesome + Flaticon → lucide (already used in dashboards); slick + swiper → one carousel (Embla) where a carousel is still needed; AOS/WOW → CSS transitions that respect reduced motion; remove the cursor effect and the fake preloader.
- Before porting each section, screenshot the current page so we can compare side by side.

Rules on top of the existing look (from the product quality standard):

- Tokens on a 4 px spacing scale, radii 6/10/14/20, named type sizes; light and dark themes.
- One primary action per decision area, specific labels ("Request session", "Accept request", "Pay ₦50,000").
- Every control designs all 9 states: default, hover, focus, pressed, loading (disabled), success, empty, error, disabled.
- 44 × 44 px touch targets, visible `focus-visible` rings, `Escape` closes dialogs, `prefers-reduced-motion` respected, 120–220 ms transitions only.
- Empty states always have icon + explanation + action (e.g. no availability set → "Add your weekly hours").
- No template filler, no decorative animation, no gradient/glass by default.

**Domain components to build once and reuse:**
`PriceTag` (amount + unit), `PriceBreakdown`, `StatusBadge` (driven by state-machine enums), `BookingTimeline`, `SlotPicker` (time-zone aware), `AvailabilityEditor`, `SessionCard` (join link enabled N minutes before start), `CountdownToExpiry`, `RubricInput`, `FileUploader` (size limit, scan pending/failed states), `RecordingPlayer`, `ConsentCheckbox` (versioned), `DataTable` (filters, CSV export), `ConfirmWithConsequence` (refund/cancel/archive preview).

---

## 6. Delivery phases (aligned with SRS §10)

Each phase ends with: screens on mocks, contract reviewed with backend, Playwright happy paths + axe passing, and a demo.

### Phase 0: Foundation (S–M) — built 19 Nov 2026

**Status:** done on `redesign/lmp`. Landing page ported in the original look; sign-in with MFA; role shells for `/learn`, `/teach`, `/admin` with guards; SRS enums and state machines; money/time-zone utilities; API client + error shape; MSW mocks; auth contract (`contracts/openapi/auth.yaml`, `contracts/CONVENTIONS.md`); CI. 53 unit tests (97% coverage on core logic) and 15 Playwright flows × desktop + mobile, including axe WCAG 2.2 AA scans.
Not carried over from the old landing page: brand logo strip and testimonials (template placeholders, not real) and featured tutors (returns in Phase 1 from the catalogue API).
Links to Phase 1 pages (`/trainings`, `/register`, `/forgot-password`, `/legal/*`) show the 404 page until Phase 1 lands. Sidebar items appear automatically as each phase ships (`SHIPPED_PHASE` in `nav-config.ts`).

Original scope:
- New Next 16 + TS app on `redesign/lmp`; keep the old pages in git history for visual reference only.
- Port the current design into Tailwind tokens (§5), base components, public header/footer, layouts per role, route guards by role.
- API client, error mapping to forms, MSW setup, `next-intl` scaffold, time-zone and money formatting utilities with unit tests.
- Shared enums and state machines (`booking`, `cohort`, `training`, `payment`) as typed constants with transition tests.
- CI: lint, typecheck, unit, Playwright, axe, Lighthouse budget.
- Write API conventions doc (§3) and agree it with backend.

### Phase 1: MVP (L) — SRS phase 1 (in progress)
**Built so far (19 Nov 2026):** registration (learner or instructor), email verification, password reset, Google sign-in entry point, consent with versioned legal pages (draft text, needs legal review), learner and instructor onboarding wizards with resume, uploads (photo, ID, certificates), Stripe Connect payout step, weekly availability, dashboard prompts for unfinished onboarding and pending approval. Contracts: `auth.yaml` (extended), `onboarding.yaml`, `uploads.yaml`.
Then (same day): admin catalogue (categories with configurable detail fields, modalities, trainings with publish checklist and archive), pricing matrix with versioned and scheduled price changes, training and instructor overrides, price preview. Contracts: `catalog.yaml`, `pricing.yaml`.
Then (20 Nov): public catalogue with search, filters in the URL and sorting (TRN-6), archived and draft trainings hidden (TRN-7), training detail with category details, cohorts shown in the viewer's time zone with seats left and deadline (COH-2), and each instructor's price on 1:1 trainings (PRC-3). Contracts: `catalog.yaml` (public paths), `cohorts.yaml` (new).
Then: admin cohorts (create, edit, open, close, start, complete, cancel with full refunds) (COH-1/3/5), cohort checkout with the API's breakdown, Stripe-hosted payment and a return page that waits for the webhook (PRC-7, PAY-1/2). Demo builds use a stand-in payment page at `/mock-gateway`. Contracts: `cohorts.yaml` (admin paths), `payments.yaml` (new).
Then: learner "My trainings" grouped by in progress, starting soon, finished and cancelled, archived trainings kept (TRN-7); next classes on the learner dashboard; payment history with refunds and a printable receipt (PAY-6). Contracts: `payments.yaml` (`/me/enrolments`, `/me/payments`, receipt fields).
Then: notifications (NTF-1): a bell with unread count in every signed-in area, a popover with the latest five, and a full page with All/Unread, mark all read and paging; payments, refunds and cohort cancellations notify learners. Contract: `notifications.yaml`.
Then: admin users (ADM-2): search and filters with applications first, a detail page with everything an instructor submitted, approve/reject with a reason (ONB-3, notifies and emails), suspend/reactivate, password reset, and read-only "view as" with a banner on every page. Admins are notified of new applications. Contracts: `admin-users.yaml` (new), `auth.yaml` (`impersonated_by`, `/auth/impersonation/end`).
Then: platform settings (ADM-3): commission, 1:1 request expiry, learner cancellation tiers with a live refund preview, instructor-cancellation refund; versioned with history and conflict protection; starting values flagged until reviewed. Audit log viewer (ADM-5) with text, admin, type and date filters, paging and links to what changed. Contract: `settings.yaml`.
Then: admin payments and refunds (PAY-5): search and filters with totals taken and refunded, full or partial refunds with a reason, optional enrolment cancellation that frees the seat, idempotent, notified, audited. Contract: `payments.yaml` (admin paths).
Then: account settings for every role (`/learn/settings`, `/teach/settings`, `/admin/account`): profile with instructor headline and bio, password change, two-step sign-in (mandatory for instructors and admins), sign out other devices, and notification preferences per group and channel (NTF-2). Contract: `account.yaml`.
**Phase 1 is feature-complete** on the frontend against the contracts. Waiting on the PO for the open questions in §8.

Auth (email/password, Google, verify, reset, consent), learner + instructor onboarding with resume, admin catalogue (categories, modalities, trainings, metadata fields), pricing rules + overrides + versions + preview, public catalogue and training detail, cohorts admin, cohort enrolment checkout with breakdown, payment return/history/receipts, basic in-app + email notification centre, admin user management and instructor approval, audit log viewer.
*Req:* ONB-1..4/6, TRN-1..7, PRC-1..5/7, COH-1..3, PAY-1/2/6, NTF-1, ADM-2/3/5.

### Phase 2: 1:1 and content (L) — SRS phase 2 (in progress)
**Built so far:** instructor availability (weekly hours, date exceptions, minimum notice) (OTO-1); learner booking page with instructor, length, and free times in the viewer's zone, excluding cohort classes and held requests (OTO-2/10); request with card authorisation through the gateway, 30-min slot hold, expiry with the hold released (OTO-3/5/7, PAY-4); learner sessions list and booking page with countdown and history. Contract: `bookings.yaml`; payments now link to a booking or an enrolment.
Then: instructor requests page with countdowns (OTO-4/5); accept captures the card, issues a receipt and creates the meeting link (OTO-8, PAY-4); decline with a reason; propose another time from the instructor's free slots, learner accepts or declines within 48 h (OTO-6); calendar invite (.ics) with 24 h and 1 h reminders; join button from 15 minutes before.
Then: reschedule (either side proposes a free slot, the other accepts or the original stands) and cancel with a refund preview from the cancellation policy snapshotted at booking (OTO-9, PAY-5).
Then: instructor schedule with cohort classes and 1:1 sessions together (OTO-10), attendance still to take first; dated cohort sessions with join links; attendance sheet (present/late/absent) that completes or marks a 1:1 as no-show (COH-4); learners get "Join class" on My trainings. Contract: `sessions.yaml`.
**Next:** recordings (REC-1..6); resources (RES-1..4); post-enrolment checklist (ONB-5); cohort cancellation by minimum enrolment (COH-5 job).

Availability editor, slot picker, booking request with authorisation, instructor accept/decline/propose with expiry countdown, counter-proposal flow, reschedule/cancel with policy preview, .ics download and reminders display, unified instructor schedule with conflict prevention, session join, attendance, recordings player and management, resources upload/visibility/folders.
*Req:* OTO-1..10, PAY-4/5, COH-4/5, REC-1..6, RES-1..4, ONB-5.

### Phase 3: Engagement and money out (M–L) — SRS phase 3
Messaging (WebSocket, unread, receipts, attachments, report/block, cohort channels), tutor feedback with rubric and progress history, reviews + moderation, instructor earnings ledger and payouts, admin dashboard metrics, reports and CSV exports, reconciliation, notification preferences, discounts/tax/multi-currency.
*Req:* MSG-1..6, FDB-1..5, PAY-7/8, ADM-1/4, NTF-2, PRC-6, COH-6.

### Phase 4: Could-haves (M) — SRS phase 4
Instalments (PAY-3), calendar sync (OTO-11), waitlists (COH-2 optional), transcripts (REC-4), recommendations from onboarding data, download tracking (RES-5).

### Cutover
Pre-launch product, so no data migration: run the new app on staging, get PO sign-off, then merge `redesign/lmp` into `main`.

---

## 7. Cross-cutting requirements checklist

- **Time zones:** store/receive UTC, render in viewer zone, show zone label on every time; DST tests for slot picker and availability.
- **Price frozen at purchase (BR-4):** UI reads price from the enrolment/payment record, never recomputes after purchase.
- **Privacy (BR-5, FDB-5, REC-3):** guards by role and ownership; never render data the API shouldn't have sent, and test 403 states.
- **Messaging restriction (BR-6, MSG-1):** "Message instructor" only appears when an enquiry, booking or enrolment exists.
- **Accessibility:** WCAG 2.2 AA (target size, focus not obscured, dragging alternatives for calendar), axe in CI, keyboard-only pass per phase.
- **Performance:** p95 page load < 3 s; route-level code splitting, server components for public pages, image dimensions set.
- **Browsers:** latest two Chrome, Edge, Safari, Firefox; iOS Safari and Android Chrome in Playwright projects.
- **Tests:** ≥ 80% coverage on frontend core logic (price display/breakdown, state-machine UI, time-zone utilities, payment status handling).

---

## 8. Open questions (need answers before the phase that depends on them)

From SRS §11:
1. ~~Payment gateway and currency~~ Stripe, USD (D8). Video provider: **Zoom, most likely** (to confirm before Phase 2)
2. ~~1:1 pricing~~ Per hour (D9, §2.1)
3. Cancellation/refund rules and commission rate? Partial answer: refund rules **depend on who cancels** (learner vs instructor). Exact cut-offs, percentages and commission still to come *(Phase 2)*. Admin settings will hold separate learner and instructor cancellation policies.
4. Can cohort learners book add-on 1:1 with their cohort instructor? *(Phase 2)*
5. Assessments, quizzes or certificates in v1? *(scope)*
6. Recording retention period? *(Phase 2)*

Added by this plan:
7. ~~Wallet removal and balances~~ Confirmed; no balances exist (D10).
8. Who can create cohorts: Admin only, or Instructor too (COH-1 says both)?
9. Which languages beyond English at launch (i18n-ready only, or translated)?
10. Brand: keep the EduBridge name and logo, or rename to match the LMP?

---

## 9. Immediate next steps

1. ~~Confirm decisions and questions 1, 2, 7.~~ Done. Still open but not blocking Phase 0/1: video provider, cancellation rules + commission, add-on 1:1 for cohort learners, quizzes/certificates, recording retention, cohort creation rights, languages, branding.
2. Share §3 conventions and §4 route map with the backend developer; agree the module order (it follows §6).
3. Start Phase 0 on `redesign/lmp`.
