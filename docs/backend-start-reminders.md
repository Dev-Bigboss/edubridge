# Reminders for when backend implementation starts

Read this before the backend work begins and again before switching the app off mock data.
Tick items off, or move them into the backend guide once they're handled.

## Decide before building

- [ ] **Instructor approval queue counts people who haven't submitted onboarding.**
  A newly registered instructor gets `approval_status: PENDING` straight away, so they appear in
  the admin approval queue, the pending count and the dashboard's "Applications" item with nothing
  to review. Proposed fix: only count and list instructors whose `onboarding_status` is `COMPLETED`
  (or set approval to `PENDING` on onboarding submit, not on registration).
  Affects `admin-users.yaml` (`/admin/users`, `pending_approvals`), `reports.yaml` (dashboard
  attention list) and the tests in `src/mocks/handlers/admin-users.test.ts` and `reports.test.ts`,
  which currently expect 2 (the applicant and the "New Instructor" demo account).
  Noted 26 Nov 2026.

## Check when wiring the real API

- [ ] `.env` has `NEXT_PUBLIC_API_BASE_URL=https://edu-bridge.waheedianho.codes/` with no `/api/v1`.
  The contracts and `.env.example` use the `/api/v1` base path; confirm which the backend serves.
- [ ] Zoom account: cloud recording with audio transcription turned on, or there are no transcripts (REC-4).
- [ ] Financial records are kept 7 years after an account is deleted; confirm for the launch countries.

## Before launch (demo mode only)

- [ ] Set `NEXT_PUBLIC_API_MOCKING` off in every deployed environment. The demo accounts panel and
  "Reset demo data" on the login page only show in mock mode.
- [ ] Remove the internal proposal page at `/proposals/instalments` once the product owner decides.
