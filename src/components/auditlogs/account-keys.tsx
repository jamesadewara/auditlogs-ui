import { KeyRound, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccountKeyMutations, useAccountKeys } from "@/hooks/useAudit";
import { ApiError, errorMessage } from "@/lib/api-error";
import { AUTH_API_URL } from "@/lib/env";
import { CodeTabs } from "./code-tabs";
import { provisionAuditSnippets } from "./snippets";
import { formatDate } from "@/lib/helpers";
import type { AccountKey, AccountKeyScope } from "@/lib/schemas";
import { LIMITS, v, useValidatedForm } from "@/lib/validation";
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  InlineError,
  KeyRevealDialog,
  Mono,
  PageHeader,
  Pager,
  Panel,
  SkeletonRows,
  StatusText,
} from "./common";

const scopeInfo: { scope: AccountKeyScope; label: string; helper: string }[] = [
  { scope: "audits:create", label: "Create audits", helper: "POST /v1/manage/audits" },
  { scope: "audits:manage", label: "List and read audits", helper: "GET /v1/manage/audits" },
  {
    scope: "keys:write:issue",
    label: "Issue write keys",
    helper: "Lets the key hand out keys that send events",
  },
  {
    scope: "keys:read:issue",
    label: "Issue read keys",
    helper: "Read keys expose log data; grant only if needed",
  },
];
const scopeLabel = (s: AccountKeyScope) => scopeInfo.find((x) => x.scope === s)?.label ?? s;

/** Expiry choices offered; the service enforces its own configured maximum. */
const expiryOptions = [
  { value: "never", label: "Never", days: null },
  { value: "30", label: "30 days", days: 30 },
  { value: "90", label: "90 days", days: 90 },
  { value: "365", label: "1 year", days: 365 },
] as const;

function CreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (key: string) => void;
}) {
  const { create } = useAccountKeyMutations();
  const form = useValidatedForm(
    { name: "" },
    { name: v.text("a key name", 2, LIMITS.accountKeyName) },
  );
  const [scopes, setScopes] = useState<AccountKeyScope[]>([
    "audits:create",
    "audits:manage",
    "keys:write:issue",
  ]);
  const [expiry, setExpiry] = useState<(typeof expiryOptions)[number]["value"]>("365");
  const [failure, setFailure] = useState<string | null>(null);

  const submit = form.submit(async (values) => {
    if (scopes.length === 0) return;
    setFailure(null);
    try {
      const res = await create.mutateAsync({
        name: values.name.trim(),
        scopes,
        expires_in_days: expiryOptions.find((o) => o.value === expiry)?.days ?? null,
      });
      onOpenChange(false);
      form.reset({ name: "" });
      onCreated(res.key);
    } catch (e) {
      if (!(e instanceof ApiError && form.applyServerErrors(e.fields))) setFailure(errorMessage(e));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create account key</DialogTitle>
          <DialogDescription>
            For your backend to create audits for your own customers. It cannot send or read events.
          </DialogDescription>
        </DialogHeader>
        <form noValidate className="space-y-5" onSubmit={submit}>
          <Field
            label="Name"
            htmlFor="ak-name"
            error={form.error("name")}
            helper="Where this key is used, for example billing-service-prod."
          >
            <Input
              id="ak-name"
              name="name"
              autoComplete="off"
              className="h-10"
              {...form.bind("name")}
              onChange={(e) => form.set("name", e.target.value)}
            />
          </Field>
          <fieldset className="space-y-3">
            <legend className="mb-2 font-medium">Permissions</legend>
            {scopeInfo.map((s) => (
              <label key={s.scope} className="flex items-start gap-2">
                <Checkbox
                  className="mt-0.5"
                  checked={scopes.includes(s.scope)}
                  onCheckedChange={(c) =>
                    setScopes(c ? [...scopes, s.scope] : scopes.filter((x) => x !== s.scope))
                  }
                />
                <span>
                  {s.label}
                  <span className="block text-xs text-muted-foreground">{s.helper}</span>
                </span>
              </label>
            ))}
            {form.submitted && scopes.length === 0 && (
              <p className="text-xs text-danger">Choose at least one permission.</p>
            )}
          </fieldset>
          <Field label="Expires">
            <Select value={expiry} onValueChange={(x) => setExpiry(x as typeof expiry)}>
              <SelectTrigger aria-label="Expiry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {expiryOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {failure && (
            <p role="alert" className="text-sm text-danger">
              {failure}
            </p>
          )}
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountKeys() {
  const [page, setPage] = useState(1);
  const keys = useAccountKeys(page);
  const { revoke } = useAccountKeyMutations();
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<AccountKey | null>(null);

  return (
    <>
      <PageHeader
        title="Account keys"
        description="Keys your backend uses to create and manage audits programmatically, one per customer. They cannot send or read audit events."
        action={<Button onClick={() => setCreating(true)}>Create account key</Button>}
      />
      {keys.isLoading ? (
        <SkeletonRows rows={3} />
      ) : keys.error ? (
        <InlineError message={errorMessage(keys.error)} onRetry={() => keys.refetch()} />
      ) : !keys.data?.count ? (
        <EmptyState
          icon={KeyRound}
          sentence="No account keys yet. Create one to provision audits from your backend."
          action={<Button onClick={() => setCreating(true)}>Create account key</Button>}
        />
      ) : (
        <DataTable<AccountKey>
          rows={keys.data.results}
          rowKey={(k) => k.id}
          columns={[
            { header: "Name", cell: (k) => <span className="font-medium">{k.name}</span> },
            { header: "Key", cell: (k) => <Mono>{`acct_...${k.last4}`}</Mono> },
            {
              header: "Permissions",
              cell: (k) => (
                <span className="text-text-secondary">{k.scopes.map(scopeLabel).join(", ")}</span>
              ),
            },
            {
              header: "Expires",
              cell: (k) => (
                <span className="whitespace-nowrap">
                  {k.expires_at ? formatDate(k.expires_at) : "Never"}
                </span>
              ),
            },
            {
              header: "Status",
              cell: (k) => (
                <StatusText
                  value={
                    k.expires_at && k.status === "active" && Date.parse(k.expires_at) < Date.now()
                      ? "expired"
                      : k.status
                  }
                />
              ),
            },
            {
              header: "",
              className: "w-12 text-right",
              cell: (k) =>
                k.status === "revoked" ? null : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Actions for ${k.name}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-danger focus:text-danger"
                        onClick={() => setRevoking(k)}
                      >
                        Revoke key
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ),
            },
          ]}
        />
      )}
      {!!keys.data?.count && (
        <Pager
          label={`Page ${keys.data.page} of ${Math.max(1, keys.data.total_pages)}, ${keys.data.count.toLocaleString()} account keys`}
          onNewer={page > 1 ? () => setPage(page - 1) : undefined}
          onOlder={page < keys.data.total_pages ? () => setPage(page + 1) : undefined}
        />
      )}

      <Panel
        className="mt-6"
        title="Example"
        description="Provision one audit per customer from your backend. Repeating a request with the same external_ref is safe."
      >
        <CodeTabs code={provisionAuditSnippets(AUTH_API_URL)} />
      </Panel>

      <CreateDialog open={creating} onOpenChange={setCreating} onCreated={setRevealed} />
      <KeyRevealDialog
        open={!!revealed}
        title="Store your account key now"
        note="Only a hash is stored, so this key cannot be shown again."
        keys={revealed ? [{ label: "Account key", value: revealed }] : []}
        doneLabel="I have saved the key"
        onDone={() => setRevealed(null)}
      />
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title="Revoke account key"
        description={
          <>
            Requests using <span className="font-medium">{revoking?.name}</span> are rejected from
            now on. Audits it created are not affected.
          </>
        }
        confirmLabel="Revoke key"
        onConfirm={async () => {
          if (revoking) await revoke.mutateAsync(revoking.id);
        }}
      />
    </>
  );
}
