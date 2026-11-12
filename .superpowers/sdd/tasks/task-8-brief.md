# Task 8: Loan Management & Repayment Ledger (5% Monthly Interest Engine)

**Files:**
- Create: `src/components/loans/LoanCard.tsx`
- Create: `src/components/loans/RecordPaymentModal.tsx`
- Create: `src/components/loans/LoanLedgerView.tsx`
- Create: `src/pages/LoansPage.tsx`
- Test: `src/pages/LoansPage.test.tsx`

**Global Constraints:**
- Implements owner/treasurer management of member loans (as required in USER_REQUEST: "manage member loan").
- Fixed 5.0% monthly interest of principal amount with NO fixed maturity term.
- Payment waterfall allocation: covers unpaid monthly accrued interest first; excess pays down principal; when remaining principal reaches 0, loan transitions to 'paid'.
- Automated double-entry: recording a repayment records a `loan_repayment` inflow entry in the fund pool.
- Strict Astryx / Impeccable / Hallmark design: `font-mono tabular-nums`, clean zinc cards, accessible status badges, zero AI slop.

**Detailed Requirements:**
1. **`src/components/loans/RecordPaymentModal.tsx`**:
   - Modal for recording loan repayments:
     - Displays target loan details (borrower name, principal amount, start date, months elapsed).
     - Breakdown cards: Unpaid Accrued Interest (`unpaidInterest`), Remaining Principal (`remainingPrincipal`), Total Payoff Amount (`totalPayoffAmount`).
     - Payment Amount input with quick-fill shortcut buttons:
       - "Pay Monthly Interest (₱X)"
       - "Pay All Interest (₱Y)"
       - "Payoff Loan (₱Z)"
     - Live preview of allocation using `allocatePayment(paymentAmount, unpaidInterest, remainingPrincipal)`:
       - Shows: Interest Portion, Principal Portion, Projected New Remaining Principal, and Projected Status (e.g. "Will mark loan as FULLY PAID" if payoff is achieved).
     - Payment Date (default today).
     - Reference # / Receipt (e.g. GCash reference, cash voucher).
     - Notes field.
     - Form validation (amount > 0, prevents excess above payoff amount or alerts user).
     - On submit: calls `recordPayment(...)` from `useData()`, shows success toast, and closes modal.

2. **`src/components/loans/LoanCard.tsx`**:
   - Card displaying an individual loan's health:
     - Borrower name, Loan ID, start date, status badge (`active`, `paid`).
     - Progress bar showing principal paid vs original principal.
     - Financial stats in `font-mono tabular-nums`:
       - Original Principal
       - Monthly Rate (5.0%/mo) & Monthly Interest Amount
       - Months Elapsed
       - Unpaid Accrued Interest
       - Remaining Principal
       - Total Payoff Balance
     - Action buttons:
       - "Record Payment" button (for Treasurer on active loans).
       - "View Ledger / History" button (opens payment history modal or expands ledger).

3. **`src/components/loans/LoanLedgerView.tsx`**:
   - Detailed ledger modal or collapsible drawer for a selected loan:
     - Complete summary table: all payments recorded for this loan (`LoanPayment[]`).
     - Columns: Payment Date, Reference #, Total Amount, Interest Portion, Principal Portion, Recorded By, Notes.
     - Empty state if no payments recorded yet.

4. **`src/pages/LoansPage.tsx`**:
   - Portfolio overview stats:
     - Total Active Loans Principal
     - Total Accrued Unpaid Interest
     - Total Repayments Collected (Principal + Interest)
     - Total Completed / Fully Paid Loans
   - Tabs: `Active Loans` and `Completed / Paid Loans`.
   - Search input (by borrower name or loan ID).
   - Role scoping:
     - Member sees only their loans.
     - Treasurer sees all member loans and has "Record Payment" action.
   - Modals: `RecordPaymentModal` and `LoanLedgerView`.

5. **`src/pages/LoansPage.test.tsx`**:
   - Tests:
     - Renders active loans and completed loans with accurate 5% monthly interest calculations.
     - Treasurer records a partial interest payment (verifies payment allocation and fund inflow entry created).
     - Treasurer records full principal payoff (verifies loan transitions to `'paid'`).
     - Member view only displays their own loans without administrative actions.
