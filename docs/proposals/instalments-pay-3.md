# Instalments for cohort seats (PAY-3): proposed rules

**For:** Product Owner · **From:** Frontend team · **Date:** 26 Nov 2026 · **Status:** Awaiting decision

Also readable in the app at `/proposals/instalments` (src/app/(public)/proposals/instalments/page.tsx). Change both together.

The SRS asks for "instalment plans for higher-priced cohorts" (PAY-3, a Could-have) but sets no rules. Below is what we propose to build. Each rule has a default you can accept as is, or change. Nothing is built until you confirm.

## Summary

Learners can split a cohort seat of **$300 or more** into **3 monthly payments**. The first payment is taken at checkout and confirms the seat. The rest are charged automatically to the same card, and the **last one falls before the cohort ends**. A failed payment is retried for **7 days**. If it is still unpaid after that, access to classes, recordings and resources pauses until the learner pays. **Admins can turn instalments on or off and change the threshold and number of payments** in platform settings.

## Decisions needed

| # | Question | Proposed default | Why | Alternatives |
|---|---|---|---|---|
| 1 | Which trainings? | Cohort seats only, priced at **$300 or more** at checkout | One-on-one sessions are already paid per session; small amounts aren't worth splitting | Every cohort; or admins switch it on per training |
| 2 | How many payments? | **3**, admin-configurable (2 to 4) | Short enough to finish within a typical 8 to 12 week cohort | Fixed 2; or the learner chooses 2 or 3 |
| 3 | How often? | **Every 30 days** from checkout, with the last one **before the cohort's end date**. If the cohort is too short for that, fewer payments are offered (none if only one fits) | The learner shouldn't still be paying after the training ends | Monthly on a fixed day |
| 4 | Does it cost more? | **No fee**: the same total, split evenly, with any odd cents on the first payment | Simplest to explain; no consumer-credit questions | A flat fee, e.g. $10 |
| 5 | When is the seat confirmed? | **On the first payment**, like today | Learners get the join link and materials straight away | Only once fully paid |
| 6 | How are later payments taken? | **Automatically, from the card used at checkout**, through Stripe. Reminder email 3 days before each one | No action needed from the learner; Stripe stores the card, we don't (PAY-1) | The learner pays each one by hand from a link |
| 7 | What if one fails? | Stripe retries over **7 days**, and the learner is emailed with a link to update the card. After 7 days, **access pauses** (classes, recordings, resources) but the seat is kept. Paying the balance restores it. Unpaid by the cohort's end: the seat is cancelled with **no refund** of what was paid | Fair to the learner, and protects the instructor's earnings | Cancel the seat straight away; or keep access and chase the payment |
| 8 | Can learners pay the rest early? | **Yes**, any time, from Payments | Common request; costs nothing | No |
| 9 | Refunds and cancellations | **The cancellation policy applies to the full seat price.** Scheduled payments that are no longer needed are cancelled, and anything already paid above what's owed is refunded. If the cohort is cancelled (COH-5), **everything paid is refunded** and the remaining payments are cancelled | Same outcome for the learner whether they paid in full or in instalments | Refund only what was paid, ignoring the policy |
| 10 | Instructor earnings | **Each payment goes into the instructor's ledger when it's collected**, with commission at the rate on the day of checkout (frozen, as today). The usual hold before payout still applies | The instructor is only paid money that was actually collected | Credit the full seat price up front (the platform carries the risk) |
| 11 | Price breakdown | Checkout shows the full price, the schedule (dates and amounts) and the total, before the learner pays (PRC-7) | Required for clarity, and in many places by consumer law | — |

## What this needs from others

- **Stripe:** card saved for later payments (SetupIntent / off-session charges), with Smart Retries on. No extra Stripe product is needed.
- **Legal:** check whether interest-free instalments count as consumer credit in our launch countries. They usually don't when there's no fee and fewer than 12 payments, but this needs confirming.
- **Backend:** a payment schedule per enrolment, a daily job to charge due payments, and webhooks for failures.

## What we'll build once agreed

- Checkout: choose "Pay in full" or "Pay in 3", with the schedule shown before paying.
- My payments: upcoming payments, "Pay the rest now", and a banner with a card-update link when a payment fails.
- Admin: on/off, threshold and number of payments in settings; instalment status on each payment; overdue instalments in the dashboard's needs-attention list.
- Notifications: reminder before each payment, failed payment, access paused, access restored.

**To decide:** reply with "accept all", or list the numbers you want changed.
