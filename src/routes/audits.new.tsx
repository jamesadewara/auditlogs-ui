import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/auditlogs/app-shell";
import { AuditForm } from "@/components/auditlogs/audit-form";

export const Route = createFileRoute("/audits/new")({
  head: () => ({
    meta: [
      { title: "Create audit | Auditlogs" },
      { name: "description", content: "Create a new audit log and issue its keys." },
    ],
  }),
  component: () => (
    <AppShell>
      <AuditForm />
    </AppShell>
  ),
});
