import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers";

/** Filters sit in a sidebar on wide screens and in a dialog on phones; both have the same controls. */
async function filters(page: Page) {
  const sidebar = page.getByRole("complementary", { name: "Filters" });
  if (await sidebar.isVisible()) return { scope: sidebar, done: async () => {} };
  await page.getByRole("button", { name: /^Filters/ }).click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  return { scope: dialog, done: () => dialog.getByRole("button", { name: /^Show|No trainings/ }).click() };
}

const cards = (page: Page) => page.getByRole("main").getByRole("article");
const results = (page: Page) => page.getByRole("heading", { name: /trainings?$/, level: 2 });

test("TRN-6: a landing page category opens the catalogue filtered to it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Professional exams/ }).click();
  await expect(page).toHaveURL(/\/trainings\?category=professional-exam/);
  await expect(page.getByRole("list", { name: "Active filters" }).getByText("Professional Exam")).toBeVisible();
  await expect(results(page)).toHaveText("2 trainings");
  await expect(page.getByRole("link", { name: "ICAN Skills: Financial Reporting" })).toBeVisible();
  await expect(page.getByRole("link", { name: "MTH 101: Elementary Mathematics I" })).toBeHidden();
});

test("TRN-6/7: search matches category details; drafts and archived trainings never show", async ({ page }) => {
  await page.goto("/trainings");
  await expect(results(page)).toHaveText("5 trainings");
  await expect(page.getByRole("link", { name: /Python for Data Analysis/ })).toBeHidden(); // draft
  await expect(page.getByRole("link", { name: /Audit and Assurance/ })).toBeHidden(); // archived

  await page.getByRole("searchbox", { name: "Search trainings" }).fill("MTH 101");
  await expect(page).toHaveURL(/q=MTH\+101/);
  await expect(results(page)).toHaveText("1 training");
  await expect(cards(page)).toHaveCount(1);

  await page.getByRole("searchbox", { name: "Search trainings" }).fill("underwater basket weaving");
  await expect(page.getByRole("heading", { name: "No trainings match your search" })).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Clear all" }).last().click();
  await expect(results(page)).toHaveText("5 trainings");
});

test("TRN-6: filter by format, language and price, then sort by price", async ({ page }) => {
  await page.goto("/trainings");
  await expect(results(page)).toHaveText("5 trainings");

  let f = await filters(page);
  await f.scope.getByRole("radio", { name: "One-on-one" }).check();
  await f.scope.getByRole("combobox", { name: "Language" }).selectOption({ label: "French" });
  await f.done();
  await expect(results(page)).toHaveText("1 training");
  await expect(page.getByRole("link", { name: "Excel pour la finance" })).toBeVisible();

  await page.getByRole("button", { name: "Remove filter: French" }).click();
  await expect(results(page)).toHaveText("3 trainings");

  f = await filters(page);
  await f.scope.getByRole("radio", { name: "Under $50" }).check();
  await f.done();
  await expect(results(page)).toHaveText("2 trainings");

  await page.getByRole("combobox", { name: "Sort by" }).selectOption({ label: "Price: high to low" });
  await expect(cards(page).first()).toContainText("SQL for Analysts");
  await expect(page).toHaveURL(/modality=ONE_ON_ONE/);
  await expect(page).toHaveURL(/price=under_50/);
  await expect(page).toHaveURL(/sort=price_desc/);

  // The filtered view survives a reload, so it can be shared.
  await page.reload();
  await expect(results(page)).toHaveText("2 trainings");
});

test("COH-2: cohort detail shows seats, schedule in my zone and blocks a full cohort", async ({ page }) => {
  await page.goto("/trainings");
  await page.getByRole("link", { name: "ICAN Skills: Financial Reporting" }).click();
  await expect(page.getByRole("heading", { name: "ICAN Skills: Financial Reporting", level: 1 })).toBeVisible();
  await expect(page).toHaveTitle("ICAN Skills: Financial Reporting | EduBridge");

  const glance = page.getByRole("complementary", { name: "At a glance" });
  await expect(glance.getByText("Exam body")).toBeVisible();
  await expect(glance.getByText("ICAN", { exact: true })).toBeVisible();
  await expect(page.getByText(/Times are shown in your time zone/)).toBeVisible();

  const full = page.getByRole("article", { name: "Weekend intensive" });
  await expect(full.getByText("No seats left")).toBeVisible();
  await expect(full.getByText("This cohort is full")).toBeVisible();
  await expect(full.getByRole("link", { name: "Enrol" })).toHaveCount(0);

  const open = page.getByRole("article", { name: "Evening cohort" });
  await expect(open.getByText("6 of 20 seats left")).toBeVisible();
  await expect(open.getByText("12 live sessions")).toBeVisible();
  await expect(open.getByRole("link", { name: "Enrol" })).toHaveAttribute("href", "/checkout/cohort/coh_sfr_jan");
  await expectNoA11yViolations(page);
});

test("PRC-3: a one-on-one training lists each instructor's price", async ({ page }) => {
  await page.goto("/trainings/acca-strategic-business-reporting-one-on-one");
  const instructors = page.getByRole("region", { name: "Choose an instructor" });
  await expect(instructors.getByText("Test Instructor")).toBeVisible();
  await expect(instructors.getByText("$75 per hour")).toBeVisible();
  await expect(instructors.getByRole("button", { name: "Request a session" })).toBeDisabled();
});

test("TRN-7: an archived training's address explains it's gone and offers the catalogue", async ({ page }) => {
  await page.goto("/trainings/ican-audit-and-assurance-2025-syllabus");
  await expect(page.getByRole("heading", { name: "This training isn't available" })).toBeVisible();
  await page.getByRole("link", { name: "Browse trainings" }).last().click();
  await expect(page).toHaveURL(/\/trainings$/);
});

test("catalogue passes axe and never scrolls sideways at 320 px", async ({ page }) => {
  await page.goto("/trainings");
  await expect(results(page)).toHaveText("5 trainings");
  await expectNoA11yViolations(page);
  await page.setViewportSize({ width: 320, height: 800 });
  const pages = [
    ["/trainings", "5 trainings"],
    ["/trainings/ican-skills-financial-reporting", "Upcoming cohorts"],
    ["/trainings/excel-pour-la-finance", "Choose an instructor"],
  ] as const;
  for (const [path, loaded] of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: loaded, level: 2 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} is wider than the screen`).toBeLessThanOrEqual(0);
  }
});
