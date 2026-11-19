import type { User } from "@/lib/api/schemas/auth";
import type { Category, Modality } from "@/lib/api/schemas/catalog";
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

export type MockUser = User & { password: string | null };

/** What the backend would have emailed. The mock shows these in a dev-only inbox note. */
export type MockEmail = { to: string; subject: string; link: string; sent_at: string };

type Token = { kind: "VERIFY_EMAIL" | "RESET_PASSWORD"; user_id: string; expires_at: string };

type State = {
  users: MockUser[];
  categories: Category[];
  onboarding: Record<string, Pick<OnboardingState, "completed_steps" | "sections">>;
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
    tokens: {},
    outbox: [],
    session: null,
    pendingMfa: {},
  };
}

/** Bump when the seed shape changes so old demo data in a browser is discarded, not half-merged. */
const STORE_KEY = "edubridge.mock.db.v3";

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
  return user as User;
}

export const findUserByEmail = (email: string | undefined) =>
  db.users.find((u) => u.email.toLowerCase() === email?.trim().toLowerCase());

export const findUser = (id: string | null | undefined) => db.users.find((u) => u.id === id);

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
