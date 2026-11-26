import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

const BOOK = "/learn/book/acca-strategic-business-reporting-one-on-one?instructor=usr_instructor_1";

async function signOut(page: Page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

/** A confirmed session weeks ahead (so a learner cancelling gets the full refund). Returns its path. */
async function confirmedSession(page: Page) {
  await signIn(page, "learner@example.com", { next: BOOK });
  await page.getByRole("radiogroup", { name: "Day" }).getByRole("radio").last().click();
  await page.getByRole("radiogroup", { name: "Start time" }).getByRole("radio").first().click();
  await page.getByRole("button", { name: /^Request session · hold/ }).click();
  await page.getByRole("button", { name: /^Authorise/ }).click();
  await expect(page.getByText(/Waiting for Test Instructor to accept/)).toBeVisible({ timeout: 15_000 });
  const path = new URL(page.url()).pathname;
  await signOut(page);
  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/requests");
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByRole("region", { name: /Coming up/ })).toBeVisible();
  return path;
}

test("OTO-9: the learner asks for a new time and the instructor accepts it", async ({ page }) => {
  const path = await confirmedSession(page);
  await signOut(page);

  await signIn(page, "learner@example.com", { next: path });
  await page.getByRole("button", { name: "Request a new time" }).click();
  const dialog = page.getByRole("dialog", { name: "Request a new time" });
  await dialog.getByRole("radiogroup", { name: "Start time" }).getByRole("radio").last().click();
  await dialog.getByLabel("Note (optional)").fill("Work trip that day.");
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByRole("region", { name: "Reschedule request" }).getByText("You asked to move this session to")).toBeVisible();
  await signOut(page);

  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/requests");
  const panel = page.getByRole("region", { name: /Waiting for you/ }).getByRole("region", { name: "Reschedule request" });
  await expect(panel.getByText("“Work trip that day.”")).toBeVisible();
  await expectNoA11yViolations(page);
  await panel.getByRole("button", { name: "Accept new time" }).click();
  await expect(page.getByRole("region", { name: /Coming up/ }).getByRole("article", { name: "Test Learner" })).toBeVisible();
  await signOut(page);

  await signIn(page, "learner@example.com", { next: path });
  await expect(page.getByText("The reschedule was accepted")).toBeVisible();
});

test("PAY-5: cancelling shows the refund first; well ahead, the learner gets it all back", async ({ page }) => {
  const path = await confirmedSession(page);
  await signOut(page);

  await signIn(page, "learner@example.com", { next: path });
  await page.getByRole("button", { name: "Cancel session" }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel this session?" });
  await expect(dialog.getByText("You get $75 back (100%)")).toBeVisible();
  await dialog.getByText("Cancellation policy for this session").click();
  await expect(dialog.getByText("48 h or more before: 100% back")).toBeVisible();
  await expectNoA11yViolations(page);
  await dialog.getByRole("button", { name: "Cancel and refund $75" }).click();
  await expect(dialog.getByText("Say why, in a few words.")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Reason" }).fill("My exam date moved.");
  await dialog.getByRole("button", { name: "Cancel and refund $75" }).click();
  await expect(page.getByText("You cancelled this session. $75 was refunded to your card.")).toBeVisible();
  await page.goto("/learn/payments");
  await expect(page.getByRole("row", { name: /ACCA Strategic Business Reporting/ }).getByText("Refunded", { exact: true })).toBeVisible();
});

test("when the instructor cancels, the learner is refunded in full and told why", async ({ page }) => {
  const path = await confirmedSession(page);
  await page.getByRole("button", { name: "Cancel session" }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel this session?" });
  await expect(dialog.getByText("Test Learner gets $75 back (100%)")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Reason" }).fill("I'm unwell, sorry.");
  await dialog.getByRole("button", { name: "Cancel and refund $75" }).click();
  await expect(page.getByRole("heading", { name: "No requests right now" })).toBeVisible();
  await signOut(page);

  await signIn(page, "learner@example.com", { next: path });
  await expect(page.getByText("Test Instructor cancelled this session. $75 was refunded to your card.")).toBeVisible();
  await expect(page.getByText("“I'm unwell, sorry.”")).toBeVisible();
});
