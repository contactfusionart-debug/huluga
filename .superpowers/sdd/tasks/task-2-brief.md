# Task 2: Core Domain Types & 5% Fixed Monthly Interest Calculation Engine

**Files:**
- Create: `src/types/index.ts`
- Create: `src/utils/formatters.ts`
- Create: `src/services/interestEngine.ts`
- Test: `src/services/interestEngine.test.ts`

**Global Constraints:**
- The loan has NO fixed maturity term.
- It has a fixed monthly interest of 5.0% of the principal amount.
- Tabular formatters for Philippine Peso (₱ default) or custom currency symbol.
- Date formatters with human-readable and ISO strings.

**Detailed Requirements:**
1. `src/types/index.ts`:
   - `UserRole`: `'treasurer' | 'member'`
   - `UserProfile`: `id`, `username`, `fullName`, `role`, `avatarUrl?`, `phoneNumber?`, `joinedDate`, `status: 'active' | 'suspended'`
   - `FundEntryType`: `'contribution' | 'deposit' | 'loan_disbursement' | 'loan_repayment' | 'expense' | 'adjustment'`
   - `FundEntry`: `id`, `type`, `amount`, `direction: 'inflow' | 'outflow'`, `memberId?`, `memberName?`, `recordedBy`, `description`, `date`, `referenceNo?`
   - `ApplicationStatus`: `'pending' | 'approved' | 'rejected' | 'disbursed' | 'cancelled'`
   - `LoanApplication`: `id`, `borrowerId`, `borrowerName`, `requestedAmount`, `purpose`, `monthlyInterestRate`, `status`, `appliedDate`, `reviewedBy?`, `reviewedAt?`, `reviewNotes?`
   - `LoanStatus`: `'active' | 'paid' | 'defaulted'`
   - `Loan`: `id`, `applicationId?`, `borrowerId`, `borrowerName`, `principalAmount`, `monthlyInterestRate`, `startDate`, `status`, `principalPaid`, `interestPaid`, `lastPaymentDate?`, `notes?`
   - `LoanPayment`: `id`, `loanId`, `borrowerId`, `recordedBy`, `amount`, `interestPortion`, `principalPortion`, `paymentDate`, `referenceNo?`, `notes?`
   - `AppSettings`: `organizationName`, `currencySymbol`, `defaultMonthlyInterestRate`, `memberLoanLimit?`
   - `LoanSummary`:
     - `principalAmount: number`
     - `monthlyInterestRate: number`
     - `monthlyInterestAmount: number` (e.g. 5% of principalAmount)
     - `monthsElapsed: number` (minimum 1, based on calendar months between startDate and asOfDate)
     - `totalInterestIncurred: number` (`monthsElapsed * monthlyInterestAmount`)
     - `totalInterestPaid: number`
     - `unpaidInterest: number` (`max(0, totalInterestIncurred - totalInterestPaid)`)
     - `remainingPrincipal: number` (`max(0, principalAmount - principalPaid)`)
     - `totalPayoffAmount: number` (`remainingPrincipal + unpaidInterest`)
     - `isFullyPaid: boolean` (`remainingPrincipal === 0 && unpaidInterest === 0`)

2. `src/utils/formatters.ts`:
   - `formatCurrency(amount: number, currency = '₱'): string` -> e.g. "₱12,500.00"
   - `formatDate(dateStr: string): string` -> e.g. "Nov 11, 2026"
   - `formatPercent(rate: number): string` -> e.g. "5.0%"

3. `src/services/interestEngine.ts`:
   - `calculateMonthsElapsed(startDateStr: string, asOfDate: Date = new Date()): number`
     - Computes calendar months difference: `(asOfYear - startYear) * 12 + (asOfMonth - startMonth)`.
     - If `asOfDay < startDay`, adjust by `-1` (or fraction if applicable, but standard community lending counts each monthly cycle or day-of-month milestone; minimum 1 month once a cycle starts).
     - Minimum returned is 1 if loan is active and current date >= start date.
   - `calculateLoanSummary(loan: Loan, asOfDate: Date = new Date()): LoanSummary`
   - `allocatePayment(paymentAmount: number, unpaidInterest: number, remainingPrincipal: number): { interestPortion: number; principalPortion: number; excessAmount: number }`
     - Payment first covers unpaid monthly interest; any excess goes towards paying down principal; any excess beyond payoff is returned as `excessAmount`.

4. `src/services/interestEngine.test.ts`:
   - Full TDD suite covering 1-month, 3-month, partial interest payments, principal reduction, and full payoff allocation.
