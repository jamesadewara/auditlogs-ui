/**
 * Client-side form checks. They give instant feedback for the obvious cases
 * and mirror the services' fixed formats (slug pattern, lengths of stored
 * columns). Rules the services make configurable (password minimum length,
 * retention bounds) are not duplicated here: the server checks them and its
 * message is shown on the field.
 */
import { useMemo, useState } from "react";

type Rule<V> = (value: V[keyof V], all: V) => string | undefined;
export type Rules<V> = Partial<{ [K in keyof V]: Rule<V> }>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG = /^[a-z0-9-]+$/;

/** Column limits from the auth-api schema (fixed by the database, not configuration). */
export const LIMITS = {
  title: 255,
  slug: 100,
  externalRef: 255,
  accountKeyName: 255,
  businessName: 255,
} as const;

export const v = {
  required: (label: string) => (x: unknown) =>
    String(x ?? "").trim() ? undefined : `Enter ${label}.`,
  email: (x: unknown) => {
    const s = String(x ?? "").trim();
    if (!s) return "Enter your email.";
    return EMAIL.test(s) ? undefined : "Enter a valid email address, like ada@example.com.";
  },
  text:
    (label: string, min: number, max: number, optional = false) =>
    (x: unknown) => {
      const s = String(x ?? "").trim();
      if (!s) return optional ? undefined : `Enter ${label}.`;
      if (s.length < min)
        return `${label[0].toUpperCase()}${label.slice(1)} must be at least ${min} characters.`;
      if (s.length > max)
        return `${label[0].toUpperCase()}${label.slice(1)} must be ${max} characters or fewer.`;
      return undefined;
    },
  slug: (x: unknown) => {
    const s = String(x ?? "");
    if (!s) return "Enter a slug.";
    if (s.length < 2) return "Slug must be at least 2 characters.";
    if (s.length > LIMITS.slug) return `Slug must be ${LIMITS.slug} characters or fewer.`;
    return SLUG.test(s) ? undefined : "Use lowercase letters, numbers and hyphens only.";
  },
  positiveWholeNumber: (label: string) => (x: unknown) => {
    const s = String(x ?? "").trim();
    if (!s) return `Enter ${label}.`;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 1)
      return `${label[0].toUpperCase()}${label.slice(1)} must be a whole number of at least 1.`;
    return undefined;
  },
};

export function useValidatedForm<V extends Record<string, unknown>>(initial: V, rules: Rules<V>) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof V, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  /** Errors returned by the server for specific fields, cleared when the field changes. */
  const [serverErrors, setServerErrors] = useState<Partial<Record<keyof V, string>>>({});
  const errors = useMemo(() => {
    const out: Partial<Record<keyof V, string>> = {};
    for (const k in rules) {
      const msg = rules[k]?.(values[k], values);
      if (msg) out[k] = msg;
    }
    return out;
  }, [values, rules]);
  const valid = Object.keys(errors).length === 0;
  const set = <K extends keyof V>(k: K, value: V[K]) => {
    setValues((p) => ({ ...p, [k]: value }));
    setServerErrors((p) => ({ ...p, [k]: undefined }));
  };
  const touch = (k: keyof V) => setTouched((p) => ({ ...p, [k]: true }));
  const error = (k: keyof V) =>
    serverErrors[k] ?? (touched[k] || submitted ? errors[k] : undefined);
  const bind = (k: keyof V) => ({
    value: String(values[k] ?? ""),
    onBlur: () => touch(k),
    "aria-invalid": !!error(k) || undefined,
  });
  const submit = (onValid: (values: V) => void | Promise<void>) => (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!valid) {
      const first = Object.keys(errors)[0];
      (e.currentTarget as HTMLFormElement).querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    void onValid(values);
  };
  const reset = (next: V) => {
    setValues(next);
    setTouched({});
    setSubmitted(false);
    setServerErrors({});
  };
  /** Show server field errors (ApiError.fields) next to the matching inputs; returns true if any matched. */
  const applyServerErrors = (fields: Record<string, string>) => {
    const matched: Partial<Record<keyof V, string>> = {};
    for (const [k, msg] of Object.entries(fields)) if (k in values) matched[k as keyof V] = msg;
    setServerErrors(matched);
    return Object.keys(matched).length > 0;
  };
  return {
    values,
    set,
    touch,
    errors,
    error,
    valid,
    bind,
    submit,
    submitted,
    reset,
    applyServerErrors,
  };
}
