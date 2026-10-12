/**
 * Calls for audits, keys and events.
 *
 * auth-api (control plane) owns audits, audit keys and account keys; paths take
 * an audit slug or id. The Go audit service owns events, verification,
 * checkpoints, stats and activity; paths take the slug. Both check that the
 * signed-in user's business owns the audit and answer 404 otherwise.
 */
import { request, requestNoContent, requestStream } from "@/lib/http-client";
import {
  AccountKeyCreatedSchema,
  AccountKeyPageSchema,
  ActivitySchema,
  AuditKeyCreatedSchema,
  ActionPageSchema,
  ActorPageSchema,
  AuditKeyPageSchema,
  AuditPageSchema,
  AuditSchema,
  AuditWithKeysSchema,
  CheckpointKeysSchema,
  CheckpointPageSchema,
  EventPageSchema,
  EventSchema,
  StatsSchema,
  VerificationSchema,
  type AccountKeyScope,
  type Outcome,
} from "@/lib/schemas";

const enc = encodeURIComponent;

// ── Audits (auth-api) ────────────────────────────────────────────────────────

/** Server-side filters for the audits list (absent means not filtered). */
export interface AuditListFilters {
  /** Text in the title or slug, any case. */
  q?: string;
  status?: "active" | "archived";
  /** Exact tag. */
  tag?: string;
}

export const listAudits = (filters: AuditListFilters, page: number, pageSize: number) =>
  request(
    {
      service: "auth",
      path: "/v1/audits",
      query: { ...filters, page, page_size: pageSize },
      errorMessage: "Could not load audits.",
    },
    AuditPageSchema,
  );

export const getAudit = (slug: string) =>
  request(
    {
      service: "auth",
      path: `/v1/audits/${enc(slug)}`,
      errorMessage: "Could not load this audit.",
    },
    AuditSchema,
  );

export interface CreateAuditPayload {
  title: string;
  slug: string;
  description: string | null;
  tags: string[];
  retention_days: number;
  external_ref: string | null;
}

export const createAudit = (payload: CreateAuditPayload) =>
  request(
    {
      service: "auth",
      path: "/v1/audits",
      method: "POST",
      body: payload,
      errorMessage: "Could not create the audit.",
    },
    AuditWithKeysSchema,
  );

export interface UpdateAuditPayload {
  title?: string;
  description?: string | null;
  tags?: string[];
  retention_days?: number;
}

export const updateAudit = (slug: string, payload: UpdateAuditPayload) =>
  request(
    {
      service: "auth",
      path: `/v1/audits/${enc(slug)}`,
      method: "PATCH",
      body: payload,
      errorMessage: "Could not save changes.",
    },
    AuditSchema,
  );

export const archiveAudit = (slug: string) =>
  request(
    {
      service: "auth",
      path: `/v1/audits/${enc(slug)}/archive`,
      method: "POST",
      errorMessage: "Could not archive the audit.",
    },
    AuditSchema,
  );

export const unarchiveAudit = (slug: string) =>
  request(
    {
      service: "auth",
      path: `/v1/audits/${enc(slug)}/unarchive`,
      method: "POST",
      errorMessage: "Could not restore the audit.",
    },
    AuditSchema,
  );

// ── Audit keys (auth-api) ────────────────────────────────────────────────────

export const listAuditKeys = (slug: string, page: number, pageSize: number) =>
  request(
    {
      service: "auth",
      path: `/v1/audits/${enc(slug)}/keys`,
      query: { page, page_size: pageSize },
      errorMessage: "Could not load keys.",
    },
    AuditKeyPageSchema,
  );

export const issueAuditKey = (slug: string, type: "write" | "read") =>
  request(
    {
      service: "auth",
      path: `/v1/audits/${enc(slug)}/keys`,
      method: "POST",
      body: { type },
      errorMessage: "Could not issue the key.",
    },
    AuditKeyCreatedSchema,
  );

export const rotateAuditKey = (slug: string, keyId: string) =>
  request(
    {
      service: "auth",
      path: `/v1/audits/${enc(slug)}/keys/${enc(keyId)}/rotate`,
      method: "POST",
      errorMessage: "Could not rotate the key.",
    },
    AuditKeyCreatedSchema,
  );

export const revokeAuditKey = (slug: string, keyId: string) =>
  requestNoContent({
    service: "auth",
    path: `/v1/audits/${enc(slug)}/keys/${enc(keyId)}`,
    method: "DELETE",
    errorMessage: "Could not revoke the key.",
  });

// ── Account keys (auth-api) ──────────────────────────────────────────────────

export const listAccountKeys = (page: number, pageSize: number) =>
  request(
    {
      service: "auth",
      path: "/v1/account-keys",
      query: { page, page_size: pageSize },
      errorMessage: "Could not load account keys.",
    },
    AccountKeyPageSchema,
  );

export interface CreateAccountKeyPayload {
  name: string;
  scopes: AccountKeyScope[];
  expires_in_days: number | null;
}

export const createAccountKey = (payload: CreateAccountKeyPayload) =>
  request(
    {
      service: "auth",
      path: "/v1/account-keys",
      method: "POST",
      body: payload,
      errorMessage: "Could not create the account key.",
    },
    AccountKeyCreatedSchema,
  );

export const revokeAccountKey = (keyId: string) =>
  requestNoContent({
    service: "auth",
    path: `/v1/account-keys/${enc(keyId)}`,
    method: "DELETE",
    errorMessage: "Could not revoke the account key.",
  });

// ── Events, verification, checkpoints (Go service) ───────────────────────────

export interface EventFilters {
  actor_id?: string;
  action?: string;
  outcome?: Outcome;
  /** RFC 3339 */
  start_time?: string;
  /** RFC 3339 */
  end_time?: string;
}

export const listEvents = (slug: string, filters: EventFilters, page: number, pageSize: number) =>
  request(
    {
      service: "audit",
      path: `/v1/audits/${enc(slug)}/events`,
      query: { ...filters, page, page_size: pageSize },
      errorMessage: "Could not load events.",
    },
    EventPageSchema,
  );

export const getEvent = (slug: string, seq: number) =>
  request(
    {
      service: "audit",
      path: `/v1/audits/${enc(slug)}/events/${seq}`,
      errorMessage: `Could not load event #${seq}.`,
    },
    EventSchema,
  );

/**
 * Every event matching filters (the same filters as listEvents), oldest first,
 * as a streamed CSV with every field. Read the body with readStream.
 */
export const exportEventsCsv = (slug: string, filters: EventFilters) =>
  requestStream({
    service: "audit",
    path: `/v1/audits/${enc(slug)}/events/export.csv`,
    query: { ...filters },
    errorMessage: "Could not export events.",
  });

export const verifyAudit = (slug: string) =>
  request(
    {
      service: "audit",
      path: `/v1/audits/${enc(slug)}/verify`,
      errorMessage: "Verification could not run.",
    },
    VerificationSchema,
  );

export const listCheckpoints = (slug: string, page: number, pageSize: number) =>
  request(
    {
      service: "audit",
      path: `/v1/audits/${enc(slug)}/checkpoints`,
      query: { page, page_size: pageSize },
      errorMessage: "Could not load checkpoints.",
    },
    CheckpointPageSchema,
  );

export const listCheckpointKeys = () =>
  request(
    {
      service: "audit",
      path: "/v1/checkpoint-keys",
      errorMessage: "Could not load the checkpoint public keys.",
    },
    CheckpointKeysSchema,
  );

export const getStats = (slug: string) =>
  request(
    {
      service: "audit",
      path: `/v1/audits/${enc(slug)}/stats`,
      errorMessage: "Could not load audit statistics.",
    },
    StatsSchema,
  );

export const getActivity = (slug: string, days: number, top: number) =>
  request(
    {
      service: "audit",
      path: `/v1/audits/${enc(slug)}/activity`,
      query: { days, top },
      errorMessage: "Could not load activity.",
    },
    ActivitySchema,
  );

/** Every actor in the last `days` UTC days, most active first, one page at a time. */
export const listActors = (slug: string, days: number, page: number, pageSize: number) =>
  request(
    {
      service: "audit",
      path: `/v1/audits/${enc(slug)}/activity/actors`,
      query: { days, page, page_size: pageSize },
      errorMessage: "Could not load actors.",
    },
    ActorPageSchema,
  );

/** Every action in the last `days` UTC days, most frequent first, one page at a time. */
export const listActions = (slug: string, days: number, page: number, pageSize: number) =>
  request(
    {
      service: "audit",
      path: `/v1/audits/${enc(slug)}/activity/actions`,
      query: { days, page, page_size: pageSize },
      errorMessage: "Could not load actions.",
    },
    ActionPageSchema,
  );
