import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/auditlogs/app-shell";
import { AuditDetail } from "@/components/auditlogs/audit-detail";
import type { EventSearch } from "@/components/auditlogs/events-page";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const day = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
const positiveInt = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export const Route = createFileRoute("/audits/$slug/events")({
  validateSearch: (s: Record<string, unknown>): EventSearch => ({
    actor: str(s.actor),
    action: str(s.action),
    outcome:
      s.outcome === "success" || s.outcome === "failure" || s.outcome === "unknown"
        ? s.outcome
        : undefined,
    from: day(s.from),
    to: day(s.to),
    page: positiveInt(s.page),
    event: positiveInt(s.event),
  }),
  head: () => ({
    meta: [
      { title: "Events | Auditlogs" },
      { name: "description", content: "Filter and inspect every recorded event in this audit." },
    ],
  }),
  component: EventsRoute,
});

function EventsRoute() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  return (
    <AppShell>
      <AuditDetail
        slug={slug}
        tab="events"
        filters={search}
        onFilters={(next) =>
          navigate({ to: "/audits/$slug/events", params: { slug }, search: next, replace: true })
        }
      />
    </AppShell>
  );
}
