import { adminCatalogHandlers } from "./admin-catalog";
import { adminUserHandlers } from "./admin-users";
import { authHandlers } from "./auth";
import { catalogHandlers } from "./catalog";
import { checkoutHandlers } from "./checkout";
import { cohortHandlers } from "./cohorts";
import { meHandlers } from "./me";
import { notificationHandlers } from "./notifications";
import { onboardingHandlers } from "./onboarding";
import { pricingHandlers } from "./pricing";
import { uploadHandlers } from "./uploads";

/** One list per module. Each module's handlers implement contracts/openapi/<module>.yaml. */
export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...adminCatalogHandlers,
  ...adminUserHandlers,
  ...pricingHandlers,
  ...cohortHandlers,
  ...checkoutHandlers,
  ...notificationHandlers,
  ...meHandlers,
  ...onboardingHandlers,
  ...uploadHandlers,
];
