import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

async function signOut(page: Page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("RES-2/3: a learner sees the materials shared with them, by folder", async ({ page }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/trainings");
  await page.getByRole("article", { name: "ICAN Audit and Assurance (2025 syllabus)" }).getByRole("link", { name: "Resources", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Resources", level: 1 })).toBeVisible();
  const week1 = page.getByRole("region", { name: "Week 1" });
  await expect(week1.getByText("Audit planning: summary notes")).toBeVisible();
  await expect(week1.getByRole("link", { name: "Download Audit planning: summary notes" })).toHaveAttribute("href", "/demo/audit-planning-summary.pdf");
  await expect(page.getByRole("region", { name: "Past papers" }).getByText("Autumn cohort")).toBeVisible();
  await expect(page.getByRole("region", { name: "Other materials" }).getByRole("link", { name: /^Open link: Whiteboard/ })).toHaveAttribute("target", "_blank");
  await expectNoA11yViolations(page);
});

test("RES-1/2/3: the instructor uploads a file for one cohort, reorders and deletes; learners are told", async ({ page }) => {
  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/resources?training=trn_ican_aa_2025");
  await expect(page.getByRole("region", { name: "Week 1" })).toBeVisible();
  await expectNoA11yViolations(page);

  // Reorder inside Week 1 with the buttons (no dragging needed).
  const week1 = page.getByRole("region", { name: "Week 1" });
  await week1.getByRole("button", { name: "Move ICAN study text (official site) up" }).click();
  await expect(week1.getByRole("listitem").first()).toContainText("ICAN study text");

  // Add a file for one cohort.
  await page.getByRole("button", { name: "Add material" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add material" });
  await dialog.getByRole("button", { name: "Add and notify learners" }).click();
  await expect(dialog.getByText("Upload the file first.")).toBeVisible();
  await dialog.locator('input[type="file"]').setInputFiles({ name: "week-2-slides.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 demo") });
  await expect(dialog.getByText("week-2-slides.pdf")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Title" }).fill("Week 2 slides");
  await dialog.getByRole("combobox", { name: "Folder (optional)" }).fill("Week 2");
  await dialog.getByRole("radio", { name: "One cohort" }).check();
  await dialog.getByRole("button", { name: "Add and notify learners" }).click();
  await expect(dialog.getByText("Choose the cohort.")).toBeVisible();
  await dialog.getByRole("combobox", { name: "Cohort" }).selectOption({ label: "Autumn cohort" });
  await dialog.getByRole("button", { name: "Add and notify learners" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("region", { name: "Week 2" }).getByText("Week 2 slides")).toBeVisible();

  // Delete the whiteboard link.
  await page.getByRole("button", { name: "Delete Whiteboard from the first class" }).click();
  await page.getByRole("dialog", { name: "Delete this material?" }).getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Whiteboard from the first class")).toHaveCount(0);
  await signOut(page);

  await signIn(page, "learner@example.com");
  await expect(page.getByRole("button", { name: /Notifications, \d+ unread/ })).toBeVisible();
  await page.goto("/learn/resources?training=trn_ican_aa_2025");
  await expect(page.getByRole("region", { name: "Week 2" }).getByText("Week 2 slides")).toBeVisible();
  await expect(page.getByText("Whiteboard from the first class")).toHaveCount(0);
});

test("resource pages never scroll sideways at 320 px", async ({ page }) => {
  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/teach/resources?training=trn_ican_aa_2025");
  await expect(page.getByRole("region", { name: "Week 1" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
