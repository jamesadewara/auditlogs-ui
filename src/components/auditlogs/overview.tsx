import { Link } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { useActivity, useStats } from "@/hooks/useAudit";
import { formatDateTime, formatDayMonth } from "@/lib/helpers";
import type { Audit } from "@/lib/schemas";
import { UI } from "@/lib/ui-config";
import {
  DataTable,
  EmptyState,
  InlineError,
  Mono,
  Panel,
  SkeletonOverview,
  StatBlock,
  errorMessage,
} from "./common";
import { RankingDialog } from "./ranking-dialog";

const axis = { fontSize: 12, fill: "var(--muted-foreground)" };

function Legend() {
  const item = (cls: string, label: string) => (
    <span className="flex items-center gap-2">
      <span className={`size-2 rounded-sm ${cls}`} />
      {label}
    </span>
  );
  return (
    <div className="flex gap-4 text-xs text-muted-foreground">
      {item("bg-primary", "Success")}
      {item("bg-danger", "Failure")}
      {item("bg-muted-foreground", "Unknown")}
    </div>
  );
}

export function Overview({ audit }: { audit: Audit }) {
  const stats = useStats(audit.slug);
  const activity = useActivity(audit.slug);
  const [ranking, setRanking] = useState<"actors" | "actions" | null>(null);

  if (stats.error)
    return <InlineError message={errorMessage(stats.error)} onRetry={() => stats.refetch()} />;
  if (stats.isLoading || !stats.data) return <SkeletonOverview />;
  const s = stats.data;

  if (s.total_events === 0) {
    return (
      <EmptyState
        icon={Inbox}
        sentence="No events yet. Send the first one with this audit's write key."
        action={
          <Button asChild variant="outline">
            <Link to="/audits/$slug/keys" params={{ slug: audit.slug }}>
              Keys and sending events
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock label="Stored events" value={s.total_events.toLocaleString()} />
        <StatBlock label="Chain head" value={`#${s.last_sequence.toLocaleString()}`} />
        <StatBlock
          label="Last event recorded"
          value={
            <span className="text-base">
              {s.last_event_at ? formatDateTime(s.last_event_at) : "None"}
            </span>
          }
        />
        <StatBlock
          label="Last signed checkpoint"
          value={
            <span className="text-base">
              {s.last_checkpoint_seq !== undefined
                ? `#${s.last_checkpoint_seq.toLocaleString()}`
                : "Not yet"}
            </span>
          }
        />
      </div>

      {activity.error ? (
        <InlineError message={errorMessage(activity.error)} onRetry={() => activity.refetch()} />
      ) : !activity.data ? (
        <SkeletonOverview />
      ) : (
        <>
          <Panel
            title="Activity"
            description={`Events recorded per day (UTC) over the last ${UI.activityDays} days.`}
            action={<Legend />}
          >
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activity.data.days.map((d) => ({ ...d, label: formatDayMonth(d.date) }))}
                  margin={{ top: 4, right: 0, left: -8, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={0.5} />
                  <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
                  <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as
                        | { label: string; success: number; failure: number; unknown: number }
                        | undefined;
                      if (!active || !p) return null;
                      return (
                        <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                          {p.label}: {(p.success + p.failure + p.unknown).toLocaleString()} events,{" "}
                          {p.failure.toLocaleString()} failed
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="success" stackId="a" fill="var(--primary)" />
                  <Bar dataKey="failure" stackId="a" fill="var(--danger)" />
                  <Bar
                    dataKey="unknown"
                    stackId="a"
                    fill="var(--muted-foreground)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title="Top actions"
              description={`Most recorded actions, last ${UI.activityDays} days.`}
              action={
                activity.data.top_actions.length > 0 && (
                  <Button variant="outline" onClick={() => setRanking("actions")}>
                    View all
                  </Button>
                )
              }
            >
              {activity.data.top_actions.length === 0 ? (
                <p className="text-text-secondary">No events in this period.</p>
              ) : (
                <div style={{ height: Math.max(120, activity.data.top_actions.length * 36) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={activity.data.top_actions}
                      layout="vertical"
                      margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="action"
                        type="category"
                        width={200}
                        tick={{ ...axis, fontFamily: "var(--font-mono)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Bar dataKey="count" fill="var(--primary)" radius={[0, 2, 2, 0]} barSize={18}>
                        <LabelList
                          dataKey="count"
                          position="right"
                          style={{ fontSize: 12, fill: "var(--text-secondary)" }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
            <Panel
              title="Most active actors"
              description={`Who recorded the most events, last ${UI.activityDays} days.`}
              action={
                activity.data.top_actors.length > 0 && (
                  <Button variant="outline" onClick={() => setRanking("actors")}>
                    View all
                  </Button>
                )
              }
              flush={activity.data.top_actors.length > 0}
            >
              {activity.data.top_actors.length === 0 ? (
                <p className="text-text-secondary">No events in this period.</p>
              ) : (
                <DataTable
                  bare
                  rows={activity.data.top_actors}
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
              )}
            </Panel>
          </div>
          <RankingDialog
            slug={audit.slug}
            kind={ranking ?? "actors"}
            open={ranking !== null}
            onClose={() => setRanking(null)}
          />
        </>
      )}
    </div>
  );
}
