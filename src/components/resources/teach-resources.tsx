"use client";

import { ArrowDown, ArrowUp, Eye, ExternalLink, FileText, FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LoadError } from "@/components/admin/catalog-admin";
import { FormError } from "@/components/auth/auth-card";
import { DocumentUpload } from "@/components/uploads/document-upload";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { PageHeader, TableCard, td, th } from "@/components/ui/page-header";
import { Select, Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import { useAudienceOptions, useDeleteResource, useReorderResources, useResourceAccess, useSaveResource, useTeachResources, useTeachingTrainings } from "@/lib/api/hooks/resources";
import type { AudienceOptions, Resource, ResourceScope } from "@/lib/api/schemas/resources";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { audienceProblem, cleanAudience, groupByFolder, moveInFolder } from "@/lib/domain/resources";
import { formatBytes } from "@/lib/domain/uploads";
import { formatInZone } from "@/lib/domain/time";

/** /teach/resources (RES-1..4): materials per training, in folders, for the right people. */
export function TeachResources() {
  const t = useTranslations("resources.teach");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const trainings = useTeachingTrainings();
  const trainingId = params.get("training") ?? trainings.data?.[0]?.id ?? null;
  const resources = useTeachResources(trainingId);
  const reorder = useReorderResources();
  const [editing, setEditing] = useState<Resource | "new" | null>(null);
  const [deleting, setDeleting] = useState<Resource | null>(null);
  const [viewingAccess, setViewingAccess] = useState<Resource | null>(null);

  const move = (r: Resource, dir: -1 | 1) => {
    const ids = moveInFolder(resources.data ?? [], r.id, dir);
    if (ids) reorder.mutate(ids, { onError: (err) => toast.error(err instanceof ApiError ? err.message : t("failed")) });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("title")}
        description={t("intro")}
        actions={
          trainingId && (
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden="true" className="size-4" /> {t("add")}
            </Button>
          )
        }
      />
      {trainings.isPending ? (
        <LoadingState />
      ) : trainings.isError ? (
        <LoadError onRetry={trainings.refetch} />
      ) : trainings.data.length === 0 ? (
        <EmptyState icon={FolderOpen} title={t("noTrainings")} description={t("noTrainingsBody")} />
      ) : (
        <>
          {trainings.data.length > 1 && (
            <Field label={t("training")} className="mb-6 md:max-w-md">
              {(a) => (
                <Select {...a} value={trainingId ?? ""} onChange={(e) => router.replace(`${pathname}?training=${e.target.value}`, { scroll: false })}>
                  {trainings.data.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          {resources.isPending ? (
            <LoadingState />
          ) : resources.isError ? (
            <LoadError onRetry={resources.refetch} />
          ) : resources.data.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={t("empty")}
              description={t("emptyBody")}
              action={<Button onClick={() => setEditing("new")}>{t("add")}</Button>}
            />
          ) : (
            groupByFolder(resources.data).map((g) => (
              <section key={g.folder ?? "none"} aria-label={g.folder ?? t("noFolder")} className="mb-6">
                <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-heading">
                  <FolderOpen aria-hidden="true" className="size-5 text-primary" />
                  {g.folder ?? t("noFolder")}
                </h2>
                <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-white">
                  {g.items.map((r, i) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      {r.kind === "FILE" ? <FileText aria-hidden="true" className="size-5 shrink-0 text-primary" /> : <ExternalLink aria-hidden="true" className="size-5 shrink-0 text-primary" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-heading">{r.title}</p>
                        <p className="text-sm">
                          {r.audience_label}
                          {r.file && ` · ${formatBytes(r.file.size_bytes)}`}
                        </p>
                        {r.access && (
                          <p className="text-sm text-heading">
                            {r.access.audience === 0 ? t("openedNone") : t("openedCount", { opened: r.access.opened, audience: r.access.audience })}
                          </p>
                        )}
                      </div>
                      {r.file && r.file.scan_status !== "CLEAN" && <Badge tone={r.file.scan_status === "INFECTED" ? "danger" : "warning"}>{t(`scan.${r.file.scan_status}`)}</Badge>}
                      <span className="flex gap-1">
                        <Button variant="ghost" size="icon" disabled={i === 0 || reorder.isPending} onClick={() => move(r, -1)} aria-label={t("moveUp", { title: r.title })}>
                          <ArrowUp aria-hidden="true" className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={i === g.items.length - 1 || reorder.isPending} onClick={() => move(r, 1)} aria-label={t("moveDown", { title: r.title })}>
                          <ArrowDown aria-hidden="true" className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setViewingAccess(r)} aria-label={t("accessLabel", { title: r.title })}>
                          <Eye aria-hidden="true" className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditing(r)} aria-label={t("edit", { title: r.title })}>
                          <Pencil aria-hidden="true" className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)} aria-label={t("delete", { title: r.title })}>
                          <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}
      {editing && trainingId && <ResourceDialog trainingId={trainingId} resource={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteDialog resource={deleting} onClose={() => setDeleting(null)} />}
      {viewingAccess && <AccessDialog resource={viewingAccess} onClose={() => setViewingAccess(null)} />}
    </div>
  );
}

const SCOPES: ResourceScope[] = ["TRAINING", "COHORT", "SESSION", "LEARNER"];

function ResourceDialog({ trainingId, resource, onClose }: { trainingId: string; resource: Resource | null; onClose: () => void }) {
  const t = useTranslations("resources.teach");
  const options = useAudienceOptions(trainingId);
  const save = useSaveResource(resource?.id ?? null);
  const { data: user } = useSession();
  const [kind, setKind] = useState<"FILE" | "LINK">(resource?.kind ?? "FILE");
  const [title, setTitle] = useState(resource?.title ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  const [folder, setFolder] = useState(resource?.folder ?? "");
  const [link, setLink] = useState(resource?.link_url ?? "");
  const [files, setFiles] = useState<StoredFile[]>(resource?.file ? [resource.file] : []);
  const [audience, setAudience] = useState({
    scope: resource?.scope ?? ("TRAINING" as ResourceScope),
    cohort_id: resource?.cohort_id ?? null,
    session_id: resource?.session_id ?? null,
    learner_id: resource?.learner_id ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async () => {
    const next: Record<string, string> = {};
    if (title.trim().length < 2) next.title = t("titleRequired");
    if (kind === "FILE" && !resource && files.length === 0) next.file = t("fileRequired");
    if (kind === "LINK" && !/^https?:\/\/\S+\.\S+/.test(link.trim())) next.link = t("linkRequired");
    const problem = audienceProblem(audience);
    if (problem) next.scope = problem;
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await save.mutateAsync({
        training_id: trainingId,
        kind,
        title: title.trim(),
        description: description.trim() || null,
        folder: folder.trim() || null,
        file_id: kind === "FILE" ? (files[0]?.id ?? null) : null,
        link_url: kind === "LINK" ? link.trim() : null,
        ...cleanAudience(audience),
      });
      toast.success(resource ? t("saved") : t("added"));
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const f = err.fieldErrors;
        setErrors({ title: f.title?.[0] ?? "", file: f.file_id?.[0] ?? "", link: f.link_url?.[0] ?? "", scope: f.scope?.[0] ?? "", form: Object.keys(f).length ? "" : err.message });
      } else setErrors({ form: t("failed") });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={resource ? t("editTitle") : t("addTitle")} wide>
      <div className="space-y-5">
        <FormError message={errors.form || null} />
        {!resource && (
          <div role="radiogroup" aria-label={t("kind")} className="inline-flex rounded-sm border border-border p-1">
            {(["FILE", "LINK"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={cn("min-h-10 rounded-[4px] px-4 text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-primary", kind === k ? "bg-primary text-white" : "text-heading hover:bg-surface-1")}
              >
                {t(`kinds.${k}`)}
              </button>
            ))}
          </div>
        )}
        {kind === "FILE" ? (
          resource ? (
            <p className="text-[15px]">{t("fileFixed", { name: resource.file?.name ?? "" })}</p>
          ) : (
            <DocumentUpload label={t("file")} description={t("fileHint")} purpose="RESOURCE" files={files} onChange={setFiles} max={1} error={errors.file || undefined} />
          )
        ) : (
          <Field label={t("link")} hint={t("linkHint")} error={errors.link || undefined}>
            {(a) => <Input {...a} type="url" inputMode="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />}
          </Field>
        )}
        <Field label={t("titleLabel")} error={errors.title || undefined}>
          {(a) => <Input {...a} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />}
        </Field>
        <Field label={t("description")}>
          {(a) => <Textarea {...a} rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />}
        </Field>
        <Field label={t("folder")} hint={t("folderHint")}>
          {(a) => (
            <>
              <Input {...a} list="resource-folders" maxLength={60} value={folder} onChange={(e) => setFolder(e.target.value)} />
              <datalist id="resource-folders">
                {options.data?.folders.map((f) => <option key={f} value={f} />)}
              </datalist>
            </>
          )}
        </Field>
        <AudiencePicker options={options.data} value={audience} onChange={setAudience} zone={user?.timezone ?? "UTC"} error={errors.scope || undefined} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t("goBack")}
          </Button>
          <Button loading={save.isPending} onClick={() => void submit()}>
            {resource ? t("save") : t("addCta")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

type AudienceValue = { scope: ResourceScope; cohort_id: string | null; session_id: string | null; learner_id: string | null };

/** RES-2: who sees it. Options the instructor doesn't have (no 1:1 learners yet) are explained, not hidden. */
function AudiencePicker({ options, value, onChange, zone, error }: { options: AudienceOptions | undefined; value: AudienceValue; onChange: (v: AudienceValue) => void; zone: string; error?: string }) {
  const t = useTranslations("resources.teach");
  const cohort = options?.cohorts.find((c) => c.id === value.cohort_id);
  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 font-heading text-[15px] font-medium text-heading">{t("audience")}</legend>
      {SCOPES.map((s) => {
        const unavailable = (s === "COHORT" || s === "SESSION") ? !options?.cohorts.length : s === "LEARNER" ? !options?.learners.length : false;
        return (
          <label key={s} className={cn("flex min-h-11 items-start gap-3", unavailable && "opacity-60")}>
            <input type="radio" name="audience" className="mt-1 size-5 accent-primary" checked={value.scope === s} disabled={unavailable} onChange={() => onChange({ ...value, scope: s })} />
            <span>
              <span className="block text-heading">{t(`scopes.${s}`)}</span>
              {unavailable && <span className="text-sm">{t(`unavailable.${s}`)}</span>}
            </span>
          </label>
        );
      })}
      {(value.scope === "COHORT" || value.scope === "SESSION") && options && (
        <div className="grid gap-3 pl-8 sm:grid-cols-2">
          <Field label={t("cohort")}>
            {(a) => (
              <Select {...a} value={value.cohort_id ?? ""} onChange={(e) => onChange({ ...value, cohort_id: e.target.value || null, session_id: null })}>
                <option value="">{t("chooseCohort")}</option>
                {options.cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {value.scope === "SESSION" && (
            <Field label={t("session")}>
              {(a) => (
                <Select {...a} value={value.session_id ?? ""} disabled={!cohort} onChange={(e) => onChange({ ...value, session_id: e.target.value || null })}>
                  <option value="">{t("chooseSession")}</option>
                  {cohort?.sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatInZone(s.start_utc, zone, "EEE d MMM, HH:mm")}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>
      )}
      {value.scope === "LEARNER" && options && (
        <div className="pl-8 sm:max-w-sm">
          <Field label={t("learner")}>
            {(a) => (
              <Select {...a} value={value.learner_id ?? ""} onChange={(e) => onChange({ ...value, learner_id: e.target.value || null })}>
                <option value="">{t("chooseLearner")}</option>
                {options.learners.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function DeleteDialog({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const t = useTranslations("resources.teach");
  const del = useDeleteResource();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("deleteTitle")} description={t("deleteBody", { title: resource.title, who: resource.audience_label })}>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          {t("goBack")}
        </Button>
        <Button
          variant="danger"
          loading={del.isPending}
          onClick={() =>
            del.mutate(resource.id, {
              onSuccess: () => (toast.success(t("deleted")), onClose()),
              onError: (err) => toast.error(err instanceof ApiError ? err.message : t("failed")),
            })
          }
        >
          {t("deleteCta")}
        </Button>
      </div>
    </Dialog>
  );
}

/** RES-5: each learner in the resource's current audience and whether, when and how often they opened it. */
function AccessDialog({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const t = useTranslations("resources.teach");
  const query = useResourceAccess(resource.id);
  const zone = useSession().data?.timezone ?? "UTC";
  const when = (iso: string | null) => (iso ? formatInZone(iso, zone, "d MMM yyyy, HH:mm") : t("notOpened"));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("accessTitle")} description={t("accessIntro", { title: resource.title, who: resource.audience_label })} wide>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={Eye} title={t("accessEmpty")} description={t("accessEmptyBody")} />
      ) : (
        <TableCard label={t("accessTitle")}>
          <table className="w-full text-[15px]">
            <thead className="border-b border-border-subtle">
              <tr>
                <th scope="col" className={th}>{t("learnerCol")}</th>
                <th scope="col" className={th}>{t("firstCol")}</th>
                <th scope="col" className={th}>{t("lastCol")}</th>
                <th scope="col" className={cn(th, "text-right")}>{t("timesCol")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {query.data.map((a) => (
                <tr key={a.learner_id}>
                  <th scope="row" className={cn(td, "text-left font-medium text-heading")}>{a.name}</th>
                  <td className={cn(td, "whitespace-nowrap", !a.first_opened_at && "text-warning")}>{when(a.first_opened_at)}</td>
                  <td className={cn(td, "whitespace-nowrap")}>{a.last_opened_at ? when(a.last_opened_at) : "–"}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{a.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={onClose}>{t("close")}</Button>
      </div>
    </Dialog>
  );
}
