import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/auditlogs/app-shell";
import { AuditDetail } from "@/components/auditlogs/audit-detail";

export const Route = createFileRoute("/audits/$slug/settings")({
  head: () => ({
    meta: [
      { title: "Audit settings | Auditlogs" },
      {
        name: "description",
        content: "Edit the title, description, tags and retention of this audit.",
      },
    ],
  }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { slug } = Route.useParams();
  return (
    <AppShell>
      <AuditDetail slug={slug} tab="settings" />
    </AppShell>
  );
}
