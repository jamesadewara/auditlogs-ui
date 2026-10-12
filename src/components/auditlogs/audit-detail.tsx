import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";

import { useAudit, useStats } from "@/hooks/useAudit";
import { formatDateTime } from "@/lib/helpers";
import {
  CopyButton,
  InlineError,
  Mono,
  SkeletonDetail,
  SkeletonEvents,
  SkeletonIntegrity,
  SkeletonKeys,
  SkeletonOverview,
  SkeletonSettings,
  StatusText,
  errorMessage,
} from "./common";
import { EventsPage, type EventSearch } from "./events-page";
import { IntegrityPage } from "./integrity-page";
import { KeysPage } from "./keys-page";
import { Overview } from "./overview";
import { SettingsPage } from "./settings-page";

export type AuditTab = "overview" | "events" | "integrity" | "keys" | "settings";

const skeletons: Record<AuditTab, ComponentType> = {
  overview: SkeletonOverview,
  events: SkeletonEvents,
  integrity: SkeletonIntegrity,
  keys: SkeletonKeys,
  settings: SkeletonSettings,
};

/**
 * One quiet line under the audit title. A failure here is shown as a short
 * notice with a retry; the full error is shown on the Overview and Integrity
 * tabs, so one failing call does not paint every tab red.
 */
function CheckpointLine({ slug }: { slug: string }) {
  const stats = useStats(slug);
  if (stats.isLoading)
    return <span className="text-muted-foreground">Loading chain status...</span>;
  if (stats.error)
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2 text-text-secondary">
        <StatusText value="failure" label="Chain status unavailable:" />
        <span className="text-muted-foreground">{errorMessage(stats.error)}</span>
        <button
          type="button"
          onClick={() => stats.refetch()}
          className="font-medium text-primary hover:underline"
        >
          Retry
        </button>
      </span>
    );
  const s = stats.data;
  if (!s) return <span className="text-muted-foreground">Loading chain status...</span>;
  if (s.total_events === 0)
    return <span className="text-muted-foreground">No events recorded yet</span>;
  return (
    <span className="text-text-secondary">
      {s.total_events.toLocaleString()} events, head #{s.last_sequence.toLocaleString()}
      <span className="mx-2 text-border">|</span>
      {s.last_checkpoint_seq !== undefined && s.last_checkpoint_at ? (
        <>
          Signed to #{s.last_checkpoint_seq.toLocaleString()} at{" "}
          {formatDateTime(s.last_checkpoint_at)}
        </>
      ) : (
        <>No signed checkpoint yet</>
      )}
      <span className="mx-2 text-border">|</span>
      <Link
        to="/audits/$slug/integrity"
        params={{ slug }}
        search={{ verify: true }}
        className="font-medium text-primary hover:underline"
      >
        Verify
      </Link>
    </span>
  );
}

export function AuditDetail({
  slug,
  tab,
  filters = {},
  onFilters = () => undefined,
  checkpointsPage = 1,
  onCheckpointsPage = () => undefined,
  autoVerify = false,
  onAutoVerified = () => undefined,
}: {
  slug: string;
  tab: AuditTab;
  filters?: EventSearch;
  onFilters?: (v: EventSearch) => void;
  /** Page of the integrity tab's checkpoint table, kept in the URL. */
  checkpointsPage?: number;
  onCheckpointsPage?: (page: number) => void;
  /** Start verification on arrival on the integrity tab (?verify=1). */
  autoVerify?: boolean;
  onAutoVerified?: () => void;
}) {
  const { data: audit, isLoading, error, refetch } = useAudit(slug);
  const Skeleton = skeletons[tab];

  if (error) return <InlineError message={errorMessage(error)} onRetry={() => refetch()} />;

  return (
    <>
      <div className="mb-6">
        {isLoading || !audit ? (
          <SkeletonDetail />
        ) : (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-xl font-semibold tracking-tight">{audit.title}</h1>
              <StatusText value={audit.status} className="text-[13px] text-text-secondary" />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                <Mono>{audit.slug}</Mono>
                <CopyButton value={audit.slug} label="slug" />
              </span>
              <CheckpointLine slug={slug} />
            </div>
            {audit.status === "archived" && (
              <p className="mt-3 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-[13px]">
                This audit is archived: its keys are disabled and it accepts no new events. Its
                history stays readable and verifiable.
              </p>
            )}
          </div>
        )}
      </div>
      {isLoading || !audit ? (
        <Skeleton />
      ) : (
        <>
          {tab === "overview" && <Overview audit={audit} />}
          {tab === "events" && <EventsPage audit={audit} filters={filters} onFilters={onFilters} />}
          {tab === "integrity" && (
            <IntegrityPage
              audit={audit}
              page={checkpointsPage}
              onPage={onCheckpointsPage}
              autoVerify={autoVerify}
              onAutoVerified={onAutoVerified}
            />
          )}
          {tab === "keys" && <KeysPage audit={audit} />}
          {tab === "settings" && <SettingsPage audit={audit} />}
        </>
      )}
    </>
  );
}
