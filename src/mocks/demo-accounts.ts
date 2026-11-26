/**
 * Demo accounts for testing every part of the app on mock data (NEXT_PUBLIC_API_MOCKING=on).
 * Kept apart from db.ts so the login page can list them without loading the whole mock store;
 * demo-accounts.test.ts checks each one exists in the seed with this role.
 */
export const DEMO_PASSWORD = "Password123!";
/** Two-step code accepted for every instructor and admin. */
export const DEMO_MFA_CODE = "123456";

export type DemoAccount = { email: string; name: string; role: "LEARNER" | "INSTRUCTOR" | "ADMIN"; tests: string };

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "LEARNER", email: "learner@example.com", name: "Test Learner", tests: "Enrolled in the Autumn cohort: classes, recordings, resources, feedback, messages, payments, suggestions" },
  { role: "LEARNER", email: "ada.demo@example.com", name: "Ada Demo", tests: "A classmate in the same cohort: roster, cohort channel, announcements" },
  { role: "LEARNER", email: "new.learner@example.com", name: "New Learner", tests: "Hasn't set up a profile: the learner onboarding steps, then browsing and enrolling" },
  { role: "LEARNER", email: "suspended@example.com", name: "Suspended Learner", tests: "A suspended account: sign-in is refused" },
  { role: "INSTRUCTOR", email: "instructor@example.com", name: "Test Instructor", tests: "Teaches the Autumn cohort: schedule, attendance, resources, recordings, feedback, earnings, payouts" },
  { role: "INSTRUCTOR", email: "instructor.two@example.com", name: "Instructor Two", tests: "Mathematics lecturer with reviews on MTH 101" },
  { role: "INSTRUCTOR", email: "instructor.three@example.com", name: "Instructor Three", tests: "One-on-one Python and SQL: availability, booking requests" },
  { role: "INSTRUCTOR", email: "applicant@example.com", name: "Demo Applicant", tests: "Finished onboarding, waiting for admin approval" },
  { role: "INSTRUCTOR", email: "new.instructor@example.com", name: "New Instructor", tests: "Hasn't started: the instructor onboarding steps" },
  { role: "ADMIN", email: "admin@example.com", name: "Test Admin", tests: "Everything admin: catalogue, pricing, users and approvals, payments, moderation, reports, settings" },
];
