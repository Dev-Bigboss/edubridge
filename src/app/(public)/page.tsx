import { Categories } from "@/components/landing/categories";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { TeachCta } from "@/components/landing/teach-cta";

/**
 * Landing page, same look as the original. Sections not carried over yet:
 * - Brand logo strip and testimonials: the old ones were template placeholders. They return once
 *   there are real partners and real reviews (FDB-4).
 * - Featured tutors: returns in Phase 1 as "Featured trainings" from the catalogue API (TRN-6).
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Categories />
      <TeachCta />
    </>
  );
}
