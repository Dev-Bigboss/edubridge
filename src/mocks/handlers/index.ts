import { accountHandlers } from "./account";
import { adminCatalogHandlers } from "./admin-catalog";
import { adminPaymentHandlers } from "./admin-payments";
import { adminUserHandlers } from "./admin-users";
import { authHandlers } from "./auth";
import { catalogHandlers } from "./catalog";
import { checkoutHandlers } from "./checkout";
import { cohortHandlers } from "./cohorts";
import { meHandlers } from "./me";
import { notificationHandlers } from "./notifications";
import { onboardingHandlers } from "./onboarding";
import { pricingHandlers } from "./pricing";
import { settingsHandlers } from "./settings";
import { uploadHandlers } from "./uploads";

/** One list per module. Each module's handlers implement contracts/openapi/<module>.yaml. */
export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...adminCatalogHandlers,
  ...adminUserHandlers,
  ...adminPaymentHandlers,
  ...pricingHandlers,
  ...settingsHandlers,
  ...cohortHandlers,
  ...checkoutHandlers,
  ...notificationHandlers,
  ...meHandlers,
  ...accountHandlers,
  ...onboardingHandlers,
  ...uploadHandlers,
];
