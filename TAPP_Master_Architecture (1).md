# TAPP (Tycoon App) — Master Architecture & Build Plan

**Client:** Tycoon Oil and Gas (subsidiary of Tycoon Group of Companies)
**Prepared by:** Helioconvrt / Ceejay Ginger
**Status:** Pre-build. This document is the single source of truth for scope. Any feature, screen, or table not listed here is out of scope until this document is updated.

---

## 1. Mission Statement

TAPP is an internal operations tool, not a public-facing app. It gives Tycoon Oil and Gas real-time, accountable visibility into stock, sales, expenses, and profitability across every fuel station it operates, and it replaces manual reporting with a system that calculates everything from a permanent transaction history.

The end users are Tycoon's own staff: station managers, admin/ownership, and any read-only stakeholders (accountants, family, investors). Nobody outside the organization ever sees this app.

---

## 2. Two Decisions That Must Be Locked Before Phase 1

The original brief flags these as open. Building without answering them means the profit numbers cannot be trusted, so they are resolved here with a recommended default. If Tycoon's ownership objects to either, change this section before Phase 1 starts. Do not let Phase 1 begin with either of these still undecided.

**A. Costing method (how a litre's cost is calculated for profit math)**
Recommendation: **Weighted Average Cost.** Fuel from different supply batches physically mixes in the same underground tank, so there is no real way to know which specific litre was sold first, which rules out FIFO (first-in-first-out) as a meaningful model. Weighted average is both the more accurate reflection of reality and the simpler calculation: every time a new supply batch is accepted, recompute the station's average cost per litre as `((old stock quantity × old average cost) + (new quantity × new cost)) / (old quantity + new quantity)`. Every sale then deducts at that current average cost.

**B. Opening stock (what a station's balance is on day one in TAPP)**
Recommendation: a one-time **Opening Balance** transaction type, entered by an Admin per station per product when that station is onboarded. It behaves like a supply entry (adds to the ledger, carries a cost-per-litre for the weighted average calculation) but skips the manager-acceptance step, since it represents a physical count on the ground rather than a new delivery. It still gets logged in the audit trail like everything else.

---

## 3. User Roles & Permission Matrix

| Capability | Manager | Admin | Viewer (default) | Viewer (with Supply permission) |
|---|---|---|---|---|
| View own station dashboard | Yes | Yes (any) | Yes (any) | Yes (any) |
| Submit sales / expenses | Own station only | No | No | No |
| Accept / reject supply | Own station only | No | No | No |
| Send supply to a station | No | Yes | No | Yes |
| Edit/correct a submitted record | No | Yes, only after manager confirms an error | No | No |
| Create / remove user accounts | No | Yes | No | No |
| Assign roles & station assignment | No | Yes | No | No |
| Grant extra permissions to viewers | No | Yes | No | No |
| View urgent-stations list | Own station only | Yes | Yes | Yes |
| View PNL report | Own station only | All stations | All stations | All stations |

Permissions are enforced at the database level (see Section 5, Row Level Security), never only by hiding a button in the interface. A manager who guesses another station's web address must still be blocked by the database itself.

---

## 4. Core Data Model

This is the entity list Gemini and Antigravity must build against. Names below are the canonical table names; do not rename them mid-build.

- **organizations** — placeholder for future multi-company use, but V1 hardcodes a single row for Tycoon Oil and Gas. Included now so V2 will not require restructuring every other table.
- **stations** — one row per fuel station (name, location, status).
- **products** — fuel types sold (e.g. PMS/petrol, diesel, gas), shared across all stations.
- **users** — account records, linked to Supabase Auth (see Section 5), each with a role.
- **station_assignments** — links a Manager user to exactly one station; links a Viewer to the stations they are allowed to see if access is ever restricted beyond "all stations."
- **supply_transactions** — every supply event: station, product, quantity, cost price, supplier, date, initiator, status (`pending`, `accepted`, `rejected`), and, once accepted, who accepted it and when.
- **sales_transactions** — every daily sales submission: station, product, date, quantity sold, selling price/revenue, submitted-by, timestamp.
- **expenses** — station, expense type, amount, date, description, submitted-by, timestamp.
- **corrections** — a linked record whenever an Admin edits a sales, expense, or supply entry, storing the original value, the new value, who changed it, and when. Originals are never deleted, only superseded and logged.
- **stock_ledger** — this is not a table you write to directly. It is a calculated view (or a value refreshed by a database trigger) built from `supply_transactions` (accepted only) minus `sales_transactions`, per station, per product. This is the technical meaning of "stock is never a stored, manually edited figure."
- **urgency_config** — the Green/Yellow/Red day thresholds, stored as data so an Admin can change them later without a code deployment.
- **notifications** — title, message, type, recipient, related station/product, read/unread, timestamp.
- **audit_log** — a system-wide table capturing who did what, when, on which record, for every write action in the app. This is separate from `corrections`, which is specific to manager-confirmed edits; `audit_log` covers everything, including logins, permission changes, and supply accept/reject actions.
- **pnl_snapshots** — a stored record of each month's generated PNL report per station, so historical reports remain stable even if underlying calculation logic changes in a later version.

---

## 5. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | Next.js (a React framework) | Renders fast, works well with Supabase's client libraries, and is what Antigravity has already been generating successfully on the Tycoon Group portfolio build. |
| Styling | Tailwind CSS | Utility-based styling, keeps the codebase consistent and easy for Antigravity to generate predictably. |
| Backend & database | Supabase (hosted Postgres) | Gives you a real relational database plus built-in authentication plus **Row Level Security (RLS)**, explained below, in one platform. Already the chosen database for the Tycoon Group site, so there is one less new tool to manage. |
| Charts | Recharts | Handles the daily sales bar chart and any future trend charts without heavy custom code. |
| Hosting | Netlify | Free tier explicitly allows commercial use, unlike Vercel's free tier, which matters since this is a paid client's internal business tool, not a portfolio piece. Keep it in its own Netlify account, separate from your other projects. |
| Notifications (V1) | In-app only, powered by Supabase Realtime | No extra service needed for V1; the database itself can push live updates to the dashboard. |
| Notifications (V2) | Web push via a service like OneSignal; WhatsApp via Meta's WhatsApp Business Cloud API | Deferred, see Section 6. |

**What "Row Level Security" (RLS) means, in plain terms:** it is a rule you attach directly to a database table saying, in effect, "a Manager account may only ever see rows belonging to their own station, no matter what request the app sends." This is what makes permission enforcement happen at the database level instead of the interface level. Even if someone tampered with the app's frontend code, the database itself would still refuse the request.

**What requires you to go into an external dashboard yourself (cannot be done purely by writing code):**
- Creating the Supabase project and authoring the RLS policies through the Supabase dashboard (Antigravity can generate the SQL, but someone has to run it and review it in Supabase's own console).
- Creating and configuring the Netlify account, custom domain, and DNS records.
- If V2 WhatsApp alerts go ahead, applying for and getting approved on Meta's WhatsApp Business Platform, which involves a business verification process outside any code.
- If V2 push notifications go ahead, creating and configuring the OneSignal account.

---

## 6. Full Scope (single build, no version gating)

Everything below is being built together in this one effort. Two items in this list have a real operational constraint attached, not a build-order one, flagged where relevant. Read those notes before that phase starts.

### Core operational system
- Three roles (Manager, Admin, Viewer) with RLS-enforced access
- Station dashboards: stock by product, today's sales, expenses, gross/net profit, urgency level, pending supplies, sales chart, notifications
- Sales and expense submission by Managers, including photo attachment on expense records
- Two-stage supply workflow (send, pending, accept/reject)
- Weighted-average stock and cost calculation (Section 2)
- Opening balance onboarding flow (Section 2)
- Product urgency system with 7-day rolling average and configurable Green/Yellow/Red thresholds
- Admin urgent-stations ranked list, plus a map view of all stations color-coded by urgency
- Admin record correction with linked `corrections` history
- Monthly PNL report, auto-available on the dashboard the 3rd through 5th of each month, with Excel/PDF export
- In-app notification center (pending supply, missing previous-day record, red urgency, record submission, supply acceptance/rejection)
- WhatsApp alerts for red-urgency and pending-supply events, plus a daily digest summary
- Leakage/anomaly detection flagging a station whose sales pattern breaks from its own recent history
- Full audit log
- Admin user and permission management (create/remove accounts, assign roles and stations, grant/revoke Viewer permissions)
- Multi-organization support at the schema level (the `organizations` table), even though only one organization exists today
- Responsive layout so Managers can use it comfortably on a phone browser, since they will often be at the station, not at a desk

**Operational note on leakage detection:** the code gets built now, but the feature has nothing meaningful to flag until real sales history accumulates. Do not treat its output as reliable until it has at least a few weeks of actual station data behind it. This is a data problem, not a code problem, and no amount of build effort changes it.

**Operational note on WhatsApp alerts:** the integration code can be built and tested against a sandbox number now, but sending real messages to real numbers requires Meta's WhatsApp Business Platform approval, a manual review process outside of any code. Start that application in parallel with the build so it is not the thing you are waiting on at the end. This belongs on your list of external dashboard steps, alongside the Supabase and Netlify setup in Section 5.

### Explicitly out of scope, do not build unless this document changes
- Any online payment processing (this is an internal ops tool, not a sales channel)
- Customer-facing anything
- Multi-currency support
- Native mobile apps

---

## 7. Build Phases

Everything in Section 6 is in scope for this build. The phases below are still bounded and sequential, not because of version gating, but because each one depends on the last: you cannot build the supply workflow before the schema exists, and you cannot build the map view before stations exist in the database. Treat each phase as a separate, bounded round of prompting in Antigravity regardless of overall scope; a build covering everything needs this discipline more than a smaller one would, not less. Do not move to the next phase until the current one's verification step passes. See the companion document, *TAPP Gemini Prompting Framework*, for how to structure the actual prompts.

**Phase 1 — Database schema and RLS**
Build every table in Section 4, plus the RLS policies from the permission matrix in Section 3. Include fields needed by later phases now (photo_url on expenses, latitude/longitude on stations, the organizations table) so nothing requires a schema rewrite mid-build.
*Verify by:* logging in as a test Manager account and confirming, directly in the Supabase dashboard's SQL editor, that a query for another station's data returns nothing.

**Phase 2 — Authentication and account management**
Supabase Auth wired to the `users` table and roles; Admin screens to create accounts, assign roles, and assign Managers to stations.
*Verify by:* creating one test account of each role and confirming each lands on the correct view after login.

**Phase 3 — Sales and expense submission**
Manager-facing forms, writing to `sales_transactions` and `expenses`, including photo upload on expense records.
*Verify by:* submitting a test sales record and a test expense with a photo attached, and confirming both appear correctly in the database with the right timestamp, submitted-by field, and photo URL.

**Phase 4 — Supply workflow**
Admin/Viewer supply creation, Manager accept/reject screen, and the trigger or function that only updates the stock ledger on acceptance.
*Verify by:* sending a test supply, confirming stock does not change while pending, accepting it, and confirming stock updates using the weighted-average formula from Section 2.

**Phase 5 — Stock ledger and urgency engine**
The calculated stock view, the 7-day rolling average calculation, and the Green/Yellow/Red logic reading from `urgency_config`.
*Verify by:* feeding in a known test scenario (for example, 2,500 litres remaining, 950 litres average daily sales) and confirming the app shows the same 2–3 day estimate and Red status used as the example in the original brief.

**Phase 6 — Dashboards and map view**
Manager, Admin, and Viewer dashboard screens, the admin's urgent-stations ranked list, the "View Dashboard" cross-navigation, and the map view of all stations color-coded by urgency.
*Verify by:* checking every dashboard element listed in Section 4 of the original brief renders with real data for a test station, and confirming the map marker color updates when a test station's urgency status changes.

**Phase 7 — Notifications, in-app and WhatsApp**
In-app notification center and the five event triggers listed in Section 6 above, plus the WhatsApp integration built against a sandbox number, plus the daily digest summary.
*Verify by:* triggering each of the five event types manually and confirming a notification appears for the correct recipient in-app, and confirming a test message sends successfully to the sandbox WhatsApp number. Real-number delivery cannot be verified until Meta's approval clears, noted in Section 6.

**Phase 8 — Corrections and audit log**
Admin correction flow tied to the `corrections` table, and the system-wide `audit_log`.
*Verify by:* making a test correction and confirming both the original and corrected values are retrievable, plus confirming a routine action (like a supply acceptance) shows up in the audit log.

**Phase 9 — Profit & loss, PNL report, and export**
Gross profit, net profit calculations, the auto-available monthly PNL report, and Excel/PDF export of PNL and sales history.
*Verify by:* running the calculation against a small set of test transactions with known, hand-calculated results, confirming the app's numbers match exactly, and confirming the exported file matches what is shown on screen.

**Phase 10 — Leakage/anomaly detection**
The anomaly-flagging logic for sales patterns, built and wired into the dashboard now, even though it has no meaningful data to work against yet.
*Verify by:* confirming the logic runs without error against a small hand-built test dataset with an obvious planted anomaly, so the mechanism is proven correct. Do not attempt to verify this against real predictive accuracy until real station data has accumulated, per the note in Section 6.

**Phase 11 — QA pass and client walkthrough**
Full run-through of every role, every workflow, on a staging environment before anything goes near real station data.

---

## 8. Non-functional requirements

- **Security:** RLS on every table holding station-specific data; no permission check should ever live only in frontend code.
- **Data integrity:** supply and sales tables are append-only; nothing is ever deleted, only corrected with a linked audit trail.
- **Auditability:** every write action (create, accept, reject, correct, permission change) must produce an `audit_log` row.
- **Availability during station hours:** stations operate long hours, so the app should be usable and legible on a mid-range Android phone browser, not just desktop.

---

9. UI/UX Design System

TAPP and the Tycoon Group portfolio site solve opposite design problems and should not share a design system. The portfolio site's job is to impress a stranger in seconds. TAPP's job is to let a manager standing outside near a pump, in direct sun, on a phone, submit a number correctly in a few seconds. The design decisions below follow from that, not from generic dashboard conventions.

Design philosophy: control panel, not brochure. The visual language draws from fuel infrastructure itself, digital pump readouts, gauge needles, tank-level fills, traffic-light status lighting, rather than a generic rounded-card SaaS look. This gives TAPP an identity specific to what it actually is.

Color system

Tycoon's brand red and white are used prominently throughout the interface (header, navigation, primary buttons, section accents, active states), not held back as a small accent. That creates one real conflict to solve deliberately: the urgency system's Red status is the single most important signal in the app, and it cannot be allowed to blend into a red-heavy interface.

The resolution is two distinct reds, never interchanged, plus a rule that urgency status never relies on hue alone:

Brand Red — Tycoon's primary red, used for structural chrome: header bar, logo, navigation, primary action buttons, active states. Exact hex needs to be pulled from the existing Tycoon Group brand assets/logo files for consistency with the portfolio site; use 
#C1272D as a placeholder until confirmed.
Alert Red — a distinctly different, more saturated red-orange, reserved exclusively for urgency-Red status. Never used for buttons, navigation, or any chrome. Placeholder 
#E4432A until reviewed alongside Brand Red for sufficient visual separation.
Every urgency-Red element also carries a warning icon and the word "Red" or "Urgent" as text, so status is never communicated by color alone. This matters both for outdoor glare, where subtle hue differences wash out, and for colorblind users.
Yellow and Green keep their standard status meaning and are not affected by the brand palette.
White remains the dominant background, consistent with the group's red-and-white identity, with enough contrast behind Brand Red and Alert Red elements to stay legible in direct sunlight.
Typography

Two typefaces, clearly separated by role. Data figures (stock levels, litres, currency, quantities) render in a semi-monospaced or tabular-figure face, echoing a pump's own digital display. Everything else (labels, navigation, buttons, body text) uses a clean, highly legible sans-serif. Exact families to be selected during the design pass, prioritizing strong numeral legibility and mobile rendering over stylistic novelty.

Layout principles
Urgency reads as a gauge, not a badge. A station's Red/Yellow/Green status displays as a fill level, closer to a tank gauge, so a low station visibly feels low rather than being tagged with a small colored dot.
Role-based simplicity. A Manager's view shows only their own station, with their handful of actions (submit sales, submit expense, accept/reject supply) as the largest, most obvious elements on screen. Admin density and multi-station tools never leak into the Manager view.
Admin view favors a scannable control-room feel. The urgent-stations list and map view surface first, before any secondary detail.
Outdoor, one-handed legibility. High contrast, large touch targets, numeric keypad inputs for quantities and amounts.
Speed over completeness for daily entry. Sales and expense forms default to the most recently used product and pre-fill anything predictable, targeting a two-to-three-tap submission.
Offline resilience. A submission made with a weak signal queues locally and syncs once connection returns, rather than failing silently.
Who-did-what stays visible in context, not buried in the audit log, so numbers carry visible accountability without requiring a lookup.