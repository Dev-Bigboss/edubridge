"use client";

import { CircleCheck, ClipboardPen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";
import { LoadError } from "@/components/admin/catalog-admin";
import { FormError } from "@/components/auth/auth-card";
import { PersonAvatar } from "@/components/catalog/bits";
import { DocumentUpload } from "@/components/uploads/document-upload";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Textarea } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/client";
import { useSaveFeedback, useSessionFeedback } from "@/lib/api/hooks/feedback";
import { FeedbackInput, type Criterion, type Feedback } from "@/lib/api/schemas/feedback";
import type { StoredFile } from "@/lib/api/schemas/uploads";
import { cn } from "@/lib/cn";
import { LEVEL_LABEL, RUBRIC_LEVELS, scoreProblems } from "@/lib/domain/feedback";
import { timeAgo } from "@/lib/domain/time";

type Person = { learner_id: string; name: string; status: string | null };

/** FDB-1: under the register, one row per learner with their feedback status. */
export function SessionFeedback({ sessionId, roster }: { sessionId: string; roster: Person[] }) {
  const t = useTranslations("teach.feedback");
  const query = useSessionFeedback(sessionId);
  const [writing, setWriting] = useState<Person | null>(null);

  return (
    <section aria-labelledby="feedback-heading" className="mt-6 rounded-lg border border-border-subtle bg-white p-5 md:p-6">
      <h2 id="feedback-heading" className="mb-1 text-lg">
        {t("title")}
      </h2>
      <p className="mb-4 text-[15px] leading-relaxed">{t("intro")}</p>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <LoadError onRetry={query.refetch} />
      ) : !query.data.rubric && query.data.items.length === 0 ? (
        <p role="status" className="rounded-sm bg-surface-1 px-4 py-3 text-heading">
          {t("noRubric")}
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {roster.map((r) => {
            const sent = query.data.items.find((f) => f.learner.id === r.learner_id);
            return (
              <li key={r.learner_id} className="flex flex-wrap items-center gap-3 py-3">
                <PersonAvatar name={r.name} url={null} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-heading">{r.name}</span>
                  <span className="flex items-center gap-1 text-sm">
                    {sent ? (
                      <>
                        <CircleCheck aria-hidden="true" className="size-4 text-success" />
                        {t("sent", { when: timeAgo(sent.updated_at) })}
                      </>
                    ) : r.status === "ABSENT" ? (
                      t("absent")
                    ) : (
                      t("notYet")
                    )}
                  </span>
                </span>
                <Button variant={sent ? "outline" : "primary"} onClick={() => setWriting(r)} aria-label={`${sent ? t("edit") : t("write")}: ${r.name}`}>
                  {!sent && <ClipboardPen aria-hidden="true" className="size-4" />}
                  {sent ? t("edit") : t("write")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {writing && query.data && (
        <FeedbackDialog
          sessionId={sessionId}
          learner={writing}
          criteria={query.data.items.find((f) => f.learner.id === writing.learner_id)?.rubric.criteria ?? query.data.rubric?.criteria ?? []}
          existing={query.data.items.find((f) => f.learner.id === writing.learner_id) ?? null}
          onClose={() => setWriting(null)}
        />
      )}
    </section>
  );
}

function FeedbackDialog({ sessionId, learner, criteria, existing, onClose }: { sessionId: string; learner: Person; criteria: Criterion[]; existing: Feedback | null; onClose: () => void }) {
  const t = useTranslations("teach.feedback");
  const id = useId();
  const save = useSaveFeedback(sessionId);
  const [scores, setScores] = useState<Record<string, number>>(existing?.scores ?? {});
  const [form, setForm] = useState({
    comment: existing?.comment ?? "",
    strengths: existing?.strengths ?? "",
    improvements: existing?.improvements ?? "",
    next_steps: existing?.next_steps ?? "",
    assignment_title: existing?.assignment_title ?? "",
  });
  const [files, setFiles] = useState<StoredFile[]>(existing?.attachment ? [existing.attachment] : []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    const body = { ...form, assignment_title: form.assignment_title.trim() || null, scores, attachment_id: files[0]?.id ?? null };
    const parsed = FeedbackInput.safeParse(body);
    const next: Record<string, string> = Object.fromEntries(Object.entries(scoreProblems(criteria, scores)).map(([k, v]) => [`scores.${k}`, v]));
    if (!parsed.success) for (const issue of parsed.error.issues) next[issue.path.join(".")] ??= issue.message;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length || !parsed.success) return setFormError(t("checkForm"));
    save.mutate(
      { learnerId: learner.learner_id, body: parsed.data },
      {
        onSuccess: () => {
          toast.success(existing ? t("updated", { name: learner.name }) : t("sentToast", { name: learner.name }));
          onClose();
        },
        onError: (e) => {
          if (e instanceof ApiError && e.fieldErrors) setErrors(Object.fromEntries(Object.entries(e.fieldErrors).map(([k, v]) => [k, v[0]])));
          setFormError(e instanceof ApiError ? e.message : t("failed"));
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("dialogTitle", { name: learner.name })} description={t("dialogBody")} wide>
      <form
        noValidate
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormError message={formError} />
        <fieldset className="space-y-4">
          <legend className="mb-1 font-heading text-[15px] font-semibold text-heading">{t("rubric")}</legend>
          {criteria.map((c) => {
            const err = errors[`scores.${c.key}`];
            return (
              <div key={c.key}>
                <p id={`${id}-${c.key}`} className="font-medium text-heading">
                  {c.label}
                </p>
                {c.description && <p className="text-sm">{c.description}</p>}
                <div role="radiogroup" aria-labelledby={`${id}-${c.key}`} aria-describedby={err ? `${id}-${c.key}-err` : undefined} aria-invalid={err ? true : undefined} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {RUBRIC_LEVELS.map((level) => {
                    const on = scores[c.key] === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setScores((s) => ({ ...s, [c.key]: level }))}
                        className={cn(
                          "min-h-11 rounded-sm border px-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                          on ? "border-primary bg-primary text-white" : "border-border bg-white text-heading hover:bg-surface-1",
                        )}
                      >
                        {level} · {LEVEL_LABEL[level]}
                      </button>
                    );
                  })}
                </div>
                {err && (
                  <p id={`${id}-${c.key}-err`} role="alert" className="mt-1 text-sm text-danger">
                    {err}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>

        <Field label={t("comment")} error={errors.comment}>
          {(a) => <Textarea {...a} value={form.comment} onChange={set("comment")} maxLength={2000} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("strengths")} error={errors.strengths}>
            {(a) => <Textarea {...a} value={form.strengths} onChange={set("strengths")} maxLength={1000} className="min-h-[96px]" />}
          </Field>
          <Field label={t("improvements")} error={errors.improvements}>
            {(a) => <Textarea {...a} value={form.improvements} onChange={set("improvements")} maxLength={1000} className="min-h-[96px]" />}
          </Field>
        </div>
        <Field label={t("nextSteps")} error={errors.next_steps} hint={t("nextStepsHint")}>
          {(a) => <Textarea {...a} value={form.next_steps} onChange={set("next_steps")} maxLength={1000} className="min-h-[96px]" />}
        </Field>
        <Field label={t("assignment")} error={errors.assignment_title} hint={t("assignmentHint")}>
          {(a) => <Input {...a} value={form.assignment_title} onChange={set("assignment_title")} maxLength={120} />}
        </Field>
        <DocumentUpload label={t("file")} description={t("fileHint")} purpose="FEEDBACK_ATTACHMENT" files={files} onChange={setFiles} max={1} error={errors.attachment_id} />

        <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {existing ? t("saveChanges") : t("send", { name: learner.name })}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
