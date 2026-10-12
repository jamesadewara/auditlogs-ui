import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/auditlogs/app-shell";
import { AuditDetail } from "@/components/auditlogs/audit-detail";

const positiveInt = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export const Route = createFileRoute("/audits/$slug/integrity")({
  validateSearch: (s: Record<string, unknown>): { page?: number; verify?: boolean } => ({
    page: positiveInt(s.page),
    verify: s.verify === 1 || s.verify === "1" || s.verify === true ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Integrity | Auditlogs" },
      { name: "description", content: "Verify this audit's hash chain and checkpoint signatures." },
    ],
  }),
  component: IntegrityRoute,
});

function IntegrityRoute() {
  const { slug } = Route.useParams();
  const { page, verify } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <AppShell>
      <AuditDetail
        slug={slug}
        tab="integrity"
        checkpointsPage={page ?? 1}
        autoVerify={verify === true}
        onAutoVerified={() =>
          navigate({
            to: "/audits/$slug/integrity",
            params: { slug },
            search: { page },
            replace: true,
          })
        }
        onCheckpointsPage={(next) =>
          navigate({
            to: "/audits/$slug/integrity",
            params: { slug },
            search: { page: next },
            replace: true,
          })
        }
      />
    </AppShell>
  );
}
