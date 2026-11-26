import type { Audience } from "@/lib/api/schemas/resources";

/**
 * Resource rules (RES-2/3). The backend decides visibility; the mock and the instructor's form use
 * the same checks so the form never offers a combination the API would reject.
 */

/** The ids each audience needs, and only those. */
export function audienceProblem(a: Audience): string | null {
  if (a.scope === "COHORT" && !a.cohort_id) return "Choose the cohort.";
  if (a.scope === "SESSION" && (!a.cohort_id || !a.session_id)) return "Choose the cohort and the class.";
  if (a.scope === "LEARNER" && !a.learner_id) return "Choose the learner.";
  return null;
}

/** Keep only the ids the scope uses, so a changed audience never leaks the old one. */
export function cleanAudience(a: Audience): Audience {
  return {
    scope: a.scope,
    cohort_id: a.scope === "COHORT" || a.scope === "SESSION" ? a.cohort_id : null,
    session_id: a.scope === "SESSION" ? a.session_id : null,
    learner_id: a.scope === "LEARNER" ? a.learner_id : null,
  };
}

/**
 * RES-3: move an item one place up or down inside its folder (a keyboard-friendly alternative to
 * dragging, WCAG 2.2 2.5.7). Returns the folder's ids in their new order, or null at an edge.
 */
export function moveInFolder<T extends { id: string; folder: string | null; position: number }>(items: T[], id: string, dir: -1 | 1): string[] | null {
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  const folder = items.filter((i) => i.folder === item.folder).sort((a, b) => a.position - b.position);
  const at = folder.findIndex((i) => i.id === id);
  const to = at + dir;
  if (to < 0 || to >= folder.length) return null;
  const ids = folder.map((i) => i.id);
  [ids[at], ids[to]] = [ids[to], ids[at]];
  return ids;
}

/** Folders in first-used order, unfiled items last. */
export function groupByFolder<T extends { folder: string | null; position: number }>(items: T[]): { folder: string | null; items: T[] }[] {
  const names: (string | null)[] = [];
  for (const i of [...items].sort((a, b) => a.position - b.position)) if (!names.includes(i.folder)) names.push(i.folder);
  names.sort((a, b) => (a === null ? 1 : b === null ? -1 : 0));
  return names.map((folder) => ({ folder, items: items.filter((i) => i.folder === folder).sort((a, b) => a.position - b.position) }));
}
