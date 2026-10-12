/**
 * The app's QueryClient. TanStack's defaults retry every failed query three
 * times and refetch on window focus, which hid errors behind repeated loading
 * states. Here retries are limited to transient failures, capped by
 * UI.queryRetries, and each one is logged.
 */
import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-error";
import { UI } from "@/lib/ui-config";

/** Statuses worth another attempt: no response at all, rate limited, or a gateway/availability failure. */
const TRANSIENT = new Set([0, 429, 502, 503, 504]);

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!isTransient(error) || failureCount > UI.queryRetries) return false;
  const e = error as ApiError;
  console.warn("Retrying query after a transient failure", {
    attempt: failureCount,
    maxRetries: UI.queryRetries,
    status: e.status,
    requestId: e.requestId,
    message: e.message,
  });
  return true;
}

/** True for failures worth another attempt (no response, rate limited, gateway or availability). */
export function isTransient(error: unknown): boolean {
  return error instanceof ApiError && TRANSIENT.has(error.status);
}

/** Delay before retry number `attempt` (1-based): UI.retryDelayMs, doubled each time. */
export function retryDelay(attempt: number): number {
  return UI.retryDelayMs * 2 ** Math.max(0, attempt - 1);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: (failureCount) => retryDelay(failureCount),
        refetchOnWindowFocus: false,
      },
      // A mutation changes data; repeating it is the user's decision, never automatic.
      mutations: { retry: false },
    },
  });
}
