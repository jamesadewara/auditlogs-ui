/**
 * Runtime schemas for every response the dashboard reads, written from the
 * services' actual contracts (auth-api Pydantic models, Go Huma types).
 * Unknown extra fields (such as Huma's "$schema") are ignored; missing or
 * mistyped fields make the request fail with a clear error instead of
 * rendering wrong data.
 */
import { z } from "zod";

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "not an ISO date");

// ── auth-api ─────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  business_id: z.string(),
  business_name: z.string(),
  created_at: isoDate,
});
export type User = z.infer<typeof UserSchema>;

export const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().positive(),
  user: UserSchema,
});
export type TokenResponse = z.infer<typeof TokenResponseSchema>;

const AuditStatus = z.enum(["active", "archived"]);

export const AuditSchema = z.object({
  id: z.string(),
  business_id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  retention_days: z.number().int().positive(),
  external_ref: z.string().nullable(),
  compliance_frameworks: z.array(z.string()),
  rate_limit_tier: z.string(),
  status: AuditStatus,
  created_at: isoDate,
  updated_at: isoDate,
  created_by: z.string().nullable(),
  created_by_key_id: z.string().nullable(),
});
export type Audit = z.infer<typeof AuditSchema>;
/** GET /v1/audits: one page of the business's audits. */
export const AuditPageSchema = pageOf(AuditSchema);

export const AuditWithKeysSchema = z.object({
  audit: AuditSchema,
  created: z.boolean(),
  write_key: z.string().nullable(),
  read_key: z.string().nullable(),
});

const KeyStatus = z.enum(["active", "revoked"]);

const AuditKeySchema = z.object({
  id: z.string(),
  audit_id: z.string(),
  type: z.enum(["write", "read"]),
  last4: z.string(),
  status: KeyStatus,
  created_at: isoDate,
  revoked_at: isoDate.nullable(),
});
export type AuditKey = z.infer<typeof AuditKeySchema>;
export const AuditKeyPageSchema = pageOf(AuditKeySchema);
export const AuditKeyCreatedSchema = AuditKeySchema.extend({ key: z.string().min(1) });

const ACCOUNT_KEY_SCOPES = [
  "audits:create",
  "audits:manage",
  "keys:write:issue",
  "keys:read:issue",
] as const;
export type AccountKeyScope = (typeof ACCOUNT_KEY_SCOPES)[number];

const AccountKeySchema = z.object({
  id: z.string(),
  business_id: z.string(),
  name: z.string(),
  last4: z.string(),
  scopes: z.array(z.enum(ACCOUNT_KEY_SCOPES)),
  status: KeyStatus,
  created_at: isoDate,
  expires_at: isoDate.nullable(),
  revoked_at: isoDate.nullable(),
});
export type AccountKey = z.infer<typeof AccountKeySchema>;
export const AccountKeyPageSchema = pageOf(AccountKeySchema);
export const AccountKeyCreatedSchema = AccountKeySchema.extend({ key: z.string().min(1) });

// ── Go audit service ─────────────────────────────────────────────────────────

/** The list envelope both services use for every list endpoint. */
function pageOf<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    results: z.array(item),
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    total_pages: z.number().int().nonnegative(),
  });
}

export const Outcome = z.enum(["success", "failure", "unknown"]);
export type Outcome = z.infer<typeof Outcome>;

export const EventSchema = z.object({
  id: z.string(),
  audit_id: z.string(),
  seq: z.number().int().positive(),
  actor: z.object({
    type: z.string(),
    id: z.string(),
    /** Human-readable name or email of the actor at the time. */
    name: z.string().optional(),
    ip: z.string().optional(),
    user_agent: z.string().optional(),
    /** Who the actor acted for, for example during support access. */
    on_behalf_of: z.object({ type: z.string(), id: z.string() }).optional(),
  }),
  action: z.string(),
  outcome: Outcome,
  summary: z.string().optional(),
  /** Why: a failure reason or a justification. */
  reason: z.string().optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  resource_name: z.string().optional(),
  /** Application or service that emitted the event. */
  source_service: z.string().optional(),
  session_id: z.string().optional(),
  changes: z.record(z.unknown()),
  request_id: z.string().optional(),
  idempotency_key: z.string().optional(),
  metadata: z.record(z.unknown()),
  prev_hash: z.string().optional(),
  hash: z.string(),
  canonical_payload: z.string(),
  occurred_at: isoDate,
  recorded_at: isoDate,
});
export type AuditEvent = z.infer<typeof EventSchema>;
export const EventPageSchema = pageOf(EventSchema);

export const FailureKind = z.enum([
  "GAP",
  "BROKEN_LINK",
  "MODIFIED",
  "BAD_CHECKPOINT",
  "CHECKPOINT_MISMATCH",
  "TRUNCATED",
  "BAD_ANCHOR",
]);
export type FailureKind = z.infer<typeof FailureKind>;

export const VerificationSchema = z.object({
  status: z.enum(["INTACT", "TAMPERED"]),
  slug: z.string(),
  audit_id: z.string(),
  events_checked: z.number().int().nonnegative(),
  first_sequence: z.number().int().nonnegative(),
  last_sequence: z.number().int().nonnegative(),
  last_hash: z.string(),
  checkpoints_checked: z.number().int().nonnegative(),
  /** Checkpoints whose RFC 3161 timestamp verified, and checkpoints with none yet. */
  anchors_checked: z.number().int().nonnegative(),
  checkpoints_unanchored: z.number().int().nonnegative(),
  anchor: z
    .object({ last_seq: z.number(), last_hash: z.string(), first_retained_seq: z.number() })
    .optional(),
  failure: z
    .object({
      kind: FailureKind,
      seq: z.number().int(),
      expected_hash: z.string().optional(),
      found_hash: z.string().optional(),
      message: z.string(),
      /** For an edited column: its name, its value now and the value in the hashed record. */
      column: z.string().optional(),
      stored_value: z.string().optional(),
      expected_value: z.string().optional(),
      /** The event stored at seq, when there is one (not for a gap or truncation). */
      event: z
        .object({
          id: z.string(),
          seq: z.number().int(),
          action: z.string(),
          actor_type: z.string(),
          actor_id: z.string(),
          occurred_at: isoDate,
          recorded_at: isoDate,
        })
        .optional(),
      /**
       * What the database recorded about who changed the record. Empty means
       * no record was found (made before capture existed, or capture disabled first).
       */
      evidence: z.array(
        z.object({
          captured_at: isoDate,
          table: z.string(),
          operation: z.enum(["INSERT", "UPDATE", "DELETE", "TRUNCATE"]),
          changed_columns: z.array(z.string()),
          old_values: z.record(z.unknown()).optional(),
          new_values: z.record(z.unknown()).optional(),
          db_login: z.string(),
          db_role: z.string(),
          /** Null when the client connected over a local socket. */
          client_addr: z.string().nullable(),
          client_port: z.number().int().nullable(),
          application_name: z.string(),
          backend_pid: z.number().int(),
          transaction_id: z.number().int(),
          triggers_bypassed: z.boolean(),
          statement: z.string().nullable(),
        }),
      ),
    })
    .optional(),
});
export type Verification = z.infer<typeof VerificationSchema>;
export type VerificationFailure = NonNullable<Verification["failure"]>;

const CheckpointSchema = z.object({
  id: z.string(),
  audit_id: z.string(),
  kind: z.enum(["periodic", "retention"]),
  last_seq: z.number().int().positive(),
  last_hash: z.string(),
  first_retained_seq: z.number().int().positive().optional(),
  signature: z.string(),
  key_id: z.string(),
  signed_at: isoDate,
  created_at: isoDate,
  /** The independent RFC 3161 timestamp, once the worker has obtained it. */
  timestamp: z
    .object({ tsa_url: z.string(), gen_time: isoDate, tsa_response: z.string() })
    .optional(),
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;
export const CheckpointPageSchema = pageOf(CheckpointSchema);

export const CheckpointKeysSchema = z.object({
  keys: z.array(
    z.object({ key_id: z.string(), algorithm: z.literal("Ed25519"), public_key: z.string() }),
  ),
});

export const StatsSchema = z.object({
  slug: z.string(),
  audit_id: z.string(),
  total_events: z.number().int().nonnegative(),
  last_sequence: z.number().int().nonnegative(),
  last_hash: z.string(),
  retention_days: z.number().int().positive(),
  last_event_at: isoDate.optional(),
  last_checkpoint_at: isoDate.optional(),
  last_checkpoint_seq: z.number().int().optional(),
});

const ActivityActionSchema = z.object({ action: z.string(), count: z.number() });
const ActivityActorSchema = z.object({
  actor_type: z.string(),
  actor_id: z.string(),
  count: z.number(),
  failures: z.number(),
});
export type ActivityActor = z.infer<typeof ActivityActorSchema>;
export type ActivityAction = z.infer<typeof ActivityActionSchema>;
/** The full rankings behind the overview's top lists. */
export const ActorPageSchema = pageOf(ActivityActorSchema);
export const ActionPageSchema = pageOf(ActivityActionSchema);

export const ActivitySchema = z.object({
  slug: z.string(),
  first_day: z.string(),
  last_day: z.string(),
  days: z.array(
    z.object({ date: z.string(), success: z.number(), failure: z.number(), unknown: z.number() }),
  ),
  top_actions: z.array(ActivityActionSchema),
  top_actors: z.array(ActivityActorSchema),
});
