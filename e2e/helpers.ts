import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Password123!";
export const MFA_CODE = "123456";

export async function signIn(page: Page, email: string, opts: { next?: string; mfa?: boolean } = {}) {
  await page.goto(opts.next ? `/login?next=${encodeURIComponent(opts.next)}` : "/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (opts.mfa) {
    await page.getByLabel("Verification code").fill(MFA_CODE);
    await page.getByRole("button", { name: "Verify and sign in" }).click();
  }
}

/** WCAG 2.2 AA scan (SRS NFR Accessibility). Fails on any violation. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}
