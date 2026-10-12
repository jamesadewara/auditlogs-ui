/**
 * HTTP client for both services.
 *
 * - Sends the in-memory access token as a Bearer token.
 * - On a 401 it refreshes once (POST /v1/auth/refresh with the httpOnly
 *   cookie, single flight shared by concurrent requests) and retries; if the
 *   refresh fails the session is over and the unauthenticated handler runs.
 * - Every successful JSON response is checked against a zod schema, so the UI
 *   never renders data whose shape it did not expect.
 * - Every failure is an ApiError with the server's own message.
 */
import type { z } from "zod";

import { ApiError, toApiError } from "@/lib/api-error";
import { AUDIT_API_URL, AUTH_API_URL } from "@/lib/env";
import { tokenStore } from "@/lib/token-store";
import { TokenResponseSchema } from "@/lib/schemas";
import { UI } from "@/lib/ui-config";

type ServiceName = "auth" | "audit";
type Method = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions {
  service: ServiceName;
  path: string;
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Message used when the server's error body has none. */
  errorMessage: string;
}

const baseUrl = (service: ServiceName) => (service === "audit" ? AUDIT_API_URL : AUTH_API_URL);

function buildUrl(opts: RequestOptions): string {
  const url = new URL(opts.path, `${baseUrl(opts.service)}/`);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  return url.toString();
}

let onUnauthenticated: (() => void) | null = null;

/** Called when the session cannot be refreshed; the root route sends the user to sign in. */
export function setUnauthenticatedHandler(handler: () => void): void {
  onUnauthenticated = handler;
}

/**
 * One fetch. The timeout normally covers the whole exchange, body included.
 * For a stream it covers only the wait for the response to start, so a long
 * download is not cut off; readStream then bounds each gap between chunks.
 */
async function rawFetch(
  opts: RequestOptions,
  token: string | null,
  stream = false,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const serviceName = opts.service === "auth" ? "account" : "audit";
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    UI.requestTimeoutMs,
  );
  try {
    const res = await fetch(buildUrl(opts), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      // Needed for the auth-api refresh cookie; harmless for the audit service.
      credentials: opts.service === "auth" ? "include" : "omit",
      signal: controller.signal,
    });
    if (stream) clearTimeout(timer);
    return res;
  } catch (e) {
    // fetch rejects without a status for network failures, for responses the
    // browser blocked (CORS) and when the timeout fires. Log the URL and cause.
    console.error("Request failed before a response arrived", {
      service: opts.service,
      url: buildUrl(opts),
      cause: e,
    });
    if (e instanceof DOMException && e.name === "TimeoutError") {
      throw new ApiError(
        0,
        `The ${serviceName} service did not answer within ${UI.requestTimeoutMs / 1000} seconds. Check that it is running, then try again.`,
        null,
      );
    }
    throw new ApiError(
      0,
      `Cannot reach the ${opts.service === "auth" ? "account" : "audit"} service. Check your connection and try again.`,
      null,
    );
  }
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ── Session refresh ──────────────────────────────────────────────────────────

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchange the refresh cookie for a new access token. Resolves true on
 * success and false only when the service says there is no valid session
 * (401). Any other failure (rate limit, server error, timeout) is thrown, so
 * it is retried or shown instead of being mistaken for "signed out".
 * Concurrent callers share one request, because a refresh token can be used
 * only once.
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const res = await rawFetch(
        { service: "auth", path: "/v1/auth/refresh", method: "POST", errorMessage: "" },
        null,
      );
      if (res.status === 401) {
        tokenStore.clear();
        return false;
      }
      if (!res.ok) {
        throw toApiError(
          res.status,
          await readBody(res),
          res.headers.get("X-Request-ID"),
          "Could not restore your session.",
        );
      }
      const parsed = TokenResponseSchema.safeParse(await readBody(res));
      if (!parsed.success) {
        tokenStore.clear();
        throw new ApiError(
          res.status,
          "The account service returned an unexpected session response.",
          null,
        );
      }
      tokenStore.setAccessToken(parsed.data.access_token);
      return true;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// ── Requests ─────────────────────────────────────────────────────────────────

async function send(opts: RequestOptions, stream = false): Promise<Response> {
  const res = await rawFetch(opts, tokenStore.getAccessToken(), stream);
  if (res.status !== 401 || opts.path === "/v1/auth/login" || opts.path === "/v1/auth/register")
    return res;

  const refreshed = await refreshSession();
  if (!refreshed) {
    onUnauthenticated?.();
    return res;
  }
  return rawFetch(opts, tokenStore.getAccessToken(), stream);
}

/** Request a JSON body and validate it against schema. */
export async function request<S extends z.ZodTypeAny>(
  opts: RequestOptions,
  schema: S,
): Promise<z.infer<S>> {
  const res = await send(opts);
  const body = await readBody(res);
  if (!res.ok)
    throw toApiError(res.status, body, res.headers.get("X-Request-ID"), opts.errorMessage);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error(`Unexpected response from ${opts.service} ${opts.path}`, parsed.error.issues);
    throw new ApiError(
      res.status,
      `${opts.errorMessage} (the service returned an unexpected response).`,
      res.headers.get("X-Request-ID"),
    );
  }
  return parsed.data;
}

/** Request that answers 204 No Content. */
export async function requestNoContent(opts: RequestOptions): Promise<void> {
  const res = await send(opts);
  if (res.status === 204) return;
  const body = await readBody(res);
  if (!res.ok)
    throw toApiError(res.status, body, res.headers.get("X-Request-ID"), opts.errorMessage);
  throw new ApiError(
    res.status,
    `${opts.errorMessage} (expected no content, got status ${res.status}).`,
    null,
  );
}

/**
 * Request a file to stream to disk (the CSV export). Returns the response once
 * it has started with a success status; read its body with readStream.
 */
export async function requestStream(opts: RequestOptions): Promise<Response> {
  const res = await send(opts, true);
  if (!res.ok)
    throw toApiError(
      res.status,
      await readBody(res),
      res.headers.get("X-Request-ID"),
      opts.errorMessage,
    );
  if (!res.body)
    throw new ApiError(
      res.status,
      `${opts.errorMessage} (the service sent no file).`,
      res.headers.get("X-Request-ID"),
    );
  return res;
}

/**
 * Hand each chunk of a streamed body to onChunk. Fails if the service goes
 * quiet for longer than UI.downloadIdleTimeoutMs or the connection breaks
 * before the end (the audit service aborts a CSV export it cannot finish), so
 * an incomplete file is never reported as complete.
 */
export async function readStream(
  res: Response,
  onChunk: (chunk: Uint8Array) => Promise<void> | void,
): Promise<void> {
  if (!res.body) throw new ApiError(res.status, "The download had no content.", null);
  const reader = res.body.getReader();
  const requestId = res.headers.get("X-Request-ID");
  for (;;) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stalled = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new ApiError(
              0,
              `The download stalled: no data arrived for ${UI.downloadIdleTimeoutMs / 1000} seconds. No file was saved; try again.`,
              requestId,
            ),
          ),
        UI.downloadIdleTimeoutMs,
      );
    });
    let step: ReadableStreamReadResult<Uint8Array>;
    try {
      step = await Promise.race([reader.read(), stalled]);
    } catch (e) {
      await reader.cancel().catch((cancelError: unknown) => {
        console.error("Could not cancel the stalled or broken download", cancelError);
      });
      if (e instanceof ApiError) throw e;
      console.error("Download interrupted", { url: res.url, cause: e });
      throw new ApiError(
        0,
        "The download was interrupted before it finished. No file was saved; try again.",
        requestId,
      );
    } finally {
      clearTimeout(timer);
    }
    if (step.done) return;
    await onChunk(step.value);
  }
}
