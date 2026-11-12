# Task 11: Application Routing, GitHub Pages Optimization & End-to-End Build Verification

**Files:**
- Modify: `src/App.tsx`
- Create: `public/404.html`
- Create: `public/favicon.svg`
- Create: `.github/workflows/deploy.yml`
- Test: `src/App.test.tsx`

**Global Constraints:**
- Target platform: GitHub Pages (`HashRouter`, `vite.config.ts` `base: './'`).
- Seamless local-first testing out of the box (auto-authenticated as Maria Santos Treasurer on first visit, with quick demo switcher in Navbar/LoginPage).
- Production build (`npm run build`) compiles with zero errors and outputs clean static bundle to `dist/`.

**Detailed Requirements:**
1. **`src/App.tsx`**:
   - Root provider tree: `ToastProvider` -> `AuthProvider` -> `DataProvider` -> `HashRouter` -> `AppRoutes` (plus `ToastContainer`).
   - Protected routes wrapped in `AppShell`:
     - `/` -> `<DashboardPage />`
     - `/funds` -> `<FundsPage />`
     - `/loans` -> `<LoansPage />`
     - `/applications` -> `<ApplicationsPage />`
     - `/members` -> `<MembersPage />`
     - `/settings` -> `<SettingsPage />`
   - `/login` -> `<LoginPage />` (redirects to `/` if already authenticated).
   - Fallback `*` -> redirects to `/` (if authenticated) or `/login` (if not).
2. **`public/404.html`**:
   - Clean GitHub Pages fallback HTML redirecting any non-hash deep path to `/`.
3. **`public/favicon.svg`**:
   - Minimalist geometric SVG mark in zinc-900 / emerald-600 matching Huluga branding.
4. **`.github/workflows/deploy.yml`**:
   - GitHub Actions workflow using `actions/checkout@v4`, `actions/setup-node@v4`, `npm ci`, `npm run build`, and `actions/deploy-pages@v4`.
5. **`src/App.test.tsx`**:
   - End-to-end routing integration tests:
     - Renders Dashboard on initial load when authenticated.
     - Navigates to Funds, Loans, Applications, Members, and Settings via Sidebar links.
     - Logging out redirects to LoginPage; logging back in restores Dashboard.
