import { authHandlers } from "./auth";
import { catalogHandlers } from "./catalog";
import { onboardingHandlers } from "./onboarding";
import { uploadHandlers } from "./uploads";

/** One list per module. Each module's handlers implement contracts/openapi/<module>.yaml. */
export const handlers = [...authHandlers, ...catalogHandlers, ...onboardingHandlers, ...uploadHandlers];
