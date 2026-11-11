# Huluga Web App - Technical Design Document

**Date:** 2026-11-11  
**Project:** Huluga (Community Fund & Member Loan Management System)  
**Target Platform:** GitHub Pages (Static Web App)  
**Primary Tech Stack:** React 18+ (TypeScript), Vite, Tailwind CSS, Lucide Icons, LocalStorage Data Engine (with ready-to-connect Supabase Backend adapter)  
**Design Influences:** Meta Astryx, Paul Bakaus' Impeccable (Anti-AI Slop), Nutlope's Hallmark (functional, high-craft financial design)

---

## 1. Overview & Objectives

Huluga is a community savings and loan web application tailored for cooperatives, associations, and micro-lending groups (paluwagan / community funds). 

### Key Objectives:
1. **Hostable on GitHub Pages**: Built as a pure client-side SPA with `HashRouter` to prevent 404 routing errors on page refresh.
2. **Local-First Testing Architecture**: Ships with an immediate, fully functional Local Storage Engine pre-populated with realistic members, loans, fund entries, and ledger history. Fully testable without requiring cloud keys upfront.
3. **Supabase-Ready Adapter**: Pre-engineered with a complete Supabase schema, SQL DDL script, and Supabase client adapter ready to connect when the user supplies credentials.
4. **Auth Flow**:
   - Username & password authentication (automatically handles synthetic auth identity `username@huluga.local`).
   - Google Login integration stub (ready for Supabase OAuth).
   - Fast demo role switcher (Treasurer vs Member) for rapid local testing.
5. **Core Financial Engine**:
   - **Open-Ended Loans**: Loans have no fixed expiration term.
   - **Fixed Monthly Interest**: Computes a fixed 5% interest per month on the principal amount.
   - **Payment Allocation**: Tracks interest payments vs. principal amortizations, updating live balances.
   - **Fund Management**: Real-time fund pool tracking (deposits, contributions, disbursements, repayments, net liquid cash).
   - **Member Loan Applications**: Self-service application submission, review pipeline (Pending -> Approved -> Disbursed -> Completed).
6. **Design Standards (Astryx / Impeccable / Hallmark)**:
   - High information density with clean, purposeful white space.
   - No generic purple AI-slop gradients or low-contrast text.
   - Strict typography with `tabular-nums` for financial alignment.
   - Clear visual status badges and accessible UI controls.

---

## 2. Architecture & Directory Structure

```
d:/huluga/
├── .github/
│   └── workflows/
│       └── deploy.yml            # Automated GitHub Pages deploy workflow
├── public/
│   ├── favicon.svg
│   └── 404.html                  # Fallback redirect for GitHub Pages
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── AppShell.tsx
│   │   ├── common/
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── Table.tsx
│   │   ├── funds/
│   │   │   ├── FundSummary.tsx
│   │   │   ├── AddFundModal.tsx
│   │   │   └── FundLedgerTable.tsx
│   │   ├── loans/
│   │   │   ├── LoanCard.tsx
│   │   │   ├── LoanApplicationModal.tsx
│   │   │   ├── RecordPaymentModal.tsx
│   │   │   ├── LoanLedgerView.tsx
│   │   │   └── LoanCalculatorPreview.tsx
│   │   ├── members/
│   │   │   ├── MemberList.tsx
│   │   │   └── MemberDetailModal.tsx
│   │   └── settings/
│   │       ├── SupabaseConfigModal.tsx
│   │       ├── OrgSettingsForm.tsx
│   │       └── SqlScriptViewer.tsx
│   ├── context/
│   │   ├── AuthContext.tsx        # Auth state & quick role switch
│   │   ├── DataContext.tsx        # Database abstraction (LocalStorage / Supabase)
│   │   └── ToastContext.tsx       # Notification toasts
│   ├── services/
│   │   ├── databaseAdapter.ts    # Interface for Data Provider
│   │   ├── localStorageAdapter.ts# Full mock data & persistent local storage
│   │   ├── supabaseAdapter.ts    # Supabase Client implementation
│   │   ├── interestEngine.ts     # 5% fixed monthly interest math & balance logic
│   │   └── supabaseSchema.sql    # Complete SQL script for Supabase SQL Editor
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── FundsPage.tsx
│   │   ├── LoansPage.tsx
│   │   ├── ApplicationsPage.tsx
│   │   ├── MembersPage.tsx
│   │   └── SettingsPage.tsx
│   ├── types/
│   │   └── index.ts              # Full TypeScript definitions
│   ├── utils/
│   │   ├── formatters.ts         # Currency, date, percentage formatters
│   │   └── validators.ts
│   ├── App.tsx                   # HashRouter + Route guards
│   ├── index.css                 # Tailwind directives & design tokens
│   └── main.tsx
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Data Models & TypeScript Interfaces

### User & Profile
```typescript
export type UserRole = 'treasurer' | 'member';

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  phoneNumber?: string;
  joinedDate: string;
  status: 'active' | 'suspended';
}
```

### Fund Entry
```typescript
export type FundEntryType = 
  | 'contribution'       // Member regular capital contribution
  | 'deposit'            // General external capital deposit
  | 'loan_disbursement'  // Cash outflow when loan is given out
  | 'loan_repayment'     // Cash inflow from loan principal or interest
  | 'expense'            // Operational or bank fee
  | 'adjustment';        // Manual ledger adjustment

export interface FundEntry {
  id: string;
  type: FundEntryType;
  amount: number;
  direction: 'inflow' | 'outflow';
  memberId?: string;
  memberName?: string;
  recordedBy: string;
  description: string;
  date: string;
  referenceNo?: string;
}
```

### Loan Application
```typescript
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'disbursed' | 'cancelled';

export interface LoanApplication {
  id: string;
  borrowerId: string;
  borrowerName: string;
  requestedAmount: number;
  purpose: string;
  monthlyInterestRate: number; // 5.0%
  status: ApplicationStatus;
  appliedDate: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}
```

### Loan & Payment Ledger
```typescript
export type LoanStatus = 'active' | 'paid' | 'defaulted';

export interface Loan {
  id: string;
  applicationId?: string;
  borrowerId: string;
  borrowerName: string;
  principalAmount: number;
  monthlyInterestRate: number; // Default 5.0%
  startDate: string;
  status: LoanStatus;
  
  // Ledger summary
  principalPaid: number;
  interestPaid: number;
  lastPaymentDate?: string;
  notes?: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  borrowerId: string;
  recordedBy: string;
  amount: number;
  interestPortion: number;
  principalPortion: number;
  paymentDate: string;
  referenceNo?: string;
  notes?: string;
}
```

---

## 4. Financial Calculation Engine (5% Fixed Monthly Interest)

### Core Rules:
1. **Principal Balance:** `Remaining Principal = Principal Amount - Total Principal Paid`.
2. **Accrued Monthly Interest:**
   - Every month passed since `startDate`, interest of `5% * Principal Amount` is accrued.
   - `Months Elapsed = max(1, count_months(startDate, today))`.
   - `Total Interest Incurred = Months Elapsed * (5% * Principal Amount)`.
   - `Unpaid Accrued Interest = max(0, Total Interest Incurred - Total Interest Paid)`.
3. **Payoff Amount:**
   - `Total Payoff = Remaining Principal + Unpaid Accrued Interest`.
4. **Payment Recording:**
   - When a payment is recorded, the user/treasurer can specify how much goes toward the monthly interest and how much reduces the principal.
   - When `Remaining Principal <= 0` and `Unpaid Accrued Interest <= 0`, loan status transitions to `paid`.

---

## 5. UI / UX Design Specifications

### Palette & Tokens:
- **Canvas:** Zinc-50 / Zinc-900 (clean crisp dark & light mode supported).
- **Cards & Surfaces:** White with `border border-zinc-200 shadow-sm` / Dark `bg-zinc-900 border-zinc-800`.
- **Accent:** Emerald-600 (`#059669`) for positive inflow, cash balances, and successful repayments.
- **Pending/Warning:** Amber-500 (`#d97706`) for pending loan applications.
- **Negative/Deduction:** Rose-600 (`#e11d48`) for disbursements and expenses.
- **Numbers:** Monospace tabular numbers (`font-mono tabular-nums`) throughout all financial displays.

### Screens:
1. **Login & Register:**
   - Username & Password inputs (no email prompt required for members).
   - "Continue with Google" button.
   - Quick Demo Switcher bar ("Log in as Treasurer (Maria)" | "Log in as Member (Juan)").
2. **Dashboard:**
   - **Treasurer View:** Total Fund Balance, Active Loans Sum, Total Interest Collected, Pending Applications counter, Quick Actions (Add Funds, New Loan, Disburse).
   - **Member View:** My Active Loan details, Next 5% Interest Due date, My Total Contributions, "Apply for a Loan" CTA.
3. **Funds Management:**
   - Inflow / Outflow filterable ledger.
   - "Record Fund Entry" modal (Contribution, Deposit, Expense).
   - Member contribution breakdown table.
4. **Loans & Applications:**
   - Tab 1: **Applications** (Approve / Reject / Disburse modal).
   - Tab 2: **Active Loans** (Inspect breakdown, Record Payment modal with interest vs principal distribution).
   - Tab 3: **Paid / Closed Loans**.
5. **Members Directory:**
   - List of all registered members with their role, total contributed, active loan balance, and role management toggle.
6. **Settings & Supabase Activation:**
   - Currency configuration (`₱` PHP default, customizable).
   - Default interest rate (5%).
   - Supabase Connection Card (Project URL & Anon Key, "Test Connection" status).
   - "Copy SQL Schema Script" button for instant Supabase setup.
   - "Reset / Seed Demo Data" button.

---

## 6. GitHub Pages Deployment Strategy

1. **Vite Base Configuration**: Configure `base: './'` in `vite.config.ts` so all assets load with relative paths regardless of the repository subfolder name (e.g. `username.github.io/huluga/`).
2. **HashRouter**: Uses `createHashRouter` or `<HashRouter>` from `react-router-dom` so page reloads on GitHub Pages never trigger a 404.
3. **Deploy Scripts**: Include `npm run build` and `gh-pages` helper command in `package.json`, plus a sample GitHub Actions workflow (`.github/workflows/deploy.yml`).

---

## 7. Verification & Testing Plan
- **Unit / Logic Tests**: Validate the 5% monthly interest engine with various date offsets (1 month, 3 months, partial interest payments, full payoff).
- **Interactive UI Testing**: Validate recording fund entries, submitting member loan applications, approving/disbursing loans as treasurer, recording repayments, and updating balances.
- **Responsive Layout Testing**: Verify mobile navigation and desktop sidebar.
- **Build Verification**: Run `npm run build` to confirm clean, error-free TypeScript compilation and bundle production.
