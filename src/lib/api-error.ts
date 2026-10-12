/**
 * One error type for every failed API call, built from either service's error
 * body:
 *   auth-api: { detail: string | [{ loc, msg }], request_id }
 *   Go (Huma, RFC 9457): { title, status, detail, errors: [{ location, message }] }
 * The message is always something a person can act on; field errors are kept
 * so forms can show them next to the right input.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly requestId: string | null;
  /** Field name (last path segment) to message, when the server named fields. */
  readonly fields: Record<string, string>;

  constructor(
    status: number,
    message: string,
    requestId: string | null,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
    this.fields = fields;
  }
}

type Detail = { loc?: unknown[]; msg?: unknown; location?: unknown; message?: unknown };

function fieldName(path: unknown): string | null {
  if (Array.isArray(path) && path.length > 0) return String(path[path.length - 1]);
  if (typeof path === "string" && path) return path.split(".").pop() ?? null;
  return null;
}

/** Build an ApiError from a non-2xx response body (already parsed if JSON). */
export function toApiError(
  status: number,
  body: unknown,
  requestId: string | null,
  fallback: string,
): ApiError {
  const fields: Record<string, string> = {};
  let message: string | null = null;

  if (body && typeof body === "object") {
    const b = body as { detail?: unknown; title?: unknown; errors?: unknown; request_id?: unknown };
    const rid = typeof b.request_id === "string" ? b.request_id : requestId;
    const list = Array.isArray(b.detail) ? b.detail : Array.isArray(b.errors) ? b.errors : [];
    for (const item of list as Detail[]) {
      const name = fieldName(item.loc ?? item.location);
      const msg =
        typeof item.msg === "string"
          ? item.msg
          : typeof item.message === "string"
            ? item.message
            : null;
      if (name && msg && !(name in fields)) fields[name] = msg;
    }
    if (typeof b.detail === "string" && b.detail) message = b.detail;
    else if (Object.keys(fields).length > 0) {
      message = Object.entries(fields)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
    } else if (typeof b.title === "string" && b.title) message = b.title;
    return new ApiError(status, message ?? fallback, rid, fields);
  }
  if (typeof body === "string" && body.trim() && body.length < 300) message = body.trim();
  return new ApiError(status, message ?? fallback, requestId, fields);
}

/** A readable message for anything thrown, including the request id when there is one. */
export function errorMessage(e: unknown, fallback = "Something went wrong."): string {
  if (e instanceof ApiError)
    return e.requestId ? `${e.message} (request ${e.requestId})` : e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
