import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

async function signOut(page: Page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("FDB-2: a learner sees progress per skill and every piece of feedback", async ({ page }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/trainings");
  await page.getByRole("article", { name: "ICAN Audit and Assurance (2025 syllabus)" }).getByRole("link", { name: "Feedback", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Feedback", level: 1 })).toBeVisible();

  const row = page.getByRole("row", { name: /Technical knowledge/ });
  await expect(row).toContainText("2 · Developing");
  await expect(row).toContainText("3 · Good");
  await expect(row).toContainText("Up 1");
  await expect(page.getByRole("row", { name: /Time management/ })).toContainText("No change");

  const history = page.getByRole("region", { name: "All feedback" });
  await expect(history.getByRole("article")).toHaveCount(2);
  const latest = history.getByRole("article").first();
  await expect(latest).toContainText("Timing is now the main thing");
  await expect(latest.getByRole("link", { name: /^Download q2-marked\.pdf/ })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("FDB-1/3: the instructor scores a learner on the rubric after class; the learner is told", async ({ page }) => {
  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/schedule");
  await page.getByRole("region", { name: /needs? attendance/ }).getByRole("link", { name: /^Take attendance:/ }).first().click();

  const section = page.getByRole("region", { name: "Feedback" });
  await section.getByRole("button", { name: "Write feedback: Ada Demo" }).click();
  const dialog = page.getByRole("dialog", { name: "Feedback for Ada Demo" });
  await dialog.getByRole("button", { name: "Send to Ada Demo" }).click();
  await expect(dialog.getByText("Choose a level for Technical knowledge.")).toBeVisible();
  await expect(dialog.getByText("Write a few sentences about how the session went.")).toBeVisible();

  for (const [criterion, level] of [["Technical knowledge", "3 · Good"], ["Applying it to scenarios", "2 · Developing"], ["Exam technique", "2 · Developing"], ["Time management", "4 · Excellent"]]) {
    await dialog.getByRole("radiogroup", { name: criterion }).getByRole("radio", { name: level }).click();
  }
  await dialog.getByLabel("How did the session go?").fill("Good questions in class and a clear plan for the case study.");
  await dialog.getByLabel("Next steps").fill("Practise two scenario questions before Thursday.");
  await expectNoA11yViolations(page);
  await dialog.getByRole("button", { name: "Send to Ada Demo" }).click();
  await expect(page.getByText("Feedback sent to Ada Demo.")).toBeVisible();
  await expect(section.getByRole("button", { name: "Edit feedback: Ada Demo" })).toBeVisible();

  await signOut(page);
  await signIn(page, "ada.demo@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/feedback");
  await expect(page.getByRole("region", { name: "All feedback" })).toContainText("Practise two scenario questions");
});

test("FDB-1: admins add a rubric for a category", async ({ page }) => {
  await signIn(page, "admin@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/rubrics");
  await expect(page.getByRole("article", { name: /General progress/ })).toContainText("Default");
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Add rubric" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add a rubric" });
  await dialog.getByLabel("Name").fill("University coursework");
  await dialog.getByLabel("Criterion 1", { exact: true }).fill("Accuracy");
  await dialog.getByLabel("Criterion 2", { exact: true }).fill("Showing working");
  await dialog.getByRole("button", { name: "Add rubric" }).click();
  await expect(dialog.getByText("Choose at least one category, or make it the default.")).toBeVisible();
  await dialog.getByText("University Course", { exact: true }).click();
  await expect(dialog.getByLabel("University Course")).toBeChecked();
  await expectNoA11yViolations(page);
  await dialog.getByRole("button", { name: "Add rubric" }).click();
  await expect(page.getByText("University coursework added.")).toBeVisible();
  await expect(page.getByRole("article", { name: /University coursework/ })).toContainText("Used for: University Course");
});
