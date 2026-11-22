/**
 * FDB-4 rules shared by the API and the app. An average built from one or two reviews says more about
 * those people than the training, so it only shows from three.
 */
export const MIN_REVIEWS_FOR_AVERAGE = 3;
export const REVIEW_COMMENT = { min: 10, max: 1000 } as const;

/** One decimal, or null below the minimum. */
export function averageRating(ratings: number[], min = MIN_REVIEWS_FOR_AVERAGE): number | null {
  if (ratings.length < min || ratings.length === 0) return null;
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
}

/** Public name on a review: first name and last initial ("Ada Demo" → "Ada D."). */
export function reviewerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || "A learner";
  return `${parts[0]} ${parts.at(-1)![0].toUpperCase()}.`;
}

/** "4.5 out of 5" for screen readers and plain text. */
export const ratingLabel = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)} out of 5`;
