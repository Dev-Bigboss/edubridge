import { HttpResponse } from "msw/http";
import { API_BASE_URL } from "@/lib/api/client";
import { findUser, mockSession, type MockUser } from "../db";

export const url = (path: string) => `${API_BASE_URL}${path}`;

export const apiError = (status: number, code: string, message: string, field_errors?: Record<string, string[]>) =>
  HttpResponse.json({ code, message, ...(field_errors && { field_errors }) }, { status });

/** Mirrors the backend's RBAC: 401 when signed out, 403 for the wrong role. */
export function requireUser(...roles: MockUser["role"][]): MockUser | Response {
  const user = findUser(mockSession.get());
  if (!user) return apiError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  if (roles.length && !roles.includes(user.role)) {
    return apiError(403, "FORBIDDEN", "You don't have access to this.");
  }
  return user;
}
