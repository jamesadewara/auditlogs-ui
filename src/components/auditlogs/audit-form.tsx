import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAudit } from "@/hooks/useAudit";
import { ApiError, errorMessage } from "@/lib/api-error";
import { slugify } from "@/lib/helpers";
import { LIMITS, v, useValidatedForm, type Rules } from "@/lib/validation";
import { Field, KeyRevealDialog, PageHeader, Panel, TagInput } from "./common";

type Values = {
  title: string;
  slug: string;
  description: string;
  retention_days: string;
  external_ref: string;
};

const rules: Rules<Values> = {
  title: v.text("a title", 2, LIMITS.title),
  slug: v.slug,
  description: v.text("description", 0, 5000, true),
  retention_days: v.positiveWholeNumber("retention"),
  external_ref: v.text("external reference", 1, LIMITS.externalRef, true),
};

export function AuditForm() {
  const navigate = useNavigate();
  const create = useCreateAudit();
  const f = useValidatedForm<Values>(
    { title: "", slug: "", description: "", retention_days: "", external_ref: "" },
    rules,
  );
  const [slugEdited, setSlugEdited] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ slug: string; writeKey: string; readKey: string } | null>(
    null,
  );

  const onSubmit = f.submit(async (values) => {
    setFormError(null);
    try {
      const res = await create.mutateAsync({
        title: values.title.trim(),
        slug: values.slug,
        description: values.description.trim() || null,
        tags,
        retention_days: Number(values.retention_days),
        external_ref: values.external_ref.trim() || null,
      });
      if (!res.created) {
        // Same external reference as an existing audit: nothing new was created and no keys were issued.
        toast.info(`An audit with this external reference already exists: ${res.audit.slug}.`);
        await navigate({ to: "/audits/$slug/overview", params: { slug: res.audit.slug } });
        return;
      }
      if (res.write_key === null || res.read_key === null) {
        throw new Error(
          "The audit was created but its keys were not returned. Issue new keys from the Keys tab.",
        );
      }
      setIssued({ slug: res.audit.slug, writeKey: res.write_key, readKey: res.read_key });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.message.toLowerCase().includes("slug")) {
        f.applyServerErrors({ slug: e.message });
      } else if (!(e instanceof ApiError && f.applyServerErrors(e.fields))) {
        setFormError(errorMessage(e));
      }
    }
  });

  return (
    <>
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Create audit"
          description="An audit is one tamper-evident event log. You get a write key to send events and a read key to query them."
        />
        <form noValidate onSubmit={onSubmit}>
          <Panel
            footer={
              <>
                {formError && (
                  <p role="alert" className="mr-auto text-sm text-danger">
                    {formError}
                  </p>
                )}
                <Button type="button" variant="outline" onClick={() => navigate({ to: "/audits" })}>
                  Cancel
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Creating audit..." : "Create audit"}
                </Button>
              </>
            }
          >
            <div className="grid max-w-xl gap-5">
              <Field label="Title" htmlFor="title" error={f.error("title")}>
                <Input
                  id="title"
                  name="title"
                  autoFocus
                  autoComplete="off"
                  {...f.bind("title")}
                  onChange={(e) => {
                    f.set("title", e.target.value);
                    if (!slugEdited) f.set("slug", slugify(e.target.value, LIMITS.slug));
                  }}
                />
              </Field>
              <Field
                label="Slug"
                htmlFor="slug"
                helper="Lowercase letters, numbers and hyphens. Used in API paths and cannot be changed later."
                error={f.error("slug")}
              >
                <Input
                  id="slug"
                  name="slug"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                  {...f.bind("slug")}
                  onChange={(e) => {
                    setSlugEdited(true);
                    f.set(
                      "slug",
                      e.target.value
                        .toLowerCase()
                        .replace(/\s/g, "-")
                        .replace(/[^a-z0-9-]/g, ""),
                    );
                    f.touch("slug");
                  }}
                />
              </Field>
              <Field
                label="Description"
                optional
                htmlFor="description"
                error={f.error("description")}
              >
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  {...f.bind("description")}
                  onChange={(e) => f.set("description", e.target.value)}
                />
              </Field>
              <Field
                label="Tags"
                optional
                htmlFor="tags"
                helper="Press Enter or comma to add a tag."
              >
                <TagInput id="tags" value={tags} onChange={setTags} />
              </Field>
              <Field
                label="Retention in days"
                htmlFor="retention_days"
                error={f.error("retention_days")}
                helper="How long events are kept. The service enforces its configured minimum and maximum."
              >
                <Input
                  id="retention_days"
                  name="retention_days"
                  inputMode="numeric"
                  className="w-full sm:w-40"
                  {...f.bind("retention_days")}
                  onChange={(e) => f.set("retention_days", e.target.value.replace(/[^\d]/g, ""))}
                />
              </Field>
              <Field
                label="External reference"
                optional
                htmlFor="external_ref"
                error={f.error("external_ref")}
                helper="Your own identifier for this audit, for example a customer id. Creating again with the same reference returns the existing audit."
              >
                <Input
                  id="external_ref"
                  name="external_ref"
                  autoComplete="off"
                  className="font-mono"
                  {...f.bind("external_ref")}
                  onChange={(e) => f.set("external_ref", e.target.value)}
                />
              </Field>
            </div>
          </Panel>
        </form>
      </div>
      <KeyRevealDialog
        open={!!issued}
        title="Store your keys now"
        note="Only a hash of each key is stored, so they cannot be shown again. If you lose one, rotate it from the Keys tab."
        keys={
          issued
            ? [
                { label: "Write key (send events)", value: issued.writeKey },
                { label: "Read key (query and verify)", value: issued.readKey },
              ]
            : []
        }
        doneLabel="I have saved both keys"
        onDone={() => {
          // Close first so the dialog can never stay open, even if navigation fails.
          const slug = issued?.slug;
          setIssued(null);
          if (slug) void navigate({ to: "/audits/$slug/overview", params: { slug } });
        }}
      />
    </>
  );
}
