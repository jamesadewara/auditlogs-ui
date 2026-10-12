import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuditKeyMutations, useAuditKeys } from "@/hooks/useAudit";
import { AUDIT_API_URL } from "@/lib/env";
import { CodeTabs } from "./code-tabs";
import { sendEventSnippets } from "./snippets";
import { formatDate } from "@/lib/helpers";
import type { Audit, AuditKey } from "@/lib/schemas";
import {
  ConfirmDialog,
  DataTable,
  InlineError,
  KeyRevealDialog,
  Mono,
  Pager,
  Panel,
  SkeletonKeys,
  StatusText,
  errorMessage,
} from "./common";

const keyLabel = { write: "Write key", read: "Read key" } as const;

export function KeysPage({ audit }: { audit: Audit }) {
  const [page, setPage] = useState(1);
  const keys = useAuditKeys(audit.slug, page);
  const m = useAuditKeyMutations(audit.slug);
  const [reveal, setReveal] = useState<{ title: string; label: string; value: string } | null>(
    null,
  );
  const [revoking, setRevoking] = useState<AuditKey | null>(null);
  const archived = audit.status === "archived";

  async function issue(type: "write" | "read") {
    try {
      const k = await m.issue.mutateAsync(type);
      setReveal({ title: `New ${type} key`, label: keyLabel[type], value: k.key });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function rotate(k: AuditKey) {
    try {
      const fresh = await m.rotate.mutateAsync(k.id);
      setReveal({ title: `Rotated ${k.type} key`, label: keyLabel[k.type], value: fresh.key });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const code = sendEventSnippets(AUDIT_API_URL, audit.slug);
  return (
    <div className="space-y-6">
      <Panel
        title="Audit keys"
        description="A write key sends events; a read key queries and verifies them. Only a hash is stored, so a key is shown once."
        flush={!!keys.data?.count}
        action={
          <>
            <Button
              variant="outline"
              disabled={archived || m.issue.isPending}
              onClick={() => issue("read")}
            >
              New read key
            </Button>
            <Button disabled={archived || m.issue.isPending} onClick={() => issue("write")}>
              New write key
            </Button>
          </>
        }
      >
        {archived && (
          <p className="border-b bg-warning-soft px-5 py-2.5 text-[13px]">
            Keys are disabled while the audit is archived. Restore it in Settings to issue keys.
          </p>
        )}
        {keys.isLoading ? (
          <SkeletonKeys />
        ) : keys.error ? (
          <InlineError message={errorMessage(keys.error)} onRetry={() => keys.refetch()} />
        ) : !keys.data?.count ? (
          <p className="text-text-secondary">No keys. Issue a write key to start sending events.</p>
        ) : (
          <DataTable<AuditKey>
            bare
            rows={keys.data.results}
            rowKey={(k) => k.id}
            columns={[
              { header: "Type", cell: (k) => keyLabel[k.type] },
              {
                header: "Key",
                cell: (k) => <Mono>{`aud_${k.type === "write" ? "w" : "r"}_...${k.last4}`}</Mono>,
              },
              { header: "Status", cell: (k) => <StatusText value={k.status} /> },
              {
                header: "Created",
                cell: (k) => <span className="whitespace-nowrap">{formatDate(k.created_at)}</span>,
              },
              {
                header: "Revoked",
                cell: (k) => (
                  <span className="whitespace-nowrap">
                    {k.revoked_at ? formatDate(k.revoked_at) : ""}
                  </span>
                ),
              },
              {
                header: "",
                className: "w-12 text-right",
                cell: (k) =>
                  k.status === "revoked" ? null : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${keyLabel[k.type].toLowerCase()} ending ${k.last4}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={archived} onClick={() => rotate(k)}>
                          Rotate (replace) key
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-danger focus:text-danger"
                          onClick={() => setRevoking(k)}
                        >
                          Revoke key
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ),
              },
            ]}
          />
        )}
        {!!keys.data?.count && (
          <div className="px-5 pb-4">
            <Pager
              label={`Page ${keys.data.page} of ${Math.max(1, keys.data.total_pages)}, ${keys.data.count.toLocaleString()} keys`}
              onNewer={page > 1 ? () => setPage(page - 1) : undefined}
              onOlder={page < keys.data.total_pages ? () => setPage(page + 1) : undefined}
            />
          </div>
        )}
      </Panel>

      <Panel
        title="Send an event"
        description="POST one event as JSON with the write key in the X-API-Key header. A 202 response means it was queued for the hash chain."
      >
        <CodeTabs code={code} />
      </Panel>

      <KeyRevealDialog
        open={!!reveal}
        title={reveal?.title ?? ""}
        note="Store this key now. It cannot be shown again. A replaced key is revoked at once; the audit service stops accepting it when its short key cache expires."
        keys={reveal ? [{ label: reveal.label, value: reveal.value }] : []}
        doneLabel="I have saved the key"
        onDone={() => setReveal(null)}
      />
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(v) => !v && setRevoking(null)}
        title="Revoke key"
        description={
          <>
            Requests using the {revoking ? keyLabel[revoking.type].toLowerCase() : "key"} ending{" "}
            <Mono>{revoking?.last4}</Mono> are rejected once the audit service's short key cache
            expires. This cannot be undone.
          </>
        }
        confirmLabel="Revoke key"
        onConfirm={async () => {
          if (revoking) await m.revoke.mutateAsync(revoking.id);
        }}
      />
    </div>
  );
}
