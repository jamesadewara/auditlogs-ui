import { createFileRoute } from "@tanstack/react-router";

import { AccountKeys } from "@/components/auditlogs/account-keys";
import { AppShell } from "@/components/auditlogs/app-shell";

export const Route = createFileRoute("/account-keys")({
  head: () => ({
    meta: [
      { title: "Account keys | Auditlogs" },
      {
        name: "description",
        content: "Create and revoke the account keys that manage your audits.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <AccountKeys />
    </AppShell>
  ),
});
