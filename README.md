# Brightloop Software — Subscription Management & Recurring Billing System
> **Odoo Hackathon Challenge Solution**: A unified enterprise software platform running the complete lifecycle of a subscription business, built with high-performance SQLite, Node.js/Express, React, TypeScript, and Tailwind CSS.

---

## 🌟 Executive Overview & Challenge Mapping

| Challenge Scene | Business Need | Brightloop Solution |
|---|---|---|
| **Scene 1: New Customer Sign-Up & RBAC** | Self-signup, password rules, password reset, strict RBAC | Custom registration enforcing >8 chars, uppercase, lowercase, special character; unique emails; tokenized reset flow with email simulation; role separation (**Admin**, **Internal Staff**, **Customer Portal**). |
| **Scene 2: Launching a New Plan** | Products with variants (e.g. Odoo brand +$560), configurable plan lifecycle | Product catalog with attribute variants & price surcharges; plan recurrence (daily, weekly, monthly, yearly); lifecycle policy flags per plan (`auto_close_on_end`, `can_close_early`, `can_pause`, `can_renew`). |
| **Scene 3: Quote to Subscription** | Quotation templates, visual subscription lifecycle | Preconfigured templates with plan & lines, valid for $N$ days; moves across `Draft` $\rightarrow$ `Quotation` $\rightarrow$ `Confirmed` $\rightarrow$ `Active` $\rightarrow$ `Closed` (plus `Paused`); full audit history. |
| **Scene 4: Billing Day** | Automated batch invoicing, automated taxes, idempotency | 1-click & scheduled billing engine; automatically pulls due subscriptions, applies tax rules & discounts; prevents double billing or skipping. Moves invoices from `Draft` $\rightarrow$ `Confirmed` $\rightarrow$ `Paid`. |
| **Scene 5: Discount Rules Engine** | Admin-only discounts, usage limits, auto-application | Fixed or % discounts, min quantity or purchase thresholds, validity dates, total usage caps. Applies to specific products or whole subscriptions; auto-stops on expiry or cap. |
| **Scene 6: Payments & Overdue Chasing** | Multi-method payments, partial payments, overdue tracking | Record payments against invoices (Card, Wire, Stripe, PayPal, Cash, Cheque); real-time balance tracking; 1-click "Chase Overdue Invoices" dispatching payment reminders. |
| **Scene 7: Finance Lead Dashboard** | Active subs, MRR, ARR, cash collected, overdue numbers, &lt;2s SLA | Unified analytics command center with interactive date & plan filters; indexed SQL aggregations running in **&lt; 2 ms** (over 1000x faster than the 2-second SLA). |

---

## 🚀 Quick Start Guide

The application is already built, tested, and running on **`http://localhost:5050`**.

### 1. Start Server & Frontend
```bash
# Starts both the Express REST API and serves the production-optimized React UI
npm start
```
*Application URL:* [http://localhost:5050](http://localhost:5050)

### 2. Run Automated Test Suite
```bash
npm test
```
*Validates password rules, plan policies, Odoo variant pricing, discount evaluation, billing engine idempotency, overdue detection, and query execution SLA.*

### 3. Reset Demo Database
```bash
npm run seed
```

---

## 👥 Demo Personas & Quick Switcher

Use the **"Switch Persona"** dropdown in the top navigation bar to test any role instantly, or log in with the credentials below:

| Role | Email | Password | Persona & Permissions |
|---|---|---|---|
| **System Admin** | `admin@brightloop.com` | `Admin@12345` | Alexander Vance — Full access, product/plan setup, discount creation, tax configuration, staff management. |
| **Staff (Sales)** | `sarah.sales@brightloop.com` | `Staff@12345` | Sarah Jenkins — Quotation templates, sales quotes, customer subscriptions. |
| **Staff (Finance)** | `felix.finance@brightloop.com` | `Staff@12345` | Felix Chen — Billing Day execution, invoice approvals, payment recording, overdue chasing. |
| **Customer 1** | `john@acmecorp.com` | `Customer@12345` | John Miller (Acme Corp) — Self-service portal: view active subscriptions, pause/renew, pay invoices. |
| **Customer 2** | `tech@globex.com` | `Customer@12345` | Elena Rostova (Globex Enterprises) — Enterprise customer with custom Odoo annual contract. |

---

## 🏗️ Architecture & Technical Highlights

```
Hackathon/
├── brightloop.db             # SQLite WAL-mode database with compound indexes
├── server/
│   ├── index.js              # Express 5 server + static client hosting + timing
│   ├── db.js                 # DatabaseSync (Node 22 built-in), PRAGMA WAL, schema
│   ├── auth.js               # JWT, bcrypt, password complexity & RBAC middleware
│   ├── billingEngine.js      # Billing Day recurring generator, idempotency, auto-close
│   ├── seed.js               # Pristine demo dataset reflecting all prompt scenes
│   └── routes/               # Modular REST endpoints
├── src/
│   ├── context/AuthContext   # Global auth, persona quick-switching
│   ├── components/           # Navbar, Sidebar, Modals, Print Layout, Status Badges
│   ├── pages/                # Dashboard, Billing Engine, Subscriptions, Invoices, Customer Portal, etc.
│   └── services/api.ts       # Typed client API interface
└── tests/
    └── api.test.js           # Full business logic & SLA test suite
```

### High-Performance Database Design
- **Sub-2ms Queries**: SQLite database runs in `WAL` (Write-Ahead Logging) mode with compound indices:
  - `idx_subs_status_billing ON subscriptions(status, next_billing_date)`
  - `idx_invoices_customer_status ON invoices(customer_id, status)`
  - `idx_invoices_due_date ON invoices(due_date)`
  - `idx_invoices_sub_period ON invoices(subscription_id, billing_period_start, billing_period_end)`
- **SLA Benchmark Modal**: In the sidebar, click **"Run Speed Benchmark"** to test query latencies or stress test with +1,000 to +5,000 records. Latency consistently clocks in at **0.04ms to 1.5ms**, easily exceeding the 2-second response time requirement.

---

## 📸 Key Workflows Walkthrough

### 1. Customer Sign-Up & Password Policy (Scene 1)
- Sign-up form actively checks:
  - $\checkmark$ More than 8 characters
  - $\checkmark$ At least one uppercase letter
  - $\checkmark$ At least one lowercase letter
  - $\checkmark$ At least one special character
  - $\checkmark$ Unique email verification
- Password reset token flow: clicking "Forgot password" generates a crypto token and saves a simulated delivery in the **Simulated Inbox**.

### 2. Launching Products with Variants (Scene 2)
- Products support attributes and price extras.
- Example: **Brightloop ERP Core** base price is \$1,200. Choosing the **"Odoo Certified Edition"** brand variant adds **+\$560.00** to the unit price.

### 3. Plan Lifecycle Policies (Scene 2 & 3)
- Admin configures policies plan by plan:
  - `auto_close_on_end`: Subscriptions automatically transition to `Closed` when the expiry date is reached.
  - `can_close_early`: Allows customer or staff to terminate early.
  - `can_pause`: Allows pausing during migrations or customer hold periods.
  - `can_renew`: Allows extending subscription dates.

### 4. Quotation to Subscription (Scene 3)
- Sales reps select a Quotation Template (e.g. "Enterprise Odoo Cloud Package") to auto-populate product lines, variants, taxes, and validity period.
- Subscriptions display visual Odoo-style pipeline badges:
  $$\text{Draft} \longrightarrow \text{Quotation} \longrightarrow \text{Confirmed} \longrightarrow \text{Active} \longrightarrow \text{Closed}$$

### 5. Automated Billing Day Engine (Scene 4)
- Select any simulated billing date (default: today).
- Previews subscriptions with `next_billing_date <= target_date`.
- Generates invoices with calculated taxes and discounts.
- Advances `next_billing_date` and enforces strict idempotency to guarantee **nothing is billed twice or skipped**.

### 6. Discounts & Promotions (Scene 5)
- Admin creates discounts with minimum quantity/purchase conditions, validity dates, and usage limits.
- Automatically applied during billing run and logged.

### 7. Payments & Overdue Chasing (Scene 6)
- Record payments with method, reference note, and date against invoices.
- Supports full or partial payments.
- Overdue invoices are highlighted with red alerts. Click **"Chase Overdue Invoices"** to send reminder notices to customers.

### 8. Customer Self-Service Portal (Scene 1 & 3)
- Log in as `john@acmecorp.com`.
- Customers can view active plans, pause/resume, renew, view invoices, download/print PDF receipts, and make 1-click online payments.

