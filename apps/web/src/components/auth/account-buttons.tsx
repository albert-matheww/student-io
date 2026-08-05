"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/**
 * Auth-aware header buttons. When Clerk keys are unset they fall back to
 * plain links so the app stays click-through-able in local dev — same
 * gating pattern as Providers and OAuthButtons.
 */
export function AccountButtons() {
  if (!HAS_CLERK) {
    return (
      <>
        <Button variant="ghost" asChild>
          <Link href="/sign-in">Log in</Link>
        </Button>
        <Button asChild className="shadow-soft">
          <Link href="/onboarding/profile">
            Get Started
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton>
          <Button variant="ghost">Log in</Button>
        </SignInButton>
        <SignUpButton forceRedirectUrl="/onboarding/profile">
          <Button className="shadow-soft">
            Get Started
            <ArrowRight className="size-4" />
          </Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton signInUrl="/sign-in" />
      </Show>
    </>
  );
}