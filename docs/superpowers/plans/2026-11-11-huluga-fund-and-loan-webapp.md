# Huluga Fund & Loan Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade, GitHub Pages-compatible community fund and loan management web application (Huluga) with local-first testing storage, ready-to-connect Supabase backend, 5% fixed monthly interest engine, and an anti-AI-slop design following Astryx, Impeccable, and Hallmark principles.

**Architecture:** Client-side React 18+ Single Page Application with HashRouter (for 100% zero-404 GitHub Pages support), Tailwind CSS design tokens, an abstracted database adapter pattern (LocalStorage for instant testing + Supabase adapter for live production), and role-based views for Treasurers and Members.

**Tech Stack:** React 18/19, TypeScript, Vite, Tailwind CSS, Lucide React, Vitest, @supabase/supabase-js.

## Global Constraints
- Target platform: GitHub Pages (static build, HashRouter, base: './')
- Local-first testing: works immediately in browser using LocalStorage with realistic seeded data
- Supabase ready: full PostgreSQL schema DDL + Supabase client adapter included
- Loan Engine: No fixed term, fixed 5% monthly interest on principal amount
- Auth: Username & password login (transparently mapped behind the scenes) + Google login stub + fast demo role switch
- Design system: Strictly follows Astryx, Impeccable, and Hallmark (no AI slop, tabular figures, high craft density, accessible WCAG AA contrast)

---

### Task 1: Project Scaffolding & Build Configuration

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: Working Vite build and test harness with Tailwind CSS configured with custom font-mono tabular tokens and neutral/zinc color palette.

- [ ] **Step 1: Create package.json with scripts and dependencies**
```json
{
  "name": "huluga",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.48.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.16.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "~5.6.2",
    "vite": "^6.0.1",
    "vitest": "^2.1.6"
  }
}
```

- [ ] **Step 2: Install dependencies**
Run: `npm install`
Expected: Dependencies installed with zero errors.

- [ ] **Step 3: Create Vite, TypeScript, and Vitest configurations**
Configure `vite.config.ts` with `base: './'` for GitHub Pages compatibility. Configure `tailwind.config.js` with custom zinc-slate aesthetic and font classes.

- [ ] **Step 4: Verify test runner works**
Run: `npm test`
Expected: Passes or reports no tests found yet.

- [ ] **Step 5: Commit scaffolding**
```bash
git add .
git commit -m "chore: scaffold vite react typescript tailwind vitest"
```

---

### Task 2: Core Domain Types & 5% Fixed Monthly Interest Calculation Engine

**Files:**
- Create: `src/types/index.ts`
- Create: `src/utils/formatters.ts`
- Create: `src/services/interestEngine.ts`
- Test: `src/services/interestEngine.test.ts`

**Interfaces:**
- Produces:
  - `UserProfile`, `FundEntry`, `LoanApplication`, `Loan`, `LoanPayment`, `AppSettings`
  - `calculateLoanSummary(loan: Loan, asOfDate?: Date): LoanSummary`
  - `allocatePayment(paymentAmount: number, unpaidInterest: number, remainingPrincipal: number)`
  - `formatCurrency(amount: number, currency?: string): string`
  - `formatDate(dateStr: string): string`

- [ ] **Step 1: Write the failing unit tests for 5% monthly interest math**
Write tests verifying:
1. Exactly 1 month elapsed on ₱10,000 principal at 5% = ₱500 accrued interest.
2. 3 months elapsed on ₱20,000 principal at 5% = ₱3,000 accrued interest.
3. Partial interest payment reduces unpaid accrued interest.
4. Excess payment above accrued interest pays down the principal balance.
5. Payoff calculation returns remaining principal + unpaid accrued interest.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/services/interestEngine.test.ts`
Expected: FAIL with "cannot find module interestEngine"

- [ ] **Step 3: Implement domain types, formatters, and interestEngine.ts**
Implement complete mathematical rules according to the spec:
- Fixed 5% of original principal per month.
- Open-ended: no fixed maturity date.
- Accurate calendar month calculation `differenceInCalendarMonths(startDate, asOfDate)`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/services/interestEngine.test.ts`
Expected: PASS all interest calculation tests.

- [ ] **Step 5: Commit**
```bash
git add src/types src/utils src/services
git commit -m "feat: add domain types, formatters, and 5% monthly interest calculation engine"
```

---

### Task 3: Local Storage Database Adapter, Mock Initial Data & Supabase Adapter

**Files:**
- Create: `src/services/databaseAdapter.ts`
- Create: `src/services/mockData.ts`
- Create: `src/services/localStorageAdapter.ts`
- Create: `src/services/supabaseAdapter.ts`
- Create: `src/services/supabaseSchema.sql`
- Test: `src/services/localStorageAdapter.test.ts`

**Interfaces:**
- Produces:
  - `DatabaseAdapter` interface:
    - `getProfiles(): Promise<UserProfile[]>`
    - `getFundEntries(): Promise<FundEntry[]>`
    - `addFundEntry(entry: Omit<FundEntry, 'id'>): Promise<FundEntry>`
    - `getLoanApplications(): Promise<LoanApplication[]>`
    - `createLoanApplication(app: Omit<LoanApplication, 'id' | 'status' | 'appliedDate'>): Promise<LoanApplication>`
    - `updateApplicationStatus(id: string, status: ApplicationStatus, notes?: string): Promise<LoanApplication>`
    - `getLoans(): Promise<Loan[]>`
    - `disburseLoan(applicationId: string): Promise<Loan>`
    - `recordPayment(payment: Omit<LoanPayment, 'id'>): Promise<LoanPayment>`
    - `getSettings(): Promise<AppSettings>`
    - `updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>`
  - `supabaseSchema.sql`: Complete DDL with profiles, fund_entries, loan_applications, loans, loan_payments, and automated triggers.

- [ ] **Step 1: Write unit tests for LocalStorageAdapter**
Test adding a fund entry, submitting a loan application, disbursing it into an active loan, and recording a payment.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/services/localStorageAdapter.test.ts`
Expected: FAIL with missing module.

- [ ] **Step 3: Implement DatabaseAdapter interface, mockData.ts, localStorageAdapter.ts, supabaseAdapter.ts, and supabaseSchema.sql**
Seed `mockData.ts` with:
- 1 Treasurer profile ("Maria Santos (Treasurer)")
- 3 Member profiles ("Juan Dela Cruz", "Ana Reyes", "Carlos Mendoza")
- Existing capital contributions and fund balance (₱150,000 capital pool)
- 2 Active loans (e.g. ₱20,000 at 5%/mo with past payments)
- 1 Pending loan application ready for approval testing

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/services/localStorageAdapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services
git commit -m "feat: add database adapters, seeded mock store, and supabase SQL DDL"
```

---

### Task 4: AuthContext, Role-Based Access Control, and Fast Demo Switcher

**Files:**
- Create: `src/context/AuthContext.tsx`
- Create: `src/context/DataContext.tsx`
- Create: `src/context/ToastContext.tsx`
- Create: `src/components/common/ToastContainer.tsx`

**Interfaces:**
- Consumes: `DatabaseAdapter`, `UserProfile`
- Produces:
  - `useAuth()`: `{ currentUser, login(username, password), logout(), switchDemoUser(userId), isTreasurer }`
  - `useData()`: `{ fundEntries, loans, applications, members, settings, refreshData, ... }`
  - `useToast()`: `{ showToast(message, type) }`

- [ ] **Step 1: Implement ToastContext and Toast UI**
Clean, anti-slop alert banners (Success, Error, Info) adhering to WCAG contrast.

- [ ] **Step 2: Implement AuthContext**
Support:
- Pure username + password registration/login.
- Local session persistence in localStorage.
- Demo quick switcher to instantly swap between Treasurer and Member.

- [ ] **Step 3: Implement DataContext**
Wraps the selected adapter (defaults to `localStorageAdapter`, dynamically switches to `supabaseAdapter` if configured).

- [ ] **Step 4: Commit**
```bash
git add src/context src/components/common
git commit -m "feat: add AuthContext with quick role switcher, DataContext, and ToastContext"
```

---

### Task 5: Design System Tokens & Base UI Component Library (Astryx / Impeccable / Hallmark)

**Files:**
- Create: `src/components/common/Button.tsx`
- Create: `src/components/common/Card.tsx`
- Create: `src/components/common/Badge.tsx`
- Create: `src/components/common/StatCard.tsx`
- Create: `src/components/common/Modal.tsx`
- Create: `src/components/common/Table.tsx`
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/AppShell.tsx`

**Interfaces:**
- Produces: Polished, responsive component library adhering to Astryx/Impeccable/Hallmark:
  - Tabular financial numbers (`font-mono tabular-nums`)
  - Crisp zinc borders (`border-zinc-200 dark:border-zinc-800`)
  - Semantic status colors (Emerald, Amber, Rose, Slate)
  - Desktop sidebar + mobile responsive navigation

- [ ] **Step 1: Build Base UI Components**
`Button`, `Badge`, `Card`, `StatCard`, `Modal`, `Table` with full keyboard/focus states and accessibility tags.

- [ ] **Step 2: Build AppShell, Navbar, and Sidebar**
Include top bar with active user role badge, quick demo switcher dropdown, fund health pill, and navigation links.

- [ ] **Step 3: Commit**
```bash
git add src/components
git commit -m "feat: implement Astryx/Impeccable inspired UI component library and AppShell"
```

---

### Task 6: Fund Management Feature (Treasurer View & Inflow/Outflow Ledger)

**Files:**
- Create: `src/components/funds/AddFundModal.tsx`
- Create: `src/components/funds/FundLedgerTable.tsx`
- Create: `src/components/funds/FundSummaryStats.tsx`
- Create: `src/pages/FundsPage.tsx`

**Interfaces:**
- Consumes: `useData()`, `useAuth()`, `FundEntry`
- Produces:
  - Fund balance summary cards (Total Liquid Pool, Total Contributed, Active Loaned Funds, Total Interest Earned).
  - "Record Fund Entry" modal (Contribution, Deposit, Expense, Adjustment).
  - Filterable transaction ledger (by type, date range, search).

- [ ] **Step 1: Implement AddFundModal**
Allows recording member contributions, external capital deposits, or expenses with amount, date, reference #, and description.

- [ ] **Step 2: Implement FundLedgerTable and FundSummaryStats**
Filterable tabular view with positive/negative color accents and receipt numbers.

- [ ] **Step 3: Implement FundsPage**
Integrate summary stats, ledger table, and modal.

- [ ] **Step 4: Commit**
```bash
git add src/components/funds src/pages/FundsPage.tsx
git commit -m "feat: implement fund entry and ledger management"
```

---

### Task 7: Loan Application & Member Self-Service Feature

**Files:**
- Create: `src/components/loans/LoanApplicationModal.tsx`
- Create: `src/components/loans/ApplicationReviewModal.tsx`
- Create: `src/components/loans/ApplicationListTable.tsx`
- Create: `src/pages/ApplicationsPage.tsx`

**Interfaces:**
- Consumes: `useData()`, `useAuth()`, `LoanApplication`
- Produces:
  - Member loan application modal with live 5% monthly interest preview.
  - Treasurer review workflow: Approve, Reject (with notes), or Disburse directly.
  - Real-time application tracker for members.

- [ ] **Step 1: Implement LoanApplicationModal with live calculation preview**
Shows monthly interest at 5% (e.g., ₱10,000 -> ₱500/month interest) before submission.

- [ ] **Step 2: Implement ApplicationReviewModal**
Treasurer can approve, reject, or disburse funds. Disbursing automatically updates fund pool and creates an active loan.

- [ ] **Step 3: Implement ApplicationsPage**
Lists applications grouped by status (Pending, Approved, Disbursed, Rejected).

- [ ] **Step 4: Commit**
```bash
git add src/components/loans src/pages/ApplicationsPage.tsx
git commit -m "feat: implement loan application flow and treasurer review inbox"
```

---

### Task 8: Loan Management & Repayment Ledger (5% Monthly Interest Engine)

**Files:**
- Create: `src/components/loans/LoanCard.tsx`
- Create: `src/components/loans/RecordPaymentModal.tsx`
- Create: `src/components/loans/LoanLedgerView.tsx`
- Create: `src/pages/LoansPage.tsx`

**Interfaces:**
- Consumes: `calculateLoanSummary()`, `Loan`, `LoanPayment`, `useData()`
- Produces:
  - Active loan portfolio display.
  - Accurate monthly interest breakdown (months elapsed, accrued interest, remaining principal).
  - "Record Payment" modal with automated or manual split between monthly interest and principal paydown.

- [ ] **Step 1: Implement RecordPaymentModal**
Calculates currently due monthly interest, allows the user/treasurer to record payment toward interest and/or principal, auto-marks loan as 'paid' when principal reaches 0.

- [ ] **Step 2: Implement LoanCard and LoanLedgerView**
Detailed breakdown card with progress bar, payment history table, and payoff estimate.

- [ ] **Step 3: Implement LoansPage**
Tabs for: Active Loans, Completed/Paid Loans, and Loan Performance Analytics.

- [ ] **Step 4: Commit**
```bash
git add src/components/loans src/pages/LoansPage.tsx
git commit -m "feat: implement active loan portfolio and 5% interest repayment ledger"
```

---

### Task 9: Member Directory, Profiles & Role Management

**Files:**
- Create: `src/components/members/MemberCard.tsx`
- Create: `src/components/members/MemberDetailModal.tsx`
- Create: `src/pages/MembersPage.tsx`

**Interfaces:**
- Consumes: `useData()`, `useAuth()`
- Produces:
  - Directory of all registered members.
  - Member statistics: Total Contributions, Total Borrowed, Active Loan Balance, Repayment Reliability.
  - Treasurer control to promote/demote user roles (`treasurer` vs `member`).

- [ ] **Step 1: Implement MemberCard and MemberDetailModal**
Inspect member history, individual ledger entries, and loans.

- [ ] **Step 2: Implement MembersPage**
Search, sort, filter members, and promote/demote role toggle.

- [ ] **Step 3: Commit**
```bash
git add src/components/members src/pages/MembersPage.tsx
git commit -m "feat: implement member directory, profiles, and role management"
```

---

### Task 10: Dashboard, Settings, Supabase Configurator & SQL Exporter

**Files:**
- Create: `src/pages/DashboardPage.tsx`
- Create: `src/pages/LoginPage.tsx`
- Create: `src/pages/SettingsPage.tsx`
- Create: `src/components/settings/SupabaseConfigModal.tsx`
- Create: `src/components/settings/SqlScriptViewer.tsx`

**Interfaces:**
- Produces:
  - Role-adaptive Dashboard (Treasurer cockpit vs Member personal overview).
  - Authentication page (Username + Password + Google sign-in + Demo accounts).
  - Settings page with:
    - Organization configuration (Name, currency symbol `₱`, default interest rate `5%`).
    - Supabase Connection Configurator (URL & Anon Key with test connection).
    - In-app "Copy SQL Setup Script" viewer.
    - "Reset Demo Data" button.

- [ ] **Step 1: Implement DashboardPage**
Personalized stats for Member vs Treasurer. Quick actions for loan application and fund contribution.

- [ ] **Step 2: Implement LoginPage**
Supports username + password registration/login, Google login button, and demo account one-click cards.

- [ ] **Step 3: Implement SettingsPage & SupabaseConfigModal**
Provides instant copyable SQL DDL script and live connection tester.

- [ ] **Step 4: Commit**
```bash
git add src/pages src/components/settings
git commit -m "feat: implement dashboard, login, settings, and Supabase SQL configurator"
```

---

### Task 11: Application Routing, GitHub Pages Optimization & End-to-End Build Verification

**Files:**
- Modify: `src/App.tsx`
- Create: `public/404.html`
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces:
  - HashRouter navigation linking all pages (`/`, `/funds`, `/loans`, `/applications`, `/members`, `/settings`).
  - GitHub Pages deploy workflow.
  - Production build in `dist/` verified with zero errors.

- [ ] **Step 1: Set up App.tsx with HashRouter and Route Guards**
Protect Treasurer-only pages (`/funds`, `/members`) from unauthorized member access while keeping member self-service seamless.

- [ ] **Step 2: Run all unit and integration tests**
Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Execute production build**
Run: `npm run build`
Expected: Output created in `dist/` with zero TypeScript or packaging errors.

- [ ] **Step 4: Commit and finalize**
```bash
git add .
git commit -m "feat: finalize GitHub Pages routing and production build configuration"
```

---

## Plan Self-Review Check
1. **Spec coverage:** All requirements from spec (GitHub Pages compatibility, 5% fixed monthly interest on principal, no fixed term, username+password auth, Google login, fund entry, member loan application, treasurer review, settings, local-first test storage, Supabase SQL script) are assigned to dedicated tasks.
2. **Placeholder scan:** No TBD, TODO, or vague instructions.
3. **Type consistency:** Interfaces and types align throughout all tasks.
