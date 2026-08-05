import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { GradientMesh } from "@/components/brand/gradient-mesh";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export const metadata = { title: "Log in — Student.io" };

export default function SignInPage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <GradientMesh />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
        <Logo />
        {HAS_CLERK ? (
          <SignIn
            fallbackRedirectUrl="/onboarding/profile"
            appearance={{ variables: { colorPrimary: "oklch(0.62 0.19 259)" } }}
            signUpUrl="/sign-up"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              Sign-in is powered by Clerk — add{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
              </code>{" "}
              to <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env.local</code> to
              enable it.
            </p>
            <Button variant="outline" asChild>
              <Link href="/">Back home</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}