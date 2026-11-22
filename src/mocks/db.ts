import type { User } from "@/lib/api/schemas/auth";
import type { Category, Modality, Training } from "@/lib/api/schemas/catalog";
import type { Cohort } from "@/lib/api/schemas/cohort";
import type { Enrolment, Payment } from "@/lib/api/schemas/payments";
import type { Notification } from "@/lib/api/schemas/notifications";
import type { PlatformSettings } from "@/lib/api/schemas/settings";
import type { Booking } from "@/lib/api/schemas/bookings";
import type { Resource } from "@/lib/api/schemas/resources";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import type { Feedback, Rubric } from "@/lib/api/schemas/feedback";
import type { Availability } from "@/lib/domain/slots";
import { DEFAULT_SETTINGS } from "@/lib/domain/policy";
import { wants } from "@/lib/domain/notification-groups";
import { cohortSessions } from "@/lib/domain/cohort-schedule";
import { seedCohorts, seedLearnerHistory } from "./seed-cohorts";
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

/** What the backend stores for a 1:1 booking; the API joins in names and the payment status. */
export type StoredBooking = Omit<Booking, "training" | "instructor" | "learner" | "payment_status"> & {
  training_id: string;
  instructor_id: string;
  learner_id: string;
  /** DRAFT only: the slot stays held while the learner is on the payment page. */
  held_until: string | null;
};

/** REC-2: a recording the video provider delivered for a session. */
export type StoredRecording = {
  id: string;
  session_id: string;
  kind: "COHORT" | "ONE_ON_ONE";
  training_id: string;
  cohort_id: string | null;
  booking_id: string | null;
  instructor_id: string;
  recorded_at: string;
  duration_sec: number;
  status: "PROCESSING" | "READY" | "FAILED";
  /** Mock only: when the provider finishes processing. */
  ready_at: string | null;
  hidden: boolean;
  trim: { start_sec: number; end_sec: number } | null;
  has_captions: boolean;
};

export type StoredResource = Omit<Resource, "audience_label"> & { owner_id: string };

/** MSG-1/2: a DIRECT pair or a cohort's channel (members come from the cohort's seats). */
export type StoredConversation = {
  id: string;
  kind: "DIRECT" | "COHORT";
  context: "ENROLMENT" | "BOOKING" | "ENQUIRY" | "COHORT";
  /** DIRECT: [learner, instructor]. COHORT: empty, members are worked out from the cohort. */
  member_ids: string[];
  training_id: string | null;
  cohort_id: string | null;
  /** Who opened it: an empty DIRECT conversation only shows for them. */
  created_by: string | null;
  created_at: string;
  /** MSG-3: user id → when they last read it. */
  reads: Record<string, string>;
  /** MSG-6, DIRECT only: the member who blocked the other. */
  blocked_by: string | null;
};

export type StoredMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachments: StoredFile[];
  announcement: boolean;
  client_id: string | null;
  /** MSG-6: contact details were masked on send. */
  filtered: boolean;
  /** MSG-6: removed by an admin after a report. */
  removed_at: string | null;
  created_at: string;
};

/** FDB-1: what the backend stores; names and titles are joined in by the API. */
export type StoredFeedback = Omit<Feedback, "training_title" | "instructor" | "learner" | "session_start_utc" | "session_kind"> & {
  instructor_id: string;
  learner_id: string;
};

/** PAY-7: one line in an instructor's earnings ledger. */
export type StoredLedgerEntry = {
  id: string;
  instructor_id: string;
  kind: "EARNING" | "REFUND" | "PAYOUT" | "PAYOUT_RETURNED";
  description: string;
  payment_id: string | null;
  payout_id: string | null;
  gross: number | null;
  commission: number | null;
  commission_percent: number | null;
  amount: number;
  available_at: string;
  created_at: string;
};

export type StoredPayout = {
  id: string;
  instructor_id: string;
  amount: number;
  status: "REQUESTED" | "PAID" | "FAILED";
  trigger: "REQUEST" | "SCHEDULE";
  requested_at: string;
  paid_at: string | null;
  failure_reason: string | null;
  reference: string | null;
  /** Mock only: when the transfer "arrives". */
  settles_at: string | null;
};

/** FDB-4: one review per learner, training and instructor. */
export type StoredReview = {
  id: string;
  learner_id: string;
  training_id: string;
  instructor_id: string;
  training_rating: number;
  instructor_rating: number;
  comment: string;
  context: "COHORT" | "ONE_ON_ONE";
  status: "PUBLISHED" | "HIDDEN";
  hidden_reason: string | null;
  moderation: { by_name: string; at: string } | null;
  created_at: string;
  updated_at: string;
};

/** MSG-6: a report on a message or a whole conversation, for admins to review. */
export type StoredMessageReport = {
  id: string;
  conversation_id: string;
  message_id: string | null;
  reporter_id: string;
  reason: "SPAM" | "HARASSMENT" | "OFF_PLATFORM_PAYMENT" | "OTHER";
  details: string;
  status: "OPEN" | "RESOLVED";
  resolution: { action: "REMOVE_MESSAGE" | "DISMISS"; note: string; by_name: string; at: string } | null;
  created_at: string;
};

export type MockUser = User & {
  password: string | null;
  headline?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
};

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
  enrolments: Enrolment[];
  notifications: (Notification & { user_id: string })[];
  /** NTF-2: saved channel choices per user and group. Missing means "everything on". */
  notificationPrefs: Record<string, Record<string, { in_app: boolean; email: boolean }>>;
  /** MFA set-up in progress: user id → secret shown in the authenticator QR. */
  mfaSetup: Record<string, string>;
  /** OTO-1: each instructor's hours, in their own zone. */
  availability: Record<string, Availability>;
  bookings: StoredBooking[];
  /** COH-4: marks per session id, then learner id. */
  attendance: Record<string, Record<string, "PRESENT" | "LATE" | "ABSENT">>;
  recordings: StoredRecording[];
  /** REC-4: user id → recording id → seconds watched. */
  recordingProgress: Record<string, Record<string, number>>;
  /** RES-1..3: training materials. */
  resources: StoredResource[];
  /** ONB-5: enrolment id → steps done, plus whether the learner dismissed it. */
  checklists: Record<string, { join_tested: boolean; resources_opened: boolean; met_instructor: boolean; dismissed: boolean }>;
  /** MSG-1..4 */
  conversations: StoredConversation[];
  messages: StoredMessage[];
  messageReports: StoredMessageReport[];
  /** FDB-1: admin-configured rubrics and the feedback written with them. */
  rubrics: Rubric[];
  feedback: StoredFeedback[];
  reviews: StoredReview[];
  /** PAY-7: earnings ledger, payouts and each instructor's payout schedule. */
  ledger: StoredLedgerEntry[];
  payouts: StoredPayout[];
  payoutSchedules: Record<string, { schedule: "MANUAL" | "WEEKLY" | "MONTHLY"; next_run_at: string | null }>;
  /** MSG-5: `conversation:user` → newest message already emailed about, so each unread batch emails once. */
  messageEmails: Record<string, string>;
  /** Mock gateway only: when a completed checkout "arrives by webhook", and how it ended. */
  payments: (Payment & { mock?: { outcome: "success" | "decline"; settles_at: string } ; idempotency_key?: string })[];
  pricingRules: PricingRuleDto[];
  audit: AuditEntry[];
  settings: PlatformSettings;
  settingsHistory: { version: number; updated_at: string; updated_by_name: string; summary: string }[];
  modalities: Modality[];
  tokens: Record<string, Token>;
  outbox: MockEmail[];
  session: string | null;
  /** ADM-2: the admin viewing as `session`, when impersonating. */
  impersonation: { admin_id: string; started_at: string; reason: string } | null;
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

/** The pending applicant's submitted onboarding, so approval (ONB-3) has something to review. */
function seedOnboarding(): State["onboarding"] {
  const file = (id: string, purpose: "ID_DOCUMENT" | "CREDENTIAL", name: string) => ({
    id, purpose, name, content_type: "application/pdf", size_bytes: 248_000, scan_status: "CLEAN" as const, url: null,
  });
  return {
    usr_instructor_pending: {
      completed_steps: ["profile", "expertise", "verification", "payout", "availability"],
      sections: {
        profile: {
          name: "Demo Applicant",
          avatar: null,
          timezone: "Africa/Lagos",
          country: "NG",
          headline: "Statistician and university tutor",
          bio: "I teach statistics and research methods to undergraduates and help final-year students plan and analyse their projects. Eight years of tutoring, with a focus on making the maths feel practical.",
        },
        expertise: {
          category_ids: ["cat_uni_course", "cat_topic"],
          subjects: ["Statistics", "Research methods", "SPSS", "R"],
          qualifications: [
            { title: "MSc Statistics", institution: "University of Ibadan", year: 2017 },
            { title: "BSc Mathematics", institution: "University of Lagos", year: 2014 },
          ],
        },
        verification: {
          id_document: file("upl_seed_id", "ID_DOCUMENT", "national-id.pdf"),
          credentials: [file("upl_seed_msc", "CREDENTIAL", "msc-certificate.pdf")],
        },
        payout: { status: "COMPLETE" },
        availability: {
          timezone: "Africa/Lagos",
          weekly: [
            { weekday: 2, start: "17:00", end: "20:00" },
            { weekday: 4, start: "17:00", end: "20:00" },
            { weekday: 6, start: "09:00", end: "13:00" },
          ],
        },
      },
    },
  };
}

/** ADM-5: a believable recent history so the audit log viewer isn't empty in a demo. */
function seedAudit(): AuditEntry[] {
  const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const e = (n: number, h: number, action: string, target_type: string, target_id: string, summary: string): AuditEntry => ({
    id: `aud_seed_${n}`, actor_id: "usr_admin_1", actor_name: "Test Admin", action, target_type, target_id, summary, created_at: ago(h),
  });
  return [
    e(1, 2, "cohort.open", "cohort", "coh_mth_sem1", 'Cohort "First semester cohort": DRAFT → OPEN'),
    e(2, 26, "user.approve", "user", "usr_instructor_3", "Approved instructor Demo Instructor Three"),
    e(3, 50, "training.updated", "training", "trn_excel_fr", 'Updated training "Excel pour la finance"'),
    e(4, 51, "training.price_override_changed", "training", "trn_excel_fr", "Excel pour la finance: price override set to $35 per hour"),
    e(5, 120, "user.suspend", "user", "usr_learner_suspended", "Suspended Demo Suspended Learner. Reason: Repeated chargebacks on two cards."),
    e(6, 200, "category.updated", "category", "cat_uni_course", 'Category "University Course": changed its fields'),
    e(7, 480, "pricing_rule.created", "pricing_rule", "rule_c_exam", "Cohort × Professional Exam: $450 per seat now"),
  ];
}

/** Demo hours: evenings and Saturday mornings in each instructor's own zone. */
function seedAvailability(): Record<string, Availability> {
  const evenings = (timezone: string, extra: Availability["weekly"] = []): Availability => ({
    timezone,
    weekly: [
      { weekday: 1, start: "18:00", end: "21:00" },
      { weekday: 3, start: "18:00", end: "21:00" },
      { weekday: 4, start: "18:00", end: "21:00" },
      { weekday: 6, start: "09:00", end: "13:00" },
      ...extra,
    ],
    overrides: [],
    notice_hours: 12,
  });
  return {
    usr_instructor_1: evenings("Europe/London", [{ weekday: 2, start: "07:00", end: "09:00" }]),
    usr_instructor_2: evenings("Africa/Lagos"),
    usr_instructor_3: evenings("Europe/London"),
  };
}

/**
 * Recordings of the running Autumn cohort's past classes. Every one plays the same 20-second demo
 * clip (public/demo), so its length is 20 s; real lengths come from the video provider. The latest
 * is still processing and becomes ready a couple of minutes after the demo starts (REC-2).
 */
function seedRecordings(): StoredRecording[] {
  const cohort = seedCohorts().find((c) => c.id === "coh_aa_2025")!;
  const past = cohortSessions(cohort).filter((s) => Date.parse(s.end_utc) < Date.now());
  return past.map((s, i) => ({
    id: `rec_${s.id.replace(/[:-]/g, "_")}`,
    session_id: s.id,
    kind: "COHORT",
    training_id: cohort.training_id,
    cohort_id: cohort.id,
    booking_id: null,
    instructor_id: cohort.instructor_id,
    recorded_at: s.start_utc,
    duration_sec: 20,
    status: i === past.length - 1 ? "PROCESSING" : "READY",
    ready_at: i === past.length - 1 ? new Date(Date.now() + 2 * 60_000).toISOString() : null,
    hidden: false,
    trim: null,
    has_captions: true,
  }));
}

/** Materials for the running Autumn cohort's training, one per kind of audience and folder. */
function seedResources(): StoredResource[] {
  const cohort = seedCohorts().find((c) => c.id === "coh_aa_2025")!;
  const firstClass = cohortSessions(cohort)[0];
  const at = "2026-10-26T09:00:00.000Z";
  const pdf = (id: string, name: string, size: number) => ({
    id, purpose: "RESOURCE" as const, name, content_type: "application/pdf", size_bytes: size, scan_status: "CLEAN" as const, url: `/demo/${name}`,
  });
  const base = { training_id: cohort.training_id, owner_id: cohort.instructor_id, created_at: at, description: null, cohort_id: null, session_id: null, learner_id: null };
  return [
    { ...base, id: "res_seed_1", kind: "FILE", title: "Audit planning: summary notes", folder: "Week 1", position: 0, scope: "TRAINING", file: pdf("file_seed_1", "audit-planning-summary.pdf", 910), link_url: null, description: "Read before the first class." },
    { ...base, id: "res_seed_2", kind: "LINK", title: "ICAN study text (official site)", folder: "Week 1", position: 1, scope: "TRAINING", file: null, link_url: "https://icanig.org/" },
    { ...base, id: "res_seed_3", kind: "FILE", title: "Practice questions", folder: "Past papers", position: 2, scope: "COHORT", cohort_id: cohort.id, file: pdf("file_seed_3", "past-paper-practice.pdf", 839), link_url: null },
    { ...base, id: "res_seed_4", kind: "LINK", title: "Whiteboard from the first class", folder: null, position: 3, scope: "SESSION", cohort_id: cohort.id, session_id: firstClass.id, file: null, link_url: "https://example.com/whiteboard/autumn-1" },
  ];
}

/** A payout already paid to the Autumn cohort's instructor, so the history isn't empty (PAY-7). */
function seedPayouts(): Pick<State, "ledger" | "payouts" | "payoutSchedules"> {
  const at = new Date(Date.now() - 10 * 86_400_000).toISOString();
  const paid = new Date(Date.now() - 8 * 86_400_000).toISOString();
  return {
    payouts: [{ id: "po_seed_1", instructor_id: "usr_instructor_1", amount: 20000, status: "PAID", trigger: "REQUEST", requested_at: at, paid_at: paid, failure_reason: null, reference: "tr_demo_1A2B3C", settles_at: null }],
    ledger: [{ id: "led_seed_po1", instructor_id: "usr_instructor_1", kind: "PAYOUT", description: "Payout to your bank account", payment_id: null, payout_id: "po_seed_1", gross: null, commission: null, commission_percent: null, amount: -20000, available_at: at, created_at: at }],
    payoutSchedules: {},
  };
}

/** Three reviews of last semester's MTH 101 cohort, so the training page shows an average (FDB-4). */
function seedReviews(): StoredReview[] {
  const at = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const r = (n: number, learner_id: string, training_rating: number, instructor_rating: number, comment: string, days: number): StoredReview => ({
    id: `rev_seed_${n}`, learner_id, training_id: "trn_mth101", instructor_id: "usr_instructor_2", training_rating, instructor_rating, comment,
    context: "COHORT", status: "PUBLISHED", hidden_reason: null, moderation: null, created_at: at(days), updated_at: at(days),
  });
  return [
    r(1, "usr_roster_1", 5, 5, "Clear explanations and lots of worked examples. I finally understand limits.", 40),
    r(2, "usr_roster_2", 4, 5, "Great instructor. The weekly problem sets were hard but worth it; I'd like the answers a little sooner.", 38),
    r(3, "usr_roster_3", 4, 4, "Well organised. Recordings helped when I missed a class.", 35),
  ];
}

/** A default rubric, one for professional exams, and two rounds of feedback on the Autumn cohort so progress shows. */
function seedFeedback(): Pick<State, "rubrics" | "feedback"> {
  const at = "2026-11-01T00:00:00.000Z";
  const c = (key: string, label: string, description: string | null = null) => ({ key, label, description });
  const general: Rubric = {
    id: "rub_general", name: "General progress", is_default: true, archived: false, category_ids: [], updated_at: at,
    criteria: [c("understanding", "Understanding of the topic"), c("problem_solving", "Problem solving"), c("participation", "Participation"), c("preparation", "Preparation")],
  };
  const exam: Rubric = {
    id: "rub_exam", name: "Professional exam readiness", is_default: false, archived: false, category_ids: ["cat_prof_exam"], updated_at: at,
    criteria: [
      c("technical", "Technical knowledge", "Knows the standards and terms the paper tests."),
      c("application", "Applying it to scenarios", "Uses the facts of the case, not a memorised answer."),
      c("technique", "Exam technique", "Structure, headings, answering the requirement."),
      c("timing", "Time management", "Finishes within the time allowed per mark."),
    ],
  };
  const cohort = seedCohorts().find((x) => x.id === "coh_aa_2025")!;
  const past = cohortSessions(cohort).filter((s) => Date.parse(s.end_utc) < Date.now());
  const snapshot = { id: exam.id, name: exam.name, criteria: exam.criteria };
  const base = { training_id: cohort.training_id, instructor_id: cohort.instructor_id, learner_id: "usr_learner_1", rubric: snapshot, assignment_title: null, attachment: null };
  const written = (i: number) => new Date(Date.parse(past[i].end_utc) + 3 * 3_600_000).toISOString();
  const feedback: StoredFeedback[] = past.length < 2 ? [] : [
    {
      ...base, id: "fbk_seed_1", session_id: past[0].id, created_at: written(0), updated_at: written(0),
      scores: { technical: 2, application: 2, technique: 1, timing: 2 },
      comment: "A solid start. You know the audit risk model well, but your answers describe it rather than apply it to the client in the question.",
      strengths: "Clear definitions and good use of the standards' terms.",
      improvements: "Use the case facts: name the specific risk and why it matters for this client.",
      next_steps: "Rewrite answer 2 from the practice paper using one paragraph per risk: risk, why, audit response.",
    },
    {
      ...base, id: "fbk_seed_2", session_id: past[1].id, created_at: written(1), updated_at: written(1),
      scores: { technical: 3, application: 3, technique: 2, timing: 2 },
      comment: "Real progress on applying the model to the scenario. Your rewritten answer 2 would score well. Timing is now the main thing holding marks back.",
      strengths: "Each risk now ties back to the client's facts.",
      improvements: "You spent 25 minutes on a 10-mark part. Watch the clock: about 1.8 minutes per mark.",
      next_steps: "Do question 3 under timed conditions and note where the time goes.",
      assignment_title: "Practice paper, question 2 (rewritten)",
      attachment: { id: "file_seed_fb", purpose: "FEEDBACK_ATTACHMENT", name: "q2-marked.pdf", content_type: "application/pdf", size_bytes: 839, scan_status: "CLEAN", url: "/demo/past-paper-practice.pdf" },
    },
  ];
  return { rubrics: [general, exam], feedback };
}

/** A chat with the Autumn cohort's instructor (last reply unread) and the cohort's channel. */
function seedMessages(): Pick<State, "conversations" | "messages" | "messageReports" | "messageEmails"> {
  const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  const msg = (n: number, conversation_id: string, sender_id: string, minutesAgo: number, body: string, announcement = false): StoredMessage => ({
    id: `msg_seed_${n}`, conversation_id, sender_id, body, attachments: [], announcement, client_id: null, filtered: false, removed_at: null, created_at: ago(minutesAgo),
  });
  const direct = "cnv_seed_direct";
  const channel = "cnv_seed_coh_aa_2025";
  return {
    conversations: [
      {
        id: direct, kind: "DIRECT", context: "ENROLMENT", member_ids: ["usr_learner_1", "usr_instructor_1"], training_id: "trn_ican_aa_2025",
        cohort_id: null, created_by: "usr_learner_1", created_at: ago(60 * 50), reads: { usr_learner_1: ago(60 * 26), usr_instructor_1: ago(60 * 3) }, blocked_by: null,
      },
      {
        id: channel, kind: "COHORT", context: "COHORT", member_ids: [], training_id: "trn_ican_aa_2025", cohort_id: "coh_aa_2025",
        created_by: null, created_at: ago(60 * 24 * 20), reads: { usr_learner_1: ago(60 * 24 * 2), usr_instructor_1: ago(30) }, blocked_by: null,
      },
    ],
    messages: [
      msg(1, direct, "usr_learner_1", 60 * 48, "Good evening. Should I read the whole of chapter 3 before Thursday, or is the summary in Resources enough?"),
      msg(2, direct, "usr_instructor_1", 60 * 47, "The summary is enough for Thursday. Read 3.4 on materiality in full though, we'll work through an example on it."),
      msg(3, direct, "usr_learner_1", 60 * 27, "Thank you. I've done 3.4 now."),
      msg(4, direct, "usr_instructor_1", 60 * 2, "Great. Bring one question about it to class and we'll start there."),
      msg(5, channel, "usr_instructor_1", 60 * 24 * 6, "Welcome to the Autumn cohort channel. Use it for questions between classes; I usually answer within a day.", true),
      msg(6, channel, "usr_roster_1", 60 * 24 * 3, "Does anyone have the page number for the audit risk model diagram?"),
      msg(7, channel, "usr_roster_2", 60 * 24 * 3 - 20, "Page 112 in the study text."),
      msg(8, channel, "usr_instructor_1", 60 * 20, "Reminder: Thursday's class starts 15 minutes early to make room for the mock exam review.", true),
      { ...msg(9, channel, "usr_roster_3", 60 * 24 * 2 + 60, "I tutor this privately for half the price. Pay me directly and message me on [contact details hidden]"), filtered: true },
    ],
    // A classmate reported the off-platform offer, so the moderation queue has something to review.
    messageReports: [
      {
        id: "rpt_seed_1", conversation_id: channel, message_id: "msg_seed_9", reporter_id: "usr_roster_1", reason: "OFF_PLATFORM_PAYMENT",
        details: "Offering lessons outside EduBridge for cash.", status: "OPEN", resolution: null, created_at: ago(60 * 24 * 2 - 30),
      },
    ],
    messageEmails: {},
  };
}

/** A few demo notifications so the bell isn't empty: recent ones unread, older ones read. */
function seedNotifications(): State["notifications"] {
  const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  return [
    { id: "ntf_seed_1", user_id: "usr_learner_1", type: "SESSION_REMINDER", title: "Class soon: ICAN Audit and Assurance", body: "Your Autumn cohort class starts at the usual time. The join link appears on My trainings.", link: "/learn/trainings", created_at: ago(3), read_at: null },
    { id: "ntf_seed_2", user_id: "usr_learner_1", type: "COHORT_CHANGED", title: "Autumn cohort: room for questions added", body: "Your instructor added 15 minutes of open questions to the end of each class.", link: "/learn/trainings", created_at: ago(30), read_at: null },
    { id: "ntf_seed_3", user_id: "usr_learner_1", type: "PAYMENT_SUCCEEDED", title: "You're enrolled: ICAN Audit and Assurance (2025 syllabus)", body: "We received $400. Your receipt is in Payments.", link: "/learn/payments", created_at: ago(24 * 31), read_at: ago(24 * 31) },
    { id: "ntf_seed_4", user_id: "usr_admin_1", type: "INSTRUCTOR_APPLICATION", title: "New instructor application", body: "An instructor finished onboarding and is waiting for approval.", link: "/admin/users?approval=PENDING", created_at: ago(5), read_at: null },
  ];
}

/** NTF-1: in-app notification; the backend sends the email version too (the mock logs it in the outbox). */
export function notify(userId: string, n: Pick<Notification, "type" | "title" | "body" | "link">) {
  const user = findUser(userId);
  if (user && !wants(user.role, db.notificationPrefs[userId], n.type, "in_app")) return;
  db.notifications.unshift({ ...n, id: newId("ntf"), user_id: userId, created_at: new Date().toISOString(), read_at: null });
}

function seedHistory() {
  const cohorts = seedCohorts();
  const history = seedLearnerHistory(cohorts);
  // Classmates in the running Autumn cohort, so the attendance sheet has a real roster.
  const classmates = [1, 2, 3].map((n) => ({
    ...history.enrolments.find((e) => e.cohort_id === "coh_aa_2025")!,
    id: `enr_roster_${n}`,
    learner_id: `usr_roster_${n}`,
    payment_id: `pay_roster_${n}`,
  }));
  return { cohorts, enrolments: [...history.enrolments, ...classmates], payments: history.payments };
}

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
      ...["Ada", "Chidi", "Fola"].map((first, i) =>
        seedUser({ id: `usr_roster_${i + 1}`, role: "LEARNER", email: `${first.toLowerCase()}.demo@example.com`, name: `${first} Demo` }),
      ),
      seedUser({
        id: "usr_instructor_pending",
        role: "INSTRUCTOR",
        email: "applicant@example.com",
        name: "Demo Applicant",
        approval_status: "PENDING",
        headline: "Statistician and university tutor",
        created_at: "2026-11-17T10:12:00.000Z",
      }),
      seedUser({
        id: "usr_learner_suspended",
        role: "LEARNER",
        email: "suspended@example.com",
        name: "Demo Suspended Learner",
        status: "SUSPENDED",
        created_at: "2026-09-02T08:00:00.000Z",
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
    onboarding: seedOnboarding(),
    trainings: seedTrainings(),
    ...seedHistory(),
    notifications: seedNotifications(),
    notificationPrefs: {},
    mfaSetup: {},
    availability: seedAvailability(),
    bookings: [],
    attendance: {},
    recordings: seedRecordings(),
    recordingProgress: {},
    resources: seedResources(),
    checklists: {},
    ...seedMessages(),
    ...seedFeedback(),
    reviews: seedReviews(),
    ...seedPayouts(),
    pricingRules: seedRules(),
    audit: seedAudit(),
    settings: { ...DEFAULT_SETTINGS, version: 1, updated_at: "2026-11-01T00:00:00.000Z", updated_by: null },
    settingsHistory: [{ version: 1, updated_at: "2026-11-01T00:00:00.000Z", updated_by_name: "System", summary: "Starting values, not yet reviewed" }],
    tokens: {},
    outbox: [],
    session: null,
    impersonation: null,
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

const STORE_KEY = "edubridge.mock.db.v21";

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
  delete user.created_at;
  delete user.last_sign_in_at;
  const imp = db.impersonation && db.session === mock.id ? db.impersonation : null;
  const admin = imp && findUser(imp.admin_id);
  return { ...(user as User), impersonated_by: admin ? { id: admin.id, name: admin.name, started_at: imp.started_at } : null };
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
    db.impersonation = null;
    const user = findUser(userId);
    if (user) user.last_sign_in_at = new Date().toISOString();
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
