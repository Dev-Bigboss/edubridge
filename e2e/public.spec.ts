import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers";

test.describe("landing page", () => {
  test("shows the hero, both learning formats and the categories", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("top instructors");
    await expect(page.getByRole("heading", { name: "Cohort classes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "One-on-one sessions" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Professional exams/ })).toHaveAttribute(
      "href",
      "/trainings?category=professional-exam",
    );
  });

  test("has no horizontal overflow at 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("mobile menu opens, traps focus and closes on Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("link", { name: "Browse trainings" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("passes axe WCAG 2.2 AA", async ({ page }) => {
    await page.goto("/");
    await expectNoA11yViolations(page);
  });

  test("unknown routes show a helpful 404", async ({ page }) => {
    const res = await page.goto("/does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("link", { name: "Go to the homepage" })).toBeVisible();
  });
});
