import { createFileRoute, redirect } from "@tanstack/react-router";

// The dashboard home is the audit list; AppShell sends signed-out visitors to /login.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/audits" });
  },
});
