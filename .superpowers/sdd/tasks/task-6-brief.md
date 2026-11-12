# Task 6: Fund Management Feature (Treasurer View & Inflow/Outflow Ledger)

**Files:**
- Create: `src/components/funds/AddFundModal.tsx`
- Create: `src/components/funds/FundLedgerTable.tsx`
- Create: `src/components/funds/FundSummaryStats.tsx`
- Create: `src/pages/FundsPage.tsx`
- Test: `src/pages/FundsPage.test.tsx`

**Global Constraints:**
- Implements owner/treasurer management of entry of funds (as explicitly required in USER_REQUEST: "this is an app were the owner or the tresurer shall manage the entry og funds").
- Strictly adheres to Astryx / Impeccable / Hallmark design: `font-mono tabular-nums`, clean zinc cards, emerald/rose/amber semantic badges, zero AI-slop gradients.
- Works seamlessly in both local testing mode and Supabase mode.

**Detailed Requirements:**
1. **`src/components/funds/FundSummaryStats.tsx`**:
   - Computes:
     - **Net Liquid Fund Pool:** `totalInflows - totalOutflows` (available cash to lend)
     - **Member Capital Contributed:** sum of `contribution` entries
     - **Active Capital Loaned:** sum of active loans principal remaining
     - **Total Repayments Collected:** sum of principal + interest repaid
   - Rendered using `StatCard` with tabular numbers.

2. **`src/components/funds/AddFundModal.tsx`**:
   - Modal to record new fund transactions:
     - `type`: `'contribution'` (requires selecting a member from `members`), `'deposit'`, `'expense'`, `'adjustment'`
     - `amount`: number > 0
     - `date`: ISO string default today
     - `referenceNo`: optional text (e.g. bank slip, receipt #, GCash ref)
     - `description`: text
   - Validates required fields, shows error toasts or inline validation.
   - On submit, calls `addFundEntry(...)` from `useData()`, shows success toast, and closes modal.

3. **`src/components/funds/FundLedgerTable.tsx`**:
   - Interactive, filterable transaction table:
     - Filter tabs: `All`, `Inflows (+)` (`contribution`, `deposit`, `loan_repayment`), `Outflows (-)` (`loan_disbursement`, `expense`).
     - Search input: filter by reference, description, or member name.
     - Columns: Date, Transaction Type (Badge), Direction & Amount (`+₱...` in emerald, `-₱...` in rose), Related Member, Reference, Recorded By.
     - Empty state when no transactions match filter.

4. **`src/pages/FundsPage.tsx`**:
   - Header with page title, description, and "Record Fund Entry" button (enabled for Treasurer; if Member, displays their personal contribution summary and read-only ledger).
   - Summary stats row.
   - Transaction ledger section.
   - Renders `AddFundModal` when triggered.

5. **`src/pages/FundsPage.test.tsx`**:
   - Vitest suite testing:
     - Renders fund summary metrics correctly.
     - Filters ledger by inflow/outflow/search.
     - Treasurer can open `AddFundModal` and submit a new fund contribution, updating the ledger and liquid pool balance.
