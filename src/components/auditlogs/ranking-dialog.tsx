import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActionRanking, useActorRanking } from "@/hooks/useAudit";
import type { ActivityAction, ActivityActor } from "@/lib/schemas";
import { UI } from "@/lib/ui-config";
import { DataTable, InlineError, Mono, Pager, SkeletonRows, errorMessage } from "./common";

/**
 * The full ranking behind an overview top list, one server page at a time.
 * It is fetched only while the dialog is open.
 */
export function RankingDialog({
  slug,
  kind,
  open,
  onClose,
}: {
  slug: string;
  kind: "actors" | "actions";
  open: boolean;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const actors = useActorRanking(slug, page, open && kind === "actors");
  const actions = useActionRanking(slug, page, open && kind === "actions");
  const q = kind === "actors" ? actors : actions;
  const data = q.data;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setPage(1);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{kind === "actors" ? "All actors" : "All actions"}</DialogTitle>
          <DialogDescription>
            {kind === "actors"
              ? `Everyone who recorded events in the last ${UI.activityDays} days, most active first.`
              : `Every recorded action in the last ${UI.activityDays} days, most frequent first.`}
          </DialogDescription>
        </DialogHeader>
        {q.isLoading ? (
          <SkeletonRows rows={5} />
        ) : q.error ? (
          <InlineError message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !data || data.count === 0 ? (
          <p className="text-text-secondary">No events in this period.</p>
        ) : (
          <>
            <div className="max-h-[60vh] overflow-y-auto">
              {kind === "actors" ? (
                <DataTable<ActivityActor>
                  bare
                  rows={actors.data?.results ?? []}
                  rowKey={(r) => `${r.actor_type}:${r.actor_id}`}
                  columns={[
                    {
                      header: "Actor",
                      cell: (r) => (
                        <div className="whitespace-nowrap">
                          <Mono>{r.actor_id}</Mono>
                          <div className="text-xs text-muted-foreground">{r.actor_type}</div>
                        </div>
                      ),
                    },
                    { header: "Events", align: "right", cell: (r) => r.count.toLocaleString() },
                    {
                      header: "Failures",
                      align: "right",
                      cell: (r) => r.failures.toLocaleString(),
                    },
                  ]}
                />
              ) : (
                <DataTable<ActivityAction>
                  bare
                  rows={actions.data?.results ?? []}
                  rowKey={(r) => r.action}
                  columns={[
                    { header: "Action", cell: (r) => <Mono>{r.action}</Mono> },
                    { header: "Events", align: "right", cell: (r) => r.count.toLocaleString() },
                  ]}
                />
              )}
            </div>
            <Pager
              label={`Page ${data.page} of ${Math.max(1, data.total_pages)}, ${data.count.toLocaleString()} ${kind}`}
              onNewer={page > 1 ? () => setPage(page - 1) : undefined}
              onOlder={page < data.total_pages ? () => setPage(page + 1) : undefined}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
