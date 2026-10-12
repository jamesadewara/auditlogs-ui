/** Small formatting and browser helpers shared by the dashboard pages. */

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const dayMonthFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "12 Oct 2026, 09:15:02 UTC". Times are shown in UTC, the zone the services store. */
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
/** "12 Oct 2026" */
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
/** "12 Oct" for a YYYY-MM-DD day. */
export const formatDayMonth = (day: string) => dayMonthFmt.format(new Date(`${day}T00:00:00Z`));

/** First and last characters of a long hash, for tables. */
export const shortHash = (hash: string, n = 10) =>
  hash.length > 2 * n ? `${hash.slice(0, n)}...${hash.slice(-4)}` : hash;

/** Lowercase letters, digits and single hyphens, as the slug rules require. */
export function slugify(s: string, maxLength: number): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

/** "finance, payments +2" */
export function tagText(tags: string[], max = 2): string {
  if (tags.length === 0) return "";
  return tags.slice(0, max).join(", ") + (tags.length > max ? ` +${tags.length - max}` : "");
}

export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export const downloadText = (name: string, text: string, type = "text/plain") =>
  downloadBlob(name, new Blob([text], { type }));

/** The File System Access API save dialog (Chromium browsers only). */
type SavePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandle>;

/**
 * Where a download goes. "file": straight to a file the user chose, so a large
 * export never sits in memory. "memory": collected, then saved through the
 * browser's download bar (browsers without the save dialog).
 */
export type SaveTarget = { kind: "file"; handle: FileSystemFileHandle } | { kind: "memory" };

/**
 * Ask where to save a CSV. Must run straight from a click, before any request,
 * because browsers only open the dialog in response to the user. Returns null
 * when the user closes the dialog without choosing.
 */
export async function chooseCsvTarget(suggestedName: string): Promise<SaveTarget | null> {
  const picker = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  if (!picker) return { kind: "memory" };
  try {
    const handle = await picker({
      suggestedName,
      types: [{ description: "CSV file", accept: { "text/csv": [".csv"] } }],
    });
    return { kind: "file", handle };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    throw e;
  }
}

/**
 * Write a streamed response to target, reading it with read. On any failure
 * the partly written file is discarded (the browser keeps the original until
 * close succeeds) and the error is rethrown, so the user never gets a silently
 * truncated export.
 */
export async function saveStream(
  res: Response,
  target: SaveTarget,
  name: string,
  type: string,
  read: (res: Response, onChunk: (c: Uint8Array) => Promise<void> | void) => Promise<void>,
): Promise<void> {
  if (target.kind === "memory") {
    const chunks: Uint8Array[] = [];
    await read(res, (c) => {
      chunks.push(c);
    });
    downloadBlob(name, new Blob(chunks as BlobPart[], { type }));
    return;
  }
  const writable = await target.handle.createWritable();
  try {
    await read(res, (c) => writable.write(c as BlobPart));
    await writable.close();
  } catch (e) {
    await writable.abort().catch((abortError: unknown) => {
      console.error("Could not discard the incomplete file", abortError);
    });
    throw e;
  }
}

/** YYYY-MM-DD for a local calendar date (the date picker works in local dates). */
export function toDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Local calendar date for YYYY-MM-DD. */
export function fromDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
