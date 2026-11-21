import { z } from "zod";
import { StoredFile } from "./uploads";

/** Mirrors contracts/openapi/resources.yaml (RES-1..4). */

export const RESOURCE_SCOPES = ["TRAINING", "COHORT", "SESSION", "LEARNER"] as const;
export type ResourceScope = (typeof RESOURCE_SCOPES)[number];

/** RES-2: who sees it. Exactly the ids its scope needs are set. */
export const Audience = z.object({
  scope: z.enum(RESOURCE_SCOPES),
  cohort_id: z.string().nullable(),
  /** A cohort class (`cohort:date`, sessions.yaml). */
  session_id: z.string().nullable(),
  /** A 1:1 learner of this instructor on this training. */
  learner_id: z.string().nullable(),
});
export type Audience = z.infer<typeof Audience>;

export const Resource = Audience.extend({
  id: z.string(),
  training_id: z.string(),
  kind: z.enum(["FILE", "LINK"]),
  title: z.string(),
  description: z.string().nullable(),
  /** RES-3: module/folder name; null = not in a folder. */
  folder: z.string().nullable(),
  position: z.number().int(),
  file: StoredFile.nullable(),
  link_url: z.string().nullable(),
  /** Plain words for the audience, e.g. "Evening cohort" or "Ada Demo (1:1)". */
  audience_label: z.string(),
  created_at: z.string(),
});
export type Resource = z.infer<typeof Resource>;
export const ResourceList = z.object({ items: z.array(Resource) });
export const ResourceResponse = z.object({ resource: Resource });

export const ResourceInput = Audience.extend({
  training_id: z.string().min(1),
  kind: z.enum(["FILE", "LINK"]),
  title: z.string().trim().min(2, { error: "Give it a title learners will recognise." }).max(120),
  description: z.string().trim().max(500).nullable(),
  folder: z.string().trim().max(60).nullable(),
  file_id: z.string().nullable(),
  link_url: z.url({ protocol: /^https?$/, error: "Enter a full web address starting with https://" }).nullable(),
});
export type ResourceInput = z.infer<typeof ResourceInput>;

/** What the instructor can target on a training: their cohorts (with classes) and their 1:1 learners. */
export const AudienceOptions = z.object({
  cohorts: z.array(z.object({ id: z.string(), name: z.string(), sessions: z.array(z.object({ id: z.string(), start_utc: z.string() })) })),
  learners: z.array(z.object({ id: z.string(), name: z.string() })),
  folders: z.array(z.string()),
});
export type AudienceOptions = z.infer<typeof AudienceOptions>;

export const TeachingTrainings = z.object({ items: z.array(z.object({ id: z.string(), title: z.string(), modality_code: z.string() })) });
