import { Copy, Search, X, type LucideIcon } from "lucide-react";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

export { errorMessage };

// ---------- layout ----------
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * A titled surface: the building block of every page. The header holds the
 * title, an optional one-line description and an optional action; the body is
 * padded, or flush when it is a table that should run edge to edge.
 */
export function Panel({
  title,
  description,
  action,
  footer,
  flush,
  tone,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  tone?: "danger";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        tone === "danger" && "border-danger/30",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {description && (
              <p className="mt-0.5 max-w-2xl text-[13px] text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
        </div>
      )}
      <div className={flush ? undefined : "p-5"}>{children}</div>
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t bg-muted px-5 py-3">
          {footer}
        </div>
      )}
    </section>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap font-mono text-[13px]", className)}>{children}</span>
  );
}

// ---------- status ----------
export type Tone = "success" | "danger" | "warning" | "muted";
/** Colour of the status dot for a status value from either service. */
function toneFor(value: string): Tone {
  switch (value.toLowerCase()) {
    case "intact":
    case "active":
    case "success":
      return "success";
    case "tampered":
    case "revoked":
    case "failure":
      return "danger";
    case "archived":
    case "expired":
    case "not verified":
      return "warning";
    default:
      return "muted";
  }
}
const dot: Record<Tone, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  muted: "bg-muted-foreground",
};
/** Status as a coloured dot plus text (the UI rules forbid badges and pills). */
export function StatusText({
  value,
  label,
  detail,
  className,
}: {
  value: string;
  label?: string;
  detail?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dot[toneFor(value)])} />
      <span>{label ?? value.charAt(0).toUpperCase() + value.slice(1)}</span>
      {detail && <span className="text-muted-foreground">{detail}</span>}
    </span>
  );
}

// ---------- copy / code ----------
function copy(value: string) {
  if (!navigator.clipboard) {
    toast.error("Copying is not available in this browser. Select the text and copy it manually.");
    return;
  }
  navigator.clipboard.writeText(value).then(
    () => toast("Copied", { duration: 1400 }),
    () => toast.error("Could not copy. Select the text and copy it manually."),
  );
}
export function CopyButton({
  value,
  label = "value",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-7 shrink-0 text-muted-foreground", className)}
      aria-label={`Copy ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        copy(value);
      }}
    >
      <Copy />
    </Button>
  );
}
export function CodeBlock({
  code,
  copyValue = code,
  copyLabel = "code",
}: {
  code: string;
  copyValue?: string;
  copyLabel?: string;
}) {
  return (
    <div className="relative rounded-md border bg-code">
      <pre className="overflow-x-auto p-4 pr-12 font-mono text-xs leading-5 text-code-foreground">
        {code}
      </pre>
      <CopyButton value={copyValue} label={copyLabel} className="absolute right-2 top-2" />
    </div>
  );
}

// ---------- inputs ----------
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}
export function Field({
  label,
  helper,
  error,
  children,
  htmlFor,
  optional,
  count,
  max,
  valid,
}: {
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  optional?: boolean;
  count?: number;
  max?: number;
  valid?: boolean;
}) {
  const over = max !== undefined && count !== undefined && count > max;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="font-medium">
          {label}
          {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
        </label>
        {max !== undefined && count !== undefined && (
          <span
            className={cn("text-xs tabular-nums", over ? "text-danger" : "text-muted-foreground")}
          >
            {count.toLocaleString()} / {max.toLocaleString()}
          </span>
        )}
      </div>
      {children}
      <div
        className="min-h-4 text-xs"
        aria-live="polite"
        id={htmlFor ? `${htmlFor}-msg` : undefined}
      >
        {error ? (
          <span className="flex items-start gap-1.5 text-danger">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-danger" aria-hidden />
            {error}
          </span>
        ) : valid ? (
          <span className="flex items-start gap-1.5 text-success">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-success" aria-hidden />
            {helper ?? "Looks good"}
          </span>
        ) : helper ? (
          <span className="text-muted-foreground">{helper}</span>
        ) : null}
      </div>
    </div>
  );
}
export function TagInput({
  value,
  onChange,
  id,
  max = 10,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  id?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const full = value.length >= max;
  const add = () => {
    const t = draft.trim().replace(/\s+/g, " ");
    if (!t) return;
    if (t.length > 32) {
      setError("Tags must be 32 characters or fewer.");
      return;
    }
    if (full) {
      setError(`Use at most ${max} tags.`);
      return;
    }
    if (value.some((x) => x.toLowerCase() === t.toLowerCase())) {
      setError("This tag is already added.");
      return;
    }
    onChange([...value, t]);
    setError("");
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20">
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex h-6 max-w-full items-center gap-1 rounded-sm bg-secondary pl-2 pr-1 text-xs"
        >
          <span className="truncate">{t}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${t}`}
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="size-5 rounded-sm p-0.5 text-muted-foreground"
          >
            <X className="size-3" />
          </Button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        maxLength={32}
        disabled={full}
        placeholder={
          full ? `Maximum of ${max} tags` : value.length ? "" : "Type a tag and press Enter"
        }
        onChange={(e) => {
          setDraft(e.target.value.replace(",", ""));
          setError("");
        }}
        onKeyDown={onKey}
        onBlur={add}
        className="h-7 min-w-32 flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        aria-label="Add tag"
      />
      {error && (
        <span className="w-full text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// ---------- states ----------
export function EmptyState({
  icon: Icon,
  sentence,
  action,
}: {
  icon: LucideIcon;
  sentence: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card px-6 py-14 text-center">
      <div className="flex size-10 items-center justify-center rounded-full border bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="max-w-sm text-text-secondary">{sentence}</p>
      {action}
    </div>
  );
}
export function InlineError({
  message,
  onRetry,
  title = "Failed to load",
}: {
  message: string;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div className="rounded-lg border border-danger/25 bg-danger-soft px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-danger/10">
          <span className="size-2 rounded-full bg-danger" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-text-secondary">{message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          Try again
        </Button>
      </div>
    </div>
  );
}
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-secondary animate-pulse", className)} />;
}
export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}
/** Skeleton for the audit detail header + tab content area */
export function SkeletonDetail() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-44" />
      </div>
      <Skeleton className="h-6 w-24" />
    </div>
  );
}
/** Skeleton for the Overview page: stat cards + chart + table */
export function SkeletonOverview() {
  return (
    <div className="space-y-12">
      <div className="flex gap-16">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-56 w-full" />
      </div>
      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <SkeletonRows rows={4} />
        </div>
      </div>
    </div>
  );
}
/** Skeleton for the Events page: filters + table rows */
export function SkeletonEvents() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>
      <SkeletonRows rows={10} />
    </div>
  );
}
/** Skeleton for the Keys page: key table + code snippet */
export function SkeletonKeys() {
  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <SkeletonRows rows={2} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    </div>
  );
}
/** Skeleton for the Settings page: form fields */
export function SkeletonSettings() {
  return (
    <div className="max-w-[560px] space-y-12">
      <div className="space-y-5">
        {["w-full", "w-full", "w-32"].map((w, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className={`h-10 ${w}`} />
          </div>
        ))}
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  );
}
/** Skeleton for the Integrity page */
export function SkeletonIntegrity() {
  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <SkeletonRows rows={3} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-24 w-full rounded-md" />
      </div>
    </div>
  );
}
/** Skeleton for the Audits List page */
export function SkeletonAuditsList() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row">
        <Skeleton className="h-10 md:w-72" />
        <Skeleton className="h-10 md:w-44" />
        <Skeleton className="h-10 md:w-44" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

// ---------- table ----------
export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  align?: "right";
  className?: string;
};
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  bare,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Drop the outer frame, for a table that sits flush inside a Panel. */
  bare?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-full overflow-x-auto",
        !bare && "rounded-lg border bg-card",
        "[&_tbody_tr:last-child_td]:border-b-0",
      )}
    >
      <table className="w-full md:max-lg:text-xs">
        <thead className="bg-muted">
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                className={cn("md:max-lg:px-2", c.align === "right" && "text-right", c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn("hover:bg-muted", onRowClick && "cursor-pointer")}
            >
              {columns.map((c, i) => (
                <td
                  key={i}
                  className={cn(
                    "md:max-lg:px-2 md:max-lg:[&_span.font-mono]:text-xs",
                    c.align === "right" && "text-right tabular-nums",
                    c.className,
                  )}
                >
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pager({
  label,
  onNewer,
  onOlder,
}: {
  label?: string;
  onNewer?: () => void;
  onOlder?: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <span className="text-muted-foreground tabular-nums">{label}</span>
      <div className="flex gap-2">
        <Button variant="outline" disabled={!onNewer} onClick={onNewer}>
          Previous
        </Button>
        <Button variant="outline" disabled={!onOlder} onClick={onOlder}>
          Next
        </Button>
      </div>
    </div>
  );
}

// ---------- dialogs ----------
export function KeyRevealDialog({
  open,
  title,
  note,
  keys,
  doneLabel,
  onDone,
}: {
  open: boolean;
  title: string;
  note: string;
  keys: { label: string; value: string }[];
  /** Text of the closing button, phrased as the user's confirmation, e.g. "I have saved the key". */
  doneLabel: string;
  onDone: () => void;
}) {
  // Every deliberate close (the button, the X, Escape) calls onDone, so the
  // dialog can never trap the user. Only a click outside is ignored, because
  // a stray click must not throw away keys that cannot be shown again.
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDone()}>
      <DialogContent className="max-w-[560px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{note}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {keys.map((k) => (
            <div key={k.label}>
              <div className="mb-1.5 text-sm font-medium">{k.label}</div>
              <div className="flex items-start gap-2 rounded-md border bg-code p-3">
                <Mono className="min-w-0 flex-1 break-all text-[13px] leading-5 select-all">
                  {k.value}
                </Mono>
                <CopyButton value={k.value} label={k.label.toLowerCase()} />
              </div>
            </div>
          ))}
        </div>
        <p className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm">
          This is the only time {keys.length > 1 ? "these keys are" : "this key is"} shown. Copy{" "}
          {keys.length > 1 ? "them" : "it"} into your secret manager before closing.
        </p>
        <DialogFooter>
          <Button className="w-full sm:w-auto" onClick={onDone}>
            {doneLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Confirmation for a destructive action. The dialog stays open while the action
 * runs; on failure it shows the server's message and stays open, so a failed
 * revoke or archive never looks like it worked.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  requireText,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  requireText?: string;
  onConfirm: () => Promise<unknown>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setText("");
      setFailure(null);
    }
  }, [open]);
  async function confirm() {
    setBusy(true);
    setFailure(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {requireText && (
          <Field label={`Type ${requireText} to confirm`} htmlFor="confirm-text">
            <Input
              id="confirm-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
            />
          </Field>
        )}
        {failure && (
          <p role="alert" className="text-sm text-danger">
            {failure}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy || (!!requireText && text !== requireText)}
            onClick={confirm}
          >
            {busy ? "Working..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
