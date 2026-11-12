# Task 4: AuthContext, Role-Based Access Control, and Fast Demo Switcher

**Files:**
- Create: `src/context/AuthContext.tsx`
- Create: `src/context/DataContext.tsx`
- Create: `src/context/ToastContext.tsx`
- Create: `src/components/common/ToastContainer.tsx`
- Test: `src/context/context.test.ts` (or test verifying Auth & Data provider state management)

**Global Constraints:**
- Username & password accounts (internal mapping to `username@huluga.local`).
- Fast Demo Switcher allowing 1-click role swapping between Treasurer (Maria) and Members (Juan, Ana, Carlos) for local testing.
- Clean toasts adhering to Astryx / Impeccable contrast (no generic floating gradients, clean zinc/emerald/rose/amber styling).
- DataContext abstracts the underlying `DatabaseAdapter` so UI components simply call `useData()` and `useAuth()`.

**Detailed Requirements:**
1. `src/context/AuthContext.tsx`:
   - `useAuth()` hook returning:
     - `currentUser: UserProfile | null`
     - `isAuthenticated: boolean`
     - `isTreasurer: boolean` (true if `currentUser?.role === 'treasurer'`)
     - `loginWithUsername(username: string, password?: string): Promise<{ success: boolean; error?: string }>`
     - `registerWithUsername(username: string, fullName: string, password?: string): Promise<{ success: boolean; error?: string }>`
     - `loginWithGoogle(): Promise<{ success: boolean; error?: string }>`
     - `logout(): void`
     - `switchDemoUser(userId: string): void`
     - `availableUsers: UserProfile[]`
   - Automatically loads persisted user from `localStorage` (`huluga_active_user`), defaulting to Maria Santos (Treasurer) so test sessions start fully authenticated.

2. `src/context/DataContext.tsx`:
   - `useData()` hook returning:
     - `fundEntries: FundEntry[]`
     - `loans: Loan[]`
     - `applications: LoanApplication[]`
     - `members: UserProfile[]`
     - `settings: AppSettings`
     - `dataSource: 'local' | 'supabase'`
     - `isLoading: boolean`
     - `error: string | null`
     - `refreshData(): Promise<void>`
     - `addFundEntry(entry: Omit<FundEntry, 'id'>): Promise<FundEntry>`
     - `createLoanApplication(app: Omit<LoanApplication, 'id' | 'status' | 'appliedDate'>): Promise<LoanApplication>`
     - `updateApplicationStatus(id: string, status: ApplicationStatus, notes?: string): Promise<LoanApplication>`
     - `disburseLoan(applicationId: string): Promise<Loan>`
     - `recordPayment(payment: Omit<LoanPayment, 'id'>): Promise<LoanPayment>`
     - `updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings>`
     - `updateMemberRole(memberId: string, role: UserRole): Promise<void>`
     - `resetToMockData(): Promise<void>`
     - `setDataSource(source: 'local' | 'supabase'): Promise<void>`

3. `src/context/ToastContext.tsx` & `src/components/common/ToastContainer.tsx`:
   - `useToast()` hook: `showToast(message: string, type?: 'success' | 'error' | 'info' | 'warning', durationMs?: number)`
   - Renders unobtrusive, accessible toast notification stack fixed at top-right (or bottom-right on mobile).

4. `src/context/context.test.ts`:
   - Tests `AuthContext` state logic (login, logout, demo switch, role determination) and `DataContext` state logic.
