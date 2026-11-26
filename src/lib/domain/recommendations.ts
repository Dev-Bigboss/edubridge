import type { EducationLevel, TrainingLevel } from "./enums";

/**
 * Recommendations from onboarding data (Phase 4). Pure scoring so the backend can mirror it:
 * an interest category or a topic must match; level fit and an exam-friendly start only add to it.
 */

export type RecommendationReason =
  | { code: "CATEGORY"; value: string }
  | { code: "TOPIC"; value: string }
  | { code: "LEVEL"; value: null }
  | { code: "BEFORE_EXAM"; value: string };

export type LearnerInterests = {
  interest_category_ids: string[];
  topics: string[];
  education_level: EducationLevel | null;
  /** YYYY-MM-DD */
  exam_target_date: string | null;
};

export type Candidate = {
  id: string;
  title: string;
  summary: string;
  level: TrainingLevel;
  category: { id: string; name: string };
  /** YYYY-MM-DD of the soonest open cohort, if any. */
  next_start_date: string | null;
  /** Category details such as "ICAN" or "MTH 101". */
  keywords: string[];
};

export const MAX_RECOMMENDATIONS = 6;

/** Training levels that suit each education level. ALL_LEVELS always fits. */
const FITS: Record<EducationLevel, TrainingLevel[]> = {
  SECONDARY: ["BEGINNER"],
  UNDERGRADUATE: ["BEGINNER", "INTERMEDIATE"],
  POSTGRADUATE: ["INTERMEDIATE", "ADVANCED"],
  PROFESSIONAL: ["INTERMEDIATE", "ADVANCED"],
  OTHER: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
};

export const levelFits = (education: EducationLevel | null, level: TrainingLevel) =>
  level === "ALL_LEVELS" || (education !== null && FITS[education].includes(level));

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();

/** A topic matches when every word of it appears in the title, summary or keywords ("financial reporting" ↔ "Financial Reporting"). */
export function topicMatches(topic: string, c: Candidate): boolean {
  const haystack = norm([c.title, c.summary, ...c.keywords].join(" "));
  const words = norm(topic).split(" ").filter(Boolean);
  return words.length > 0 && words.every((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u").test(haystack));
}

export type Scored<C extends Candidate> = { candidate: C; score: number; reasons: RecommendationReason[] };

export function scoreCandidate<C extends Candidate>(c: C, me: LearnerInterests, today: string): Scored<C> | null {
  const reasons: RecommendationReason[] = [];
  let score = 0;
  if (me.interest_category_ids.includes(c.category.id)) {
    score += 3;
    reasons.push({ code: "CATEGORY", value: c.category.name });
  }
  for (const topic of me.topics.filter((tp) => topicMatches(tp, c)).slice(0, 2)) {
    score += 2;
    reasons.push({ code: "TOPIC", value: topic });
  }
  if (score === 0) return null;
  if (levelFits(me.education_level, c.level)) {
    score += 1;
    reasons.push({ code: "LEVEL", value: null });
  }
  if (me.exam_target_date && c.next_start_date && c.next_start_date >= today && c.next_start_date < me.exam_target_date) {
    score += 1;
    reasons.push({ code: "BEFORE_EXAM", value: me.exam_target_date });
  }
  return { candidate: c, score, reasons };
}

/** Best first; ties go to the sooner start, then the title. Trainings the learner already has are left out. */
export function recommend<C extends Candidate>(candidates: C[], me: LearnerInterests, opts: { exclude: Set<string>; today: string; limit?: number }): Scored<C>[] {
  return candidates
    .filter((c) => !opts.exclude.has(c.id))
    .map((c) => scoreCandidate(c, me, opts.today))
    .filter((s): s is Scored<C> => s !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.candidate.next_start_date ?? "9999").localeCompare(b.candidate.next_start_date ?? "9999") ||
        a.candidate.title.localeCompare(b.candidate.title),
    )
    .slice(0, opts.limit ?? MAX_RECOMMENDATIONS);
}
