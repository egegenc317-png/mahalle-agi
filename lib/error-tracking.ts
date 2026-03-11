export async function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) {
    console.error("Captured exception", error, context);
    return;
  }

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(error, {
    extra: context
  });
}

export async function captureMessage(message: string, context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) {
    console.warn("Captured message", message, context);
    return;
  }

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureMessage(message, {
    level: "info",
    extra: context
  });
}
