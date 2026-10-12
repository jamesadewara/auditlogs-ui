import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSetArchived, useUpdateAudit } from "@/hooks/useAudit";
import { ApiError, errorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/helpers";
import type { Audit } from "@/lib/schemas";
import { LIMITS, v, useValidatedForm, type Rules } from "@/lib/validation";
import { ConfirmDialog, CopyButton, Field, Mono, Panel, StatusText, TagInput } from "./common";

type Values = { title: string; description: string; retention_days: string };
const rules: Rules<Values> = {
  title: v.text("a title", 2, LIMITS.title),
  description: v.text("description", 0, 5000, true),
  retention_days: v.positiveWholeNumber("retention"),
};

export function SettingsPage({ audit }: { audit: Audit }) {
  const navigate = useNavigate();
  const update = useUpdateAudit(audit.slug);
  const setArchived = useSetArchived(audit.slug);
  const [tags, setTags] = useState(audit.tags);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const archived = audit.status === "archived";
  const form = useValidatedForm<Values>(
    {
      title: audit.title,
      description: audit.description ?? "",
      retention_days: String(audit.retention_days),
    },
    rules,
  );

  const save = form.submit(async (values) => {
    setFormError(null);
    try {
      await update.mutateAsync({
        title: values.title.trim(),
        description: values.description.trim() || null,
        tags,
        retention_days: Number(values.retention_days),
      });
      toast.success("Changes saved");
    } catch (e) {
      if (!(e instanceof ApiError && form.applyServerErrors(e.fields)))
        setFormError(errorMessage(e));
    }
  });

  const details: [string, React.ReactNode][] = [
    ["Status", <StatusText key="s" value={audit.status} />],
    [
      "Audit ID",
      <span key="id" className="flex items-center gap-1">
        <Mono>{audit.id}</Mono>
        <CopyButton value={audit.id} label="audit id" />
      </span>,
    ],
    ["Created", formatDateTime(audit.created_at)],
    [
      "Created by",
      audit.created_by ??
        (audit.created_by_key_id ? (
          <span key="k">
            Account key <Mono>{audit.created_by_key_id}</Mono>
          </span>
        ) : (
          "Unknown"
        )),
    ],
    ["External reference", audit.external_ref ? <Mono key="e">{audit.external_ref}</Mono> : "None"],
    ["Ingestion rate tier", audit.rate_limit_tier],
    ["Last changed", formatDateTime(audit.updated_at)],
  ];

  return (
    <div className="space-y-6">
      <form noValidate onSubmit={save}>
        <Panel
          title="General"
          description="How this audit is named and how long its events are kept."
          footer={
            <>
              {formError && (
                <p role="alert" className="mr-auto text-sm text-danger">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Saving..." : "Save changes"}
              </Button>
            </>
          }
        >
          <div className="grid max-w-2xl gap-5">
            <Field label="Title" htmlFor="s-title" error={form.error("title")}>
              <Input
                id="s-title"
                name="title"
                {...form.bind("title")}
                onChange={(e) => form.set("title", e.target.value)}
              />
            </Field>
            <Field label="Description" optional htmlFor="s-desc" error={form.error("description")}>
              <Textarea
                id="s-desc"
                name="description"
                rows={3}
                {...form.bind("description")}
                onChange={(e) => form.set("description", e.target.value)}
              />
            </Field>
            <Field
              label="Tags"
              optional
              htmlFor="s-tags"
              helper="Press Enter or comma to add a tag."
            >
              <TagInput id="s-tags" value={tags} onChange={setTags} />
            </Field>
            <Field
              label="Retention in days"
              htmlFor="s-ret"
              error={form.error("retention_days")}
              helper="How long events are kept. Expired events are removed only after a signed retention checkpoint anchors the rest of the chain."
            >
              <Input
                id="s-ret"
                name="retention_days"
                inputMode="numeric"
                className="w-full sm:w-40"
                {...form.bind("retention_days")}
                onChange={(e) => form.set("retention_days", e.target.value.replace(/[^\d]/g, ""))}
              />
            </Field>
          </div>
        </Panel>
      </form>

      <Panel title="Details" description="Set by the platform. These cannot be edited." flush>
        <dl>
          {details.map(([k, val]) => (
            <div
              key={k}
              className="grid min-h-12 grid-cols-1 gap-1 border-b px-5 py-3 last:border-b-0 sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4"
            >
              <dt className="text-[13px] text-muted-foreground">{k}</dt>
              <dd className="min-w-0 wrap-break-word">{val}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {archived ? (
        <Panel
          title="Restore audit"
          description="Restoring re-enables this audit's keys so it accepts events again."
        >
          <Button
            variant="outline"
            disabled={setArchived.isPending}
            onClick={() =>
              setArchived.mutateAsync(false).then(
                () => toast.success("Audit restored"),
                (e) => toast.error(errorMessage(e)),
              )
            }
          >
            {setArchived.isPending ? "Restoring..." : "Restore audit"}
          </Button>
        </Panel>
      ) : (
        <Panel
          tone="danger"
          title="Danger zone"
          description="Archiving disables this audit's keys, so it stops accepting events. Stored events stay readable and verifiable, and you can restore it later."
        >
          <Button variant="destructive" onClick={() => setConfirmArchive(true)}>
            Archive audit
          </Button>
        </Panel>
      )}

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archive audit"
        description="Its write and read keys stop working and no new events are accepted. You can restore it later."
        confirmLabel="Archive audit"
        requireText={audit.slug}
        onConfirm={async () => {
          await setArchived.mutateAsync(true);
          toast.success("Audit archived");
          await navigate({ to: "/audits" });
        }}
      />
    </div>
  );
}
