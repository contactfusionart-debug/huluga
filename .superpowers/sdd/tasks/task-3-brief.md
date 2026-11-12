# Task 3: Local Storage Database Adapter, Mock Initial Data & Supabase Adapter

**Files:**
- Create: `src/services/databaseAdapter.ts`
- Create: `src/services/mockData.ts`
- Create: `src/services/localStorageAdapter.ts`
- Create: `src/services/supabaseAdapter.ts`
- Create: `src/services/supabaseSchema.sql`
- Test: `src/services/localStorageAdapter.test.ts`

**Context & Requirements:**
Huluga operates in a **local-first testing mode** using `localStorage` so that the user and reviewer can test everything immediately without needing Supabase keys upfront. At the same time, it provides a full `supabaseAdapter.ts` and `supabaseSchema.sql` ready to be plugged in seamlessly when credentials are provided.

1. **`src/services/databaseAdapter.ts`**:
   Define `DatabaseAdapter` interface:
   - `getProfiles(): Promise<UserProfile[]>`
   - `createProfile(profile: UserProfile): Promise<UserProfile>`
   - `updateProfileRole(id: string, role: UserRole): Promise<UserProfile>`
   - `getFundEntries(): Promise<FundEntry[]>`
   - `addFundEntry(entry: Omit<FundEntry, 'id'>): Promise<FundEntry>`
   - `getLoanApplications(): Promise<LoanApplication[]>`
   - `createLoanApplication(app: Omit<LoanApplication, 'id' | 'status' | 'appliedDate'>): Promise<LoanApplication>`
   - `updateApplicationStatus(id: string, status: ApplicationStatus, notes?: string, reviewerId?: string): Promise<LoanApplication>`
   - `getLoans(): Promise<Loan[]>`
   - `disburseLoan(applicationId: string, recordedBy: string): Promise<Loan>`
   - `getPayments(loanId?: string): Promise<LoanPayment[]>`
   - `recordPayment(payment: Omit<LoanPayment, 'id'>): Promise<LoanPayment>`
   - `getSettings(): Promise<AppSettings>`
   - `updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>`
   - `resetToMockData(): Promise<void>`

2. **`src/services/mockData.ts`**:
   Realistic pre-seeded data:
   - 4 Profiles:
     - `user-1`: username `'maria'`, fullName `'Maria Santos (Treasurer)'`, role `'treasurer'`
     - `user-2`: username `'juan'`, fullName `'Juan Dela Cruz'`, role `'member'`
     - `user-3`: username `'ana'`, fullName `'Ana Reyes'`, role `'member'`
     - `user-4`: username `'carlos'`, fullName `'Carlos Mendoza'`, role `'member'`
   - Fund Entries:
     - Capital contributions from each member (e.g. ₱40,000 each) and initial seed balance.
     - Outflows from existing disbursed loans.
   - Active Loans:
     - Juan Dela Cruz: ₱20,000 principal at 5.0% monthly interest, started 2 months ago, has paid ₱2,000 in interest.
     - Carlos Mendoza: ₱10,000 principal at 5.0% monthly interest, started 1 month ago.
   - Loan Applications:
     - Ana Reyes: ₱15,000, purpose `'Emergency home repair'`, status `'pending'`.
   - Settings:
     - `organizationName: 'Huluga Community Fund'`
     - `currencySymbol: '₱'`
     - `defaultMonthlyInterestRate: 5.0`
     - `memberLoanLimit: 50000`

3. **`src/services/localStorageAdapter.ts`**:
   - Implements `DatabaseAdapter` backed by `localStorage` keys (e.g. `huluga_profiles`, `huluga_funds`, `huluga_applications`, `huluga_loans`, `huluga_payments`, `huluga_settings`).
   - If empty, auto-seeds with `mockData.ts`.
   - `disburseLoan`:
     - Checks application status is `'approved'` or `'pending'`.
     - Marks application as `'disbursed'`.
     - Creates new `Loan` with `principalAmount: app.requestedAmount`, `monthlyInterestRate: app.monthlyInterestRate`, `startDate: today`, `status: 'active'`.
     - Auto-records a `FundEntry` of type `'loan_disbursement'`, direction `'outflow'`, reducing pool cash.
   - `recordPayment`:
     - Creates `LoanPayment`.
     - Updates target `Loan`: adds to `principalPaid` and `interestPaid`.
     - If `remainingPrincipal === 0 && unpaidInterest === 0`, sets `status = 'paid'`.
     - Auto-records a `FundEntry` of type `'loan_repayment'`, direction `'inflow'`, adding back into pool cash.

4. **`src/services/supabaseAdapter.ts`**:
   - Implements `DatabaseAdapter` using `@supabase/supabase-js`.
   - Initializes with client credentials (URL & anon key) from localStorage or env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
   - If client is unconfigured or offline, provides clean error handling so caller knows to fallback to local adapter.

5. **`src/services/supabaseSchema.sql`**:
   - Complete PostgreSQL DDL with:
     - `profiles` table (id references `auth.users.id`, username unique, full_name, role)
     - `fund_entries` table
     - `loan_applications` table
     - `loans` table
     - `loan_payments` table
     - `app_settings` table
     - RLS (Row Level Security) policies: members can view their own loans/applications; treasurers can view and manage all entries.
     - Trigger: auto-create profile on `auth.users` insert; if first user in database, role is `'treasurer'`, else `'member'`.

6. **`src/services/localStorageAdapter.test.ts`**:
   - Tests `localStorageAdapter` methods:
     - Auto-seeding works
     - Adding a fund entry updates entries list
     - Submitting loan application and then disbursing it creates an active loan and a fund outflow entry
     - Recording payment updates loan balances and records a fund inflow entry
     - Settings updates persist
