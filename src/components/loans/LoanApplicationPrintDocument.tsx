import React from 'react';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';
import type { AppSettings, LoanApplication, UserProfile } from '../../types';

export interface LoanApplicationPrintDocumentProps {
  mode: 'blank' | 'prefilled';
  settings: AppSettings;
  member?: UserProfile;
  paidUpCapital?: number;
  sharesCount?: number;
  application?: LoanApplication;
}

export const LoanApplicationPrintDocument: React.FC<LoanApplicationPrintDocumentProps> = ({
  mode,
  settings,
  member,
  paidUpCapital = 0,
  sharesCount = 0,
  application,
}) => {
  const isPrefilled = mode === 'prefilled';
  const currency = settings.currencySymbol || '₱';
  const interestRate = application?.monthlyInterestRate ?? settings.defaultMonthlyInterestRate ?? 5.0;
  const coMakerThreshold = settings.coMakerLoanThreshold ?? 20000;

  const requestedAmount = isPrefilled && application ? application.requestedAmount : 0;
  const monthlyInterest = Math.round(requestedAmount * (interestRate / 100) * 100) / 100;

  return (
    <div
      id="a4-loan-form-sheet"
      data-testid="a4-loan-form-sheet"
      className="mx-auto w-full max-w-[210mm] min-h-[275mm] max-h-[285mm] bg-white text-zinc-900 p-6 sm:p-8 print:p-2 print:max-w-none print:min-h-0 print:max-h-[280mm] shadow-lg print:shadow-none border border-zinc-200 print:border-none rounded-sm print:rounded-none flex flex-col justify-between text-[11px] leading-snug overflow-hidden"
    >
      <div className="space-y-3">
        {/* Official Cooperative Header */}
        <header className="border-b-2 border-zinc-900 pb-2.5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              Community Micro-Finance &amp; Lending Cooperative
            </p>
            <h1 className="text-lg font-extrabold tracking-tight text-zinc-950 uppercase">
              {settings.organizationName || 'Huluga Community Fund'}
            </h1>
            <p className="text-[10px] text-zinc-600">
              Official Member Loan Application, Co-Maker Guarantee &amp; Credit Agreement
            </p>
          </div>
          <div className="text-right shrink-0 text-[10px] font-mono">
            <div className="border border-zinc-400 px-2.5 py-1 rounded bg-zinc-50">
              <span className="text-zinc-500 block text-[9px] uppercase">Form Ref No.</span>
              <span className="font-bold text-zinc-900">
                {isPrefilled && application ? application.id.toUpperCase() : 'HCF-LAF-____'}
              </span>
            </div>
            <div className="mt-1 text-zinc-600">
              Date:{' '}
              <span className="underline decoration-zinc-400 underline-offset-2 font-semibold">
                {isPrefilled && application
                  ? formatDate(application.appliedDate)
                  : '____ / ____ / 202__'}
              </span>
            </div>
          </div>
        </header>

        {/* Section 1: Borrower Information */}
        <section className="border border-zinc-300 rounded p-2.5 space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 px-2 py-0.5 rounded-xs text-zinc-800 border-l-2 border-emerald-600">
            1. Applicant / Borrower Information
          </h2>
          <div className="grid grid-cols-12 gap-x-3 gap-y-2 pt-0.5">
            <div className="col-span-7">
              <span className="text-[9px] uppercase text-zinc-500 block">Full Name (Last, First, M.I.)</span>
              <div className="border-b border-zinc-400 pb-0.5 font-semibold min-h-[16px]">
                {isPrefilled && (member?.fullName || application?.borrowerName)
                  ? member?.fullName || application?.borrowerName
                  : ''}
              </div>
            </div>
            <div className="col-span-5">
              <span className="text-[9px] uppercase text-zinc-500 block">Member ID / Username</span>
              <div className="border-b border-zinc-400 pb-0.5 font-mono min-h-[16px]">
                {isPrefilled && member ? `@${member.username} (${member.id.slice(0, 8)})` : ''}
              </div>
            </div>
            <div className="col-span-4">
              <span className="text-[9px] uppercase text-zinc-500 block">Contact / Mobile No.</span>
              <div className="border-b border-zinc-400 pb-0.5 font-mono min-h-[16px]">
                {isPrefilled && member?.phoneNumber ? member.phoneNumber : ''}
              </div>
            </div>
            <div className="col-span-4">
              <span className="text-[9px] uppercase text-zinc-500 block">Residential Address / Purok</span>
              <div className="border-b border-zinc-400 pb-0.5 min-h-[16px]">
                {isPrefilled && member?.address ? member.address : ''}
              </div>
            </div>
            <div className="col-span-4">
              <span className="text-[9px] uppercase text-zinc-500 block">Paid-Up Share Capital</span>
              <div className="border-b border-zinc-400 pb-0.5 font-mono font-semibold min-h-[16px]">
                {isPrefilled && member
                  ? `${formatCurrency(paidUpCapital, currency)} (${sharesCount} sh)`
                  : ''}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Loan Particulars */}
        <section className="border border-zinc-300 rounded p-2.5 space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 px-2 py-0.5 rounded-xs text-zinc-800 border-l-2 border-emerald-600">
            2. Loan Particulars &amp; Repayment Terms
          </h2>
          <div className="grid grid-cols-12 gap-x-3 gap-y-2 pt-0.5">
            <div className="col-span-4">
              <span className="text-[9px] uppercase text-zinc-500 block">Requested Principal Amount</span>
              <div className="border-b border-zinc-400 pb-0.5 font-mono font-bold text-xs min-h-[18px]">
                {isPrefilled && application ? formatCurrency(application.requestedAmount, currency) : `${currency} `}
              </div>
            </div>
            <div className="col-span-4">
              <span className="text-[9px] uppercase text-zinc-500 block">Monthly Interest Rate</span>
              <div className="border-b border-zinc-400 pb-0.5 font-mono min-h-[18px]">
                {formatPercent(interestRate)} Fixed Monthly (Open-Ended)
              </div>
            </div>
            <div className="col-span-4">
              <span className="text-[9px] uppercase text-zinc-500 block">Est. Monthly Interest Due</span>
              <div className="border-b border-zinc-400 pb-0.5 font-mono font-semibold min-h-[18px]">
                {isPrefilled && application ? formatCurrency(monthlyInterest, currency) : `${currency} `}
              </div>
            </div>
            <div className="col-span-12">
              <span className="text-[9px] uppercase text-zinc-500 block">Stated Loan Purpose</span>
              <div className="border-b border-zinc-400 pb-0.5 min-h-[16px]">
                {isPrefilled && application ? application.purpose : ''}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Co-Maker / Guarantor Undertaking */}
        <section className="border border-zinc-300 rounded p-2.5 space-y-1.5">
          <div className="flex items-center justify-between bg-zinc-100 px-2 py-0.5 rounded-xs border-l-2 border-amber-600">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-800">
              3. Co-Maker / Guarantor Undertaking
            </h2>
            <span className="text-[9px] font-semibold text-amber-800">
              {coMakerThreshold > 0
                ? `Mandatory for Loans >= ${formatCurrency(coMakerThreshold, currency)}`
                : 'Optional Guarantor'}
            </span>
          </div>
          <div className="grid grid-cols-12 gap-x-3 gap-y-1.5 pt-0.5">
            <div className="col-span-6">
              <span className="text-[9px] uppercase text-zinc-500 block">Co-Maker Full Name</span>
              <div className="border-b border-zinc-400 pb-0.5 font-semibold min-h-[16px]">
                {isPrefilled && application?.coMakerName ? application.coMakerName : ''}
              </div>
            </div>
            <div className="col-span-3">
              <span className="text-[9px] uppercase text-zinc-500 block">Member ID</span>
              <div className="border-b border-zinc-400 pb-0.5 font-mono min-h-[16px]">
                {isPrefilled && application?.coMakerId ? application.coMakerId.slice(0, 8) : ''}
              </div>
            </div>
            <div className="col-span-3">
              <span className="text-[9px] uppercase text-zinc-500 block">Endorsement Status</span>
              <div className="border-b border-zinc-400 pb-0.5 font-mono min-h-[16px]">
                {isPrefilled && application?.coMakerRequired
                  ? application.coMakerStatus?.toUpperCase()
                  : 'N/A / Manual'}
              </div>
            </div>
          </div>
          <p className="text-[9.5px] text-zinc-700 italic pt-0.5">
            &ldquo;I hereby agree to act as Co-Maker for this loan and assume joint and solidary liability with the primary borrower for full repayment of principal and accrued interest in the event of default.&rdquo;
          </p>
        </section>

        {/* Section 4: Cooperative Loan Policy, Terms & Agreements */}
        <section className="border border-zinc-300 rounded p-2.5 space-y-1.5 bg-zinc-50/70">
          <h2 className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 px-2 py-0.5 rounded-xs text-zinc-800 border-l-2 border-zinc-800">
            4. Terms, Conditions &amp; Cooperative Lending Policy
          </h2>
          <ol className="list-decimal list-inside space-y-1 text-[10px] text-zinc-700">
            <li>
              <strong>Interest Accrual:</strong> Loans accrue a fixed <strong>{formatPercent(interestRate)}</strong> monthly interest per 30-day cycle calculated strictly on the remaining unpaid principal balance.
            </li>
            <li>
              <strong>Principal Reduction:</strong> This loan carries an open-ended maturity. Any payment exceeding accrued monthly interest is applied directly to principal reduction, lowering subsequent monthly interest charges.
            </li>
            <li>
              <strong>Timely Settlement &amp; Credit Standing:</strong> Borrowers agree to settle monthly interest on or before the scheduled due date. Delinquency lowers the member&apos;s Community Credit Score and restricts future borrowing.
            </li>
            <li>
              <strong>Year-End Share &amp; Dividend Offset:</strong> In the event of default at the end of the cycle, the cooperative reserves the right to deduct unpaid balances from the borrower&apos;s share and, where applicable, from the co-maker&apos;s year-end dividend (profit share) only; the co-maker&apos;s paid-up share capital is excluded.
            </li>
            <li>
              <strong>Disbursement &amp; Governance:</strong> All applications are subject to liquidity pool availability, credit limit verification, and final approval by the Cooperative Treasurer.
            </li>
          </ol>
        </section>
      </div>

      {/* Section 5: Formal Acceptance & Certification Signatures */}
      <footer className="pt-3 space-y-3">
        <div className="flex items-start gap-2 text-[10px] text-zinc-800">
          <span className="inline-block w-3.5 h-3.5 border border-zinc-700 rounded-xs shrink-0 mt-0.5 text-center leading-none font-bold">
            {isPrefilled ? '✓' : ''}
          </span>
          <span>
            <strong>Borrower Declaration:</strong> I confirm that all information provided is accurate and that I have read, understood, and accepted the <strong>Loan Terms &amp; Conditions</strong> and <strong>Cooperative Lending &amp; Delinquency Policy</strong> stated above.
          </span>
        </div>

        <div className="grid grid-cols-3 gap-5 pt-4 text-center">
          <div>
            <div className="border-b border-zinc-800 h-7 flex items-end justify-center pb-0.5 text-[10px] font-semibold">
              {isPrefilled && (member?.fullName || application?.borrowerName)
                ? member?.fullName || application?.borrowerName
                : ''}
            </div>
            <p className="text-[9.5px] font-bold uppercase mt-1">Borrower Signature over Printed Name</p>
            <p className="text-[9px] text-zinc-500">Date: ______________</p>
          </div>

          <div>
            <div className="border-b border-zinc-800 h-7 flex items-end justify-center pb-0.5 text-[10px] font-semibold">
              {isPrefilled && application?.coMakerName ? application.coMakerName : ''}
            </div>
            <p className="text-[9.5px] font-bold uppercase mt-1">Co-Maker Signature over Printed Name</p>
            <p className="text-[9px] text-zinc-500">Date: ______________</p>
          </div>

          <div>
            <div className="border-b border-zinc-800 h-7 flex items-end justify-center pb-0.5 text-[10px] font-semibold" />
            <p className="text-[9.5px] font-bold uppercase mt-1">Treasurer Verification &amp; Approval</p>
            <p className="text-[9px] text-zinc-500">
              [ ] Approved &nbsp; [ ] Disbursed &nbsp; Date: _______
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
