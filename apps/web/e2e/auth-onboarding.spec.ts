import { test, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { deleteClerkUser, findClerkUserIdByEmail } from "./helpers";

/**
 * Regression test for the exact bug that broke production: the frontend
 * signed users in via Clerk but never attached a session token to API
 * requests, so the very first authenticated call (saving the onboarding
 * profile) 401'd behind a misleading "check localhost:8000" toast. This
 * exercises the real Clerk flow end-to-end against a locally running API,
 * the same way manual testing caught the bug in the first place.
 */

const email = `e2e.playwright.${Date.now()}+clerk_test@studentio.dev`;
const password = "PlaywrightTest!2026x";

test.afterEach(async () => {
  const userId = await findClerkUserIdByEmail(email);
  if (userId) await deleteClerkUser(userId);
});

test("sign-up completes and the onboarding profile actually saves", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto("/sign-up");

  await page.getByPlaceholder("Enter your email address").fill(email);
  await page.getByPlaceholder("Create a password").fill(password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  await page.getByRole("textbox").first().pressSequentially("424242");

  await expect(page.getByRole("heading", { name: "Tell us about yourself" })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByPlaceholder("Jordan Lee").fill("Playwright Test");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  // The regression: this toast appeared for every signed-in user once
  // Clerk went live in production, because the request never carried auth.
  await expect(page.getByText("Couldn't save your profile")).not.toBeVisible();

  // The positive assertion: profile save succeeded and onboarding advanced.
  await expect(page.getByRole("heading", { name: /How would you like/ })).toBeVisible({
    timeout: 10_000,
  });
});
