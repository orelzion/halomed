import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

// Environment and version for server-side events
const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

export function getPostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0
      }
    );
  }
  return posthogClient;
}

/**
 * Capture an event with environment tagging
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, any>
) {
  const client = getPostHogClient();
  client.capture({
    distinctId,
    event,
    properties: {
      ...properties,
      environment,
      app_version: appVersion,
    },
  });
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}
