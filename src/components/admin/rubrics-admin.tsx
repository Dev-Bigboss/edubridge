"use client";

import { ArrowDown, ArrowUp, ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useCategories } from "@/lib/api/hooks/catalog";
import { useArchiveRubric, useRubrics, useSaveRubric } from "@/lib/api/hooks/feedback";
import { RubricInput, type Rubric } from "@/lib/api/schemas/feedback";
import { LEVEL_LABEL, RUBRIC_CRITERIA, RUBRIC_LEVELS, rubricProblems } from "@/lib/domain/feedback";
import { LoadError } from "./catalog-admin";

/** /admin/rubrics (FDB-1): the scoring rubrics instructors use for feedback. One default, others per category. */
export function RubricsAdmin() {
  const t = useTranslations("admin.rubrics");
  const query = useRubrics();
  const categories = useCategories({ includeInactive: true });
  const archive = useArchiveRubric();
  const [editing, setEditing] = useState<Rubric | "new" | null>(null);
  const catName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? id;

  const toggleArchive = (r: Rubric) =>
    archive.mutate(
      { id: r.id, archive: !r.archived },
      {
        onSuccess: () => toast.success(r.archived ? t("restored", { name: r.name }) : t("archived", { name: r.name })),
        onError: (e) => toast.error(e instanceof ApiError ? e.message : t("failed")),
      },
    );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("title")}
        description={t("intro", { levels: RUBRIC_LEVELS.map((l) => `${l} ${LEVEL_LABEL[l]}`).join(", ") })}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" className="size-4" />
            {t("add")}
          </Button>
        }
      />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t("empty")} description={t("emptyBody")} action={<Button onClick={() => setEditing("new")}>{t("add")}</Button>} />
      ) : (
        <ul className="space-y-3">
          {query.data.map((r) => (
            <li key={r.id}>
              <article aria-labelledby={`rub-${r.id}`} className={`rounded-lg border border-border-subtle bg-white p-5 ${r.archived ? "opacity-75" : ""}`}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 id={`rub-${r.id}`} className="flex flex-wrap items-center gap-2 text-base font-semibold text-heading">
                      {r.name}
                      {r.is_default && <span className="rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-medium text-primary">{t("default")}</span>}
                      {r.archived && <span className="rounded-full bg-surface-1 px-2.5 py-0.5 text-xs font-medium text-body">{t("archivedBadge")}</span>}
                    </h2>
                    <p className="text-sm">{r.is_default ? t("usedByDefault") : t("usedFor", { list: r.category_ids.map(catName).join(", ") })}</p>
                    <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-[15px] text-heading">
                      {r.criteria.map((c) => (
                        <li key={c.key}>{c.label}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    {!r.is_default && (
                      <Button variant="ghost" onClick={() => toggleArchive(r)} disabled={archive.isPending} aria-label={`${r.archived ? t("restore") : t("archive")}: ${r.name}`}>
                        {r.archived ? t("restore") : t("archive")}
                      </Button>
                    )}
                    {!r.archived && (
                      <Button variant="outline" onClick={() => setEditing(r)} aria-label={`${t("edit")}: ${r.name}`}>
                        {t("edit")}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      {editing && <RubricDialog rubric={editing === "new" ? null : editing} categories={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))} onClose={() => setEditing(null)} />}
    </div>
  );
}

type Row = { key: string | null; label: string; description: string };

function RubricDialog({ rubric, categories, onClose }: { rubric: Rubric | null; categories: { value: string; label: string }[]; onClose: () => void }) {
  const t = useTranslations("admin.rubrics");
  const save = useSaveRubric(rubric?.id ?? null);
  const [name, setName] = useState(rubric?.name ?? "");
  const [rows, setRows] = useState<Row[]>(rubric?.criteria.map((c) => ({ key: c.key, label: c.label, description: c.description ?? "" })) ?? [{ key: null, label: "", description: "" }, { key: null, label: "", description: "" }]);
  const [isDefault, setIsDefault] = useState(rubric?.is_default ?? false);
  const [cats, setCats] = useState<string[]>(rubric?.category_ids ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) => setRows((r) => {
    const next = [...r];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    return next;
  });

  const submit = () => {
    const body = { name, criteria: rows.map((r) => ({ key: r.key, label: r.label, description: r.description.trim() || null })), category_ids: isDefault ? [] : cats, is_default: isDefault };
    const next: Record<string, string> = {};
    const parsed = RubricInput.safeParse(body);
    if (!parsed.success) for (const issue of parsed.error.issues) next[issue.path.join(".")] ??= issue.message;
    const problem = rubricProblems(rows);
    if (problem) next.criteria ??= problem;
    if (!isDefault && cats.length === 0) next.category_ids = t("pickCategory");
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length || !parsed.success) return;
    save.mutate(parsed.data, {
      onSuccess: () => {
        toast.success(rubric ? t("saved", { name }) : t("created", { name }));
        onClose();
      },
      onError: (e) => {
        if (e instanceof ApiError && e.fieldErrors) setErrors(Object.fromEntries(Object.entries(e.fieldErrors).map(([k, v]) => [k, v[0]])));
        setFormError(e instanceof ApiError ? e.message : t("failed"));
      },
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={rubric ? t("editTitle") : t("addTitle")} description={rubric ? t("editBody") : undefined} wide>
      <form
        noValidate
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormError message={formError} />
        <Field label={t("name")} error={errors.name}>
          {(a) => <Input {...a} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />}
        </Field>

        <fieldset aria-describedby={errors.criteria ? "criteria-error" : undefined}>
          <legend className="mb-1 font-heading text-[15px] font-medium text-heading">{t("criteria")}</legend>
          <p className="mb-3 text-sm">{t("criteriaHint", { min: RUBRIC_CRITERIA.min, max: RUBRIC_CRITERIA.max })}</p>
          <ol className="space-y-3">
            {rows.map((r, i) => (
              <li key={i} className="grid gap-3 rounded-sm border border-border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                <Field label={t("criterionLabel", { n: i + 1 })} error={errors[`criteria.${i}.label`]}>
                  {(a) => <Input {...a} value={r.label} onChange={(e) => update(i, { label: e.target.value })} maxLength={60} />}
                </Field>
                <Field label={t("criterionHelp", { n: i + 1 })}>
                  {(a) => <Input {...a} value={r.description} onChange={(e) => update(i, { description: e.target.value })} maxLength={200} />}
                </Field>
                <div className="flex gap-1 sm:mt-7">
                  <Button type="button" variant="ghost" size="icon" aria-label={t("up", { n: i + 1 })} disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={t("down", { n: i + 1 })} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={t("remove", { n: i + 1 })} disabled={rows.length <= RUBRIC_CRITERIA.min} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          {errors.criteria && (
            <p id="criteria-error" role="alert" className="mt-2 text-sm text-danger">
              {errors.criteria}
            </p>
          )}
          {rows.length < RUBRIC_CRITERIA.max && (
            <Button type="button" variant="outline" className="mt-3" onClick={() => setRows([...rows, { key: null, label: "", description: "" }])}>
              <Plus aria-hidden="true" className="size-4" /> {t("addCriterion")}
            </Button>
          )}
        </fieldset>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-heading">
          <input type="checkbox" checked={isDefault} disabled={rubric?.is_default} onChange={(e) => setIsDefault(e.target.checked)} className="size-5 accent-primary" />
          {rubric?.is_default ? t("isDefaultLocked") : t("makeDefault")}
        </label>
        {!isDefault && <ChoiceChips legend={t("categories")} hint={t("categoriesHint")} options={categories} value={cats} onChange={setCats} error={errors.category_ids} />}

        <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {rubric ? t("save") : t("create")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
