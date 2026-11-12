# Task 7: Loan Application & Member Self-Service Feature

**Files:**
- Create: `src/components/loans/LoanApplicationModal.tsx`
- Create: `src/components/loans/ApplicationReviewModal.tsx`
- Create: `src/components/loans/ApplicationListTable.tsx`
- Create: `src/pages/ApplicationsPage.tsx`
- Test: `src/pages/ApplicationsPage.test.tsx`

**Global Constraints:**
- Implements member loan application submission and treasurer review/disbursement pipeline.
- Integrates the 5% fixed monthly interest calculation preview (no fixed term).
- Double-entry disbursement: disbursing a loan creates an active loan and a fund outflow entry.
- Strict Astryx / Impeccable / Hallmark design (`font-mono tabular-nums`, clean zinc cards, accessible status badges, no AI slop).

**Detailed Requirements:**
1. **`src/components/loans/LoanApplicationModal.tsx`**:
   - For members (or treasurer applying on behalf of a member):
     - Amount field (numeric validation > 0, compares against `settings.memberLoanLimit` if set).
     - Purpose field (required).
     - Live 5% Monthly Interest Calculator Preview:
       - Displays: `Fixed Rate: 5.0% / month`
       - Computes: `Monthly Interest = requestedAmount * 0.05` (e.g. ₱10,000 -> ₱500.00/mo)
       - Notes: "Open-ended loan: pay 5% monthly interest each cycle; pay down the principal at any time."
     - Form validation, error handling, loading state on submit.
     - On submit, calls `createLoanApplication(...)`, shows success toast, and closes modal.

2. **`src/components/loans/ApplicationReviewModal.tsx`**:
   - For Treasurer:
     - Displays application details: Borrower name, requested amount, purpose, submission date.
     - Context card: Borrower's total capital contributions to date, current active loan balance.
     - Review notes textarea.
     - Three Actions:
       - **Approve**: Updates status to `'approved'` with notes.
       - **Reject**: Updates status to `'rejected'` with notes.
       - **Disburse Loan**:
         - Confirms fund availability from `useData().fundEntries` (Net Liquid Pool).
         - Calls `disburseLoan(application.id)`.
         - Auto-creates active `Loan` with start date today and records a `loan_disbursement` fund outflow.
         - Shows success toast.

3. **`src/components/loans/ApplicationListTable.tsx`**:
   - Tabular view of loan applications:
     - Filter tabs: `All`, `Pending`, `Approved`, `Disbursed`, `Rejected`.
     - Search input (borrower name, purpose, ID).
     - Columns: Applied Date, Borrower, Amount (`font-mono tabular-nums`), Monthly 5% Interest (`font-mono tabular-nums`), Purpose, Status (`Badge`), Actions.
     - If Member: sees only their applications; can cancel a pending application.
     - If Treasurer: sees all applications; can open `ApplicationReviewModal`.

4. **`src/pages/ApplicationsPage.tsx`**:
   - Page header with title, summary, and "Apply for Loan" primary CTA button.
   - Status counters (Total Pending, Total Approved, Total Disbursed, Total Rejected).
   - Application list table and modals.

5. **`src/pages/ApplicationsPage.test.tsx`**:
   - Tests:
     - Member submitting a loan application with live calculation preview.
     - Member viewing their submitted application status.
     - Treasurer reviewing, approving, and disbursing an application (verifying loan creation and fund outflow).
     - Rejection with review notes.
