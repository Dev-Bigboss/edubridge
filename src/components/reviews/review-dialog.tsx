"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import { useDeleteReview, useReviewables, useSaveReview } from "@/lib/api/hooks/reviews";
import { ReviewInput, type Reviewable } from "@/lib/api/schemas/reviews";
import { REVIEW_COMMENT } from "@/lib/domain/reviews";
import { StarInput } from "./stars";

/** FDB-4: "Leave a review" (or edit it) for a training finished with an instructor. Renders nothing until eligible. */
export function ReviewButton({ trainingId, instructorId, variant = "outline" }: { trainingId: string; instructorId: string; variant?: "outline" | "link" }) {
  const t = useTranslations("reviews");
  const list = useReviewables();
  const [open, setOpen] = useState(false);
  const item = list.data?.find((x) => x.training_id === trainingId && x.instructor.id === instructorId);
  if (!item) return null;
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {variant !== "link" && <Star aria-hidden="true" className="size-4" />}
        {item.review ? t("edit") : t("leave")}
      </Button>
      {item.review?.status === "HIDDEN" && <span className="text-sm text-danger">{t("hiddenShort")}</span>}
      {open && <ReviewDialog item={item} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReviewDialog({ item, onClose }: { item: Reviewable; onClose: () => void }) {
  const t = useTranslations("reviews");
  const save = useSaveReview();
  const remove = useDeleteReview();
  const [trainingRating, setTrainingRating] = useState(item.review?.training_rating ?? 0);
  const [instructorRating, setInstructorRating] = useState(item.review?.instructor_rating ?? 0);
  const [comment, setComment] = useState(item.review?.comment ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const submit = () => {
    const parsed = ReviewInput.safeParse({ training_id: item.training_id, instructor_id: item.instructor.id, training_rating: trainingRating, instructor_rating: instructorRating, comment });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path.join(".")] ??= issue.message;
      return setErrors(next);
    }
    setErrors({});
    setFormError(null);
    save.mutate(parsed.data, {
      onSuccess: () => {
        toast.success(item.review ? t("updated") : t("thanks"));
        onClose();
      },
      onError: (e) => setFormError(e instanceof ApiError ? e.message : t("failed")),
    });
  };

  const del = () =>
    item.review &&
    remove.mutate(item.review.id, {
      onSuccess: () => {
        toast.success(t("deleted"));
        onClose();
      },
      onError: () => setFormError(t("failed")),
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("title", { training: item.training_title })} description={t("body", { name: item.instructor.name })}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {item.review?.status === "HIDDEN" && (
          <p role="status" className="rounded-sm border border-danger/30 bg-danger-soft px-4 py-3 text-[15px] text-danger">
            {t("hidden", { reason: item.review.hidden_reason ?? "" })}
          </p>
        )}
        <FormError message={formError} />
        <StarInput legend={t("trainingQuestion")} value={trainingRating} onChange={setTrainingRating} error={errors.training_rating} />
        <StarInput legend={t("instructorQuestion", { name: item.instructor.name })} value={instructorRating} onChange={setInstructorRating} error={errors.instructor_rating} />
        <Field label={t("comment")} error={errors.comment} hint={t("commentHint")}>
          {(a) => <Textarea {...a} value={comment} maxLength={REVIEW_COMMENT.max} onChange={(e) => setComment(e.target.value)} />}
        </Field>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          {item.review && (
            <Button type="button" variant="ghost" className="text-danger hover:bg-danger-soft sm:mr-auto" loading={remove.isPending} onClick={del}>
              {t("delete")}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={save.isPending}>
            {item.review ? t("save") : t("post")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
