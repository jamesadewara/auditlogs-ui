/**
 * Copy-and-run request examples shown in the dashboard (Keys tab and Account
 * keys page). One description of the request produces every language, so the
 * examples cannot drift apart.
 *
 * Every example:
 *   - reads the key from an environment variable and stops with a clear
 *     message when it is not set (instead of sending an empty key and getting
 *     a confusing 401);
 *   - prints the status and body, and treats any status other than the
 *     expected ones as a failure.
 *
 * "curl (bash)" is for macOS, Linux and Git Bash. Windows PowerShell maps
 * `curl` to Invoke-WebRequest, so it has its own example.
 *
 * Pure functions with no imports, so scripts/check-snippets can run the exact
 * generated text against live services.
 */

interface SnippetRequest {
  /** Full URL, including the service base URL. */
  url: string;
  /** Header that carries the key, for example "X-API-Key". */
  keyHeader: string;
  /** Environment variable that holds the key. */
  keyEnv: string;
  /** Example value shape for the "set it first" hint, for example "aud_w_...". */
  keyHint: string;
  /** JSON request body. */
  body: Record<string, unknown>;
  /** Statuses that mean success, for example [202]. */
  okStatuses: number[];
  /** One line describing what success means. */
  okMeaning: string;
}

export type SnippetLanguage =
  "curl (bash)" | "PowerShell" | "JavaScript" | "Python" | "Go" | "HTTP";

const indent = (text: string, pad: string) => text.replace(/\n/g, `\n${pad}`);

/** JSON text as a Python literal (true/false/null become True/False/None outside strings). */
function pythonLiteral(json: string): string {
  return json.replace(/("(?:[^"\\]|\\.)*")|\btrue\b|\bfalse\b|\bnull\b/g, (m, str: string) =>
    str ? str : m === "true" ? "True" : m === "false" ? "False" : "None",
  );
}

function buildSnippets(r: SnippetRequest): Record<SnippetLanguage, string> {
  const pretty = JSON.stringify(r.body, null, 2);
  const compact = JSON.stringify(r.body);
  const ok = r.okStatuses;
  const okList = ok.join(" or ");

  const curl = [
    `# Set the key first: export ${r.keyEnv}="${r.keyHint}"`,
    `curl -sS -X POST "${r.url}" \\`,
    `  -H "${r.keyHeader}: \${${r.keyEnv}:?Set ${r.keyEnv} first}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -w "\\nHTTP %{http_code}\\n" \\`,
    `  -d '${compact}'`,
    `# HTTP ${okList}: ${r.okMeaning}`,
  ].join("\n");

  const powershell = [
    `# Set the key first: $env:${r.keyEnv} = "${r.keyHint}"`,
    `if (-not $env:${r.keyEnv}) { throw "Set ${r.keyEnv} first" }`,
    `$body = @'`,
    pretty,
    `'@`,
    `try {`,
    `  $res = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "${r.url}" \``,
    `    -Headers @{ "${r.keyHeader}" = $env:${r.keyEnv} } -ContentType "application/json" -Body $body`,
    `} catch {`,
    `  if (-not $_.Exception.Response) { throw }  # no response at all: network or DNS`,
    `  throw "HTTP $([int]$_.Exception.Response.StatusCode): $($_.ErrorDetails.Message)"`,
    `}`,
    `if (@(${ok.join(", ")}) -notcontains [int]$res.StatusCode) { throw "HTTP $($res.StatusCode): $($res.Content)" }`,
    `"HTTP $($res.StatusCode): $($res.Content)"`,
    `# HTTP ${okList}: ${r.okMeaning}`,
  ].join("\n");

  const javascript = [
    `// Node 18 or newer. Save as request.mjs and run: node request.mjs`,
    `const key = process.env.${r.keyEnv};`,
    `if (!key) throw new Error("Set ${r.keyEnv} first");`,
    ``,
    `const res = await fetch("${r.url}", {`,
    `  method: "POST",`,
    `  headers: { "${r.keyHeader}": key, "Content-Type": "application/json" },`,
    `  body: JSON.stringify(${indent(pretty, "  ")}),`,
    `});`,
    `const text = await res.text();`,
    `if (![${ok.join(", ")}].includes(res.status)) throw new Error(\`HTTP \${res.status}: \${text}\`);`,
    `console.log(\`HTTP \${res.status}: \${text}\`); // ${r.okMeaning}`,
  ].join("\n");

  const python = [
    `# pip install requests`,
    `import os`,
    `import requests`,
    ``,
    `key = os.environ.get("${r.keyEnv}")`,
    `if not key:`,
    `    raise SystemExit("Set ${r.keyEnv} first")`,
    ``,
    `res = requests.post(`,
    `    "${r.url}",`,
    `    headers={"${r.keyHeader}": key},`,
    `    json=${indent(pythonLiteral(pretty), "    ")},`,
    `    timeout=10,`,
    `)`,
    `if res.status_code not in (${ok.join(", ")}${ok.length === 1 ? "," : ""}):`,
    `    raise SystemExit(f"HTTP {res.status_code}: {res.text}")`,
    `print(f"HTTP {res.status_code}: {res.text}")  # ${r.okMeaning}`,
  ].join("\n");

  const go = [
    `// Save as main.go and run: go run main.go`,
    `package main`,
    ``,
    `import (`,
    `\t"bytes"`,
    `\t"fmt"`,
    `\t"io"`,
    `\t"net/http"`,
    `\t"os"`,
    `\t"time"`,
    `)`,
    ``,
    `func main() {`,
    `\tkey := os.Getenv("${r.keyEnv}")`,
    `\tif key == "" {`,
    `\t\tfail("Set ${r.keyEnv} first")`,
    `\t}`,
    `\tbody := []byte(\`${compact}\`)`,
    `\treq, err := http.NewRequest(http.MethodPost, "${r.url}", bytes.NewReader(body))`,
    `\tif err != nil {`,
    `\t\tfail(err.Error())`,
    `\t}`,
    `\treq.Header.Set("${r.keyHeader}", key)`,
    `\treq.Header.Set("Content-Type", "application/json")`,
    `\tres, err := (&http.Client{Timeout: 10 * time.Second}).Do(req)`,
    `\tif err != nil {`,
    `\t\tfail("request failed: " + err.Error())`,
    `\t}`,
    `\tdefer res.Body.Close()`,
    `\tout, err := io.ReadAll(res.Body)`,
    `\tif err != nil {`,
    `\t\tfail("reading the response failed: " + err.Error())`,
    `\t}`,
    `\tif ${ok.map((s) => `res.StatusCode != ${s}`).join(" && ")} {`,
    `\t\tfail(fmt.Sprintf("HTTP %d: %s", res.StatusCode, out))`,
    `\t}`,
    `\tfmt.Printf("HTTP %d: %s\\n", res.StatusCode, out) // ${r.okMeaning}`,
    `}`,
    ``,
    `func fail(msg string) {`,
    `\tfmt.Fprintln(os.Stderr, msg)`,
    `\tos.Exit(1)`,
    `}`,
  ].join("\n");

  const http = [
    `### For the VS Code REST Client extension. In JetBrains IDEs use {{$env.${r.keyEnv}}}.`,
    `# Set the environment variable ${r.keyEnv} before starting the editor.`,
    `POST ${r.url}`,
    `${r.keyHeader}: {{$processEnv ${r.keyEnv}}}`,
    `Content-Type: application/json`,
    ``,
    pretty,
    ``,
    `# HTTP ${okList}: ${r.okMeaning}`,
  ].join("\n");

  return {
    "curl (bash)": curl,
    PowerShell: powershell,
    JavaScript: javascript,
    Python: python,
    Go: go,
    HTTP: http,
  };
}

/** Example for POST /v1/audits/{slug}/events with a write key. */
export function sendEventSnippets(auditApiUrl: string, slug: string) {
  return buildSnippets({
    url: `${auditApiUrl}/v1/audits/${encodeURIComponent(slug)}/events`,
    keyHeader: "X-API-Key",
    keyEnv: "AUDITLOGS_WRITE_KEY",
    keyHint: "aud_w_...",
    body: {
      actor: { type: "user", id: "usr_1042", name: "Ada Obi", ip: "203.0.113.9" },
      action: "order.created",
      outcome: "success",
      resource_type: "order",
      resource_id: "ord_9001",
      resource_name: "Order #9001",
      summary: "Order created",
      changes: { after: { status: "pending", total: "49.99" } },
      source_service: "checkout",
      session_id: "sess_77f2",
      idempotency_key: "ord_9001-created",
    },
    okStatuses: [202],
    okMeaning: "queued for the hash chain",
  });
}

/** Example for POST /v1/manage/audits with an account key. */
export function provisionAuditSnippets(authApiUrl: string) {
  return buildSnippets({
    url: `${authApiUrl}/v1/manage/audits`,
    keyHeader: "X-Account-Key",
    keyEnv: "AUDITLOGS_ACCOUNT_KEY",
    keyHint: "acct_...",
    body: {
      external_ref: "customer-1042",
      title: "Customer 1042",
      slug: "customer-1042",
      retention_days: 365,
    },
    okStatuses: [201, 200],
    okMeaning: "201 created with new keys, 200 when customer-1042 already had an audit",
  });
}
