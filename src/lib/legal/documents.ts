import { LEGAL_VERSIONS } from "./versions";

/**
 * Plain-language drafts written from the LMP SRS so the consent flow (ONB-4) has real documents
 * to point at. They are NOT reviewed by counsel: replace the text before launch and bump
 * LEGAL_VERSIONS so every user is asked to accept the final wording.
 */
export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDocument = { title: string; version: string; summary: string; sections: LegalSection[] };

export const TERMS: LegalDocument = {
  title: "Terms of service",
  version: LEGAL_VERSIONS.terms,
  summary: "The rules for learning and teaching on EduBridge: accounts, bookings, payments, cancellations and conduct.",
  sections: [
    {
      heading: "Your account",
      paragraphs: [
        "You need an account to enrol in a cohort or book a one-on-one session. Keep your sign-in details private and tell us straight away if you think someone else has used your account.",
        "Instructors and admins must use two-step verification. Instructor profiles are reviewed by EduBridge before they appear in the catalogue.",
      ],
    },
    {
      heading: "Cohorts",
      paragraphs: [
        "A cohort is a group class with a fixed schedule, a seat limit and an enrolment deadline. Your seat is confirmed once payment succeeds.",
        "If we cancel a cohort, or it does not reach its minimum number of learners, we tell everyone enrolled and refund the full amount automatically.",
      ],
    },
    {
      heading: "One-on-one sessions",
      paragraphs: [
        "When you request a session we place a hold on your card for the quoted price. You are only charged if the instructor accepts. If they decline, or do not respond in time, the hold is released.",
        "Instructors may suggest a different time instead. Nothing is charged until you accept it.",
      ],
    },
    {
      heading: "Prices and payments",
      paragraphs: [
        "Every price is shown with its unit (per seat, per session or per hour) and a full breakdown before you pay. The price you pay is fixed at checkout, even if our prices change later.",
        "Payments are processed by our payment provider. EduBridge never sees or stores your full card number.",
      ],
    },
    {
      heading: "Cancellations and refunds",
      paragraphs: [
        "What you get back depends on who cancels and how far ahead. The exact rules are shown before you confirm any cancellation, along with the amount you will receive.",
      ],
    },
    {
      heading: "Recordings",
      paragraphs: [
        "Live sessions may be recorded through our video provider. A notice is shown to everyone in the session when recording is on. Cohort recordings are available to the cohort and its instructor; one-on-one recordings only to the learner and instructor involved.",
      ],
    },
    {
      heading: "Conduct",
      paragraphs: [
        "Be respectful in sessions and messages. Arrange and pay for sessions through EduBridge, not privately, so both sides stay protected. You can report a conversation and we will review it.",
      ],
    },
  ],
};

export const PRIVACY: LegalDocument = {
  title: "Privacy policy",
  version: LEGAL_VERSIONS.privacy,
  summary: "What we collect, why we need it, who we share it with and the choices you have.",
  sections: [
    {
      heading: "What we collect",
      paragraphs: [
        "Your name, email address, time zone and country, plus what you tell us during onboarding: learning goals, interests and education level for learners; bio, qualifications, subjects and payout details for instructors.",
        "Records of your enrolments, bookings, payments, messages, feedback and session attendance.",
      ],
    },
    {
      heading: "Why we use it",
      paragraphs: [
        "To run your classes and sessions, take payments and pay instructors, send the notifications you choose, suggest relevant trainings, and keep the platform secure.",
      ],
    },
    {
      heading: "Who we share it with",
      paragraphs: [
        "Your instructor or learners see what they need for a session (for example your name and time zone). We use trusted providers for payments, video sessions, email and file storage. We do not sell your data.",
      ],
    },
    {
      heading: "Recordings",
      paragraphs: [
        "Session recordings are stored securely, shown only to the people in that session (and admins for moderation) and deleted at the end of the retention period.",
      ],
    },
    {
      heading: "Your choices",
      paragraphs: [
        "You can update your profile and notification preferences at any time, download a copy of your data, or ask us to delete your account. We keep payment records for as long as the law requires.",
      ],
    },
    {
      heading: "Consent records",
      paragraphs: [
        "When you accept these documents we record which version you accepted and when. If we change them, we will ask you to review the new version before you continue.",
      ],
    },
  ],
};
