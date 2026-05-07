import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  const common = {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  };

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init(common);
  } else if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(common);
  }
}

export const onRequestError = Sentry.captureRequestError;
