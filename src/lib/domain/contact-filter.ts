/**
 * MSG-6: spotting contact details in messages, so people aren't nudged into paying off the platform
 * (no receipt, refund or dispute help there). The filter is a platform setting:
 *   OFF  nothing happens
 *   WARN the sender sees a warning first and can still send
 *   MASK the details are replaced when the message is sent (the sender is told beforehand)
 * It catches the common cases (emails, phone numbers, chat-app links), not deliberate disguises like
 * "zero eight zero": reports (MSG-6) cover the rest.
 */
export const CONTACT_FILTERS = ["OFF", "WARN", "MASK"] as const;
export type ContactFilter = (typeof CONTACT_FILTERS)[number];

export const MASK_TEXT = "[contact details hidden]";

export type ContactMatch = { kind: "EMAIL" | "PHONE" | "CHAT_LINK"; text: string; index: number };

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const CHAT_LINK = /\b(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me)\/\S*/gi;
/** Runs of digits with optional + ( ) . - or spaces between them. */
const DIGIT_RUN = /\+?\(?\d[\d\s().-]{6,}\d/g;
/** 9–15 digits covers local and international numbers but not years, dates or times. */
const PHONE_DIGITS = { min: 9, max: 15 };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function findContactDetails(text: string): ContactMatch[] {
  const found: ContactMatch[] = [];
  const add = (kind: ContactMatch["kind"], re: RegExp, keep: (s: string) => boolean = () => true) => {
    for (const m of text.matchAll(re)) {
      const s = m[0].trim();
      if (keep(s)) found.push({ kind, text: s, index: m.index ?? 0 });
    }
  };
  add("EMAIL", EMAIL);
  add("CHAT_LINK", CHAT_LINK);
  add("PHONE", DIGIT_RUN, (s) => {
    const digits = s.replace(/\D/g, "").length;
    return digits >= PHONE_DIGITS.min && digits <= PHONE_DIGITS.max && !ISO_DATE.test(s);
  });
  // A phone-like run inside an email or link is part of that match already.
  return found
    .filter((m) => m.kind !== "PHONE" || !found.some((o) => o !== m && o.kind !== "PHONE" && m.index >= o.index && m.index < o.index + o.text.length))
    .sort((a, b) => a.index - b.index);
}

/** Replaces every match, longest first so overlapping text is handled once. */
export function maskContactDetails(text: string): { text: string; masked: boolean } {
  const matches = findContactDetails(text);
  if (!matches.length) return { text, masked: false };
  let out = text;
  for (const m of [...matches].sort((a, b) => b.index - a.index)) {
    out = out.slice(0, m.index) + MASK_TEXT + out.slice(m.index + m.text.length);
  }
  return { text: out, masked: true };
}
