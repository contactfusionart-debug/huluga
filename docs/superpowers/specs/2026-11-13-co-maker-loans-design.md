# Design Specification: Co-Maker for High-Value Loans

**Date**: 2026-11-13  
**Status**: Approved  
**Topic**: High-Value Loan Co-Maker & Joint Liability Endorsement Workflow  

---

## 1. Overview & Business Rationale
In community micro-finance and cooperative lending, high-value loans introduce concentration risk to the liquidity pool. To safeguard capital while maintaining accessible financing for members, loans exceeding a configurable threshold (default **₱20,000.00**) require an eligible **Co-Maker (Guarantor)** who is an active cooperative member in good standing.

The co-maker must review the loan details and explicitly consent to joint liability via their Member Dashboard before the Treasurer is permitted to approve or disburse the loan.

---

## 2. Configuration & Settings
A new configurable parameter is added to `AppSettings`:
* **`coMakerLoanThreshold: number`**: Default `20000` (₱20,000.00).
  - Can be adjusted or disabled (set to `0`) by the Treasurer in **SettingsPage** under *Lending Rules & Credit Policies*.

---

## 3. Data Model Extensions

### 3.1 `LoanApplication` Schema Extensions
Located in `src/types/index.ts`:
```ts
export type CoMakerStatus = 'none' | 'pending' | 'accepted' | 'declined';

export interface LoanApplication {
  id: string;
  borrowerId: string;
  borrowerName: string;
  requestedAmount: number;
  purpose: string;
  monthlyInterestRate: number;
  status: ApplicationStatus;
  appliedDate: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // Co-Maker Fields
  coMakerRequired?: boolean;
  coMakerId?: string;
  coMakerName?: string;
  coMakerStatus?: CoMakerStatus;
  coMakerRespondedAt?: string;
  coMakerNotes?: string;
}
```

### 3.2 `Loan` Schema Extensions
When an approved application with a co-maker is disbursed into an active `Loan`:
```ts
export interface Loan {
  // Existing fields...
  coMakerId?: string;
  coMakerName?: string;
}
```

---

## 4. Co-Maker Eligibility Engine
Located in `src/utils/coMaker.ts`:
```ts
export interface CoMakerEligibility {
  member: UserProfile;
  isEligible: boolean;
  reasons: string[];
}

export function getEligibleCoMakers(
  allMembers: UserProfile[],
  applicantId: string,
  fundEntries: FundEntry[],
  loans: Loan[]
): CoMakerEligibility[];
```

### Eligibility Criteria:
1. **Not Self**: `member.id !== applicantId`.
2. **Active Status**: `member.status === 'active'`.
3. **Share Capital Holding**: Has at least 1 paid-up share (₱5,000.00 contributed capital from contribution fund entries).
4. **Clean Credit Record**: Has no active loans that are overdue (based on interest accrual and payment cycle).

---

## 5. User Workflows & Components

### 5.1 Borrower Application Flow (`LoanApplicationModal.tsx`)
1. Member inputs loan amount.
2. If `amount >= coMakerLoanThreshold`:
   - An informational notice appears: *"Loans of ₱20,000.00 or higher require an eligible co-maker."*
   - A searchable Co-Maker dropdown displays qualified members with their share equity.
   - If submitted without selecting a co-maker, validation blocks submission (`terms-error`/`co-maker-error`).
3. Upon submission:
   - `coMakerRequired = true`
   - `coMakerStatus = 'pending'`
   - Application enters queue with pending endorsement.

### 5.2 Co-Maker Endorsement Flow (`DashboardPage.tsx` & `CoMakerConsentModal.tsx`)
1. When the nominated co-maker logs in, a dedicated notification card displays:
   - *"Pending Co-Maker Request: [Borrower Name] requested you to guarantee a ₱[Amount] loan."*
2. Co-maker clicks **"Review & Sign"**:
   - Opens `CoMakerConsentModal` displaying principal, interest, purpose, and the Co-Maker Joint Liability Agreement:
     > *"I agree to act as co-maker for this loan. I acknowledge that I am jointly liable for repayments if the primary borrower defaults, and understand the cooperative may apply my share capital to satisfy outstanding balances."*
   - Explicit confirmation checkbox required.
   - Clicking **"Accept & Co-Sign"** updates `coMakerStatus = 'accepted'` and sets `coMakerRespondedAt`.
3. Co-maker clicks **"Decline"**:
   - Updates `coMakerStatus = 'declined'`.
   - The applicant is notified on their application card to cancel or re-apply with another co-maker.

### 5.3 Treasurer Review & Disbursement (`ApplicationsPage.tsx`)
1. In the Application Queue:
   - If `coMakerStatus === 'pending'`: Shows badge `⏳ Awaiting Co-Maker`. The **"Approve"** button is disabled with tooltip: *"Cannot approve: Nominated co-maker has not yet accepted endorsement."*
   - If `coMakerStatus === 'accepted'`: Shows badge `✓ Co-Maker Endorsed ([Name])`. **"Approve"** button is unlocked.
   - If `coMakerStatus === 'declined'`: Shows badge `✕ Co-Maker Declined`. **"Approve"** button remains disabled.
2. Upon disbursement:
   - Co-maker info is transferred to the active `Loan` record.
   - Displayed in `LoansPage` portfolio and member profiles.

---

## 6. Testing & Quality Assurance
- **Unit Tests**:
  - `src/utils/coMaker.test.ts`: Tests eligibility rules, self-nomination blocking, share capital minimum, and delinquency disqualification.
- **Component & Integration Tests**:
  - `LoanApplicationModal.test.tsx`: Form validation for co-maker threshold.
  - `DashboardPage.test.tsx`: Co-maker notification, consent modal signing, and declining.
  - `ApplicationsPage.test.tsx`: Treasurer approval blocking when co-maker is pending, and clean approval when endorsed.
- **Build & Full Verification**:
  - Complete Vitest test run (`npx vitest run`) across all 19+ test suites.
  - TypeScript build verification (`npm run build`).
