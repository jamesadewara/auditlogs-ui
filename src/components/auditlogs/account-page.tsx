import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChangePassword, useMe } from "@/hooks/useAuthMutations";
import { ApiError, errorMessage } from "@/lib/api-error";
import { formatDate } from "@/lib/helpers";
import { v, useValidatedForm, type Rules } from "@/lib/validation";
import { CopyButton, Field, InlineError, Mono, PageHeader, Panel, SkeletonRows } from "./common";

type PasswordValues = { current_password: string; new_password: string; confirm: string };
const passwordRules: Rules<PasswordValues> = {
  current_password: v.required("your current password"),
  new_password: v.required("a new password"),
  confirm: (value, all) => (value === all.new_password ? undefined : "The passwords do not match."),
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-12 grid-cols-1 gap-1 border-b px-5 py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 wrap-break-word font-medium">{children}</dd>
    </div>
  );
}

export function AccountPage() {
  const me = useMe();
  const change = useChangePassword();
  const form = useValidatedForm<PasswordValues>(
    { current_password: "", new_password: "", confirm: "" },
    passwordRules,
  );
  const [failure, setFailure] = useState<string | null>(null);

  const submit = form.submit(async (values) => {
    setFailure(null);
    try {
      await change.mutateAsync({
        current_password: values.current_password,
        new_password: values.new_password,
      });
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.status === 401 &&
        e.message.toLowerCase().includes("current password")
      ) {
        form.applyServerErrors({ current_password: e.message });
      } else if (!(e instanceof ApiError && form.applyServerErrors(e.fields))) {
        setFailure(errorMessage(e));
      }
    }
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Account"
        description="Your sign-in details and the business you belong to."
      />
      <Panel title="Profile" flush={!!me.data}>
        {me.isLoading ? (
          <SkeletonRows rows={4} />
        ) : me.error ? (
          <InlineError message={errorMessage(me.error)} onRetry={() => me.refetch()} />
        ) : me.data ? (
          <dl>
            <Row label="Email">{me.data.email}</Row>
            <Row label="Business">{me.data.business_name}</Row>
            <Row label="Business ID">
              <span className="flex items-center gap-1">
                <Mono>{me.data.business_id}</Mono>
                <CopyButton value={me.data.business_id} label="business id" />
              </span>
            </Row>
            <Row label="Member since">{formatDate(me.data.created_at)}</Row>
          </dl>
        ) : null}
      </Panel>

      <form noValidate onSubmit={submit}>
        <Panel
          title="Change password"
          description="Changing your password signs you out everywhere, including here."
          footer={
            <>
              {failure && (
                <p role="alert" className="mr-auto text-sm text-danger">
                  {failure}
                </p>
              )}
              <Button type="submit" disabled={change.isPending}>
                {change.isPending ? "Changing..." : "Change password"}
              </Button>
            </>
          }
        >
          <div className="grid max-w-md gap-4">
            <Field
              label="Current password"
              htmlFor="pw-current"
              error={form.error("current_password")}
            >
              <Input
                id="pw-current"
                name="current_password"
                type="password"
                autoComplete="current-password"
                {...form.bind("current_password")}
                onChange={(e) => form.set("current_password", e.target.value)}
              />
            </Field>
            <Field
              label="New password"
              htmlFor="pw-new"
              error={form.error("new_password")}
              helper="The service enforces its minimum length."
            >
              <Input
                id="pw-new"
                name="new_password"
                type="password"
                autoComplete="new-password"
                {...form.bind("new_password")}
                onChange={(e) => form.set("new_password", e.target.value)}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="pw-confirm" error={form.error("confirm")}>
              <Input
                id="pw-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                {...form.bind("confirm")}
                onChange={(e) => form.set("confirm", e.target.value)}
              />
            </Field>
          </div>
        </Panel>
      </form>

      <Panel
        title="Account keys"
        description="Keys your backend uses to create audits for your customers."
      >
        <Button asChild variant="outline">
          <Link to="/account-keys">Manage account keys</Link>
        </Button>
      </Panel>
    </div>
  );
}
