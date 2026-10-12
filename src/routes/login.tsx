import { createFileRoute } from "@tanstack/react-router";

import { AuthPage } from "@/components/auditlogs/auth-page";

type LoginSearch = { reason?: "session-expired" | "password-changed" };

const notices: Record<NonNullable<LoginSearch["reason"]>, string> = {
  "session-expired": "Your session ended. Sign in again to continue.",
  "password-changed":
    "Your password was changed and every session was signed out. Sign in with the new password.",
};

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    reason:
      s.reason === "session-expired" || s.reason === "password-changed" ? s.reason : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in | Auditlogs" },
      { name: "description", content: "Sign in to the Auditlogs dashboard." },
    ],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  const { reason } = Route.useSearch();
  return <AuthPage mode="login" notice={reason ? notices[reason] : undefined} />;
}
