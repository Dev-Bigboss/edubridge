import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "./client";

/**
 * Maps the API error shape onto a react-hook-form form: field errors go next to their fields,
 * anything else becomes the form-level message. Never clears what the person typed.
 * Returns the form-level message, or null if every error belonged to a field.
 */
export function applyApiError<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>): string | null {
  if (!(err instanceof ApiError)) return "Something went wrong. Please try again.";
  const entries = Object.entries(err.fieldErrors);
  for (const [field, messages] of entries) {
    setError(field as Path<T>, { type: "server", message: messages[0] });
  }
  return entries.length ? null : err.message;
}
