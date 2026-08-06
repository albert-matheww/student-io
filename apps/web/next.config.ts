import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// No-op wrap when Sentry isn't configured, matching the rest of the app's
// pattern of every optional integration degrading gracefully without a key.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, { silent: true, sourcemaps: { disable: true } })
  : nextConfig;
