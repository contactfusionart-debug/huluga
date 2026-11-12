# High-Value Loan Co-Maker & Joint Liability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a high-value loan co-maker requirement where loans $\ge$ ₱20,000 require an eligible member co-maker who must digitally accept joint liability in their dashboard before treasurer approval.

**Architecture:** Extend `LoanApplication` and `Loan` types with co-maker state tracking (`coMakerStatus: 'none' | 'pending' | 'accepted' | 'declined'`). Provide an eligibility evaluator in `src/utils/coMaker.ts`, integrate co-maker selection in `LoanApplicationModal`, surface pending endorsement requests in `DashboardPage` via a new `CoMakerConsentModal`, and enforce approval locks in `ApplicationsPage`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Vitest, React Testing Library.

## Global Constraints
- Target threshold: Default `₱20,000.00` configured via `AppSettings.coMakerLoanThreshold`.
- Co-maker eligibility: Active member, not the applicant, $\ge 1$ paid-up share (₱5,000 equity), 0 overdue loans.
- Treasurer approval gate: Hard block on approval if `coMakerStatus === 'pending'` or `coMakerStatus === 'declined'`.
- All 19 existing Vitest test files must continue to pass 100% without regression.
- Code must pass `npm run build` (`tsc && vite build`) cleanly with zero TypeScript errors.

---

### Task 1: Type Definitions & Settings Support

**Files:**
- Modify: `src/types/index.ts:40-120`
- Modify: `src/context/AppContext.tsx:80-120`

**Interfaces:**
- Produces: `CoMakerStatus`, updated `LoanApplication` with co-maker attributes, updated `Loan` with co-maker attributes, updated `AppSettings` with `coMakerLoanThreshold`.

- [ ] **Step 1: Write type definitions and default settings**
  Add `CoMakerStatus = 'none' | 'pending' | 'accepted' | 'declined'` to `src/types/index.ts`.
  Add `coMakerRequired?: boolean`, `coMakerId?: string`, `coMakerName?: string`, `coMakerStatus?: CoMakerStatus`, `coMakerRespondedAt?: string`, `coMakerNotes?: string` to `LoanApplication`.
  Add `coMakerId?: string`, `coMakerName?: string` to `Loan`.
  Add `coMakerLoanThreshold?: number` to `AppSettings`.
  Update initial settings in `AppContext.tsx` with `coMakerLoanThreshold: 20000`.

- [ ] **Step 2: Verify TypeScript compilation**
  Run `npx tsc --noEmit` to verify type safety.

- [ ] **Step 3: Commit**
  `git add src/types/index.ts src/context/AppContext.tsx && git commit -m "feat(types): add co-maker fields to LoanApplication, Loan, and AppSettings"`

---

### Task 2: Co-Maker Eligibility Engine & Unit Tests

**Files:**
- Create: `src/utils/coMaker.ts`
- Create: `src/utils/coMaker.test.ts`

**Interfaces:**
- Consumes: `UserProfile`, `FundEntry`, `Loan` from `src/types`
- Produces: `getEligibleCoMakers(allMembers, applicantId, fundEntries, loans): CoMakerEligibility[]`

- [ ] **Step 1: Write failing unit tests for `getEligibleCoMakers`**
  In `src/utils/coMaker.test.ts`:
  - Test that applicant cannot be their own co-maker.
  - Test that members with 0 shares / < ₱5,000 paid-up capital are disqualified.
  - Test that members with overdue loans are disqualified.
  - Test that inactive members are disqualified.
  - Test that active members in good standing with $\ge$ ₱5,000 shares are qualified.

- [ ] **Step 2: Run tests to verify failure**
  Run `npx vitest run src/utils/coMaker.test.ts` and confirm failure.

- [ ] **Step 3: Implement `src/utils/coMaker.ts`**
  Implement `getEligibleCoMakers` calculating paid-up capital from `fundEntries` where `type === 'contribution'`, checking overdue interest obligations using `calculateLoanSummary`, and filtering out ineligible candidates.

- [ ] **Step 4: Run tests to verify pass**
  Run `npx vitest run src/utils/coMaker.test.ts` and confirm all tests pass.

- [ ] **Step 5: Commit**
  `git add src/utils/coMaker.ts src/utils/coMaker.test.ts && git commit -m "feat(loans): add co-maker eligibility evaluation utility and unit tests"`

---

### Task 3: Co-Maker Selection in `LoanApplicationModal`

**Files:**
- Modify: `src/components/loans/LoanApplicationModal.tsx`
- Modify: `src/pages/ApplicationsPage.test.tsx`

**Interfaces:**
- Consumes: `getEligibleCoMakers` from `src/utils/coMaker`, `settings.coMakerLoanThreshold`
- Produces: Submission payload containing `coMakerRequired`, `coMakerId`, `coMakerName`, `coMakerStatus`

- [ ] **Step 1: Write failing test in `ApplicationsPage.test.tsx`**
  Add test: *"requires selecting an eligible co-maker when requesting amount >= ₱20,000"*.
  Confirm failure when submitting ₱25,000 without a co-maker.

- [ ] **Step 2: Update `LoanApplicationModal.tsx`**
  - Compute `isCoMakerRequired = numericAmount >= (settings?.coMakerLoanThreshold ?? 20000)`.
  - Display co-maker alert and searchable dropdown selector showing eligible members.
  - In `validate()`, if `isCoMakerRequired && !coMakerId`, add `newErrors.coMaker = 'Please select a qualified co-maker for loans of ₱20,000 or greater'`.
  - Pass co-maker details to `onSubmit`.

- [ ] **Step 3: Run tests and verify pass**
  Run `npx vitest run src/pages/ApplicationsPage.test.tsx` and confirm tests pass.

- [ ] **Step 4: Commit**
  `git add src/components/loans/LoanApplicationModal.tsx src/pages/ApplicationsPage.test.tsx && git commit -m "feat(loans): require co-maker nomination for loan amounts >= ₱20,000"`

---

### Task 4: `CoMakerConsentModal` & Dashboard Endorsement Card

**Files:**
- Create: `src/components/loans/CoMakerConsentModal.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/PagesCore.test.tsx`

**Interfaces:**
- Consumes: `LoanApplication`, `onAccept(applicationId, notes)`, `onDecline(applicationId, notes)`
- Produces: Interactive endorsement acceptance & decline flow for nominated member

- [ ] **Step 1: Create `CoMakerConsentModal.tsx`**
  - Display applicant name, requested loan amount, monthly interest preview, and purpose.
  - Display Co-Maker Joint Liability Agreement text with an explicit confirmation checkbox (`accept-co-maker-checkbox`).
  - Action buttons: "Accept & Co-Sign" (`confirm-co-maker-btn`) and "Decline" (`decline-co-maker-btn`).

- [ ] **Step 2: Integrate endorsement banner & modal into `DashboardPage.tsx`**
  - When logged in as a member, filter `applications` where `coMakerId === currentUser.id && coMakerStatus === 'pending'`.
  - Render an alert card: *"Pending Co-Maker Request"* with "Review & Sign" and "Decline" buttons.
  - Implement handlers to update application `coMakerStatus` to `'accepted'` or `'declined'`.

- [ ] **Step 3: Add unit tests in `PagesCore.test.tsx`**
  Verify that when an application targets the logged-in member as co-maker, the endorsement card is shown, and accepting updates the status.

- [ ] **Step 4: Run tests to verify pass**
  Run `npx vitest run src/pages/PagesCore.test.tsx`.

- [ ] **Step 5: Commit**
  `git add src/components/loans/CoMakerConsentModal.tsx src/pages/DashboardPage.tsx src/pages/PagesCore.test.tsx && git commit -m "feat(member): add co-maker review and joint liability endorsement modal"`

---

### Task 5: Treasurer Safeguards & Loan Ledger Preservation in `ApplicationsPage`

**Files:**
- Modify: `src/pages/ApplicationsPage.tsx`
- Modify: `src/pages/ApplicationsPage.test.tsx`

**Interfaces:**
- Consumes: `application.coMakerStatus`, `application.coMakerName`
- Produces: Locked approval state when co-maker is pending/declined, co-maker attached to `Loan` on disbursement

- [ ] **Step 1: Write test for Treasurer approval gate**
  In `ApplicationsPage.test.tsx`:
  - Test that an application with `coMakerStatus === 'pending'` disables the "Approve" button and renders `⏳ Awaiting Co-Maker`.
  - Test that after co-maker accepts, the "Approve" button unlocks.
  - Test that disbursement creates a loan containing `coMakerId` and `coMakerName`.

- [ ] **Step 2: Update `ApplicationsPage.tsx`**
  - Add co-maker status badges (`⏳ Awaiting Co-Maker`, `✓ Co-Maker Endorsed`, `✕ Co-Maker Declined`).
  - Disable "Approve" button if `app.coMakerRequired && app.coMakerStatus !== 'accepted'`.
  - Pass `coMakerId` and `coMakerName` to `disburseLoan`.

- [ ] **Step 3: Run tests and verify pass**
  Run `npx vitest run src/pages/ApplicationsPage.test.tsx`.

- [ ] **Step 4: Commit**
  `git add src/pages/ApplicationsPage.tsx src/pages/ApplicationsPage.test.tsx && git commit -m "feat(treasurer): enforce co-maker endorsement gate before loan approval and disbursement"`

---

### Task 6: Settings Page Configuration & End-to-End Verification

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.test.tsx` (or `PagesCore.test.tsx`)

**Interfaces:**
- Consumes/Updates: `settings.coMakerLoanThreshold`

- [ ] **Step 1: Update `SettingsPage.tsx`**
  Add "Co-Maker Loan Threshold (₱)" input under *Lending Rules & Credit Policies*, allowing the Treasurer to adjust the threshold or set to 0.

- [ ] **Step 2: Run complete Vitest suite**
  Run `npx vitest run` across all test files and ensure 100% pass rate.

- [ ] **Step 3: Run production build**
  Run `npm run build` to ensure clean TypeScript compilation and bundle generation.

- [ ] **Step 4: Commit and push**
  `git add src/pages/SettingsPage.tsx && git commit -m "feat(settings): allow configuring co-maker loan threshold"`
  `git push origin feature/huluga-core`
