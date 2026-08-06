const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn, environment: process.env.NODE_ENV, tracesSampleRate: 0.1 });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({ dsn, environment: process.env.NODE_ENV, tracesSampleRate: 0.1 });
  }
}

export const onRequestError = dsn
  ? async (...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>) => {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureRequestError(...args);
    }
  : undefined;
