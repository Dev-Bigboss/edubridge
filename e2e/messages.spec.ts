import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

async function signOut(page: Page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

const list = (page: Page) => page.getByRole("region", { name: "Messages" });
const thread = (page: Page) => page.getByRole("log");

test("MSG-1/3: a learner reads a reply, sees it was seen, and answers", async ({ page, isMobile }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  if (!isMobile) await expect(page.getByRole("link", { name: /^Messages\s*2 unread$/ })).toBeVisible();
  await page.goto("/learn/messages");
  await expect(page.getByRole("heading", { name: "Messages", level: 1 })).toBeVisible();
  const chat = list(page).getByRole("link", { name: /^Test Instructor/ });
  await expect(chat).toContainText("1 unread");
  await expectNoA11yViolations(page);

  await chat.click();
  await expect(thread(page).getByText("Bring one question about it to class")).toBeVisible();
  await expect(thread(page).getByText("Seen")).toBeVisible();
  // Opening it marks it read.
  if (!isMobile) await expect(chat).not.toContainText("unread");
  await expectNoA11yViolations(page);

  const box = page.getByLabel("Message Test Instructor");
  await box.fill("Will do. Is the mock exam open book?");
  await box.press("Enter");
  await expect(thread(page).getByText("Will do. Is the mock exam open book?")).toBeVisible();
  await expect(box).toHaveValue("");

  // Shift+Enter is a new line, not a send.
  await box.fill("First line");
  await box.press("Shift+Enter");
  await box.pressSequentially("second line");
  await expect(box).toHaveValue("First line\nsecond line");
});

test("MSG-2: the cohort channel pins the latest announcement; a finished cohort is read-only", async ({ page }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/messages");
  await list(page).getByRole("link", { name: /^Autumn cohort/ }).click();
  await expect(page.getByText(/^Latest announcement:/)).toBeVisible();
  await expect(thread(page).getByText("Page 112 in the study text.")).toBeVisible();
  await expect(page.getByLabel("Post as an announcement (highlighted for everyone)")).toHaveCount(0);
  await expectNoA11yViolations(page);

  await page.goto("/learn/messages");
  await list(page).getByRole("link", { name: /^Last semester's cohort/ }).click();
  await expect(page.getByText("This cohort has ended, so its channel is read-only.")).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
});

test("MSG-1/2: the instructor posts an announcement and replies with a file", async ({ page }) => {
  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/messages");
  await list(page).getByRole("link", { name: /^Autumn cohort/ }).click();
  await page.getByLabel("Post as an announcement (highlighted for everyone)").check();
  await page.getByLabel("Message Autumn cohort").fill("No class next Monday; we'll make it up on Saturday.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator("p").filter({ hasText: /^Latest announcement:/ })).toContainText("No class next Monday");

  await page.goto("/teach/messages");
  await list(page).getByRole("link", { name: /^Test Learner/ }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "marking-guide.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 demo") });
  await expect(page.getByRole("list", { name: "Files to send" }).getByText("marking-guide.pdf")).toBeVisible();
  await page.getByRole("button", { name: "Send" }).click();
  await expect(thread(page).getByRole("link", { name: /^Download marking-guide\.pdf/ })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("MSG-1 / BR-6: a learner asks about a training before booking; the instructor sees it", async ({ page }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/trainings/sql-for-analysts-one-on-one");
  await page.getByRole("button", { name: "Ask a question: Demo Instructor Three" }).click();
  await expect(page).toHaveURL(/\/learn\/messages\?c=/);
  await expect(page.getByText("Start the conversation with Demo Instructor Three")).toBeVisible();
  await page.getByLabel("Message Demo Instructor Three").fill("Is this suitable if I've never written SQL?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(thread(page).getByText("Is this suitable if I've never written SQL?")).toBeVisible();

  // Only people they work with (or asked) are offered in New message.
  await page.goto("/learn/messages");
  await page.getByRole("button", { name: "New message" }).click();
  const dialog = page.getByRole("dialog", { name: "New message" });
  await expect(dialog.getByRole("button", { name: /Demo Instructor Three/ })).toContainText("Question about");
  await expect(dialog.getByRole("button", { name: /Test Instructor/ })).toBeVisible();
  await page.keyboard.press("Escape");

  await signOut(page);
  await signIn(page, "instructor.three@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/messages");
  await expect(list(page).getByRole("link", { name: /^Test Learner/ })).toContainText("Question about SQL");
});

test("a guest's question starts with signing in", async ({ page }) => {
  await page.goto("/trainings/sql-for-analysts-one-on-one");
  await page.getByRole("link", { name: "Ask a question: Demo Instructor Three" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("messages fit a 320 px screen: list, then the conversation, then back", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/messages");
  await list(page).getByRole("link", { name: /^Test Instructor/ }).click();
  await expect(page.getByLabel("Message Test Instructor")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole("link", { name: "Back to conversations" }).click();
  await expect(list(page).getByRole("link", { name: /^Autumn cohort/ })).toBeVisible();
});

test("MSG-6: a phone number gets a warning first; the sender can still send it", async ({ page }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/messages?c=cnv_seed_direct");
  const box = page.getByLabel("Message Test Instructor");
  await box.fill("Could you call me on 0803 123 4567?");
  await box.press("Enter");
  const warning = page.getByRole("alert").filter({ hasText: "aren't protected" });
  await expect(warning).toBeVisible();
  await expect(box).toHaveValue("Could you call me on 0803 123 4567?");
  await expectNoA11yViolations(page);
  await warning.getByRole("button", { name: "Send anyway" }).click();
  await expect(thread(page).getByText("Could you call me on 0803 123 4567?")).toBeVisible();
});

test("MSG-6: a learner reports a message and blocks; unblocking opens the chat again", async ({ page }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/messages?c=cnv_seed_direct");
  await page.getByRole("button", { name: "Conversation options" }).click();
  await page.getByRole("menuitem", { name: "Report" }).click();
  const dialog = page.getByRole("dialog", { name: "Report this conversation" });
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByText("Choose what's wrong.")).toBeVisible();
  await dialog.getByLabel("Harassment or abuse").check();
  await dialog.getByLabel("Which message?").selectOption({ label: "Test Instructor: Great. Bring one question about it to class and we'll start there." });
  await dialog.getByLabel("Also block Test Instructor").check();
  await expectNoA11yViolations(page);
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Thanks for telling us.")).toBeVisible();
  await expect(page.getByText("You blocked Test Instructor.")).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);

  await page.getByRole("button", { name: "Unblock Test Instructor" }).click();
  await expect(page.getByLabel("Message Test Instructor")).toBeVisible();
});

test("MSG-6: an admin reviews a reported message in context and removes it", async ({ page }) => {
  await signIn(page, "admin@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/moderation");
  const card = page.getByRole("article", { name: /Asking to pay outside EduBridge: Fola Demo/ });
  await expect(card).toContainText("Reported by Ada Demo");
  await expectNoA11yViolations(page);

  await card.getByRole("button", { name: /^Review/ }).click();
  const dialog = page.getByRole("dialog", { name: "Review report" });
  await expect(dialog.getByRole("region", { name: "Messages around it" }).getByText("I tutor this privately")).toBeVisible();
  await dialog.getByRole("button", { name: "Remove message" }).click();
  await expect(dialog.getByText("Add a short note for the record.")).toBeVisible();
  await dialog.getByLabel("Note for the record").fill("Off-platform payment offer, first warning.");
  await expectNoA11yViolations(page);
  await dialog.getByRole("button", { name: "Remove message" }).click();
  await expect(page.getByText("Message removed for everyone.")).toBeVisible();
  await expect(page.getByText("Nothing waiting for review")).toBeVisible();

  await page.getByRole("group", { name: "Show reports" }).getByRole("button", { name: "Resolved" }).click();
  await expect(page.getByRole("article", { name: /Fola Demo/ })).toContainText("Off-platform payment offer, first warning.");
  await page.goto("/admin/audit-log");
  await expect(page.getByText(/Removed a reported message/).first()).toBeVisible();
});
