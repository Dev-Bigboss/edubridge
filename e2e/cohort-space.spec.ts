import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test("COH-6: a learner sees the cohort roster and announcements", async ({ page }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/trainings");
  await page.getByRole("article", { name: "ICAN Audit and Assurance (2025 syllabus)" }).getByRole("link", { name: "Cohort", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Autumn cohort", level: 1 })).toBeVisible();

  const roster = page.getByRole("region", { name: "5 people" });
  await expect(roster.getByRole("listitem")).toHaveCount(5);
  await expect(roster.getByRole("listitem").first()).toContainText("Test InstructorInstructor");
  await expect(roster).toContainText("Test Learner (you)");

  const feed = page.getByRole("region", { name: "Announcements" });
  await expect(feed.getByRole("article")).toHaveCount(2);
  await expect(feed.getByRole("article").first()).toContainText("Thursday's class starts 15 minutes early");
  await expect(page.getByLabel("New announcement")).toHaveCount(0);
  await expectNoA11yViolations(page);

  await page.getByRole("link", { name: "Cohort channel" }).click();
  await expect(page).toHaveURL(/\/learn\/messages\?c=/);
});

test("COH-6: the instructor posts an announcement from the cohort page", async ({ page }) => {
  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/schedule");
  await page.getByRole("region", { name: /needs? attendance/ }).getByRole("link", { name: /^Take attendance:/ }).first().click();
  await expect(page).toHaveURL(/\/teach\/sessions\//);
  await page.getByRole("link", { name: "Autumn cohort", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Autumn cohort", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Post announcement" }).click();
  await expect(page.getByText("Write the announcement first.")).toBeVisible();
  await page.getByLabel("New announcement").fill("Bring a calculator to Thursday's mock exam.");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Post announcement" }).click();
  await expect(page.getByText("Announcement posted.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Announcements" }).getByRole("article").first()).toContainText("Bring a calculator");
});
