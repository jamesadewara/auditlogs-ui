# Audit Logs

Build a front-end-only web app (not a website: no landing page, no marketing pages) that is a UI blueprint for a multi-tenant audit logging platform. Businesses create audits, send events to them over an API, and review events, integrity checks, and compliance status in a dashboard. Use React, TypeScript, Tailwind, shadcn/ui, React Router, Recharts, and lucide-react icons. All data is dummy data. There is no backend. Any email and password signs in.

RULES THAT APPLY EVERYWHERE
- No gradients anywhere: not in backgrounds, buttons, charts, logos, or avatars. Flat colours only.
- No badges or pills in or next to page headings. Statuses inside tables and panels are shown as a coloured dot plus text.
- No filler text. No lorem ipsum, slogans, or descriptions that repeat the title. Add a one-line description under a page title only when it gives information the title does not.
- Sentence case. No exclamation marks. No emojis. No illustrations. Empty states use one icon, one sentence, and one action.
- Buttons are verb plus object: "Create audit", "Verify now", "Revoke key".
- Numbers use thousands separators. Dates look like "20 Sept 2026, 08:05:52". Relative time is used only for "verified 4 minutes ago" and "last used".
- Do not add: pricing, billing, team management, notifications, dark mode, global search, onboarding tours, or any page not listed below.

DESIGN TOKENS
- Font: Inter for UI. JetBrains Mono for IDs, hashes, keys, and code.
- Primary #4338CA, hover #3730A3, selected or active background #EEF2FF.
- Text #0F172A, secondary text #475569, muted #64748B. Border #E2E8F0. Page background #F8FAFC. Surface #FFFFFF.
- Success #15803D on #F0FDF4. Danger #B91C1C on #FEF2F2. Warning #B45309 on #FFFBEB.
- Base text 14px. Table rows 44px high. Radius 8px. Cards use a 1px border and no shadow. Focus rings are visible. Status is never conveyed by colour alone.
- Charts use flat fills: primary for volume, danger for failures, slate for secondary series.

STRUCTURE
- Routes: /login, /register, /audits, /audits/new, /audits/:slug with nested tabs (overview, events, integrity, keys, access-log, settings), and /account-keys.
- Put all mock data in src/data. Put an async API layer in src/lib/api.ts (listAudits, getAudit, createAudit, listEvents with filters and a cursor, getEvent, verifyAudit, listCheckpoints, listKeys, rotateKey, revokeKey, listAccessLog, listAccountKeys, createAccountKey) that resolves after 300 to 600 ms, so real endpoints can replace it later.
- Event type: event_id, seq, occurred_at, recorded_at, actor {type, id, name, ip, user_agent}, action, outcome (success or failure), resource {type, id}, summary, changes {before, after}, metadata, request_id, prev_hash, hash.
- Use a seeded generator so totals in the list, the overview, and the charts always agree.

APP SHELL
- Left sidebar 240px: wordmark "Auditrail" with a small flat primary square, nav items "Audits" and "Account keys", and at the bottom the business name "Kasuvia" and user "Ada Okafor" with a menu containing "Sign out".
- The top bar shows breadcrumbs only. Below 1024px the sidebar collapses to an icon menu.

PAGES
1. /login and /register: a centred 400px card. Login has email, password, "Sign in", and a link to register. Register has business name, email, password, "Create account", and a link to login. Nothing else on the page.

2. /audits: title "Audits" and a primary button "Create audit". Toolbar: search (title or slug), tag filter, integrity filter (All, Intact, Tampered, Not verified). Table columns: Audit (title, with the slug in mono and muted below), Tags (show two, then "+n"), Events, Integrity (dot and text, with "verified 4 minutes ago" muted), Retention (for example "365 days"), Created. Clicking a row opens the audit. Include an empty state for no audits.

3. /audits/new: single-column form, 560px. Fields: Title (required); Slug (auto-filled from the title, editable, helper "Lowercase letters, numbers, and hyphens. Used in API paths." and an inline "already in use" error); Description (optional); Tags (chip input); Retention in days (default 365); Compliance frameworks (checkboxes: PCI DSS, ISO/IEC 27001, SOC 2, NDPA 2023). Buttons: "Cancel", "Create audit". After submit, show a dialog titled "Copy your keys" with a Write key and a Read key, each with a copy button, the line "These keys are shown once.", and a required checkbox "I have stored both keys" that enables "Done". Done opens the new audit.

4. /audits/:slug header: audit title, slug in mono with a copy button, tags, a line "Integrity: Intact, verified 4 minutes ago" (dot plus text), and a secondary button "Verify now". Tabs: Overview, Events, Integrity, Keys, Access log, Settings.
 - Overview: four stat blocks (Total events, Last 24 hours, Last checkpoint as "#12,400, 4 minutes ago", Retention as "365 days"). Below, a 2x2 grid of panels: "Events per day" (last 14 days, vertical bars), "Events by action" (horizontal bars), "Failed events per day" (bars in danger), and "Most active actors" (name, events, failures). If the audit has zero events, show an empty state that links to the Keys tab.
 - Events: filters for search, date range, action, outcome, and actor; an "Export" menu (CSV, JSON). Table columns: When, Action (mono), Actor (name, with the type muted), Resource (type and id), Outcome (dot plus text). Newer and Older buttons for pagination. Clicking a row opens a right-hand drawer (480px) with the header (action, outcome, time) and these sections: Who (actor type, actor ID, name); Where (IP address, browser, operating system; show "Not captured" when missing); Target (resource type, resource ID); Changes (a before and after table listing only fields that changed); Additional context (key and value list); Chain (sequence number, hash, previous hash, recorded at, occurred at, and the masked key it was sent with); Reference (event ID, request ID). Hashes and IDs are mono with copy buttons. Esc closes the drawer.
 - Integrity: a verification panel with the last result and a "Verify now" button. While running, show a progress bar and "Checked 8,200 of 12,480 events". Result states: Intact ("12,480 events checked. Every hash matches and all checkpoint signatures are valid."), and Tampered ("Tampered at event #1,042", then a two-column list of the expected hash and the found hash, the range affected as "#1,042 onward", and a "Download verification report" button). Below: a "Checkpoints" table (Sequence, Hash truncated with copy, Type: Periodic or Retention, Signed at, Key ID, Signature: Valid) and a "Public key" panel with the key ID, the key in mono, and buttons "Copy" and "Download".
 - Keys: an "Audit keys" table (Type: Write or Read; Key masked like aud_w_••••Xk4p; Created; Last used; Status; a row menu with "Rotate key" and "Revoke key") and a "Create key" button. Rotate opens a dialog that shows the new key once and says "The old key stops working in 24 hours." Revoke asks for confirmation. Below the table, a "Send an event" panel with code tabs (curl, JavaScript, Python) that show POST /v1/audits/{slug}/events with an Authorization header using YOUR_WRITE_KEY and a sample event body, plus a copy button.
 - Access log: table with When, Who (user or key), Action (Viewed events, Exported CSV, Verified integrity, Rotated key, Changed settings), and IP address. Newer and Older buttons.
 - Settings: an editable form (title, description, tags, retention days with the helper "Shortening retention removes older events after the next signed checkpoint.", compliance frameworks) and a "Save changes" button. Read-only rows: Created, Created by (either "Dashboard, ada@kasuvia.com" or "Account key: onboarding-service"), and External reference. A separate "Archive audit" section with a destructive button that requires typing the slug to confirm, and the text "An archived audit stops accepting events."

5. /account-keys: title "Account keys", with the one-line description "Create and manage audits from your backend. These keys cannot send or read events." and a primary button "Create account key". Table columns: Name, Key (masked like acct_••••7Qm2), Scopes (comma-separated text), Created, Last used, Expires, Status, and a row menu with "Revoke key". The create dialog has Name; Scopes as checkboxes with plain labels ("Create audits", "Manage audits", "Issue write keys", "Issue read keys" with the helper "Lets this key grant read access to log data" and unchecked by default); and Expiry (Never, 30 days, 90 days, 1 year). The key is shown once, as in the audit key flow. Under the table, a collapsible "Create an audit from your backend" panel with a code sample of POST /v1/manage/audits including title, slug, external_ref, and retention_days.

DUMMY DATA
- Business "Kasuvia". User "Ada Okafor". Team names: Ada Okafor, Tunde Bello, Ngozi Eze, Ibrahim Musa, Chioma Nwosu.
- Six audits: "Store sign-ins" (store-sign-ins, 12,480 events, Intact, 365 days); "API key changes" (api-key-changes, 236, Intact, 730 days); "Payment approvals" (payment-approvals, 3,912, Tampered at #1,042, 1,825 days, tags include PCI DSS); "Order status changes" (order-status-changes, 48,203, Intact, 180 days); "Adaeze Fabrics" (adaeze-fabrics, 1,204, Not verified, 365 days, created by account key onboarding-service, external reference kasuvia-store-1042); "Lagos Gadgets Hub" (lagos-gadgets-hub, 87, Intact, 365 days, same account key).
- Events span 7 to 20 Sept 2026. Actions include auth.login (success and failure, with a failure reason in metadata), api_key.regenerated (changes show only masked before and after keys such as ****abcd and ****1VIs), order.status_changed, payout.approved, and member.role_changed. Use IP addresses from 203.0.113.0/24 and 198.51.100.0/24, browsers such as Chrome 128 on Windows 11, Safari 17 on iOS 17, and Firefox 130 on Ubuntu, and leave at least one event with no IP address or browser.
- Two account keys: "onboarding-service" (Create audits, Issue write keys; last used 2 hours ago; never expires) and "reporting-sync" (Manage audits; revoked).

STATES
- Loading: flat grey skeletons. Errors: an inline message with "Retry". Copy actions show a small "Copied" confirmation. Destructive actions always ask for confirmation. Filters are stored in the URL.
- Desktop first, and usable on tablet and phone.

## Development

Prefer working locally? You need Bun or Node.js:

```sh
bun install
bun run dev
```
