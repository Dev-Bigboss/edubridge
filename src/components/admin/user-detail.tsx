"use client";

import { ArrowLeft, FileText, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { PersonAvatar } from "@/components/catalog/bits";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useAdminUser, useUserAction } from "@/lib/api/hooks/admin-users";
import { useCategories } from "@/lib/api/hooks/catalog";
import { NEEDS_REASON, type AdminUserDetail, type UserAction } from "@/lib/api/schemas/admin-users";
import { ROLE_HOME } from "@/lib/auth/routes";
import { formatCalendarDate } from "@/lib/domain/cohort-schedule";
import { formatMoney } from "@/lib/domain/money";
import { timeAgo } from "@/lib/domain/time";
import { LoadError } from "./catalog-admin";
import { ApprovalBadge, UserStatusBadge } from "./user-badges";

/** /admin/users/[id]: who they are, what they submitted, and the actions an admin can take (ADM-2, ONB-3). */
export function UserDetail({ id }: { id: string }) {
  const t = useTranslations("admin.users");
  const query = useAdminUser(id);
  const [action, setAction] = useState<UserAction | null>(null);

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <EmptyState
          icon={UserX}
          title={t("notFound")}
          description={t("notFoundBody")}
          action={
            <Button asChild>
              <Link href="/admin/users">{t("backToUsers")}</Link>
            </Button>
          }
        />
      );
    }
    return <LoadError onRetry={query.refetch} />;
  }
  if (!query.data) return <LoadingState />;
  const { user, onboarding, stats, history } = query.data;
  const pending = user.role === "INSTRUCTOR" && user.approval_status === "PENDING";

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/users" className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("backToUsers")}
      </Link>

      <header className="mb-8 flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-4">
          <PersonAvatar name={user.name} url={user.avatar_url} size="lg" />
          <div className="min-w-0">
            <h1 className="text-[28px] leading-tight">{user.name}</h1>
            <p className="break-all">{user.email}</p>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-heading">{t(`roles.${user.role}`)}</span>
              <UserStatusBadge status={user.status} />
              {user.approval_status && <ApprovalBadge status={user.approval_status} />}
            </p>
          </div>
        </div>
        <Actions user={user} pending={pending} onPick={setAction} />
      </header>

      {pending && (
        <p role="status" className="mb-8 rounded-sm border border-warning/30 bg-warning-soft px-4 py-3 leading-relaxed text-heading">
          {t("pendingNote")}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-8">
          {onboarding ? <Submitted sections={onboarding} role={user.role} /> : <p>{t("noOnboarding")}</p>}
        </div>
        <aside className="space-y-8">
          <Section title={t("account")}>
            <Facts
              rows={[
                [t("joined"), formatCalendarDate(user.created_at.slice(0, 10))],
                [t("lastSignIn"), user.last_sign_in_at ? timeAgo(user.last_sign_in_at) : t("never")],
                [t("timezone"), user.timezone],
                [t("mfa"), user.mfa_enabled ? t("on") : t("off")],
                ...(user.role === "LEARNER"
                  ? ([
                      [t("enrolments"), String(stats.enrolments)],
                      [t("paid"), formatMoney({ amount: stats.payments_total, currency: "USD" })],
                    ] as [string, string][])
                  : []),
                ...(user.role === "INSTRUCTOR" ? ([[t("teaching"), String(stats.trainings_taught)]] as [string, string][]) : []),
              ]}
            />
          </Section>
          <Section title={t("history")}>
            {history.length === 0 ? (
              <p className="text-[15px]">{t("noHistory")}</p>
            ) : (
              <ol className="space-y-3 text-[15px]">
                {history.map((h) => (
                  <li key={h.id}>
                    <p className="text-heading">{h.summary}</p>
                    <p className="text-sm">
                      {h.actor_name} · <time dateTime={h.created_at}>{timeAgo(h.created_at)}</time>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </aside>
      </div>

      {action && <ActionDialog user={user} action={action} onClose={() => setAction(null)} />}
    </div>
  );
}

/** One primary action per state: Approve for applicants, otherwise nothing is pushed on the admin. */
function Actions({ user, pending, onPick }: { user: AdminUserDetail["user"]; pending: boolean; onPick: (a: UserAction) => void }) {
  const t = useTranslations("admin.users.do");
  const suspended = user.status === "SUSPENDED";
  return (
    <div className="flex flex-wrap gap-2 md:justify-end">
      {pending && (
        <>
          <Button onClick={() => onPick("approve")}>{t("approve")}</Button>
          <Button variant="outline" onClick={() => onPick("reject")}>
            {t("reject")}
          </Button>
        </>
      )}
      {user.role !== "ADMIN" && !suspended && (
        <Button variant="outline" onClick={() => onPick("impersonate")}>
          {t("impersonate")}
        </Button>
      )}
      {!suspended && (
        <Button variant="outline" onClick={() => onPick("reset-access")}>
          {t("reset-access")}
        </Button>
      )}
      {suspended ? (
        <Button variant="outline" onClick={() => onPick("reactivate")}>
          {t("reactivate")}
        </Button>
      ) : (
        <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => onPick("suspend")}>
          {t("suspend")}
        </Button>
      )}
    </div>
  );
}

function ActionDialog({ user, action, onClose }: { user: AdminUserDetail["user"]; action: UserAction; onClose: () => void }) {
  const t = useTranslations("admin.users");
  const router = useRouter();
  const run = useUserAction(user.id);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const needsReason = NEEDS_REASON.includes(action);
  const danger = action === "suspend" || action === "reject";

  const confirm = async () => {
    setError(null);
    setReasonError(null);
    if (needsReason && reason.trim().length < 5) {
      setReasonError(t("reasonRequired"));
      return;
    }
    try {
      await run.mutateAsync({ action, reason: needsReason ? reason.trim() : undefined });
      if (action === "impersonate") {
        router.replace(ROLE_HOME[user.role]);
        return;
      }
      toast.success(t(`done.${action}`, { name: user.name }));
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.reason) setReasonError(err.fieldErrors.reason[0]);
      else setError(err instanceof ApiError ? err.message : t("actionFailed"));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t(`confirm.${action}.title`, { name: user.name })} description={t(`confirm.${action}.body`, { name: user.name, email: user.email })}>
      <div className="space-y-5">
        <FormError message={error} />
        {needsReason && (
          <Field label={t("reason")} hint={t(`confirm.${action}.reasonHint`)} error={reasonError ?? undefined}>
            {(a) => <Textarea {...a} rows={3} className="min-h-[96px]" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t("goBack")}
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={run.isPending} onClick={() => void confirm()}>
            {t(`confirm.${action}.cta`)}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

const WEEKDAY = (n: number) => new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, n)));

/** What the person entered in onboarding (ONB-2/3), read-only, in the order they entered it. */
function Submitted({ sections, role }: { sections: NonNullable<AdminUserDetail["onboarding"]>; role: string }) {
  const t = useTranslations("admin.users");
  const categories = useCategories({ includeInactive: true });
  const catName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? id;
  const { profile, expertise, verification, payout, availability, goals, background } = sections;
  if (!profile) return <p>{t("noOnboarding")}</p>;

  return (
    <>
      <Section title={t("profile")}>
        {profile.headline && <p className="mb-2 font-medium text-heading">{profile.headline}</p>}
        {profile.bio && <p className="mb-4 max-w-[68ch] leading-relaxed whitespace-pre-line">{profile.bio}</p>}
        <Facts rows={[[t("country"), profile.country ? (new Intl.DisplayNames(["en"], { type: "region" }).of(profile.country) ?? profile.country) : "–"], [t("timezone"), profile.timezone]]} />
      </Section>

      {role === "INSTRUCTOR" && (
        <>
          {expertise && (
            <Section title={t("expertise")}>
              <Facts rows={[[t("categories"), expertise.category_ids.map(catName).join(", ")], [t("subjects"), expertise.subjects.join(", ")]]} />
              <h3 className="mt-5 mb-2 text-base">{t("qualifications")}</h3>
              <ul className="space-y-1 text-[15px]">
                {expertise.qualifications.map((q) => (
                  <li key={`${q.title}-${q.year}`} className="text-heading">
                    {q.title}, {q.institution} ({q.year})
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {verification && (
            <Section title={t("documents")}>
              <ul className="space-y-2">
                {[verification.id_document, ...verification.credentials].filter((f) => f !== null).map((f, i) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-sm border border-border-subtle px-4 py-3 text-[15px]">
                    <FileText aria-hidden="true" className="size-5 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-heading">{i === 0 ? t("idDocument") : t("credential")}</span>
                      <span className="block text-sm break-all">{f.name}</span>
                    </span>
                    <span className="text-sm">{t(`scan.${f.scan_status}`)}</span>
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
                        {t("open")}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Section title={t("payoutAndTimes")}>
            <Facts
              rows={[
                [t("payout"), payout ? t(`payoutStatus.${payout.status}`) : t(`payoutStatus.NOT_STARTED`)],
                [
                  t("availability"),
                  availability?.weekly.length
                    ? `${availability.weekly.map((s) => `${WEEKDAY(s.weekday)} ${s.start}–${s.end}`).join(", ")} (${availability.timezone})`
                    : "–",
                ],
              ]}
            />
          </Section>
        </>
      )}

      {role === "LEARNER" && (goals || background) && (
        <Section title={t("learning")}>
          <Facts
            rows={[
              ...(goals ? ([[t("goals"), goals.learning_goals], [t("interests"), goals.interest_category_ids.map(catName).join(", ")]] as [string, string][]) : []),
              ...(background ? ([[t("education"), background.education_level.toLowerCase()]] as [string, string][]) : []),
            ]}
          />
        </Section>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <h2 className="mb-4 text-lg">{title}</h2>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-border-subtle text-[15px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-4">
          <dt>{k}</dt>
          <dd className="text-heading first-letter:uppercase sm:text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
