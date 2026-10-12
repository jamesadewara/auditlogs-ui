import { Link, useNavigate } from "@tanstack/react-router";
import { FileClock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAudits, useStats } from "@/hooks/useAudit";
import { formatDate, tagText } from "@/lib/helpers";
import type { Audit } from "@/lib/schemas";
import { UI } from "@/lib/ui-config";
import {
  DataTable,
  EmptyState,
  InlineError,
  Mono,
  PageHeader,
  Pager,
  SearchInput,
  SkeletonAuditsList,
  StatusText,
  errorMessage,
} from "./common";

export type AuditListSearch = {
  q?: string;
  tag?: string;
  status?: "active" | "archived";
  page?: number;
};

/** Event count for one audit, from the audit service. */
function EventCount({ slug }: { slug: string }) {
  const stats = useStats(slug);
  if (stats.isLoading) return <span className="text-muted-foreground">...</span>;
  if (stats.error)
    return (
      <span className="text-danger" title={errorMessage(stats.error)}>
        Unavailable
      </span>
    );
  return <>{(stats.data?.total_events ?? 0).toLocaleString()}</>;
}

/**
 * Filters and paging run on the server, so a search covers every audit, not
 * only the rows of the page on screen. Text filters apply after the user
 * pauses typing (UI.searchDebounceMs).
 */
export function AuditsList({
  search,
  onSearch,
}: {
  search: AuditListSearch;
  onSearch: (next: AuditListSearch) => void;
}) {
  const navigate = useNavigate();
  const page = search.page ?? 1;
  const filters = useMemo(
    () => ({ q: search.q, status: search.status, tag: search.tag }),
    [search.q, search.status, search.tag],
  );
  const { data, isLoading, error, refetch } = useAudits(filters, page);
  const rows = data?.results ?? [];
  const filtered = !!(search.q || search.tag || search.status);
  // Any filter change starts again at page 1.
  const set = (patch: Partial<AuditListSearch>) =>
    onSearch({ ...search, ...patch, page: undefined });

  const [q, setQ] = useState(search.q ?? "");
  const [tag, setTag] = useState(search.tag ?? "");
  useEffect(() => setQ(search.q ?? ""), [search.q]);
  useEffect(() => setTag(search.tag ?? ""), [search.tag]);
  useEffect(() => {
    const id = setTimeout(() => {
      const nextQ = q.trim() || undefined;
      const nextTag = tag.trim() || undefined;
      if (nextQ !== search.q || nextTag !== search.tag) set({ q: nextQ, tag: nextTag });
    }, UI.searchDebounceMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tag]);

  return (
    <>
      <PageHeader
        title="Audits"
        description="Each audit is its own tamper-evident event log with its own keys."
        action={
          <Button asChild>
            <Link to="/audits/new">Create audit</Link>
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-2 md:flex-row">
        <SearchInput
          className="md:w-72"
          value={q}
          onChange={setQ}
          placeholder="Search title or slug"
        />
        <Select
          value={search.status ?? "all"}
          onValueChange={(v) =>
            set({ status: v === "all" ? undefined : (v as "active" | "archived") })
          }
        >
          <SelectTrigger className="md:w-40" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="h-10 md:w-44"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Tag (exact)"
          aria-label="Tag (exact)"
        />
      </div>

      {isLoading ? (
        <SkeletonAuditsList />
      ) : error ? (
        <InlineError message={errorMessage(error)} onRetry={() => refetch()} />
      ) : !data || data.count === 0 ? (
        filtered ? (
          <EmptyState
            icon={FileClock}
            sentence="No audits match these filters."
            action={
              <Button variant="outline" onClick={() => onSearch({})}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileClock}
            sentence="No audits yet. Create one to get its write and read keys."
            action={
              <Button asChild>
                <Link to="/audits/new">Create audit</Link>
              </Button>
            }
          />
        )
      ) : (
        <DataTable<Audit>
          rows={rows}
          rowKey={(a) => a.id}
          onRowClick={(a) => navigate({ to: "/audits/$slug/overview", params: { slug: a.slug } })}
          columns={[
            {
              header: "Audit",
              cell: (a) => (
                <div className="whitespace-nowrap">
                  <div className="font-medium">{a.title}</div>
                  <Mono className="text-xs text-muted-foreground">{a.slug}</Mono>
                </div>
              ),
            },
            { header: "Status", cell: (a) => <StatusText value={a.status} /> },
            {
              header: "Tags",
              cell: (a) => (
                <span className="whitespace-nowrap text-text-secondary">
                  {tagText(a.tags) || "None"}
                </span>
              ),
            },
            { header: "Events", align: "right", cell: (a) => <EventCount slug={a.slug} /> },
            {
              header: "Retention",
              cell: (a) => (
                <span className="whitespace-nowrap">{a.retention_days.toLocaleString()} days</span>
              ),
            },
            {
              header: "Created",
              cell: (a) => <span className="whitespace-nowrap">{formatDate(a.created_at)}</span>,
            },
          ]}
        />
      )}
      {data && data.count > 0 && (
        <Pager
          label={`Page ${data.page} of ${Math.max(1, data.total_pages)}, ${data.count.toLocaleString()} audits`}
          onNewer={page > 1 ? () => onSearch({ ...search, page: page - 1 }) : undefined}
          onOlder={
            page < data.total_pages ? () => onSearch({ ...search, page: page + 1 }) : undefined
          }
        />
      )}
    </>
  );
}
