import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instalment rules (proposal)",
  description: "Proposed rules for paying cohort seats in instalments (PAY-3), for the product owner to accept or change.",
  robots: { index: false, follow: false },
};

/** Internal: the PAY-3 proposal from docs/proposals/instalments-pay-3.md, readable by the product owner. Keep the two in step. */
const DECISIONS: { q: string; proposed: string; why: string; alt?: string }[] = [
  { q: "Which trainings?", proposed: "Cohort seats only, priced at $300 or more at checkout.", why: "One-on-one sessions are already paid per session, and small amounts aren't worth splitting.", alt: "Every cohort, or admins switch it on per training." },
  { q: "How many payments?", proposed: "3, which admins can set between 2 and 4.", why: "Short enough to finish within a typical 8 to 12 week cohort.", alt: "Always 2, or the learner chooses 2 or 3." },
  { q: "How often?", proposed: "Every 30 days from checkout, with the last payment before the cohort's end date. If the cohort is too short for that, fewer payments are offered, or none if only one fits.", why: "A learner shouldn't still be paying after the training has ended.", alt: "Monthly on a fixed day of the month." },
  { q: "Does it cost more?", proposed: "No fee. The same total, split evenly, with any odd cents on the first payment.", why: "Simplest to explain, and avoids consumer-credit questions.", alt: "A flat fee, for example $10." },
  { q: "When is the seat confirmed?", proposed: "On the first payment, as today.", why: "Learners get the join link and materials straight away.", alt: "Only once the seat is fully paid." },
  { q: "How are later payments taken?", proposed: "Automatically from the card used at checkout, through Stripe, with a reminder email 3 days before each one.", why: "The learner doesn't have to do anything, and Stripe stores the card, not us.", alt: "The learner pays each one by hand from an emailed link." },
  { q: "What if a payment fails?", proposed: "Stripe retries over 7 days and the learner is emailed a link to update their card. After 7 days, access to classes, recordings and resources pauses, but the seat is kept; paying the balance restores it. If it's still unpaid when the cohort ends, the seat is cancelled with no refund of what was paid.", why: "Fair to the learner, and protects the instructor's earnings.", alt: "Cancel the seat straight away, or keep access and chase the payment." },
  { q: "Can learners pay the rest early?", proposed: "Yes, at any time, from their Payments page.", why: "A common request, and it costs nothing.", alt: "No early payment." },
  { q: "Refunds and cancellations", proposed: "The cancellation policy applies to the full seat price. Payments no longer needed are cancelled, and anything paid above what's owed is refunded. If the cohort is cancelled, everything paid is refunded and the remaining payments are cancelled.", why: "The learner gets the same outcome whether they paid in full or in instalments.", alt: "Refund only what was paid, ignoring the policy." },
  { q: "Instructor earnings", proposed: "Each payment reaches the instructor's earnings when it's collected, with commission at the rate on the day of checkout. The usual hold before payout still applies.", why: "Instructors are only paid money that was actually collected.", alt: "Credit the full seat price up front, with the platform carrying the risk." },
  { q: "What learners see before paying", proposed: "Checkout shows the full price, every payment date and amount, and the total, before the learner pays.", why: "Required by the SRS (PRC-7), and by consumer law in many places." },
];

const NEEDS = [
  ["Stripe", "saving the card for later charges, with automatic retries on. No extra Stripe product is needed."],
  ["Legal", "confirm whether interest-free instalments count as consumer credit in our launch countries. They usually don't when there's no fee and fewer than 12 payments, but this needs checking."],
  ["Backend", "a payment schedule per enrolment, a daily job that charges due payments, and handling for failed-payment notices from Stripe."],
] as const;

const BUILD = [
  ["Checkout", "a choice between paying in full and paying in 3, with the schedule shown before paying."],
  ["Learner payments", "upcoming payments, a “Pay the rest now” button, and a notice with a card-update link when a payment fails."],
  ["Admin", "on/off, threshold and number of payments in settings; instalment status on each payment; overdue instalments in the dashboard's needs-attention list."],
  ["Notifications", "a reminder before each payment, and messages when a payment fails, access pauses and access is restored."],
] as const;

const label = "block text-xs font-semibold tracking-[0.06em] uppercase text-body";

export default function InstalmentsProposalPage() {
  return (
    <div className="container-site py-12 lg:py-16">
      <article className="mx-auto flex max-w-3xl flex-col gap-10 text-[17px] leading-relaxed">
        <header className="flex flex-col gap-3">
          <p className="w-fit rounded-full border border-warning bg-warning-soft px-3 text-sm font-medium text-heading">Awaiting product owner decision</p>
          <h1 className="text-[32px] leading-tight text-balance">Instalments for cohort seats: proposed rules</h1>
          <p className="text-[15px]">
            For the product owner · From the frontend team · 26 Nov 2026 · SRS PAY-3 (Could)
          </p>
          <p className="max-w-[65ch]">
            The SRS asks for instalment plans for higher-priced cohorts but sets no rules. These are the rules we propose to build. Each has a default you can accept or change. Nothing is built until you confirm.
          </p>
        </header>

        <section aria-labelledby="summary" className="rounded-lg border border-border bg-surface-1 p-5 md:p-6">
          <h2 id="summary" className="mb-2 text-sm font-semibold tracking-[0.06em] text-primary uppercase">
            In short
          </h2>
          <p className="max-w-[65ch]">
            Learners can split a cohort seat of <strong className="text-heading">$300 or more</strong> into <strong className="text-heading">3 monthly payments</strong>, with no fee. The first payment confirms the seat. The rest are charged automatically to the same card, and the last one falls before the cohort ends. A failed payment is retried for 7 days; after that, access pauses until it&apos;s paid. Admins can switch instalments off and change the threshold and number of payments.
          </p>
        </section>

        <section aria-labelledby="decisions">
          <h2 id="decisions" className="mb-2 text-[22px]">
            Decisions needed
          </h2>
          <ol className="divide-y divide-border border-y border-border">
            {DECISIONS.map((d, i) => (
              <li key={d.q} className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 py-6">
                <span className="font-heading text-[22px] leading-snug text-primary tabular-nums">{i + 1}</span>
                <div className="flex min-w-0 flex-col gap-2.5">
                  <h3 className="text-lg">{d.q}</h3>
                  <p className="border-l-[3px] border-accent pl-3.5 text-heading">
                    <span className={label}>Proposed</span>
                    {d.proposed}
                  </p>
                  <p className="text-base">
                    <span className={label}>Why</span>
                    {d.why}
                  </p>
                  {d.alt && (
                    <p className="text-base">
                      <span className={label}>Alternatives</span>
                      {d.alt}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="needs" className="flex flex-col gap-3">
          <h2 id="needs" className="text-[22px]">
            What this needs from others
          </h2>
          <ul className="flex max-w-[65ch] list-disc flex-col gap-2 pl-5">
            {NEEDS.map(([who, what]) => (
              <li key={who}>
                <strong className="text-heading">{who}:</strong> {what}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="build" className="flex flex-col gap-3">
          <h2 id="build" className="text-[22px]">
            What we&apos;ll build once agreed
          </h2>
          <ul className="flex max-w-[65ch] list-disc flex-col gap-2 pl-5">
            {BUILD.map(([what, detail]) => (
              <li key={what}>
                <strong className="text-heading">{what}:</strong> {detail}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="reply" className="rounded-lg border border-border bg-surface-1 p-5 md:p-6">
          <h2 id="reply" className="mb-2 text-[22px]">
            How to reply
          </h2>
          <p className="max-w-[65ch]">Reply with &ldquo;accept all&rdquo;, or list the numbers you want changed and what to change them to.</p>
        </section>
      </article>
    </div>
  );
}
