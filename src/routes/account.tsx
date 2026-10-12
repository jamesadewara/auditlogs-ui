import { createFileRoute } from "@tanstack/react-router";

import { AccountPage } from "@/components/auditlogs/account-page";
import { AppShell } from "@/components/auditlogs/app-shell";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Profile and password | Auditlogs" },
      { name: "description", content: "Your profile and password." },
    ],
  }),
  component: () => (
    <AppShell>
      <AccountPage />
    </AppShell>
  ),
});
