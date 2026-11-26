import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test.describe("notifications (NTF-1)", () => {
  test("the bell shows unread ones, opens one and follows its link", async ({ page }) => {
    await signIn(page, "learner@example.com");
    const bell = page.getByRole("button", { name: "Notifications, 2 unread" });
    await expect(bell).toBeVisible();
    await bell.click();
    const panel = page.getByRole("dialog", { name: "Notifications" });
    await expect(panel.getByText("Class soon: ICAN Audit and Assurance")).toBeVisible();
    await expectNoA11yViolations(page);

    await panel.getByRole("button", { name: /Class soon/ }).click();
    await expect(page).toHaveURL(/\/learn\/trainings$/);
    await expect(page.getByRole("button", { name: "Notifications, 1 unread" })).toBeVisible();

    // Escape closes it, keyboard users included (WCAG 2.1.2).
    await page.getByRole("button", { name: "Notifications, 1 unread" }).click();
    await expect(page.getByRole("dialog", { name: "Notifications" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Notifications" })).toBeHidden();
  });

  test("the page filters unread and marks everything read", async ({ page }) => {
    await signIn(page, "learner@example.com");
    await expect(page).toHaveURL(/\/learn$/);
    await page.goto("/learn/notifications");
    await expect(page.getByRole("heading", { name: "Notifications", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /^You're enrolled/ })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "Unread (2)" }).click();
    await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(2);
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByRole("heading", { name: "You're all caught up" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  });

  test("a declined payment arrives as a notification", async ({ page }) => {
    await signIn(page, "learner@example.com", { next: "/checkout/cohort/coh_mth_sem1" });
    await page.getByRole("button", { name: "Pay $250 securely" }).click();
    await page.getByRole("button", { name: "Simulate a declined card" }).click();
    await expect(page.getByRole("heading", { name: "Payment didn't go through" })).toBeVisible({ timeout: 15_000 });
    await page.goto("/learn/notifications");
    await expect(page.getByRole("button", { name: /^Payment didn't go through/ })).toBeVisible();
  });

  test("admins and instructors have the bell too", async ({ page }) => {
    await signIn(page, "admin@example.com", { mfa: true });
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("button", { name: "Notifications, 1 unread" })).toBeVisible();
    await page.goto("/admin/notifications");
    await expect(page.getByRole("button", { name: /New instructor application/ })).toBeVisible();
  });
});
