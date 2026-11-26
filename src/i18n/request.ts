import { getRequestConfig } from "next-intl/server";

/**
 * i18n-ready (SRS NFR Localisation). English only at launch, so the locale is fixed and no
 * request data is read: pages can still prerender into the static shell (Cache Components).
 * Adding a language later = add messages/<locale>.json and resolve the locale here.
 */
export const DEFAULT_LOCALE = "en";

export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  messages: (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default,
}));
