import { beforeEach, describe, expect, it } from "vitest";
import { API_BASE_URL, ApiError, api } from "@/lib/api/client";
import { AdminDashboard } from "@/lib/api/schemas/reports";
import { db, mockSession, resetDb, type StoredBooking } from "../db";

const failure = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected the request to fail");
    },
    (e) => e as ApiError,
  );
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const today = new Date().toISOString().slice(0, 10);
const csv = (type: string, from = "2020-01-01", to = today) =>
  fetch(`${API_BASE_URL}/admin/reports/${type}?from=${from}&to=${to}`, { credentials: "include" }).then(async (r) => ({ status: r.status, text: await r.text(), rows: r.headers.get("X-Row-Count") }));

/** A 1:1 request with just enough fields for the dashboard's response-time maths. */
function booking(id: string, instructor: string, status: StoredBooking["status"], timeline: StoredBooking["timeline"], extra: Partial<StoredBooking> = {}): StoredBooking {
  return { id, instructor_id: instructor, learner_id: "usr_learner_1", training_id: "trn_sql_1on1", status, timeline, start_utc: hoursAgo(-48), end_utc: hoursAgo(-49), created_at: timeline[0]?.at ?? hoursAgo(1), expires_at: null, held_until: null, ...extra } as unknown as StoredBooking;
}

describe("admin dashboard and reports (ADM-1, ADM-4)", () => {
  beforeEach(() => {
    resetDb();
    mockSession.set("usr_admin_1");
  });

  it("sums revenue, users, cohorts and what needs attention for the period", async () => {
    const d = await api("/admin/dashboard", { query: { days: 90 }, schema: AdminDashboard });
    expect(d.revenue.series).toHaveLength(13);
    expect(d.revenue.series.reduce((n, b) => n + b.captured, 0)).toBe(d.revenue.captured);
    expect(d.users.instructors).toBe(3);
    expect(d.enrolments.active_learners).toBe(4); // the Autumn cohort's four learners
    expect(d.cohorts.active).toBeGreaterThan(0);
    expect(d.attention.map((a) => a.kind)).toEqual(expect.arrayContaining(["APPLICATIONS", "MESSAGE_REPORTS"]));
    expect(d.attention.find((a) => a.kind === "APPLICATIONS")).toMatchObject({ count: 2, href: "/admin/users?approval=PENDING" });
    expect((await failure(api("/admin/dashboard", { query: { days: 12 } }))).status).toBe(422);
    mockSession.set("usr_instructor_1");
    expect((await failure(api("/admin/dashboard"))).status).toBe(403);
  });

  it("measures instructor response times from the card hold, counting expiries", async () => {
    db.bookings.push(
      booking("bk_a", "usr_instructor_3", "ACCEPTED", [{ at: hoursAgo(30), actor: "SYSTEM", event: "PAYMENT_AUTHORISED", note: null }, { at: hoursAgo(28), actor: "INSTRUCTOR", event: "ACCEPTED", note: null }]),
      booking("bk_b", "usr_instructor_3", "DECLINED", [{ at: hoursAgo(20), actor: "SYSTEM", event: "PAYMENT_AUTHORISED", note: null }, { at: hoursAgo(14), actor: "INSTRUCTOR", event: "DECLINED", note: "Busy" }]),
      booking("bk_c", "usr_instructor_2", "EXPIRED", [{ at: hoursAgo(40), actor: "SYSTEM", event: "PAYMENT_AUTHORISED", note: null }, { at: hoursAgo(16), actor: "SYSTEM", event: "EXPIRED", note: null }]),
      booking("bk_d", "usr_instructor_2", "PENDING_INSTRUCTOR", [{ at: hoursAgo(20), actor: "SYSTEM", event: "PAYMENT_AUTHORISED", note: null }], { expires_at: hoursAgo(-3) }),
    );
    const d = await api("/admin/dashboard", { query: { days: 7 }, schema: AdminDashboard });
    expect(d.response_times).toMatchObject({ median_hours: 4, answered: 2, expired: 1 });
    expect(d.response_times.by_instructor.map((i) => [i.name, i.answered, i.expired, i.median_hours])).toEqual([
      ["Demo Instructor Three", 2, 0, 4],
      ["Demo Instructor Two", 0, 1, null],
    ]);
    expect(d.one_on_one).toEqual({ pending: 1, expiring_within_6_hours: 1 });
    expect(d.attention[0]).toEqual({ kind: "EXPIRING_REQUESTS", count: 1, href: null });
  });

  it("exports revenue, refunds, payouts and attendance as CSV, each audited", async () => {
    const p = db.payments.find((x) => x.id === "pay_seed_2")!;
    p.refunded_amount = 5000;
    p.status = "PARTIALLY_REFUNDED";

    const revenue = await csv("revenue");
    expect(revenue.status).toBe(200);
    const lines = revenue.text.split("\r\n");
    expect(lines[0]).toBe("date,receipt,learner,training,kind,instructor,paid_usd,commission_percent,commission_usd,instructor_usd,payment_status");
    expect(lines.some((l) => l.includes("ICAN Audit and Assurance (2025 syllabus),cohort seat,Test Instructor,400.00,20,80.00,320.00,PARTIALLY_REFUNDED"))).toBe(true);
    expect(revenue.rows).toBe("2");

    const refunds = (await csv("refunds")).text.split("\r\n");
    expect(refunds[1]).toMatch(/,Test Learner,.*,Test Instructor,50\.00,40\.00,10\.00$/);

    expect((await csv("payouts")).text).toContain("Test Instructor,200.00,PAID,REQUEST,tr_demo_1A2B3C,");

    const attendance = (await csv("attendance")).text.split("\r\n");
    expect(attendance[0]).toBe("session_date,training,session,instructor,learner,attendance");
    expect(attendance.filter((l) => l.includes("Autumn cohort")).length).toBeGreaterThan(4);
    expect(attendance.some((l) => l.endsWith("NOT_TAKEN"))).toBe(true);

    expect(db.audit.filter((a) => a.action === "report.exported")).toHaveLength(4);
    expect((await csv("salaries")).status).toBe(404);
    expect((await csv("revenue", today, "2020-01-01")).status).toBe(422);
  });
});
