import { useState, type ReactNode } from "react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/helpers";
import type { AuditEvent, VerificationFailure } from "@/lib/schemas";
import { UI } from "@/lib/ui-config";
import { CodeBlock, CopyButton, SkeletonRows, StatusText } from "./common";
import { FindingDetails } from "./integrity-page";

/**
 * The event drawer answers the standard audit questions in a fixed order:
 * who, what, on which target, why, from where, when, then the integrity
 * details. Every standard field is always listed, with "Not provided" when the
 * sender left it out, so a reviewer can see what is missing as well as what
 * is there. Values are shown in full (long ones behind "Show all"), never cut.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t px-6 py-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <dl className="space-y-1">{children}</dl>
    </section>
  );
}

/** A value shown whole; past UI.drawerValuePreviewChars it starts collapsed. */
function FullValue({ text, mono }: { text: string; mono?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > UI.drawerValuePreviewChars;
  const shown = long && !expanded ? `${text.slice(0, UI.drawerValuePreviewChars)}...` : text;
  return (
    <span className="min-w-0">
      <span className={mono ? "break-all font-mono text-[13px]" : "wrap-break-word"}>{shown}</span>
      {long && (
        <button
          type="button"
          className="ml-2 text-xs font-medium text-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show all"}
        </button>
      )}
    </span>
  );
}

function Row({
  label,
  value,
  mono,
  copy,
  children,
}: {
  label: string;
  /** Absent (undefined) is shown as "Not provided". */
  value?: string;
  mono?: boolean;
  /** Offer a copy button for this value. */
  copy?: boolean;
  /** Custom content instead of value. */
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[132px_1fr] items-start gap-2 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-start gap-1">
        {children ??
          (value === undefined ? (
            <span className="text-muted-foreground">Not provided</span>
          ) : (
            <>
              <FullValue text={value} mono={mono} />
              {copy && <CopyButton value={value} label={label.toLowerCase()} />}
            </>
          ))}
      </dd>
    </div>
  );
}

/** Values in changes and metadata can be any JSON; show them as compact JSON text. */
const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));

function formatHashedPayload(payload: string): { code: string; formatted: boolean } {
  try {
    return { code: JSON.stringify(JSON.parse(payload), null, 2), formatted: true };
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return { code: payload, formatted: false };
  }
}

/** "Ada Obi" when a name was sent, otherwise "user usr_1042". */
const actorLabel = (e: AuditEvent) => e.actor.name ?? `${e.actor.type} ${e.actor.id}`;

/** "Order #9001", otherwise "order ord_9001", or null when no target was sent. */
function targetLabel(e: AuditEvent): string | null {
  if (e.resource_name) return e.resource_name;
  const parts = [e.resource_type, e.resource_id].filter((p): p is string => p !== undefined);
  return parts.length > 0 ? parts.join(" ") : null;
}

/** One sentence saying who did what to which target, and how it ended. */
function Headline({ e }: { e: AuditEvent }) {
  const behalf = e.actor.on_behalf_of
    ? `, acting for ${e.actor.on_behalf_of.type} ${e.actor.on_behalf_of.id},`
    : "";
  const target = targetLabel(e);
  const on = target ? ` on ${target}` : "";
  const action = <span className="font-mono">{e.action}</span>;
  const who = `${actorLabel(e)}${behalf}`;
  switch (e.outcome) {
    case "success":
      return (
        <>
          {who} performed {action}
          {on}.
        </>
      );
    case "failure":
      return (
        <>
          {who} tried {action}
          {on}, but it failed.
        </>
      );
    case "unknown":
      return (
        <>
          {who} attempted {action}
          {on}; the outcome was not reported.
        </>
      );
  }
}

function Changes({ changes }: { changes: Record<string, unknown> }) {
  const before = (changes.before ?? {}) as Record<string, unknown>;
  const after = (changes.after ?? {}) as Record<string, unknown>;
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return (
    <section className="border-t px-6 py-4">
      <h3 className="mb-2 font-semibold">Changes</h3>
      {fields.length === 0 ? (
        <p className="text-muted-foreground">No field changes were recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="pl-0">Field</th>
                <th>Before</th>
                <th>After</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((k) => (
                <tr key={k} className="align-top">
                  <td className="pl-0">
                    <FullValue text={k} mono />
                  </td>
                  <td>{k in before ? <FullValue text={show(before[k])} mono /> : null}</td>
                  <td>{k in after ? <FullValue text={show(after[k])} mono /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function EventDrawer({
  event,
  open,
  loading,
  error,
  onClose,
  finding,
}: {
  event: AuditEvent | null;
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  /** The last verification's finding, when it is about this event. */
  finding?: VerificationFailure;
}) {
  const e = event;
  const metadata = e ? Object.entries(e.metadata) : [];
  const hashedPayload = e
    ? formatHashedPayload(e.canonical_payload)
    : { code: "", formatted: true };
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="overflow-y-auto p-0 sm:max-w-lg">
        {!e ? (
          <div className="p-6">
            <SheetTitle>Event</SheetTitle>
            <SheetDescription className="mt-2">
              {error ?? (loading ? "Loading event..." : "Event not found.")}
            </SheetDescription>
            {loading && <SkeletonRows rows={6} />}
          </div>
        ) : (
          <>
            <div className="px-6 py-5 pr-12">
              <SheetTitle className="text-base leading-6 font-semibold">
                <Headline e={e} />
              </SheetTitle>
              <SheetDescription asChild>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-foreground">
                  <StatusText value={e.outcome} />
                  <span className="text-muted-foreground">#{e.seq.toLocaleString()}</span>
                  <span className="text-muted-foreground">{formatDateTime(e.occurred_at)}</span>
                </div>
              </SheetDescription>
              {e.summary !== undefined && <p className="mt-2 text-text-secondary">{e.summary}</p>}
              {e.reason !== undefined && (
                <p className="mt-1 text-text-secondary">
                  <span className="font-medium text-foreground">Reason:</span> {e.reason}
                </p>
              )}
            </div>
            {finding && finding.seq === e.seq && (
              <section className="border-t px-6 py-4" role="alert">
                <StatusText
                  value="tampered"
                  label={`Verification failed at this event: ${finding.kind}`}
                />
                <p className="mt-1 mb-3 text-xs text-muted-foreground">{finding.message}</p>
                <FindingDetails f={finding} />
              </section>
            )}
            <Section title="Who">
              <Row label="Name" value={e.actor.name} />
              <Row label="Actor type" value={e.actor.type} />
              <Row label="Actor ID" value={e.actor.id} mono copy />
              <Row
                label="On behalf of"
                value={
                  e.actor.on_behalf_of
                    ? `${e.actor.on_behalf_of.type} ${e.actor.on_behalf_of.id}`
                    : undefined
                }
                mono
              />
              <Row label="IP address" value={e.actor.ip} mono />
              <Row label="User agent" value={e.actor.user_agent} />
              <Row label="Session" value={e.session_id} mono copy />
            </Section>
            <Section title="What">
              <Row label="Action" value={e.action} mono />
              <Row label="Outcome">
                <StatusText value={e.outcome} />
              </Row>
              <Row label="Reason" value={e.reason} />
              <Row label="Summary" value={e.summary} />
            </Section>
            <Section title="Target">
              <Row label="Name" value={e.resource_name} />
              <Row label="Type" value={e.resource_type} />
              <Row label="ID" value={e.resource_id} mono copy />
            </Section>
            <Section title="Where">
              <Row label="Source service" value={e.source_service} />
              <Row label="Request ID" value={e.request_id} mono copy />
            </Section>
            <Section title="When">
              <Row label="Occurred" value={formatDateTime(e.occurred_at)} />
              <Row label="Recorded" value={formatDateTime(e.recorded_at)} />
            </Section>
            <Changes changes={e.changes} />
            <Section title="Metadata">
              {metadata.length === 0 ? (
                <p className="text-muted-foreground">No metadata was recorded.</p>
              ) : (
                metadata.map(([k, val]) => <Row key={k} label={k} value={show(val)} mono />)
              )}
            </Section>
            <Section title="Chain">
              <Row label="Sequence" value={`#${e.seq.toLocaleString()}`} />
              <Row label="Hash" value={e.hash} mono copy />
              {e.prev_hash === undefined ? (
                <Row label="Previous hash">Genesis (first event)</Row>
              ) : (
                <Row label="Previous hash" value={e.prev_hash} mono copy />
              )}
            </Section>
            <Section title="Reference">
              <Row label="Event ID" value={e.id} mono copy />
              <Row label="Idempotency key" value={e.idempotency_key} mono copy />
            </Section>
            <section className="border-t px-6 py-4">
              <h3 className="mb-1 font-semibold">Hashed payload</h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Pretty-printed for readability only. Copy preserves the exact text used to compute
                the hash.
              </p>
              {!hashedPayload.formatted && (
                <p className="mb-2 text-sm text-destructive">
                  Could not format invalid JSON; showing the original hashed text.
                </p>
              )}
              <CodeBlock
                code={hashedPayload.code}
                copyValue={e.canonical_payload}
                copyLabel="original hashed payload"
              />
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
