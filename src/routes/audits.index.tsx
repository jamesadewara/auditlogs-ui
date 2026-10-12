import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/auditlogs/app-shell";
import { AuditsList, type AuditListSearch } from "@/components/auditlogs/audits-list";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const positiveInt = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export const Route = createFileRoute("/audits/")({
  validateSearch: (s: Record<string, unknown>): AuditListSearch => ({
    q: str(s.q),
    tag: str(s.tag),
    status: s.status === "active" || s.status === "archived" ? s.status : undefined,
    page: positiveInt(s.page),
  }),
  head: () => ({
    meta: [
      { title: "Audits | Auditlogs" },
      { name: "description", content: "Every audit log in your organisation." },
    ],
  }),
  component: AuditsRoute,
});

function AuditsRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  return (
    <AppShell>
      <AuditsList
        search={search}
        onSearch={(next) => navigate({ to: "/audits", search: next, replace: true })}
      />
    </AppShell>
  );
}
