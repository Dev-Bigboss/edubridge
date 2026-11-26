# API conventions (frontend ↔ backend)

The frontend is built first against mocks, so it drafts the API contract and the backend implements it.
Each module has an OpenAPI 3.1 file in `contracts/openapi/`. The zod schemas in `src/lib/api/schemas/`
and the MSW mocks in `src/mocks/handlers/` mirror those files. Change the YAML first, then both sides.

## Transport
- REST + JSON, base path `/api/v1`.
- Field names are `snake_case`, matching SRS §5 (`start_utc`, `join_url`).
- Enum values are UPPER_SNAKE exactly as in the SRS (`ONE_ON_ONE`, `PENDING_INSTRUCTOR`, `PER_HOUR`).
  The full list the frontend relies on is in `src/lib/domain/enums.ts`.

## Auth and sessions
- The backend sets the session in **httpOnly, Secure, SameSite=Lax** cookies. The frontend never reads or stores a token.
- Requests use `credentials: "include"`. Host the API on the same site as the app (e.g. `app.example.com` and
  `api.example.com`) so the cookies are first-party, and allow the app origin in CORS with credentials.
- `GET /auth/me` returns `401` when signed out. The frontend treats that as "signed out", not an error.
- Admin and Instructor sign-ins need a second factor (SRS NFR Security): `POST /auth/login` returns
  `{ mfa_required: true, mfa_challenge_id }`, then `POST /auth/mfa/verify` completes sign-in.
- Unknown email and wrong password return the **same** error, so accounts can't be enumerated.

## Errors
Every non-2xx response has this body:

```json
{ "code": "INVALID_CREDENTIALS", "message": "Readable sentence for the user.", "field_errors": { "email": ["..."] } }
```

- `code` is stable and machine-readable; `message` is shown to people.
- `field_errors` keys match request field names so the form shows them inline.
- `401` signed out, `403` signed in but not allowed, `404` not found or not visible to this user,
  `409` state conflict (e.g. booking already accepted), `422` validation.

## Time
- All timestamps are ISO 8601 UTC with `Z` (`2026-03-03T13:00:00Z`) and named `*_utc` where the SRS does.
- The user's IANA time zone is `User.timezone`. The frontend converts for display; the backend never sends local times.
- Instructor availability (OTO-1) is the one place times are local: weekly slots are stored as local wall-clock
  times plus the instructor's zone, because "Mondays 09:00" must survive DST.

## Money
- `{ "amount": 4000, "currency": "USD" }`: integer minor units (cents) plus ISO 4217 code. Never floats.
- Launch currency is USD, gateway is Stripe (plan D8).
- Prices are resolved by the backend (PRC-4). Before checkout the frontend asks for a **quote** and shows its
  breakdown as-is (PRC-7); it never computes tax or discounts itself.
- The price paid is stored on the enrolment/booking and never recomputed (PRC-5, BR-4).

## Lists
- Cursor pagination: `{ "items": [...], "next_cursor": "opaque" | null }`, query `?cursor=&limit=`.
- Filters and sort are query params named after fields (`?category=…&modality=ONE_ON_ONE&sort=price_asc`).

## Writes
- Mutations return the full updated resource.
- Anything that moves money or changes a booking/enrolment state accepts an `Idempotency-Key` header (UUID) and
  returns the original result on a retry with the same key (PAY-8).
- State changes are actions, not raw status writes: `POST /bookings/{id}/accept`, not `PATCH {status}`. The
  backend enforces the state machine; the frontend mirrors it in `src/lib/domain/booking-machine.ts`.

## Decisions the plan made where the SRS is silent (please review)
| Topic | Proposal | Where |
|---|---|---|
| Payment statuses | `PENDING, AUTHORISED, CAPTURED, VOIDED, FAILED, PARTIALLY_REFUNDED, REFUNDED` | `enums.ts` |
| Counter-proposal deadline | Learner has 48 h, then `EXPIRED` and the authorisation is voided (Stripe holds ~7 days) | `booking-machine.ts` |
| After `RESCHEDULE_REQUESTED` | Other party accepts → `ACCEPTED` at new time; declines → `ACCEPTED` at old time; either can `CANCEL` | `booking-machine.ts` |
| Cohort cancellation | Allowed from any state before `COMPLETED`; `FULL → OPEN` when a seat frees up | `cohort-machine.ts` |
| User statuses | `PENDING_VERIFICATION, ACTIVE, SUSPENDED` | `enums.ts` |
| Onboarding progress | `User.onboarding_status`: `NOT_STARTED, IN_PROGRESS, COMPLETED` (ONB-6) | `schemas/auth.ts` |
| Cancellation policy | Separate learner and instructor policies (who cancels changes the refund); values still to come | plan §8 Q3 |
| Password policy | 10–128 characters, no composition rules, breached-password check on the backend (NIST 800-63B) | `schemas/auth.ts` |
| Email verification | Required before sign-in (403 `EMAIL_NOT_VERIFIED`); link valid 24 h, single use; verifying signs the user in | `auth.yaml` |
| Consent records | Versions live in `src/lib/legal/versions.ts`; `User.consent_required` forces re-acceptance after a change | `auth.yaml` |
| Google sign-up | Account created `ACTIVE` with `consent_required: true`; consent page before anything else | `auth.yaml` |
| Learner onboarding | Sent there once after sign-up; "finish later" allowed (dashboard offers to resume) | `routes.ts` |
| Instructor onboarding | Must be finished before `/teach`; submitting sets `approval_status: PENDING` | `routes.ts`, `onboarding.yaml` |
| Education levels | `SECONDARY, UNDERGRADUATE, POSTGRADUATE, PROFESSIONAL, OTHER` | `enums.ts` |
| Payout details | Stripe Connect Express; status `NOT_STARTED, PENDING, COMPLETE` from Stripe webhooks; no bank data stored | `onboarding.yaml` |
| Uploads | Signed direct-to-storage PUT, virus scan (`SCANNING, CLEAN, INFECTED`), limits per purpose | `uploads.yaml` |
| Availability | Weekly slots in the instructor's own zone, ISO weekday 1 = Monday, no overlaps per day | `onboarding.yaml` |
| Training levels | `BEGINNER, INTERMEDIATE, ADVANCED, ALL_LEVELS` | `enums.ts` |
| Training languages | Starting list `en, fr, ar, es, pt, de, yo, ig, ha, sw` until plan §8 Q9 is answered | `domain/training.ts` |
| Publish checklist | Description ≥ 80 chars, active category, required details, ≥ 1 instructor, a price applies | `catalog.yaml` |
| Modality lock | Can't change after a training leaves DRAFT; archive and recreate instead | `catalog.yaml` |
| Slugs | From the title while DRAFT, frozen once published | `catalog.yaml` |
| Instructor rate | Stored per training assignment (`TrainingInstructor.custom_rate`, SRS §5), with its own unit | `catalog.yaml` |
| Price versions | Added, never edited; start now or later and after the latest version; dated changes start at the admin's local midnight | `pricing.yaml` |
| Catalogue search | Every word must match title, summary, category, category details or instructor name; case and accents ignored; default sort relevance with a query, newest without | `catalog.yaml`, `domain/catalog.ts` |
| Price filter | Bands on the card's "from" price (under $50, $50–150, $150–300, over $300); unpriced trainings drop out | `domain/catalog.ts` |
| Cohort schedule | Weekdays + local start time + length in the instructor's zone; the backend expands sessions; UTC first-session instant lets clients convert (days can shift across midnight) | `cohorts.yaml` |
| Cohort visibility | Guests see `OPEN, FULL, CLOSED, IN_PROGRESS`; drafts, completed and cancelled stay hidden | `cohorts.yaml` |
| Cohort creation | Admin only for now (plan §8 Q8 open) | `cohorts.yaml` |
| Cohort editing | Everything until it starts; then name and seats only; nothing once completed or cancelled | `cohorts.yaml` |
| Enrolment deadline | Admin picks a day; it closes at 23:59 in the cohort's zone; must be no later than the first class | `cohorts.yaml` |
| Cohort cancel | Needs a reason; refunds every paid seat in full and emails it (COH-5) | `cohorts.yaml` |
| Enrolment statuses | `PENDING_PAYMENT, CONFIRMED, CANCELLED, REFUNDED` | `payments.yaml` |
| Seat holds | None while paying; if the cohort fills meanwhile, the webhook refunds in full at once | `payments.yaml` |
| Checkout | Stripe-hosted Checkout; enrolment confirmed only by the signed webhook; return page polls | `payments.yaml` |
| Receipts | Sequential `EB-YYYY-NNNNN` on capture; PDF emailed and linked by signed URL; the app also renders it | `payments.yaml` |
| Notifications | Backend writes title/body per event in the user's language, same event sends the email; types in `enums.ts`; bell polls every 60 s until Phase 3 real-time | `notifications.yaml` |
| Admin actions on users | Reason required for reject, suspend and view-as; never on your own account; all audited | `admin-users.yaml` |
| View as (impersonate) | Read-only session as the user, banner on every page, not for admins, start and end audited | `admin-users.yaml`, `auth.yaml` |
| Platform settings | Versioned like prices; save needs the current version (409 otherwise); a booking keeps the policy in force when it was made | `settings.yaml` |
| Cancellation policy | Learner: refund tiers by hours of notice (one tier at 0 h, never more refund for later notice). Instructor cancels: one refund %. Values await the PO (plan §8 Q3) | `settings.yaml`, `domain/policy.ts` |
| Audit log | Append-only, 25 per page, filters by text, admin, type and day | `settings.yaml` |
| Manual refunds | Full or partial, reason required and sent to the learner, Idempotency-Key; cancelling the enrolment (and freeing the seat) only with a full refund | `payments.yaml` |
| Account settings | `/me/*` for every role; admins' page is `/admin/account` (`/admin/settings` is platform settings); email changes go through support | `account.yaml` |
| Two-step sign-in | Mandatory for instructors and admins; optional for learners (code to turn on, password to turn off) | `account.yaml` |
| Notification preferences | 7 groups by role; default on; payments email, cohort-change email and account decisions are locked on | `account.yaml`, `domain/notification-groups.ts` |
| 1:1 availability | Weekly local hours + date overrides (empty = blocked) + minimum notice; 60-day horizon; 30-min steps | `bookings.yaml`, `domain/slots.ts` |
| 1:1 lengths and price | 1 h to 4 h in 30-min steps; per-hour price × length (rounded to the cent) or flat per session; frozen on the booking | `bookings.yaml`, `domain/checkout.ts` |
| Slot hold | A DRAFT holds its slot 30 min while the learner authorises; then PENDING_INSTRUCTOR holds it until answered or expired | `bookings.yaml` |
| Payments ↔ bookings | A payment has either `enrolment_id` (cohort seat) or `booking_id` (1:1), never both | `payments.yaml` |
| Counter-proposal | Instructor picks one of their own free slots; learner has 48 h; the hold moves to the proposed time | `bookings.yaml` |
| Confirmation | Capture on accept, receipt issued, meeting link, .ics to both with alarms 24 h and 1 h before; join opens 15 min before the start | `bookings.yaml`, `domain/ics.ts` |
| Declining | Instructor gives a reason (sent to the learner); learner may decline a proposal without one | `bookings.yaml` |
| Reschedule | Either side asks for one of the instructor's free slots; only the other side answers; unanswered by the earlier of 48 h or the start → original time stands | `bookings.yaml` |
| Cancellation | Either side, before the start, with a reason; refund from the booking's policy snapshot (learner tiers or instructor share); preview shown before confirming | `bookings.yaml`, `domain/policy.ts` |
| Sessions and attendance | Cohort classes are dated sessions with their own join link; attendance PRESENT/LATE/ABSENT from the start; for a 1:1, absent = no-show, present/late = completed | `sessions.yaml` |
| Recordings | Automatic, linked to the session; visible to that session's people (admins for moderation); signed 1-hour links, no downloads; instructor hides/trims/deletes; retention in months is a platform setting (12 until the PO decides) | `recordings.yaml` |
| Resources | File or link; audience = whole training, one cohort, one class, or one 1:1 learner of that instructor; folders + ordering by buttons; files 100 MB, scanned, downloadable | `resources.yaml` |
| Post-enrolment checklist | Three steps per cohort seat (test join link, open resources, meet the instructor), ticked by doing them, dismissible | `payments.yaml` |
| Below-minimum cohorts | Auto-cancelled at the enrolment deadline with full refunds; admins see "needs N more by date" before that | `cohorts.yaml` |
| Who can message whom | Learner ↔ instructor only, once a seat (CONFIRMED) or a 1:1 booking past DRAFT links them, or the learner asks about one of the instructor's published trainings (enquiry); one conversation per pair; admins don't take part (BR-6, MSG-1) | `messages.yaml` |
| Cohort channels | One per cohort past DRAFT: instructor + confirmed learners; only the instructor can post announcements (pinned); read-only once the cohort is completed or cancelled (MSG-2) | `messages.yaml` |
| Real-time delivery | WebSocket `/api/v1/realtime` pushes `message.created`, `conversation.read`, `unread.changed`; the UI polls (list 15 s, open conversation 5 s, badge 30 s) when the socket is down (MSG-3, plan D7) | `messages.yaml`, `hooks/messages.ts` |
| Read receipts and unread | Per person `last_read_at`; unread = others' messages after it; "Seen" shown in one-to-one chats only | `messages.yaml`, `domain/messages.ts` |
| Message limits | 1–4000 characters, up to 5 attachments (MESSAGE_ATTACHMENT: same types, 100 MB and scan as resources); `client_id` makes a retried send post once | `messages.yaml`, `uploads.yaml` |
| New-message alerts | Not in the notification bell (it would flood it); the sidebar shows unread messages | `messages.yaml` |
| Unread-message email | After `message_email_delay_minutes` (default 30, admin setting): one email per conversation per unread batch, none again until read; respects the "messages" email preference; no message text in the email (MSG-5) | `messages.yaml`, `settings.yaml` |
| Contact details in messages | Admin setting OFF / WARN (default: the sender is warned, can still send) / MASK (replaced with "[contact details hidden]" on send); emails, 9–15-digit phone numbers, wa.me and t.me links (MSG-6) | `settings.yaml`, `domain/contact-filter.ts` |
| Blocking | One-to-one only; either side; nobody can post while blocked; history stays; only the blocker unblocks; bookings and classes unaffected (MSG-6) | `messages.yaml` |
| Reports and moderation | Report a message or the conversation with a reason (optionally block too); admins are notified and see only the 5 messages either side; remove or dismiss with a note, audited (MSG-6) | `messages.yaml` |
| Feedback rubrics | Admin-managed; one default, others per category (a category in at most one); 2–8 criteria; four levels 1 Needs work, 2 Developing, 3 Good, 4 Excellent (no neutral middle); keys kept on edit; copied into each feedback (FDB-1) | `feedback.yaml`, `domain/feedback.ts` |
| Writing feedback | Instructor of the session, per learner on it, from the session start; one per session and learner, editable; comment and a next step required; the learner is notified once; optional assignment name and file (FDB-1/3) | `feedback.yaml` |
| Feedback privacy and progress | Only the learner, the author and admins can read it; learners see first vs latest level per criterion per training, matched by criterion name (FDB-2/5) | `feedback.yaml`, `domain/feedback.ts` |
| Reviews | After a completed cohort or 1:1; one per learner, training and instructor, rating both 1–5 with a 10+ character comment; live at once, admins hide with a reason the author sees (or restore), audited; public name "Ada D."; averages from 3 reviews (FDB-4) | `reviews.yaml`, `domain/reviews.ts` |
| Instructor earnings | Earning = payment total minus commission at the rate in force at capture (stored on the line); refunds take back the same share; pending until a hold after delivery (`earnings_hold_days`, default 7, from the 1:1 session end or the cohort's first class) (PAY-7) | `earnings.yaml`, `domain/earnings.ts` |
| Payouts | Whole available balance via Stripe Connect; needs payout details complete, nothing in flight and $20 minimum; manual, weekly (Mondays) or monthly (1st) at 09:00 UTC; a failed transfer returns the amount (PAY-7) | `earnings.yaml` |
| Reconciliation | Per period: captured, refunded, net revenue = commission + instructor earnings, paid out, owed now, per instructor; CSV export audited; webhook handlers idempotent on the Stripe event id (PAY-8) | `earnings.yaml` |
| Admin dashboard | Last 7, 30 or 90 days; revenue captured with refunds and commission from the ledger; daily buckets up to 30 days, weekly for 90; response time = card held to the instructor's first answer, median, expiries counted; "needs attention" counts with links (ADM-1) | `reports.yaml`, `domain/reports.ts` |
| CSV reports | Revenue, refunds, payouts, attendance; dates inclusive in UTC; RFC 4180 with CRLF; cells starting with = + - @ prefixed so spreadsheets don't run them; every export audited (ADM-4) | `reports.yaml`, `domain/reports.ts` |
| Cohort page | Members (instructor and confirmed learners) see the roster, names and photos only, and the latest 20 announcements from the cohort channel; admins read-only; each announcement notifies the other members (COH-6) | `messages.yaml` |
