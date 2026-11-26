import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

async function signOut(page: Page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("REC-2/4/6: a learner finds a class recording, plays it with speed and captions, and resumes later", async ({ page }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/trainings");
  await page.getByRole("article", { name: "ICAN Audit and Assurance (2025 syllabus)" }).getByRole("link", { name: "Recordings" }).click();
  await expect(page.getByRole("heading", { name: /^Recordings: ICAN Audit/, level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole("main").getByRole("listitem").first().getByRole("link").click();

  const video = page.getByLabel(/^Recording of ICAN Audit/);
  await expect(video).toHaveAttribute("src", /\/demo\/recording-sample\.webm\?token=/);
  await expect(video).toHaveAttribute("controlslist", /nodownload/);
  // The real clip loads: its length comes from the file.
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => Math.round(v.duration))).toBe(20);

  await page.getByRole("radiogroup", { name: "Playback speed" }).getByRole("radio", { name: "1.5×" }).click();
  expect(await video.evaluate((v: HTMLVideoElement) => v.playbackRate)).toBe(1.5);
  await expect(page.getByRole("checkbox", { name: "Captions" })).toBeChecked();
  await expect(page.getByText(/Only this cohort's learners and instructor can watch/)).toBeVisible();
  await expectNoA11yViolations(page);

  // Stop at 0:08; coming back picks up there.
  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = 8;
    v.dispatchEvent(new Event("pause"));
  });
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByText("Picking up where you left off (0:08)")).toBeVisible();
});

test("REC-5: the instructor hides and trims a recording; learners only see visible ones", async ({ page }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/recordings");
  await expect(page.getByRole("main").getByRole("listitem").first()).toBeVisible();
  const visibleBefore = await page.getByRole("main").getByRole("listitem").count();
  await signOut(page);

  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/recordings");
  await expect(page.getByRole("heading", { name: "Recordings", level: 1 })).toBeVisible();
  await expect(page.getByText("Processing")).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: /^Hide the recording from/ }).first().click();
  await expect(page.getByText("Hidden from learners")).toBeVisible();
  await expect(page.getByText("Hidden", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^Trim the recording from/ }).nth(1).click();
  const dialog = page.getByRole("dialog", { name: "Trim recording" });
  await dialog.getByRole("textbox", { name: "Until" }).fill("0:05");
  await dialog.getByRole("button", { name: "Save trim" }).click();
  await expect(dialog.getByText("Keep at least 10 seconds.")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Keep from" }).fill("0:02");
  await dialog.getByRole("textbox", { name: "Until" }).fill("0:18");
  await dialog.getByRole("button", { name: "Save trim" }).click();
  await expect(page.getByText("Trimmed to 0:02–0:18")).toBeVisible();
  await signOut(page);

  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/recordings");
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(visibleBefore - 1);
});
