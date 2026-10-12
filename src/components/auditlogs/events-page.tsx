import { CalendarDays, ChevronDown, Download, Inbox, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActivity, useEvent, useEvents, useLastVerification } from "@/hooks/useAudit";
import {
  chooseCsvTarget,
  formatDate,
  formatDateTime,
  fromDay,
  saveStream,
  toDay,
} from "@/lib/helpers";
import { readStream } from "@/lib/http-client";
import { UI } from "@/lib/ui-config";
import type { Audit, AuditEvent, Outcome } from "@/lib/schemas";
import { exportEventsCsv, type EventFilters } from "@/services/audit.service";
import {
  DataTable,
  EmptyState,
  InlineError,
  Mono,
  Pager,
  SkeletonEvents,
  StatusText,
  errorMessage,
} from "./common";
import { EventDrawer } from "./event-drawer";

export type EventSearch = {
  actor?: string;
  action?: string;
  outcome?: Outcome;
  /** YYYY-MM-DD, local calendar day */
  from?: string;
  /** YYYY-MM-DD, local calendar day, inclusive */
  to?: string;
  page?: number;
  /** Sequence number of the event open in the drawer. */
  event?: number;
};

/** Search params to the Go list filters: local days become an RFC 3339 range. */
function toFilters(s: EventSearch): EventFilters {
  const startOfDay = (day: string) => fromDay(day).toISOString();
  const endOfDay = (day: string) => {
    const d = fromDay(day);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  };
  return {
    actor_id: s.actor,
    action: s.action,
    outcome: s.outcome,
    start_time: s.from ? startOfDay(s.from) : undefined,
    end_time: s.from ? endOfDay(s.to ?? s.from) : undefined,
  };
}

/** Text filter that updates the URL after the user stops typing. */
function DebouncedInput({
  value,
  onChange,
  placeholder,
  label,
  list,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  placeholder: string;
  label: string;
  list?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  useEffect(() => {
    const id = setTimeout(() => {
      const next = draft.trim() || undefined;
      if (next !== value) onChange(next);
    }, UI.searchDebounceMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);
  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      list={list}
      className="h-10 font-mono lg:w-52"
    />
  );
}

export function EventsPage({
  audit,
  filters,
  onFilters,
}: {
  audit: Audit;
  filters: EventSearch;
  onFilters: (v: EventSearch) => void;
}) {
  const page = filters.page ?? 1;
  const apiFilters = useMemo(() => toFilters(filters), [filters]);
  const events = useEvents(audit.slug, apiFilters, page);
  const activity = useActivity(audit.slug);
  const lastVerification = useLastVerification(audit.slug);
  const [exporting, setExporting] = useState(false);

  // The open event: from the current page when it is there, otherwise fetched by seq.
  const onPage = events.data?.results.find((e) => e.seq === filters.event);
  const fetched = useEvent(audit.slug, onPage ? undefined : filters.event);
  const selected: AuditEvent | null = onPage ?? fetched.data ?? null;

  const set = (patch: Partial<EventSearch>) =>
    onFilters({ ...filters, ...patch, page: 1, event: undefined });
  const hasFilters = !!(filters.actor || filters.action || filters.outcome || filters.from);
  const range: DateRange | undefined = filters.from
    ? { from: fromDay(filters.from), to: filters.to ? fromDay(filters.to) : undefined }
    : undefined;
  const rangeLabel = filters.from
    ? `${formatDate(fromDay(filters.from).toISOString())} to ${formatDate(fromDay(filters.to ?? filters.from).toISOString())}`
    : "Any date";

  /**
   * Export the events matching the current filters. Where the browser allows,
   * the file is chosen first and the CSV streams straight to it; otherwise it
   * is collected and saved through the download bar.
   */
  async function exportCsv() {
    const name = `${audit.slug}-events${hasFilters ? "-filtered" : ""}.csv`;
    setExporting(true);
    try {
      const target = await chooseCsvTarget(name);
      if (!target) return; // the user closed the save dialog
      const res = await exportEventsCsv(audit.slug, apiFilters);
      await saveStream(res, target, name, "text/csv", readStream);
      toast.success(target.kind === "file" ? "Export saved." : "Export downloaded.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  const data = events.data;
  const open = (e: AuditEvent) => onFilters({ ...filters, event: e.seq });

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:flex-wrap">
        <DebouncedInput
          value={filters.actor}
          onChange={(actor) => set({ actor })}
          placeholder="Actor ID"
          label="Filter by actor ID"
        />
        <DebouncedInput
          value={filters.action}
          onChange={(action) => set({ action })}
          placeholder="Action, e.g. order.created"
          label="Filter by action"
          list="known-actions"
        />
        <datalist id="known-actions">
          {activity.data?.top_actions.map((a) => (
            <option key={a.action} value={a.action} />
          ))}
        </datalist>
        <Select
          value={filters.outcome ?? "all"}
          onValueChange={(v) => set({ outcome: v === "all" ? undefined : (v as Outcome) })}
        >
          <SelectTrigger className="h-10 lg:w-40" aria-label="Outcome">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 justify-between font-normal lg:w-64">
              <span className="flex items-center gap-2">
                <CalendarDays className="text-muted-foreground" />
                {rangeLabel}
              </span>
              <ChevronDown className="text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              defaultMonth={range?.from ?? new Date()}
              onSelect={(r) =>
                set({
                  from: r?.from ? toDay(r.from) : undefined,
                  to: r?.to ? toDay(r.to) : undefined,
                })
              }
            />
            {filters.from && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => set({ from: undefined, to: undefined })}
                >
                  Clear dates
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          className="h-10 lg:ml-auto"
          onClick={exportCsv}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="animate-spin" /> : <Download />} Export CSV
        </Button>
      </div>
      {hasFilters && (
        <p className="mb-4 text-xs text-muted-foreground">
          Filters apply to the table and to the CSV export.{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => onFilters({})}
          >
            Clear filters
          </button>
        </p>
      )}

      {events.isLoading ? (
        <SkeletonEvents />
      ) : events.error ? (
        <InlineError message={errorMessage(events.error)} onRetry={() => events.refetch()} />
      ) : !data || data.count === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={Inbox}
            sentence="No events match these filters."
            action={
              <Button variant="outline" onClick={() => onFilters({})}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState icon={Inbox} sentence="This audit has no events yet." />
        )
      ) : (
        <div className={events.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          <div className="hidden md:block">
            <DataTable<AuditEvent>
              rows={data.results}
              rowKey={(e) => e.id}
              onRowClick={open}
              columns={[
                {
                  header: "#",
                  align: "right",
                  cell: (e) => (
                    <span className="tabular-nums text-muted-foreground">
                      {e.seq.toLocaleString()}
                    </span>
                  ),
                },
                {
                  header: "Occurred",
                  cell: (e) => (
                    <span className="whitespace-nowrap">{formatDateTime(e.occurred_at)}</span>
                  ),
                },
                { header: "Action", cell: (e) => <Mono>{e.action}</Mono> },
                {
                  header: "Actor",
                  cell: (e) => (
                    <div className="whitespace-nowrap">
                      <Mono>{e.actor.id}</Mono>
                      <div className="text-xs text-muted-foreground">{e.actor.type}</div>
                    </div>
                  ),
                },
                {
                  header: "Resource",
                  cell: (e) =>
                    e.resource_id ? (
                      <div className="whitespace-nowrap">
                        <Mono>{e.resource_id}</Mono>
                        <div className="text-xs text-muted-foreground">
                          {e.resource_type ?? "Untyped"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    ),
                },
                { header: "Outcome", cell: (e) => <StatusText value={e.outcome} /> },
              ]}
            />
          </div>
          <ul className="space-y-3 md:hidden">
            {data.results.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => open(e)}
                  className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      #{e.seq.toLocaleString()} {formatDateTime(e.occurred_at)}
                    </span>
                    <StatusText value={e.outcome} />
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold">{e.action}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Actor <span className="font-mono text-foreground">{e.actor.id}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <Pager
            label={`Page ${data.page.toLocaleString()} of ${Math.max(1, data.total_pages).toLocaleString()}, ${data.count.toLocaleString()} events`}
            onNewer={
              page > 1
                ? () => onFilters({ ...filters, page: page - 1, event: undefined })
                : undefined
            }
            onOlder={
              page < data.total_pages
                ? () => onFilters({ ...filters, page: page + 1, event: undefined })
                : undefined
            }
          />
        </div>
      )}

      <EventDrawer
        event={selected}
        finding={lastVerification.data?.failure}
        loading={filters.event !== undefined && !selected && fetched.isLoading}
        error={
          filters.event !== undefined && !selected && fetched.error
            ? errorMessage(fetched.error)
            : null
        }
        open={filters.event !== undefined}
        onClose={() => onFilters({ ...filters, event: undefined })}
      />
    </>
  );
}
