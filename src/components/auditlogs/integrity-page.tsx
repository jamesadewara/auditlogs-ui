import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useCheckpointKeys, useCheckpoints, useVerify } from "@/hooks/useAudit";
import { downloadText, formatDateTime, shortHash } from "@/lib/helpers";
import type {
  Audit,
  Checkpoint,
  FailureKind,
  Verification,
  VerificationFailure,
} from "@/lib/schemas";
import {
  CodeBlock,
  CopyButton,
  DataTable,
  InlineError,
  Mono,
  Pager,
  Panel,
  SkeletonRows,
  StatusText,
  errorMessage,
} from "./common";

/** What each verifier finding means, in plain words. */
const failureText: Record<FailureKind, { title: string; meaning: string }> = {
  GAP: {
    title: "Missing events",
    meaning: "An event that should be at this sequence number is not stored. Events were deleted.",
  },
  BROKEN_LINK: {
    title: "Broken link",
    meaning:
      "This event does not point at the hash of the event before it. Events were removed, inserted or reordered.",
  },
  MODIFIED: {
    title: "Modified event",
    meaning:
      "The stored content of this event no longer produces its recorded hash. The event was edited after it was written.",
  },
  BAD_CHECKPOINT: {
    title: "Invalid checkpoint",
    meaning:
      "A checkpoint's signature does not verify with any trusted key. It was forged or altered.",
  },
  CHECKPOINT_MISMATCH: {
    title: "History rewritten",
    meaning:
      "A signed checkpoint records a different hash for this point in the chain. Events up to here were changed and their hashes recomputed.",
  },
  TRUNCATED: {
    title: "Newest events deleted",
    meaning:
      "A signed checkpoint covers events that are no longer stored. The end of the chain was cut off.",
  },
  BAD_ANCHOR: {
    title: "Checkpoint timestamp does not match",
    meaning:
      "A checkpoint's independent timestamp is invalid, belongs to something else, or was issued long after the checkpoint was signed. The history may have been re-signed after the fact.",
  },
};

/**
 * Where the finding is and what changed: the event as stored now and, for an
 * edited column, its value now beside the value in the hashed record.
 */
export function FindingDetails({ f }: { f: VerificationFailure }) {
  return (
    <div className="space-y-3">
      <WhatChanged f={f} />
      <WhoChanged f={f} />
    </div>
  );
}

const notFound = <span className="text-muted-foreground">Not found</span>;
const show = (v: unknown) =>
  v === undefined ? "(not set)" : typeof v === "string" ? v : JSON.stringify(v);

/**
 * Who made the change, from the database's tamper evidence: the login, the
 * client address, the application and the statement. Anything that could not
 * be captured says "Not found".
 */
function WhoChanged({ f }: { f: VerificationFailure }) {
  const latest = f.evidence[f.evidence.length - 1];
  if (!latest) {
    return (
      <dl className="grid gap-x-6 gap-y-2 rounded-md border px-4 py-3 text-sm md:grid-cols-[160px_1fr]">
        <dt className="text-muted-foreground">Who made the change</dt>
        <dd>
          {notFound}. The database has no record of this change: it was made before change capture
          existed, or by someone who switched capture off first.
        </dd>
      </dl>
    );
  }
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-md border px-4 py-3 text-sm md:grid-cols-[160px_1fr]">
      <dt className="text-muted-foreground">Who made the change</dt>
      <dd>
        Database login <Mono>{latest.db_login}</Mono>
        {latest.db_role !== latest.db_login && (
          <>
            {" "}
            acting as <Mono>{latest.db_role}</Mono>
          </>
        )}
      </dd>
      <dt className="text-muted-foreground">From IP address</dt>
      <dd>
        {latest.client_addr ? (
          <Mono>
            {latest.client_addr}
            {latest.client_port !== null ? ` port ${latest.client_port}` : ""}
          </Mono>
        ) : (
          <span className="text-muted-foreground">Not found (connected over a local socket)</span>
        )}
      </dd>
      <dt className="text-muted-foreground">Application</dt>
      <dd>{latest.application_name ? <Mono>{latest.application_name}</Mono> : notFound}</dd>
      <dt className="text-muted-foreground">When</dt>
      <dd>{formatDateTime(latest.captured_at)}</dd>
      <dt className="text-muted-foreground">Protection</dt>
      <dd>
        {latest.triggers_bypassed
          ? "The append-only protection was switched off for this change."
          : "The change was made without switching the protection off."}
      </dd>
      {latest.operation === "UPDATE" && latest.changed_columns.length > 0 && (
        <>
          <dt className="text-muted-foreground">Edited</dt>
          <dd className="min-w-0 space-y-1">
            {latest.changed_columns.map((c) => (
              <div key={c} className="break-all font-mono text-[13px]">
                {c}: {show(latest.old_values?.[c])} {"->"} {show(latest.new_values?.[c])}
              </div>
            ))}
          </dd>
        </>
      )}
      <dt className="text-muted-foreground">Statement</dt>
      <dd className="min-w-0 break-all font-mono text-[13px]">{latest.statement ?? notFound}</dd>
      {f.evidence.length > 1 && (
        <>
          <dt className="text-muted-foreground">Earlier changes</dt>
          <dd>
            {(f.evidence.length - 1).toLocaleString()} more recorded change
            {f.evidence.length > 2 ? "s" : ""} to this record (in the downloaded report).
          </dd>
        </>
      )}
    </dl>
  );
}

function WhatChanged({ f }: { f: VerificationFailure }) {
  if (!f.event && !f.column) return null;
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-md border bg-danger-soft px-4 py-3 text-sm md:grid-cols-[160px_1fr]">
      {f.event && (
        <>
          <dt className="text-muted-foreground">Event</dt>
          <dd className="min-w-0 break-words">
            <Mono>{f.event.action}</Mono> by <Mono>{f.event.actor_id}</Mono> ({f.event.actor_type}),{" "}
            {formatDateTime(f.event.occurred_at)}
          </dd>
        </>
      )}
      {f.column && (
        <>
          <dt className="text-muted-foreground">Changed field</dt>
          <dd>
            <Mono>{f.column}</Mono>
          </dd>
          <dt className="text-muted-foreground">Value now</dt>
          <dd className="min-w-0 break-all font-mono text-[13px]">{f.stored_value}</dd>
          <dt className="text-muted-foreground">Original value</dt>
          <dd className="min-w-0 break-all font-mono text-[13px]">{f.expected_value}</dd>
        </>
      )}
    </dl>
  );
}

function Result({ audit, r }: { audit: Audit; r: Verification }) {
  if (r.status === "INTACT") {
    return (
      <div className="space-y-1">
        <StatusText value="intact" label="Intact" />
        <p className="text-text-secondary">
          {r.events_checked === 0 ? (
            "No events are stored yet, so there is nothing to recompute."
          ) : (
            <>
              Recomputed {r.events_checked.toLocaleString()} events (#
              {r.first_sequence.toLocaleString()} to #{r.last_sequence.toLocaleString()}). Every
              hash matches and all {r.checkpoints_checked.toLocaleString()} signed checkpoints
              verify.
            </>
          )}
        </p>
        {r.anchor && (
          <p className="text-text-secondary">
            Earlier events were removed by retention. The retained chain starts at #
            {r.anchor.first_retained_seq.toLocaleString()}, anchored by a signed retention
            checkpoint.
          </p>
        )}
        {r.checkpoints_checked > 0 && (
          <p className="text-text-secondary">
            {r.anchors_checked.toLocaleString()} of {r.checkpoints_checked.toLocaleString()}{" "}
            checkpoints carry a verified timestamp from an independent timestamp authority
            {r.checkpoints_unanchored > 0
              ? `; ${r.checkpoints_unanchored.toLocaleString()} are waiting for one.`
              : "."}
          </p>
        )}
      </div>
    );
  }
  const f = r.failure;
  if (!f)
    return (
      <p className="text-danger">
        The service reported TAMPERED without details. Check the service logs.
      </p>
    );
  const info = failureText[f.kind];
  return (
    <div className="space-y-4">
      <div>
        <StatusText
          value="tampered"
          label={`Tampered: ${info.title.toLowerCase()} at event #${f.seq.toLocaleString()}`}
        />
        <p className="mt-1 text-text-secondary">{info.meaning}</p>
        <p className="mt-1 text-xs text-muted-foreground">{f.message}</p>
      </div>
      <FindingDetails f={f} />
      {(f.expected_hash || f.found_hash) && (
        <dl className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["Expected hash", f.expected_hash],
              ["Found hash", f.found_hash],
            ] as const
          ).map(([k, val]) =>
            val ? (
              <div key={k} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="flex items-center gap-1">
                  <Mono className="truncate">{val}</Mono>
                  <CopyButton value={val} label={k.toLowerCase()} />
                </dd>
              </div>
            ) : null,
          )}
        </dl>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {f.kind !== "TRUNCATED" && f.kind !== "GAP" && (
          <Link
            to="/audits/$slug/events"
            params={{ slug: audit.slug }}
            search={{ event: f.seq }}
            className="font-medium text-primary hover:underline"
          >
            Open event #{f.seq.toLocaleString()}
          </Link>
        )}
        <Button
          variant="outline"
          onClick={() =>
            downloadText(
              `${audit.slug}-verification.json`,
              JSON.stringify(r, null, 2),
              "application/json",
            )
          }
        >
          Download report
        </Button>
      </div>
    </div>
  );
}

function Checkpoints({
  slug,
  page,
  setPage,
}: {
  slug: string;
  page: number;
  setPage: (page: number) => void;
}) {
  const cps = useCheckpoints(slug, page);
  if (cps.isLoading) return <SkeletonRows rows={4} />;
  if (cps.error)
    return <InlineError message={errorMessage(cps.error)} onRetry={() => cps.refetch()} />;
  const data = cps.data;
  if (!data || data.count === 0) {
    return (
      <p className="text-text-secondary">
        No signed checkpoints yet. The service signs one for new events at its configured interval.
      </p>
    );
  }
  return (
    <>
      <DataTable<Checkpoint>
        rows={data.results}
        rowKey={(c) => c.id}
        columns={[
          {
            header: "Sequence",
            cell: (c) => <span className="tabular-nums">#{c.last_seq.toLocaleString()}</span>,
          },
          {
            header: "Kind",
            cell: (c) =>
              c.kind === "retention" ? <span>Retention anchor</span> : <span>Periodic</span>,
          },
          {
            header: "Chain hash",
            cell: (c) => (
              <span className="flex items-center gap-1">
                <Mono>{shortHash(c.last_hash)}</Mono>
                <CopyButton value={c.last_hash} label="hash" />
              </span>
            ),
          },
          { header: "Key", cell: (c) => <Mono>{c.key_id}</Mono> },
          {
            header: "Signed",
            cell: (c) => <span className="whitespace-nowrap">{formatDateTime(c.signed_at)}</span>,
          },
          {
            header: "Timestamp",
            cell: (c) =>
              c.timestamp ? (
                <span
                  className="whitespace-nowrap"
                  title={`Independent RFC 3161 timestamp from ${c.timestamp.tsa_url}`}
                >
                  <StatusText value="intact" label={formatDateTime(c.timestamp.gen_time)} />
                </span>
              ) : (
                <StatusText value="not verified" label="Pending" />
              ),
          },
        ]}
      />
      <Pager
        label={`Page ${data.page} of ${Math.max(1, data.total_pages)}, ${data.count.toLocaleString()} checkpoints`}
        onNewer={page > 1 ? () => setPage(page - 1) : undefined}
        onOlder={page < data.total_pages ? () => setPage(page + 1) : undefined}
      />
    </>
  );
}

function PublicKeys() {
  const keys = useCheckpointKeys();
  if (keys.isLoading) return <SkeletonRows rows={2} />;
  if (keys.error)
    return <InlineError message={errorMessage(keys.error)} onRetry={() => keys.refetch()} />;
  return (
    <div className="space-y-4">
      {keys.data?.keys.map((k) => (
        <div key={k.key_id}>
          <p className="mb-1 text-text-secondary">
            Key <Mono className="text-foreground">{k.key_id}</Mono> ({k.algorithm}, base64)
          </p>
          <CodeBlock code={k.public_key} />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        To check a checkpoint yourself, verify its base64 signature with this key over the text
        "auditlogs-checkpoint-v1" followed by kind, audit_id, last_seq, last_hash,
        first_retained_seq ("none" for periodic), signed_at (UTC, microseconds) and key_id, one
        "name=value" line each.
      </p>
    </div>
  );
}

export function IntegrityPage({
  audit,
  page,
  onPage,
  autoVerify = false,
  onAutoVerified = () => undefined,
}: {
  audit: Audit;
  page: number;
  onPage: (page: number) => void;
  /** Start verification on arrival (?verify=1, used by the alert email and the Verify link). */
  autoVerify?: boolean;
  /** Called once the automatic run has started, so the flag can leave the URL. */
  onAutoVerified?: () => void;
}) {
  const verify = useVerify(audit.slug);
  // Deferred so it runs once after mounting settles: React's development
  // double mount clears the first timer, and a guard flag would instead leave
  // the page attached to a run whose result it never receives.
  useEffect(() => {
    if (!autoVerify) return;
    const id = setTimeout(() => {
      verify.mutate();
      onAutoVerified();
    }, 0);
    return () => clearTimeout(id);
    // Only the flag decides; verify and onAutoVerified are new objects on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoVerify]);
  return (
    <div className="space-y-6">
      <Panel
        title="Verification"
        description="Recomputes every stored event's hash from its saved payload and checks every checkpoint signature against the trusted keys."
        action={
          <Button onClick={() => verify.mutate()} disabled={verify.isPending}>
            {verify.isPending && <Loader2 className="animate-spin" />}
            {verify.isPending ? "Verifying..." : verify.data ? "Verify again" : "Verify now"}
          </Button>
        }
      >
        {verify.isPending ? (
          <p className="text-text-secondary">
            Recomputing the chain. Large audits can take a while.
          </p>
        ) : verify.error ? (
          <InlineError
            title="Verification could not run"
            message={errorMessage(verify.error)}
            onRetry={() => verify.mutate()}
          />
        ) : verify.data ? (
          <Result audit={audit} r={verify.data} />
        ) : (
          <StatusText value="not verified" label="Not verified in this session" />
        )}
      </Panel>
      <Panel
        title="Checkpoints"
        description="Signed statements of the chain's hash at a point in time. A deleted or rewritten history no longer matches them."
      >
        <Checkpoints slug={audit.slug} page={page} setPage={onPage} />
      </Panel>
      <Panel
        title="Public keys"
        description="Checkpoint signatures can be verified independently with these public keys."
      >
        <PublicKeys />
      </Panel>
    </div>
  );
}
