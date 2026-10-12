import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/auditlogs/app-shell";
import { AuditDetail } from "@/components/auditlogs/audit-detail";

export const Route = createFileRoute("/audits/$slug/keys")({
  head: () => ({
    meta: [
      { title: "Audit keys | Auditlogs" },
      {
        name: "description",
        content: "Issue, rotate and revoke this audit's write and read keys.",
      },
    ],
  }),
  component: KeysRoute,
});

function KeysRoute() {
  const { slug } = Route.useParams();
  return (
    <AppShell>
      <AuditDetail slug={slug} tab="keys" />
    </AppShell>
  );
}
