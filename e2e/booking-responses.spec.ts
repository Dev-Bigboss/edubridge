import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

const BOOK = "/learn/book/acca-strategic-business-reporting-one-on-one?instructor=usr_instructor_1";

/** The demo learner requests the first free hour and authorises the card. */
async function requestAsLearner(page: Page) {
  await signIn(page, "learner@example.com", { next: BOOK });
  await page.getByRole("radiogroup", { name: "Start time" }).getByRole("radio").first().click();
  await page.getByLabel("Note to the instructor (optional)").fill("Consolidations, please.");
  await page.getByRole("button", { name: /^Request session · hold/ }).click();
  await page.getByRole("button", { name: /^Authorise/ }).click();
  await expect(page.getByText(/Waiting for Test Instructor to accept/)).toBeVisible({ timeout: 15_000 });
  return page.url();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("OTO-4/8: the instructor accepts; both sides see the confirmed session and the calendar invite", async ({ page }) => {
  const bookingUrl = await requestAsLearner(page);
  await signOut(page);

  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page.getByRole("button", { name: /Notifications, \d+ unread/ })).toBeVisible();
  await page.goto("/teach/requests");
  const waiting = page.getByRole("region", { name: /Waiting for you/ });
  const card = waiting.getByRole("article", { name: "Test Learner" });
  await expect(card.getByText(/Answer within/)).toBeVisible();
  await expect(card.getByText("“Consolidations, please.”")).toBeVisible();
  await expectNoA11yViolations(page);
  await card.getByRole("button", { name: "Accept" }).click();
  const upcoming = page.getByRole("region", { name: /Coming up/ });
  await expect(upcoming.getByRole("article", { name: "Test Learner" })).toBeVisible();
  await expect(upcoming.getByText("Confirmed. Join opens 15 minutes before the start.")).toBeVisible();
  await signOut(page);

  await signIn(page, "learner@example.com", { next: new URL(bookingUrl).pathname });
  await expect(page.getByText(/Confirmed and paid/)).toBeVisible();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  expect((await download).suggestedFilename()).toMatch(/^edubridge-session-bkg_.*\.ics$/);
});

test("OTO-6: the instructor proposes another time and the learner accepts it", async ({ page }) => {
  const bookingUrl = await requestAsLearner(page);
  await signOut(page);

  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/requests");
  await page.getByRole("button", { name: "Propose another time" }).click();
  const dialog = page.getByRole("dialog", { name: "Propose another time" });
  await dialog.getByRole("button", { name: "Send proposal" }).click();
  await expect(dialog.getByText("Pick a time to propose.")).toBeVisible();
  await dialog.getByRole("radiogroup", { name: "Start time" }).getByRole("radio").last().click();
  await dialog.getByLabel("Note to the learner (optional)").fill("That evening works better for me.");
  await dialog.getByRole("button", { name: "Send proposal" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("region", { name: /Waiting for the learner/ }).getByText(/Learner has/)).toBeVisible();
  await signOut(page);

  await signIn(page, "learner@example.com", { next: new URL(bookingUrl).pathname });
  const proposal = page.getByRole("region", { name: "Test Instructor proposed another time" });
  await expect(proposal.getByText("“That evening works better for me.”")).toBeVisible();
  await expectNoA11yViolations(page);
  await proposal.getByRole("button", { name: "Accept new time" }).click();
  await expect(page.getByText(/Confirmed and paid/)).toBeVisible();
  await expect(page.getByText("You accepted the new time")).toBeVisible();
});

test("declining needs a reason, which the learner then sees", async ({ page }) => {
  const bookingUrl = await requestAsLearner(page);
  await signOut(page);

  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/requests");
  await page.getByRole("button", { name: "Decline" }).click();
  const dialog = page.getByRole("dialog", { name: "Decline Test Learner's request?" });
  await dialog.getByRole("button", { name: "Decline request" }).click();
  await expect(dialog.getByText("Tell the learner why, in a few words.")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Reason" }).fill("I'm away that week, sorry.");
  await dialog.getByRole("button", { name: "Decline request" }).click();
  await expect(page.getByRole("heading", { name: "No requests right now" })).toBeVisible();
  await signOut(page);

  await signIn(page, "learner@example.com", { next: new URL(bookingUrl).pathname });
  await expect(page.getByText(/couldn't take this session/)).toBeVisible();
  await expect(page.getByText("“I'm away that week, sorry.”")).toBeVisible();
});
