import { accountHandlers } from "./account";
import { adminCatalogHandlers } from "./admin-catalog";
import { adminPaymentHandlers } from "./admin-payments";
import { adminUserHandlers } from "./admin-users";
import { authHandlers } from "./auth";
import { bookingHandlers } from "./bookings";
import { catalogHandlers } from "./catalog";
import { checkoutHandlers } from "./checkout";
import { cohortHandlers } from "./cohorts";
import { feedbackHandlers } from "./feedback";
import { meHandlers } from "./me";
import { messageHandlers } from "./messages";
import { notificationHandlers } from "./notifications";
import { onboardingHandlers } from "./onboarding";
import { pricingHandlers } from "./pricing";
import { recordingHandlers } from "./recordings";
import { resourceHandlers } from "./resources";
import { reviewHandlers } from "./reviews";
import { sessionHandlers } from "./sessions";
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
  ...bookingHandlers,
  ...sessionHandlers,
  ...recordingHandlers,
  ...resourceHandlers,
  ...reviewHandlers,
  ...feedbackHandlers,
  ...messageHandlers,
  ...notificationHandlers,
  ...meHandlers,
  ...accountHandlers,
  ...onboardingHandlers,
  ...uploadHandlers,
];
