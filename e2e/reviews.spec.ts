import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

const MTH = "/trainings/mth-101-elementary-mathematics-i";

test("FDB-4: anyone sees the average and reviews on the training page", async ({ page }) => {
  await page.goto(MTH);
  const reviews = page.getByRole("region", { name: "What learners say" });
  await expect(reviews).toContainText("4.3 out of 5");
  await expect(reviews).toContainText("from 3 reviews");
  await expect(reviews.getByRole("listitem")).toHaveCount(3);
  await expect(reviews).toContainText("Ada D.");
  await expect(page.getByRole("region", { name: "Your instructor" })).toContainText("4.7 out of 5");
  await expectNoA11yViolations(page);
});

test("FDB-4: a learner reviews a finished training and can edit it", async ({ page }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto("/learn/trainings");
  const card = page.getByRole("region", { name: /Finished/ }).getByRole("article", { name: "MTH 101: Elementary Mathematics I" });
  await card.getByRole("button", { name: "Leave a review" }).click();

  const dialog = page.getByRole("dialog", { name: "Review MTH 101: Elementary Mathematics I" });
  await dialog.getByRole("button", { name: "Post review" }).click();
  await expect(dialog.getByText("Choose from 1 to 5 stars.").first()).toBeVisible();
  await dialog.getByRole("group", { name: "How was the training?" }).getByLabel("4 stars, Very good").check({ force: true });
  await dialog.getByRole("group", { name: /as an instructor/ }).getByLabel("5 stars, Excellent").check({ force: true });
  await dialog.getByLabel("Your review").fill("Patient explanations and useful weekly problem sets.");
  await expectNoA11yViolations(page);
  await dialog.getByRole("button", { name: "Post review" }).click();
  await expect(page.getByText("Thanks for your review.")).toBeVisible();
  await expect(card.getByRole("button", { name: "Edit your review" })).toBeVisible();

  await page.goto(MTH);
  await expect(page.getByRole("region", { name: "What learners say" })).toContainText("from 4 reviews");
  await expect(page.getByRole("region", { name: "What learners say" })).toContainText("Test L.");
});

test("FDB-4: an admin hides a review with a reason and can restore it", async ({ page }) => {
  await signIn(page, "admin@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/moderation");
  await page.getByRole("navigation", { name: "Moderation sections" }).getByRole("link", { name: "Reviews" }).click();
  await expect(page).toHaveURL(/tab=reviews/);
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Hide review: Ada Demo, MTH 101: Elementary Mathematics I" }).click();
  const dialog = page.getByRole("dialog", { name: "Hide this review?" });
  await dialog.getByRole("button", { name: "Hide review" }).click();
  await expect(dialog.getByText("Say why, so the learner understands.")).toBeVisible();
  await dialog.getByLabel("Reason").fill("Names another learner.");
  await dialog.getByRole("button", { name: "Hide review" }).click();
  await expect(page.getByText("Review hidden.")).toBeVisible();

  await page.getByRole("group", { name: "Show reviews" }).getByRole("button", { name: "Hidden" }).click();
  await expect(page.getByRole("article", { name: "MTH 101: Elementary Mathematics I" })).toContainText("Names another learner.");
  await page.getByRole("button", { name: /^Restore: Ada Demo/ }).click();
  await expect(page.getByText("Review is live again.")).toBeVisible();
});
