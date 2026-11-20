"use client";

import { ChevronDown, Layers, Plus, SearchX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { PageHeader, TableCard, td, th } from "@/components/ui/page-header";
import { Select, Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import { useAdminTrainings } from "@/lib/api/hooks/admin-catalog";
import { useModalities } from "@/lib/api/hooks/catalog";
import { useAdminCohorts, useCohortAction, type CohortFilters } from "@/lib/api/hooks/cohorts";
import type { AdminCohort } from "@/lib/api/schemas/cohort";
import { cohortActions, cohortEditable, type CohortActionName } from "@/lib/domain/cohort-machine";
import { formatCalendarDate } from "@/lib/domain/cohort-schedule";
import { COHORT_STATUSES, MODALITY } from "@/lib/domain/enums";
import { LoadError } from "./catalog-admin";
import { CohortDialog } from "./cohort-dialog";

const FILTER_KEYS = ["training_id", "status"] as const;

/** /admin/cohorts: COH-1 create and edit, COH-3 status changes, COH-5 cancel with refunds. */
export function CohortsAdmin() {
  const t = useTranslations("admin.cohorts");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters: CohortFilters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined]));
  const setFilter = (key: (typeof FILTER_KEYS)[number], value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const cohorts = useAdminCohorts(filters);
  const modalities = useModalities();
  const cohortModality = modalities.data?.find((m) => m.code === MODALITY.COHORT)?.id;
  const trainings = useAdminTrainings({ modality_id: cohortModality });
  const [editing, setEditing] = useState<AdminCohort | "new" | null>(null);
  const [acting, setActing] = useState<{ cohort: AdminCohort; action: CohortActionName } | null>(null);
  const filtered = FILTER_KEYS.some((k) => filters[k]);

  const newButton = (
    <Button onClick={() => setEditing("new")}>
      <Plus aria-hidden="true" className="size-4" /> {t("new")}
    </Button>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("title")} description={t("intro")} actions={newButton} />

      <div className="mb-4 grid gap-3 md:grid-cols-[320px_220px]" role="search" aria-label={t("filters")}>
        <Select aria-label={t("training")} value={filters.training_id ?? ""} onChange={(e) => setFilter("training_id", e.target.value)}>
          <option value="">{t("allTrainings")}</option>
          {trainings.data?.items
            .filter((tr) => tr.modality_id === cohortModality)
            .map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.title}
              </option>
            ))}
        </Select>
        <Select aria-label={t("status")} value={filters.status ?? ""} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">{t("allStatuses")}</option>
          {COHORT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </Select>
      </div>

      {cohorts.isPending ? (
        <LoadingState />
      ) : cohorts.isError ? (
        <LoadError onRetry={cohorts.refetch} />
      ) : cohorts.data.items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title={t("noMatches")}
            description={t("noMatchesBody")}
            action={
              <Button variant="outline" onClick={() => router.replace(pathname)}>
                {t("clearFilters")}
              </Button>
            }
          />
        ) : (
          <EmptyState icon={Layers} title={t("empty")} description={t("emptyBody")} action={newButton} />
        )
      ) : (
        <TableCard label={t("title")}>
          <table className="w-full min-w-[880px] text-[15px]">
            <thead className="border-b border-border bg-surface-1">
              <tr>
                <th className={th}>{t("cohort")}</th>
                <th className={th}>{t("dates")}</th>
                <th className={th}>{t("seats")}</th>
                <th className={th}>{t("status")}</th>
                <th className={th}>
                  <span className="sr-only">{t("actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cohorts.data.items.map((c) => (
                <tr key={c.id} className="hover:bg-surface-1">
                  <td className={td}>
                    <span className="font-medium text-heading">{c.name}</span>
                    <p className="text-sm">
                      <Link href={`/admin/trainings/${c.training_id}`} className="underline-offset-4 hover:text-primary hover:underline">
                        {c.training_title}
                      </Link>
                      <span aria-hidden="true"> · </span>
                      {c.instructor_name}
                    </p>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {formatCalendarDate(c.start_date)} – {formatCalendarDate(c.end_date)}
                    <p className="text-sm">{t("sessions", { count: c.session_count })}</p>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {t("seatsValue", { enrolled: c.enrolled_count, capacity: c.capacity })}
                    {c.min_enrolment !== null && c.enrolled_count < c.min_enrolment && !["COMPLETED", "CANCELLED"].includes(c.status) && (
                      <p className="text-sm text-warning">{t("belowMinimum", { min: c.min_enrolment })}</p>
                    )}
                  </td>
                  <td className={td}>
                    <StatusBadge status={c.status} />
                  </td>
                  <td className={`${td} text-right`}>
                    <RowActions cohort={c} onEdit={() => setEditing(c)} onAction={(action) => setActing({ cohort: c, action })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {editing && <CohortDialog cohort={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {acting && <ActionDialog cohort={acting.cohort} action={acting.action} onClose={() => setActing(null)} />}
    </div>
  );
}

function RowActions({ cohort, onEdit, onAction }: { cohort: AdminCohort; onEdit: () => void; onAction: (a: CohortActionName) => void }) {
  const t = useTranslations("admin.cohorts");
  const actions = cohortActions(cohort.status);
  const item = "flex min-h-11 cursor-pointer items-center rounded-sm px-3 outline-none data-[highlighted]:bg-surface-1";
  if (cohortEditable(cohort.status) === "NONE") return <span className="text-sm">{t("finished")}</span>;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" aria-label={t("manage", { name: cohort.name })}>
          {t("manageShort")}
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[220px] rounded-md border border-border-subtle bg-white p-1.5 text-[15px] text-heading shadow-[0_10px_30px_rgba(8,42,94,0.12)]"
        >
          <DropdownMenu.Item onSelect={onEdit} className={item}>
            {t("editAction")}
          </DropdownMenu.Item>
          {actions.length > 0 && <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />}
          {actions.map((a) => (
            <DropdownMenu.Item
              key={a}
              onSelect={() => onAction(a)}
              className={a === "cancel" ? `${item} text-danger data-[highlighted]:bg-danger-soft` : item}
            >
              {t(`do.${a}`)}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Every status change says what will happen before it happens. Cancel needs a reason (COH-5). */
function ActionDialog({ cohort, action, onClose }: { cohort: AdminCohort; action: CohortActionName; onClose: () => void }) {
  const t = useTranslations("admin.cohorts");
  const run = useCohortAction(cohort.id);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);

  const confirm = async () => {
    setError(null);
    setReasonError(null);
    if (action === "cancel" && reason.trim().length < 5) {
      setReasonError(t("reasonRequired"));
      return;
    }
    try {
      await run.mutateAsync({ action, reason: reason.trim() });
      toast.success(t(`done.${action}`, { name: cohort.name }));
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.reason) setReasonError(err.fieldErrors.reason[0]);
      else setError(err instanceof ApiError ? err.message : t("actionFailed"));
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={t(`confirm.${action}.title`, { name: cohort.name })}
      description={t(`confirm.${action}.body`, { count: cohort.enrolled_count })}
    >
      <div className="space-y-5">
        <FormError message={error} />
        {action === "cancel" && (
          <Field label={t("reason")} hint={t("reasonHint")} error={reasonError ?? undefined}>
            {(a) => <Textarea {...a} rows={3} className="min-h-[96px]" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t("keep")}
          </Button>
          <Button variant={action === "cancel" ? "danger" : "primary"} loading={run.isPending} onClick={() => void confirm()}>
            {t(`confirm.${action}.cta`)}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
