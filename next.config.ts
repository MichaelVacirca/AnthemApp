import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: false,
  },
};

const sentryEnabled = !!(process.env.SENTRY_DSN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      reactComponentAnnotation: { enabled: true },
      tunnelRoute: "/monitoring",
      sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
      disableLogger: true,
    })
  : nextConfig;
