import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test.describe("account settings (learner)", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "learner@example.com");
    await expect(page).toHaveURL(/\/learn$/);
  });

  test("edit the profile from the account menu; the new name shows everywhere", async ({ page }) => {
    await page.getByRole("button", { name: /Account menu: Test Learner/ }).click();
    await page.getByRole("menuitem", { name: "Account settings" }).click();
    await expect(page.getByRole("heading", { name: "Account settings", level: 1 })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email address" })).toBeDisabled();
    await expectNoA11yViolations(page);

    await page.getByRole("textbox", { name: "Full name" }).fill("Ada Learner");
    await page.getByRole("combobox", { name: "Time zone" }).selectOption("Europe/London");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();
    await expect(page.getByRole("button", { name: /Account menu: Ada Learner/ })).toBeVisible();
  });

  test("change the password and turn two-step sign-in on and off", async ({ page }) => {
    await page.goto("/learn/settings?tab=security");
    const password = page.getByRole("region", { name: "Password" });
    await password.getByLabel("Current password").fill("wrong one");
    await password.getByLabel("New password").fill("a much longer passphrase");
    await password.getByRole("button", { name: "Change password" }).click();
    await expect(password.getByText("That isn't your current password.")).toBeVisible();
    await password.getByLabel("Current password").fill("Password123!");
    await password.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Password changed")).toBeVisible();
    await expectNoA11yViolations(page);

    const mfa = page.getByRole("region", { name: "Two-step sign-in" });
    await mfa.getByRole("button", { name: "Turn on two-step sign-in" }).click();
    await mfa.getByRole("textbox", { name: "6-digit code" }).fill("000000");
    await mfa.getByRole("button", { name: "Confirm and turn on" }).click();
    await expect(mfa.getByText("That code didn't match.")).toBeVisible();
    await mfa.getByRole("textbox", { name: "6-digit code" }).fill("123456");
    await mfa.getByRole("button", { name: "Confirm and turn on" }).click();
    await expect(mfa.getByText("On", { exact: true })).toBeVisible();

    await mfa.getByRole("button", { name: "Turn off" }).click();
    const dialog = page.getByRole("dialog", { name: "Turn off two-step sign-in?" });
    await dialog.getByLabel("Current password").fill("a much longer passphrase");
    await dialog.getByRole("button", { name: "Turn off" }).click();
    await expect(mfa.getByText("Off", { exact: true })).toBeVisible();
  });

  test("NTF-2: choose channels; essential ones stay on", async ({ page }) => {
    await page.goto("/learn/settings?tab=notifications");
    await expect(page.getByRole("checkbox", { name: "Payments and receipts: Email" })).toBeDisabled();
    await expect(page.getByRole("checkbox", { name: "Payments and receipts: Email" })).toBeChecked();
    await expectNoA11yViolations(page);

    await page.getByRole("checkbox", { name: "Class reminders: In app" }).uncheck();
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByText("Notification preferences saved")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("checkbox", { name: "Class reminders: In app" })).not.toBeChecked();
  });

  test("settings never scroll sideways at 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    for (const tab of ["profile", "security", "notifications"]) {
      await page.goto(`/learn/settings?tab=${tab}`);
      await expect(page.getByRole("heading", { name: "Account settings", level: 1 })).toBeVisible();
      await expect(page.getByRole("button", { name: /Save|Change password/ }).first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${tab} is wider than the screen`).toBeLessThanOrEqual(0);
    }
  });
});

test("instructors keep two-step sign-in and edit their public headline", async ({ page }) => {
  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/settings");
  await expect(page.getByRole("textbox", { name: "Headline" })).toBeVisible();
  await page.goto("/teach/settings?tab=security");
  await expect(page.getByText("Required for your role. It stays on.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Turn off" })).toHaveCount(0);
});

test("admins reach their own account at /admin/account", async ({ page }) => {
  await signIn(page, "admin@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Account settings" }).click();
  await expect(page).toHaveURL(/\/admin\/account/);
  await page.getByRole("button", { name: "Notifications", exact: true }).last().click();
  await expect(page.getByRole("checkbox", { name: "Account decisions: Email" })).toBeDisabled();
});
