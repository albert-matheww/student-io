import { readFileSync } from "node:fs";
import path from "node:path";

/** Minimal .env.local reader — avoids pulling in a dotenv dependency for
 * the one value the Clerk-cleanup helper needs server-side. */
export function readEnvLocal(key: string): string | undefined {
  const file = path.join(__dirname, "..", ".env.local");
  let contents: string;
  try {
    contents = readFileSync(file, "utf-8");
  } catch {
    return undefined;
  }
  const match = contents.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match?.[1]?.trim().replace(/^"|"$/g, "");
}

/** Deletes a Clerk user by id via the Backend API, so this suite never
 * accumulates test accounts across runs. Silently no-ops if CLERK_SECRET_KEY
 * isn't available (e.g. Clerk not configured locally) — the test itself
 * already requires it to have gotten this far. */
export async function deleteClerkUser(userId: string): Promise<void> {
  const secretKey = readEnvLocal("CLERK_SECRET_KEY");
  if (!secretKey) return;
  await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${secretKey}` },
  });
}

/** Looks up a Clerk user's id by email via the Backend API — used to clean
 * up after a test since the frontend never exposes the raw user id. */
export async function findClerkUserIdByEmail(email: string): Promise<string | undefined> {
  const secretKey = readEnvLocal("CLERK_SECRET_KEY");
  if (!secretKey) return undefined;
  const res = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );
  if (!res.ok) return undefined;
  const users = (await res.json()) as { id: string }[];
  return users[0]?.id;
}
