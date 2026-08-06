import { clerkSetup } from "@clerk/testing/playwright";
import { readEnvLocal } from "./helpers";

/**
 * Fetches a Clerk testing token once per run, using the project's own
 * secret key via Clerk's Backend API. This is Clerk's first-party
 * accommodation for automated testing — it does not defeat Cloudflare
 * Turnstile, it tells Clerk's own Frontend API to skip the bot-protection
 * check for requests carrying this token. Playwright's automated browser
 * otherwise gets a real Turnstile challenge, same as any other bot would.
 */
export default async function globalSetup() {
  const publishableKey = readEnvLocal("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  const secretKey = readEnvLocal("CLERK_SECRET_KEY");
  if (!publishableKey || !secretKey) {
    console.warn("Clerk keys not found in .env.local — skipping clerkSetup(); auth E2E test will fail.");
    return;
  }
  await clerkSetup({ publishableKey, secretKey });
}
