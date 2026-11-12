# Task 10: Dashboard, Settings, Supabase Configurator & SQL Exporter

**Files:**
- Create: `src/pages/DashboardPage.tsx`
- Create: `src/pages/LoginPage.tsx`
- Create: `src/pages/SettingsPage.tsx`
- Create: `src/components/settings/SupabaseConfigModal.tsx`
- Create: `src/components/settings/SqlScriptViewer.tsx`
- Test: `src/pages/PagesCore.test.tsx`

**Global Constraints:**
- Auth: Pure username & password (no email input required), Google Login button, and 1-click Fast Demo User Switcher for local testing.
- Dashboard adapts dynamically to `isTreasurer` (Executive Cockpit) vs Member (Personal Self-Service).
- Settings page includes: Organization settings (`organizationName`, `currencySymbol`, `defaultMonthlyInterestRate`, `memberLoanLimit`), Data Source mode toggle (Local Testing vs Supabase Cloud), `SupabaseConfigModal` (saves `huluga_supabase_url` and `huluga_supabase_anon_key` in localStorage), `SqlScriptViewer` (displays `src/services/supabaseSchema.sql` with 1-click copy), and Reset Demo Data button.
- Strict Astryx / Impeccable / Hallmark design: `font-mono tabular-nums`, crisp zinc borders, semantic badges, zero AI slop.

**Detailed Requirements:**
1. **`src/pages/LoginPage.tsx`**:
   - Clean, centered auth card with Huluga branding (no bloated purple blobs/AI slop).
   - Tabs or toggle: "Sign In" vs "Create Account".
   - Fields:
     - Username (required, alphanumeric)
     - Full Name (only shown in "Create Account" mode)
     - Password (required)
   - Actions:
     - Primary button calling `loginWithUsername` or `registerWithUsername` from `useAuth()`.
     - "Continue with Google" button calling `loginWithGoogle()`.
   - "Local Testing Quick Access" section:
     - 1-click demo buttons for Maria Santos (Treasurer) and Juan Dela Cruz (Member) calling `switchDemoUser(...)`.
   - Automatically navigates to `/` upon successful authentication.

2. **`src/pages/DashboardPage.tsx`**:
   - **Treasurer View (`isTreasurer === true`)**:
     - Top 4 `StatCard`s:
       - Net Liquid Fund Pool (`totalInflows - totalOutflows`)
       - Active Loans Principal (sum of remaining principal on active loans)
       - Total Unpaid Accrued Interest (sum of unpaid accrued interest at 5%/mo)
       - Pending Loan Applications (count, links to `/applications`)
     - Quick Action buttons:
       - "Manage Funds" (`/funds`)
       - "Review Applications" (`/applications`)
       - "Manage Loans" (`/loans`)
     - Two-column grid:
       - **Pending Applications Queue**: Top pending loan applications with requested amount and quick "Review" link to `/applications`.
       - **Recent Treasury Ledger**: Latest 5 fund entries (`font-mono tabular-nums`, `+` emerald / `-` rose).
   - **Member View (`isTreasurer === false`)**:
     - Top 4 `StatCard`s:
       - My Total Contributed Equity
       - My Active Loan Principal
       - My Unpaid Accrued 5% Monthly Interest
       - My Pending Applications
     - Callout Card: "Need Cash? Apply for a Loan" (5.0% fixed monthly interest on principal, no fixed term) -> links to `/applications`.
     - Two-column grid:
       - **My Active Loans**: Shows principal, monthly 5% interest amount, and total payoff balance.
       - **My Recent Transactions**: Personal contributions and loan repayments.

3. **`src/components/settings/SupabaseConfigModal.tsx`**:
   - Modal to configure Supabase project credentials:
     - Supabase Project URL (`https://xxxx.supabase.co`)
     - Supabase Anon Key (`eyJ...`)
   - Loads initial values via `getSupabaseCredentials()`.
   - Validation: checks URL starts with `https://` or `http://` and anon key is non-empty.
   - Save button writes `huluga_supabase_url` and `huluga_supabase_anon_key` to `localStorage`, shows toast, and optionally tests/activates `setDataSource('supabase')`.
   - "Disconnect / Clear Keys" button to revert back to Local Testing mode (`setDataSource('local')`).

4. **`src/components/settings/SqlScriptViewer.tsx`**:
   - Imports `supabaseSchema.sql` (using Vite `?raw` import: `import schemaSql from '../../services/supabaseSchema.sql?raw'`) with fallback string if undefined in test environment.
   - Scrollable code block with syntax-clean monospace font (`font-mono text-xs`).
   - "Copy SQL Setup Script" button with clipboard copy + visual "Copied!" state + toast.

5. **`src/pages/SettingsPage.tsx`**:
   - **Organization & Lending Rules Card**:
     - Inputs: `organizationName`, `currencySymbol`, `defaultMonthlyInterestRate` (defaults to 5.0), `memberLoanLimit`.
     - Save button (enabled for Treasurer, read-only display for regular Member).
   - **Database & Backend Mode Card**:
     - Current mode badge: `Local Storage (Testing Mode)` vs `Supabase Cloud (Connected)`.
     - Toggle button to switch mode or open `SupabaseConfigModal`.
     - "Reset Local Demo Data" button (calls `resetToMockData()` + success toast).
   - **Supabase SQL Schema Setup Card**:
     - Embeds `SqlScriptViewer` with concise instructions ("Paste this into your Supabase SQL Editor to create tables, RLS policies, and the auto-treasurer signup trigger").

6. **`src/pages/PagesCore.test.tsx`**:
   - Tests:
     - `LoginPage`: Sign in with username+password, create account mode, quick demo login button.
     - `DashboardPage`: Renders Treasurer cockpit metrics vs Member personal portal metrics.
     - `SettingsPage`: Treasurer updates organization name & currency symbol; SQL script copy button works; Supabase config modal saves credentials; Reset demo data triggers `resetToMockData`.
