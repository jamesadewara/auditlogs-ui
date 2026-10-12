/**
 * Service base URLs, from Vite environment variables (see .env.example).
 * Both are required: a missing value stops the app with a clear message
 * instead of silently calling a guessed address.
 */

function required(name: "VITE_AUTH_API_URL" | "VITE_AUDIT_API_URL"): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and set it to the service's base URL.`,
    );
  }
  return value.trim().replace(/\/+$/, "");
}

export const AUTH_API_URL = required("VITE_AUTH_API_URL");
export const AUDIT_API_URL = required("VITE_AUDIT_API_URL");
