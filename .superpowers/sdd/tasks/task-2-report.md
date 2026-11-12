# Task 2 Report: Core Domain Types & 5% Fixed Monthly Interest Calculation Engine

**Date:** 2026-11-11
**Task:** Task 2 - Core Domain Types & 5% Fixed Monthly Interest Calculation Engine
**Status:** DONE

---

## 1. Implementation Overview

We implemented the complete TypeScript domain model, formatters for currency and dates, and the core 5% fixed monthly interest calculation engine for Huluga following strict Test-Driven Development (TDD).

### Deliverables:
1. **`src/types/index.ts`**:
   - `UserRole`: `'treasurer' | 'member'`
   - `UserProfile`: Full profile representation with status and joined date.
   - `FundEntryType`: Six accounting entry types (`contribution`, `deposit`, `loan_disbursement`, `loan_repayment`, `expense`, `adjustment`).
   - `FundEntry`: Inflow/outflow fund ledger transaction record.
   - `ApplicationStatus`: Pending, approved, rejected, disbursed, cancelled lifecycle.
   - `LoanApplication`: Full loan request record with borrower details and review status.
   - `LoanStatus`: `'active' | 'paid' | 'defaulted'`.
   - `Loan`: Open-ended loan model without fixed term, tracking principal and interest paid.
   - `LoanPayment`: Ledger entry mapping payment portions to interest and principal.
   - `AppSettings`: Organization parameters (default interest rate, currency symbol).
   - `LoanSummary`: Financial snapshot containing accrued interest, unpaid interest, remaining principal, payoff amount, and fully-paid boolean flag.
   - `PaymentAllocation`: Breakdown of interest portion, principal portion, and excess amount.

2. **`src/utils/formatters.ts`**:
   - `formatCurrency(amount: number, currency = '₱')`: Formats numbers with 2 decimal places, comma thousands separator, and handles negative values correctly (`-₱500.00`).
   - `formatDate(dateStr: string)`: Formats `YYYY-MM-DD` or ISO strings to human-friendly format (e.g. `Nov 11, 2026`) without timezone shift defects.
   - `formatPercent(rate: number)`: Formats numeric rates with 1-2 decimal places (e.g. `5.0%`).
   - `toISODateString(date: Date)`: Helper to extract local `YYYY-MM-DD` formatted strings.

3. **`src/services/interestEngine.ts`**:
   - `calculateMonthsElapsed(startDateStr, asOfDate)`:
     - Calculates elapsed calendar months taking into account day-of-month milestones and month-end variations (e.g. Feb 28).
     - Returns minimum 1 month once a cycle starts if `asOfDate >= startDate`.
     - Returns 0 if `asOfDate < startDate`.
   - `calculateLoanSummary(loan, asOfDate)`:
     - Calculates monthly interest based on 5% of original principal.
     - Calculates total accrued interest = `monthsElapsed * monthlyInterestAmount`.
     - Calculates unpaid accrued interest = `max(0, totalInterestIncurred - interestPaid)`.
     - Calculates remaining principal = `max(0, principalAmount - principalPaid)`.
     - Calculates total payoff amount = `remainingPrincipal + unpaidInterest`.
     - Correctly determines `isFullyPaid` and freezes calculation for loans marked `paid`.
   - `allocatePayment(paymentAmount, unpaidInterest, remainingPrincipal)`:
     - Priority 1: Unpaid accrued interest.
     - Priority 2: Remaining principal.
     - Priority 3: Excess amount returned if overpaid.

4. **`src/services/interestEngine.test.ts`**:
   - 26 comprehensive unit tests covering all engine logic, edge cases, date boundaries, payment allocations, and formatters.

---

## 2. Test-Driven Development (TDD) Workflow

1. **Red Phase**:
   - Created test suite `src/services/interestEngine.test.ts`.
   - Ran `npm test`. Confirmed test suite failed with missing module error (`Failed to load url ./interestEngine`).
2. **Green Phase**:
   - Implemented `src/types/index.ts`, `src/utils/formatters.ts`, and `src/services/interestEngine.ts`.
   - Ran `npm test`. All 27 tests (1 sanity + 26 unit tests) passed in 35ms.
3. **Refactor & Build Phase**:
   - Verified TypeScript compiler (`tsc`) and Vite build (`vite build`) succeeded with 0 errors.

---

## 3. Test & Verification Results

### Test Execution (`npm test`)
```
> huluga@1.0.0 test
> vitest run

 RUN  v2.1.9 D:/huluga

 ✓ src/sanity.test.ts (1 test) 4ms
 ✓ src/services/interestEngine.test.ts (26 tests) 35ms

 Test Files  2 passed (2)
      Tests  27 passed (27)
   Start at  22:29:44
   Duration  1.88s (transform 120ms, setup 0ms, collect 148ms, tests 40ms, environment 1ms, prepare 483ms)
```

### Build Verification (`npm run build`)
```
> huluga@1.0.0 build
> tsc && vite build

vite v6.4.6 building for production...
transforming...
✓ 26 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.17 kB │ gzip:  0.66 kB
dist/assets/index-CGXtPKUG.css    8.23 kB │ gzip:  2.25 kB
dist/assets/index-Ccl-OW3s.js   145.10 kB │ gzip: 46.70 kB
✓ built in 2.71s
```

---

## 4. Commits Created
- `f18bb19`: `feat: add domain types, formatters, and 5% monthly interest calculation engine`

---

## 5. Self-Review Findings
- **Completeness:** Every interface and function required in the brief and specification has been authored and fully tested.
- **Edge Case Protection:**
  - Robust calendar date handling prevents timezone shifts on standard `YYYY-MM-DD` strings.
  - End-of-month adjustments handle shorter months like February gracefully.
  - Floating point rounding prevents JS precision errors on financial amounts.
  - Negative and zero payment amounts handled safely.
- **Concerns:** None. Ready for Task 3 (Local Storage Database Adapter, Mock Initial Data & Supabase Adapter).
