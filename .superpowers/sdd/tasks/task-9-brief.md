# Task 9: Member Directory, Profiles & Role Management

**Files:**
- Create: `src/components/members/MemberCard.tsx`
- Create: `src/components/members/MemberDetailModal.tsx`
- Create: `src/pages/MembersPage.tsx`
- Test: `src/pages/MembersPage.test.tsx`

**Global Constraints:**
- Supports role management: Admin/Treasurer can promote or demote member roles (`treasurer` <-> `member`).
- Strict Astryx / Impeccable / Hallmark design (`font-mono tabular-nums`, clean zinc cards, accessible badges, zero AI slop).
- Computes live financial equity and borrowing metrics from `fundEntries` and `loans` via `useData()`.

**Detailed Requirements:**
1. **`src/components/members/MemberCard.tsx`**:
   - Displays member identity: initials avatar badge, `fullName`, `@username`, role badge (`Treasurer` in indigo/emerald, `Member` in zinc), status badge (`Active`/`Suspended`).
   - Financial stats in `font-mono tabular-nums`:
     - Total Capital Contributed
     - Active Loan Balance (Remaining Principal + Unpaid Interest, or Remaining Principal)
   - Joined date (`formatDate`).
   - Interactive button / click handler to inspect member details in `MemberDetailModal`.

2. **`src/components/members/MemberDetailModal.tsx`**:
   - Detailed profile modal for a selected member:
     - Identity header, joined date, phone number (if present), role badge.
     - 4 financial summary cells: Total Equity Contributed, Active Loan Principal, Unpaid Accrued Interest, Completed Loans Count.
     - Member's recent fund contributions list & member's loan history list.
     - Treasurer Administrative Control:
       - Button to "Promote to Treasurer" or "Demote to Member" calling `updateMemberRole(member.id, newRole)` from `useData()`.
       - Guardrail: Prevent a treasurer from demoting themselves (if `member.id === currentUser.id`) so the organization always has an active treasurer.
       - Shows success toast on role change.

3. **`src/pages/MembersPage.tsx`**:
   - Page header: "Member Directory", subtitle, summary stats row:
     - Total Members
     - Active Borrowers (members with active loans)
     - Total Member Equity (sum of all member contributions)
     - Treasurers Count
   - Filter controls: Search by name or username, role filter tabs (`All`, `Treasurers`, `Members`).
   - Responsive grid of `MemberCard` components.
   - Empty state when search yields no matches.

4. **`src/pages/MembersPage.test.tsx`**:
   - Tests:
     - Displays all members with accurate computed contributions and active loan balances.
     - Filters members by search query and role tab.
     - Treasurer can open `MemberDetailModal` and promote a member to Treasurer (verifies `updateMemberRole` persists and UI updates).
     - Treasurer cannot demote themselves (guardrail verified).
     - Regular member view hides administrative role-switching actions.
