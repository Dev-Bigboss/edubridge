/**
 * FDB-1/2: rubric scoring and progress. Four levels with no neutral middle, so every score says
 * which way the learner is going. The labels are what learners see next to the number.
 */
export const RUBRIC_LEVELS = [1, 2, 3, 4] as const;
export type RubricLevel = (typeof RUBRIC_LEVELS)[number];
export const LEVEL_LABEL: Record<RubricLevel, string> = { 1: "Needs work", 2: "Developing", 3: "Good", 4: "Excellent" };

export const RUBRIC_CRITERIA = { min: 2, max: 8 } as const;

export type Criterion = { key: string; label: string; description: string | null };
export type RubricLike = { id: string; criteria: Criterion[]; category_ids: string[]; is_default: boolean; archived: boolean };

/** A stable key from a label, unique within the rubric ("Exam technique" → "exam_technique"). */
export function criterionKey(label: string, taken: string[]): string {
  const base = label.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "criterion";
  let key = base;
  for (let n = 2; taken.includes(key); n++) key = `${base}_${n}`;
  return key;
}

/** The rubric for a training: one set up for its category, else the platform default. */
export function rubricFor<T extends RubricLike>(rubrics: T[], categoryId: string | null): T | null {
  const live = rubrics.filter((r) => !r.archived);
  return (categoryId && live.find((r) => r.category_ids.includes(categoryId))) || live.find((r) => r.is_default) || null;
}

/** Problems that stop a rubric being saved: too few or many criteria, blank or repeated labels. */
export function rubricProblems(criteria: { label: string }[]): string | null {
  if (criteria.length < RUBRIC_CRITERIA.min) return `Add at least ${RUBRIC_CRITERIA.min} criteria.`;
  if (criteria.length > RUBRIC_CRITERIA.max) return `Use at most ${RUBRIC_CRITERIA.max} criteria, so feedback stays quick to give.`;
  const labels = criteria.map((c) => c.label.trim().toLowerCase());
  if (labels.some((l) => !l)) return "Every criterion needs a name.";
  if (new Set(labels).size !== labels.length) return "Two criteria have the same name.";
  return null;
}

/** Every criterion of the rubric scored 1–4; extra keys are rejected. */
export function scoreProblems(criteria: Criterion[], scores: Record<string, number>): Record<string, string> {
  const problems: Record<string, string> = {};
  for (const c of criteria) {
    const v = scores[c.key];
    if (!RUBRIC_LEVELS.includes(v as RubricLevel)) problems[c.key] = `Choose a level for ${c.label}.`;
  }
  for (const k of Object.keys(scores)) if (!criteria.some((c) => c.key === k)) problems[k] = "That isn't part of this rubric.";
  return problems;
}

export type ProgressRow = { key: string; label: string; first: number; latest: number; change: number; count: number };

/**
 * FDB-2: per criterion, first and latest score across a learner's feedback in one training, oldest
 * first. Criteria are matched by label so a renamed rubric version still lines up where it can.
 */
export function progress(items: { created_at: string; rubric: { criteria: Criterion[] }; scores: Record<string, number> }[]): ProgressRow[] {
  const ordered = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const rows = new Map<string, ProgressRow>();
  for (const f of ordered) {
    for (const c of f.rubric.criteria) {
      const score = f.scores[c.key];
      if (!score) continue;
      const id = c.label.trim().toLowerCase();
      const row = rows.get(id);
      if (!row) rows.set(id, { key: c.key, label: c.label, first: score, latest: score, change: 0, count: 1 });
      else Object.assign(row, { latest: score, change: score - row.first, count: row.count + 1 });
    }
  }
  return [...rows.values()];
}
