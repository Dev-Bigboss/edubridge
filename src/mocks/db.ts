import type { User } from "@/lib/api/schemas/auth";
import type { Category, Modality, Training } from "@/lib/api/schemas/catalog";
import type { Cohort } from "@/lib/api/schemas/cohort";
import { seedCohorts } from "./seed-cohorts";
import type { PricingRuleDto } from "@/lib/api/schemas/pricing";
import type { OnboardingState } from "@/lib/api/schemas/onboarding";

/**
 * In-memory fixtures for the mock API. Realistic but obviously fake (example.com, test names)
 * so nothing here can be mistaken for real data in a demo.
 *
 * In the browser the whole store is mirrored to localStorage, so accounts you register and
 * records you create in a demo survive a refresh. `resetDb()` puts the seed back (tests call it).
 */

export const MOCK_PASSWORD = "Password123!";
export const MOCK_MFA_CODE = "123456";

export { LEGAL_VERSIONS } from "@/lib/legal/versions";

export type MockUser = User & { password: string | null; headline?: string | null };

/** ADM-5: admin actions and price/policy changes. */
export type AuditEntry = {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  summary: string;
  created_at: string;
};

/** What the backend would have emailed. The mock shows these in a dev-only inbox note. */
export type MockEmail = { to: string; subject: string; link: string; sent_at: string };

type Token = { kind: "VERIFY_EMAIL" | "RESET_PASSWORD"; user_id: string; expires_at: string };

type State = {
  users: MockUser[];
  categories: Category[];
  onboarding: Record<string, Pick<OnboardingState, "completed_steps" | "sections">>;
  trainings: Training[];
  cohorts: Cohort[];
  pricingRules: PricingRuleDto[];
  audit: AuditEntry[];
  modalities: Modality[];
  tokens: Record<string, Token>;
  outbox: MockEmail[];
  session: string | null;
  pendingMfa: Record<string, string>;
};

const seedUser = (u: Partial<MockUser> & Pick<MockUser, "id" | "role" | "email" | "name">): MockUser => ({
  timezone: "Africa/Lagos",
  status: "ACTIVE",
  avatar_url: null,
  onboarding_status: "COMPLETED",
  approval_status: u.role === "INSTRUCTOR" ? "APPROVED" : null,
  mfa_enabled: u.role !== "LEARNER",
  consent_required: false,
  password: MOCK_PASSWORD,
  ...u,
});

function seed(): State {
  return {
    users: [
      seedUser({ id: "usr_learner_1", role: "LEARNER", email: "learner@example.com", name: "Test Learner" }),
      seedUser({
        id: "usr_instructor_1",
        role: "INSTRUCTOR",
        email: "instructor@example.com",
        name: "Test Instructor",
        timezone: "Europe/London",
      }),
      seedUser({ id: "usr_admin_1", role: "ADMIN", email: "admin@example.com", name: "Test Admin" }),
      seedUser({
        id: "usr_instructor_2",
        role: "INSTRUCTOR",
        email: "instructor.two@example.com",
        name: "Demo Instructor Two",
        headline: "Mathematics lecturer, 10 years with first-year students",
      }),
      seedUser({
        id: "usr_instructor_3",
        role: "INSTRUCTOR",
        email: "instructor.three@example.com",
        name: "Demo Instructor Three",
        timezone: "Europe/London",
        headline: "Data analyst teaching Python and SQL",
      }),
    ],
    categories: [
      {
        id: "cat_prof_exam",
        name: "Professional Exam",
        slug: "professional-exam",
        description: "ICAN, ACCA, CFA, PMP and other certification exams.",
        active: true,
        metadata_fields: [
          { key: "exam_body", label: "Exam body", type: "TEXT", required: true },
          { key: "exam_code", label: "Exam code", type: "TEXT", required: false },
        ],
      },
      {
        id: "cat_uni_course",
        name: "University Course",
        slug: "university-course",
        description: "Support for a specific course at a specific institution.",
        active: true,
        metadata_fields: [
          { key: "institution", label: "Institution", type: "TEXT", required: true },
          { key: "course_code", label: "Course code", type: "TEXT", required: true },
          { key: "semester", label: "Semester", type: "SELECT", required: false, options: ["First", "Second", "Summer"] },
        ],
      },
      {
        id: "cat_topic",
        name: "Specific Topic",
        slug: "specific-topic",
        description: "Focused help on one subject, from calculus to Python.",
        active: true,
        metadata_fields: [{ key: "topic_tags", label: "Topic tags", type: "TAGS", required: true }],
      },
    ],
    modalities: [
      { id: "mod_cohort", code: "COHORT", name: "Cohort", active: true, pricing_units: ["PER_SEAT"] },
      { id: "mod_1on1", code: "ONE_ON_ONE", name: "One-on-one", active: true, pricing_units: ["PER_HOUR", "PER_SESSION"] },
    ],
    onboarding: {},
    trainings: seedTrainings(),
    cohorts: seedCohorts(),
    pricingRules: seedRules(),
    audit: [],
    tokens: {},
    outbox: [],
    session: null,
    pendingMfa: {},
  };
}

/** Bump when the seed shape changes so old demo data in a browser is discarded, not half-merged. */
/** Demo prices only (USD, plan D8). Real amounts are the PO's call, set in /admin/pricing. */
function seedRules(): PricingRuleDto[] {
  const from = "2026-11-01T00:00:00.000Z";
  const r = (id: string, modality_id: string, category_id: string, unit: PricingRuleDto["unit"], amount: number): PricingRuleDto => ({
    id, modality_id, category_id, unit, amount, currency: "USD", effective_from: from, effective_to: null,
    created_by: "usr_admin_1", created_at: from,
  });
  return [
    r("rule_c_exam", "mod_cohort", "cat_prof_exam", "PER_SEAT", 45000),
    r("rule_c_uni", "mod_cohort", "cat_uni_course", "PER_SEAT", 25000),
    r("rule_c_topic", "mod_cohort", "cat_topic", "PER_SEAT", 15000),
    r("rule_o_exam", "mod_1on1", "cat_prof_exam", "PER_HOUR", 6000),
    r("rule_o_uni", "mod_1on1", "cat_uni_course", "PER_HOUR", 4500),
    r("rule_o_topic", "mod_1on1", "cat_topic", "PER_HOUR", 4000),
  ];
}

function seedTrainings(): Training[] {
  const at = "2026-11-02T09:00:00.000Z";
  const inst = (id: string, name: string, headline: string | null, custom_rate: Training["price_override"] = null) => ({
    instructor_id: id, name, avatar_url: null, headline, custom_rate,
  });
  const base = { thumbnail: null, price_override: null, created_at: at, updated_at: at, published_at: at, duration_hours: null };
  return [
    {
      ...base,
      id: "trn_ican_sfr",
      slug: "ican-skills-financial-reporting",
      title: "ICAN Skills: Financial Reporting",
      summary: "Twelve live evening classes that walk through the full Financial Reporting syllabus with past questions.",
      description:
        "Work through every part of the ICAN Skills level Financial Reporting syllabus in a small live group: IFRS standards, group accounts, analysis and interpretation. Each class ends with a timed past question you mark together, so you build exam technique as well as knowledge.",
      category_id: "cat_prof_exam",
      modality_id: "mod_cohort",
      level: "INTERMEDIATE",
      language: "en",
      duration_hours: 24,
      status: "PUBLISHED",
      metadata: { exam_body: "ICAN", exam_code: "SFR" },
      instructors: [inst("usr_instructor_1", "Test Instructor", "Chartered accountant teaching ICAN")],
    },
    {
      ...base,
      id: "trn_acca_sbr",
      slug: "acca-strategic-business-reporting-one-on-one",
      title: "ACCA Strategic Business Reporting, one-on-one",
      summary: "Book focused sessions on the SBR topics you find hardest, at times that suit you.",
      description:
        "Private sessions for ACCA Strategic Business Reporting candidates. Bring the areas you struggle with, from group accounting to ethics scenarios, and your instructor builds each session around them with exam-standard questions and feedback.",
      category_id: "cat_prof_exam",
      modality_id: "mod_1on1",
      level: "ADVANCED",
      language: "en",
      status: "PUBLISHED",
      metadata: { exam_body: "ACCA", exam_code: "SBR" },
      instructors: [
        inst("usr_instructor_1", "Test Instructor", "Chartered accountant teaching ICAN", { amount: 7500, currency: "USD", unit: "PER_HOUR" }),
      ],
    },
    {
      ...base,
      id: "trn_mth101",
      slug: "mth-101-elementary-mathematics-i",
      title: "MTH 101: Elementary Mathematics I",
      summary: "A first-semester companion course: sets, functions, limits and the basics of calculus.",
      description:
        "Keep up with MTH 101 from week one. Weekly live classes follow the university's course outline, with worked examples, practice sets and a revision class before each test, taught by a lecturer who knows where first-year students get stuck.",
      category_id: "cat_uni_course",
      modality_id: "mod_cohort",
      level: "BEGINNER",
      language: "en",
      duration_hours: 30,
      status: "PUBLISHED",
      metadata: { institution: "University of Lagos", course_code: "MTH 101", semester: "First" },
      instructors: [inst("usr_instructor_2", "Demo Instructor Two", "Mathematics lecturer, 10 years with first-year students")],
    },
    {
      ...base,
      id: "trn_sql_1on1",
      slug: "sql-for-analysts-one-on-one",
      title: "SQL for Analysts, one-on-one",
      summary: "Learn to query real business data with joins, grouping and window functions, one session at a time.",
      description:
        "Private sessions for analysts and students who need SQL for work or a project. You bring a dataset or use ours, and each session builds one practical skill: filtering, joins, aggregation, window functions and writing queries others can read.",
      category_id: "cat_topic",
      modality_id: "mod_1on1",
      level: "BEGINNER",
      language: "en",
      duration_hours: null,
      status: "PUBLISHED",
      published_at: "2026-11-10T09:00:00.000Z",
      metadata: { topic_tags: ["SQL", "Data analysis"] },
      instructors: [inst("usr_instructor_3", "Demo Instructor Three", "Data analyst teaching Python and SQL")],
    },
    {
      ...base,
      id: "trn_excel_fr",
      slug: "excel-pour-la-finance",
      title: "Excel pour la finance",
      summary: "Séances individuelles en français : tableaux croisés, modèles financiers et graphiques clairs.",
      description:
        "Des séances individuelles pour maîtriser Excel dans un contexte financier : fonctions de recherche, tableaux croisés dynamiques, modèles de prévision et présentation des résultats. Chaque séance part de vos propres fichiers.",
      category_id: "cat_topic",
      modality_id: "mod_1on1",
      level: "INTERMEDIATE",
      language: "fr",
      duration_hours: null,
      status: "PUBLISHED",
      published_at: "2026-11-12T09:00:00.000Z",
      price_override: { amount: 3500, currency: "USD", unit: "PER_HOUR" },
      metadata: { topic_tags: ["Excel", "Finance"] },
      instructors: [inst("usr_instructor_3", "Demo Instructor Three", "Data analyst teaching Python and SQL")],
    },
    {
      ...base,
      id: "trn_ican_aa_2025",
      slug: "ican-audit-and-assurance-2025-syllabus",
      title: "ICAN Audit and Assurance (2025 syllabus)",
      summary: "Replaced by the 2026 syllabus course. Kept for learners who are already enrolled.",
      description:
        "Live classes for the 2025 ICAN Audit and Assurance syllabus. This training is archived: it no longer appears in the catalogue, but learners who enrolled keep their recordings and resources.",
      category_id: "cat_prof_exam",
      modality_id: "mod_cohort",
      level: "INTERMEDIATE",
      language: "en",
      duration_hours: 20,
      status: "ARCHIVED",
      metadata: { exam_body: "ICAN", exam_code: "AA" },
      instructors: [inst("usr_instructor_1", "Test Instructor", "Chartered accountant teaching ICAN")],
    },
    {
      ...base,
      id: "trn_python_da",
      slug: "python-for-data-analysis",
      title: "Python for Data Analysis",
      summary: "One-on-one help with pandas, cleaning messy data and charts, at your pace.",
      description: "",
      category_id: "cat_topic",
      modality_id: "mod_1on1",
      level: "BEGINNER",
      language: "en",
      status: "DRAFT",
      published_at: null,
      metadata: { topic_tags: ["Python", "pandas", "Data cleaning"] },
      instructors: [],
    },
  ];
}

const STORE_KEY = "edubridge.mock.db.v5";

function load(): State {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return { ...seed(), ...(JSON.parse(raw) as Partial<State>) };
    }
  } catch {
    /* corrupt or blocked storage: start from the seed */
  }
  return seed();
}

export const db: State = load();

/** Call after every mutation so a browser refresh keeps the demo state. */
export function save() {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch {
    /* storage full or blocked: the in-memory store still works for this tab */
  }
}

export function resetDb() {
  Object.assign(db, seed());
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

/** The public shape of a user (never leaks the mock password). */
export function toUser(mock: MockUser): User {
  const user: Partial<MockUser> = { ...mock };
  delete user.password;
  delete user.headline;
  return user as User;
}

export const findUserByEmail = (email: string | undefined) =>
  db.users.find((u) => u.email.toLowerCase() === email?.trim().toLowerCase());

export const findUser = (id: string | null | undefined) => db.users.find((u) => u.id === id);

export function audit(actor: MockUser, action: string, target_type: string, target_id: string, summary: string) {
  db.audit.unshift({
    id: newId("aud"),
    actor_id: actor.id,
    actor_name: actor.name,
    action,
    target_type,
    target_id,
    summary,
    created_at: new Date().toISOString(),
  });
}

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const HOUR = 3_600_000;

export function issueToken(kind: Token["kind"], userId: string): string {
  const token = `${kind === "VERIFY_EMAIL" ? "vrf" : "rst"}_${Math.random().toString(36).slice(2)}`;
  db.tokens[token] = {
    kind,
    user_id: userId,
    expires_at: new Date(Date.now() + (kind === "VERIFY_EMAIL" ? 24 : 1) * HOUR).toISOString(),
  };
  save();
  return token;
}

/** Single use: a token is gone once redeemed. Returns the user id, or null if invalid/expired. */
export function redeemToken(kind: Token["kind"], token: string | undefined): string | null {
  const entry = token ? db.tokens[token] : undefined;
  if (!entry || entry.kind !== kind) return null;
  delete db.tokens[token!];
  save();
  return new Date(entry.expires_at).getTime() > Date.now() ? entry.user_id : null;
}

export function sendMail(to: string, subject: string, link: string) {
  db.outbox.unshift({ to, subject, link, sent_at: new Date().toISOString() });
  db.outbox = db.outbox.slice(0, 20);
  save();
}

/**
 * The real backend keeps the session in an httpOnly cookie. The mock can't, so it keeps the
 * signed-in user id in the store.
 */
export const mockSession = {
  get: (): string | null => db.session,
  set(userId: string | null) {
    db.session = userId;
    save();
  },
  startMfa(userId: string): string {
    const id = newId("mfa");
    db.pendingMfa[id] = userId;
    save();
    return id;
  },
  finishMfa(challengeId: string): string | null {
    const userId = db.pendingMfa[challengeId] ?? null;
    delete db.pendingMfa[challengeId];
    save();
    return userId;
  },
  reset: resetDb,
};
