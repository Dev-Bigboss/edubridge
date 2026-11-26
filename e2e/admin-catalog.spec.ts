import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, "admin@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/admin$/);
});

test("TRN-3: a new category is offered when creating a training", async ({ page }) => {
  await page.goto("/admin/catalog");
  await expect(page.getByRole("heading", { name: "Categories and modalities", level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Add category" }).click();
  const dialog = page.getByRole("dialog", { name: "Add category" });
  await dialog.getByLabel("Name").fill("Language Certification");
  await dialog.getByRole("button", { name: "Add a detail" }).click();
  await dialog.getByLabel("Label").fill("Test name");
  await dialog.getByRole("checkbox", { name: "Required before publishing" }).check();
  await dialog.getByRole("button", { name: "Create category" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("cell", { name: "Language Certification", exact: true })).toBeVisible();

  await page.goto("/admin/trainings/new");
  await page.getByRole("combobox", { name: "Category", exact: true }).selectOption({ label: "Language Certification" });
  await expect(page.getByRole("textbox", { name: "Test name", exact: true })).toBeVisible();
});

test("create a draft, complete the checklist and publish", async ({ page }) => {
  await page.goto("/admin/trainings");
  await expectNoA11yViolations(page);
  await page.getByRole("link", { name: "New training" }).first().click();

  await page.getByRole("textbox", { name: "Title", exact: true }).fill("IELTS Academic Writing");
  await page.getByRole("textbox", { name: "Summary", exact: true }).fill("Live classes on Task 1 and Task 2 with marked practice essays.");
  await page.getByRole("combobox", { name: "Category", exact: true }).selectOption({ label: "Professional Exam" });
  await page.getByRole("combobox", { name: "How it's taught", exact: true }).selectOption({ label: "Cohort" });
  await page.getByRole("combobox", { name: "Level", exact: true }).selectOption("INTERMEDIATE");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/trainings\/trn_/);
  await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();
  await expectNoA11yViolations(page);

  await page.getByRole("textbox", { name: "Description", exact: true }).fill(
    "Twelve hours of live classes on both IELTS writing tasks, with two essays marked against the official band descriptors.",
  );
  await page.getByRole("textbox", { name: "Exam body", exact: true }).fill("British Council");
  await page.getByRole("combobox", { name: "Choose an instructor", exact: true }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published. It's now in the catalogue.")).toBeVisible();
  await expect(page.getByText("/trainings/ielts-academic-writing")).toBeVisible();
});

test("archiving asks for confirmation and explains the effect", async ({ page }) => {
  await page.goto("/admin/trainings/trn_mth101");
  await page.getByRole("button", { name: "Archive" }).click();
  const dialog = page.getByRole("dialog", { name: "Archive this training?" });
  await expect(dialog.getByText("Learners already enrolled keep access")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Archive" }).click();
  await dialog.getByRole("button", { name: "Archive training" }).click();
  await expect(page.getByText("Archived. Enrolled learners keep access.")).toBeVisible();
});

test("schedule a price change and preview how prices resolve", async ({ page }) => {
  await page.goto("/admin/pricing");
  await expect(page.getByRole("heading", { name: "Pricing", level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Change price for Cohort × Professional Exam" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("New price").fill("500");
  await dialog.getByRole("radio", { name: "On a date" }).check();
  const nextMonth = new Date(Date.now() + 30 * 864e5).toLocaleDateString("en-CA");
  await dialog.getByLabel("Start date").fill(nextMonth);
  await dialog.getByRole("button", { name: "Schedule change" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/\$500 per seat from/)).toBeVisible();

  await page.getByRole("combobox", { name: "Training", exact: true }).selectOption({ label: "ACCA Strategic Business Reporting, one-on-one" });
  await page.getByRole("combobox", { name: "Instructor", exact: true }).selectOption({ label: "Test Instructor" });
  await expect(page.getByText("$75 per hour")).toBeVisible();
  await expect(page.getByText("This instructor's own rate for this training.")).toBeVisible();
});

test("admin pages never scroll sideways at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/admin", "/admin/catalog", "/admin/trainings", "/admin/trainings/new", "/admin/trainings/trn_mth101", "/admin/pricing"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} is wider than the screen`).toBeLessThanOrEqual(0);
  }
});
