import { redirect } from "next/navigation";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function SsoCallbackPage() {
  if (!HAS_CLERK) redirect("/");
  return (
    <main className="flex flex-1 items-center justify-center">
      <AuthenticateWithRedirectCallback />
    </main>
  );
}