"use client";

import { toast } from "sonner";
import { useSignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { GoogleIcon, AppleIcon, MicrosoftIcon } from "./brand-icons";

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const PROVIDERS = [
  { key: "oauth_google" as const, label: "Google", Icon: GoogleIcon },
  { key: "oauth_apple" as const, label: "Apple", Icon: AppleIcon },
  { key: "oauth_microsoft" as const, label: "Microsoft", Icon: MicrosoftIcon },
];

/**
 * Renders live Clerk OAuth buttons when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is
 * set, otherwise a visually-identical placeholder that explains what to
 * configure. NEXT_PUBLIC_* vars are inlined at build time, so HAS_CLERK is
 * constant for a given build — safe to branch on for hook usage.
 */
export function OAuthButtons() {
  return HAS_CLERK ? <LiveOAuthButtons /> : <PlaceholderOAuthButtons />;
}

function PlaceholderOAuthButtons() {
  return (
    <div className="flex items-center gap-3">
      {PROVIDERS.map(({ key, label, Icon }) => (
        <Button
          key={key}
          type="button"
          variant="outline"
          size="icon"
          className="size-11 rounded-full"
          aria-label={`Continue with ${label}`}
          onClick={() =>
            toast.info(`Continue with ${label}`, {
              description:
                "Add your Clerk publishable key to apps/web/.env.local to enable this.",
            })
          }
        >
          <Icon />
        </Button>
      ))}
    </div>
  );
}

function LiveOAuthButtons() {
  // Only ever mounted when HAS_CLERK is true, i.e. inside <ClerkProvider> —
  // see Providers in src/components/providers.tsx.
  const { signIn } = useSignIn();

  const handleOAuth = (strategy: (typeof PROVIDERS)[number]["key"]) => {
    signIn.sso({
      strategy,
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/onboarding/profile",
    });
  };

  return (
    <div className="flex items-center gap-3">
      {PROVIDERS.map(({ key, label, Icon }) => (
        <Button
          key={key}
          type="button"
          variant="outline"
          size="icon"
          className="size-11 rounded-full"
          aria-label={`Continue with ${label}`}
          onClick={() => handleOAuth(key)}
        >
          <Icon />
        </Button>
      ))}
    </div>
  );
}
