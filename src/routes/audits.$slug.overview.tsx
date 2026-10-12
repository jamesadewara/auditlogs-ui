import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/auditlogs/app-shell";
import { AuditDetail } from "@/components/auditlogs/audit-detail";

export const Route = createFileRoute("/audits/$slug/overview")({
  head: () => ({
    meta: [
      { title: "Audit overview | Auditlogs" },
      {
        name: "description",
        content: "Event volume, top actions and actors, and checkpoint status for this audit.",
      },
    ],
  }),
  component: OverviewRoute,
});

function OverviewRoute() {
  const { slug } = Route.useParams();
  return (
    <AppShell>
      <AuditDetail slug={slug} tab="overview" />
    </AppShell>
  );
}
