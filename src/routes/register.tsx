import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/components/auditlogs/auth-page";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account | Auditlogs" },
      {
        name: "description",
        content: "Create an Auditlogs account to start recording tamper-evident audit events.",
      },
    ],
  }),
  component: () => <AuthPage mode="register" />,
});
