"use client";

import { useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import { applyApiError } from "@/lib/api/form-errors";

/**
 * Shared submit logic for wizard steps: save, then advance. On failure, field errors land on
 * their fields, other errors show above the form, and nothing typed is lost.
 */
export function useStepSubmit<T extends FieldValues>(
  form: UseFormReturn<T>,
  save: (values: T) => Promise<unknown>,
  onDone: () => void,
) {
  const [formError, setFormError] = useState<string | null>(null);
  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await save(values);
      onDone();
    } catch (err) {
      setFormError(applyApiError(err, form.setError));
    }
  });
  return { onSubmit, formError };
}
