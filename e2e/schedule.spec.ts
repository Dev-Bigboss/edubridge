import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
});

test("OTO-10: the schedule shows cohort classes ahead and what still needs attendance", async ({ page }) => {
  await page.goto("/teach/schedule");
  await expect(page.getByRole("heading", { name: "Schedule", level: 1 })).toBeVisible();
  const todo = page.getByRole("region", { name: /needs? attendance/ });
  await expect(todo.getByText("Autumn cohort").first()).toBeVisible();
  await expect(page.getByText(/Evening cohort/).first()).toBeVisible(); // a class later this month
  await expectNoA11yViolations(page);
});

test("COH-4: take attendance for a past class", async ({ page }) => {
  await page.goto("/teach/schedule");
  const todo = page.getByRole("region", { name: /needs? attendance/ });
  await expect(todo.getByRole("listitem").first()).toBeVisible();
  const before = await todo.getByRole("listitem").count();
  await todo.getByRole("link", { name: /^Take attendance:/ }).first().click();

  await expect(page.getByRole("heading", { name: "Attendance (4 learners)" })).toBeVisible();
  await page.getByRole("button", { name: "Save attendance" }).click();
  await expect(page.getByText("Mark at least one learner.")).toBeVisible();

  await page.getByRole("radiogroup", { name: "Attendance for Ada Demo" }).getByRole("radio", { name: "Absent" }).click();
  await page.getByRole("radiogroup", { name: "Attendance for Chidi Demo" }).getByRole("radio", { name: "Late" }).click();
  await page.getByRole("button", { name: "Mark everyone else present" }).click();
  await expect(page.getByRole("radiogroup", { name: "Attendance for Fola Demo" }).getByRole("radio", { name: "Present" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radiogroup", { name: "Attendance for Ada Demo" }).getByRole("radio", { name: "Absent" })).toHaveAttribute("aria-checked", "true");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Save attendance" }).click();
  await expect(page.getByText("Attendance saved")).toBeVisible();

  await page.getByRole("link", { name: "Schedule" }).first().click();
  if (before > 1) await expect(page.getByRole("region", { name: /needs? attendance/ }).getByRole("listitem")).toHaveCount(before - 1);
  else await expect(page.getByRole("region", { name: /needs? attendance/ })).toHaveCount(0);
});

test("schedule and attendance pages never scroll sideways at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/teach/schedule");
  await expect(page.getByRole("heading", { name: "Schedule", level: 1 })).toBeVisible();
  await expect(page.getByText("Autumn cohort").first()).toBeVisible();
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole("link", { name: /^Take attendance:/ }).first().click();
  await expect(page.getByRole("heading", { name: "Attendance (4 learners)" })).toBeVisible();
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
