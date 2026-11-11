-- ==============================================================================
-- Huluga Community Fund - Supabase PostgreSQL Schema & Security DDL
-- ==============================================================================
-- Tables:
--   1. profiles          - User roles (treasurer vs member) and contact info
--   2. fund_entries      - Inflows/outflows ledger (capital, disbursements, repayments)
--   3. loan_applications - Requests submitted by members for loan funding
--   4. loans             - Active & historical loans with 5% monthly accrual
--   5. loan_payments     - Payment history tracking interest and principal portions
--   6. app_settings      - Organization-wide config (name, default rate, limits)
-- ==============================================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  role text not null check (role in ('treasurer', 'member')),
  avatar_url text,
  phone_number text,
  joined_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. FUND ENTRIES TABLE
create table if not exists public.fund_entries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('contribution', 'deposit', 'loan_disbursement', 'loan_repayment', 'expense', 'adjustment')),
  amount numeric(14,2) not null check (amount > 0),
  direction text not null check (direction in ('inflow', 'outflow')),
  member_id uuid references public.profiles(id) on delete set null,
  member_name text,
  recorded_by uuid not null references public.profiles(id),
  description text not null,
  date date not null default current_date,
  reference_no text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. LOAN APPLICATIONS TABLE
create table if not exists public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  borrower_name text not null,
  requested_amount numeric(14,2) not null check (requested_amount > 0),
  purpose text not null,
  monthly_interest_rate numeric(5,2) not null default 5.00,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'disbursed', 'cancelled')),
  applied_date date not null default current_date,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. LOANS TABLE
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.loan_applications(id) on delete set null,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  borrower_name text not null,
  principal_amount numeric(14,2) not null check (principal_amount > 0),
  monthly_interest_rate numeric(5,2) not null default 5.00,
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'paid', 'defaulted')),
  principal_paid numeric(14,2) not null default 0.00,
  interest_paid numeric(14,2) not null default 0.00,
  last_payment_date date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. LOAN PAYMENTS TABLE
create table if not exists public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  recorded_by uuid not null references public.profiles(id),
  amount numeric(14,2) not null check (amount > 0),
  interest_portion numeric(14,2) not null default 0.00,
  principal_portion numeric(14,2) not null default 0.00,
  payment_date date not null default current_date,
  reference_no text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. APP SETTINGS TABLE
create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  organization_name text not null default 'Huluga Community Fund',
  currency_symbol text not null default '₱',
  default_monthly_interest_rate numeric(5,2) not null default 5.00,
  member_loan_limit numeric(14,2) default 50000.00,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed default application settings
insert into public.app_settings (id, organization_name, currency_symbol, default_monthly_interest_rate, member_loan_limit)
values (1, 'Huluga Community Fund', '₱', 5.00, 50000.00)
on conflict (id) do nothing;

-- ==============================================================================
-- INDEXES
-- ==============================================================================
create index if not exists idx_fund_entries_date on public.fund_entries(date desc);
create index if not exists idx_loan_applications_borrower on public.loan_applications(borrower_id);
create index if not exists idx_loan_applications_status on public.loan_applications(status);
create index if not exists idx_loans_borrower on public.loans(borrower_id);
create index if not exists idx_loans_status on public.loans(status);
create index if not exists idx_loan_payments_loan_id on public.loan_payments(loan_id);
create index if not exists idx_loan_payments_borrower on public.loan_payments(borrower_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.fund_entries enable row level security;
alter table public.loan_applications enable row level security;
alter table public.loans enable row level security;
alter table public.loan_payments enable row level security;
alter table public.app_settings enable row level security;

-- Helper security definer function to check if current authenticated user is a treasurer
create or replace function public.is_treasurer()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'treasurer'
  );
end;
$$ language plpgsql security definer;

-- PROFILES POLICIES
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

create policy "Treasurers can manage all profiles"
  on public.profiles for all
  to authenticated
  using (public.is_treasurer());

-- FUND ENTRIES POLICIES
create policy "All authenticated members can view fund ledger"
  on public.fund_entries for select
  to authenticated
  using (true);

create policy "Treasurers can insert and manage fund ledger"
  on public.fund_entries for all
  to authenticated
  using (public.is_treasurer());

-- LOAN APPLICATIONS POLICIES
create policy "Borrowers view their own applications, treasurers view all"
  on public.loan_applications for select
  to authenticated
  using (borrower_id = auth.uid() or public.is_treasurer());

create policy "Members can submit loan applications"
  on public.loan_applications for insert
  to authenticated
  with check (borrower_id = auth.uid() or public.is_treasurer());

create policy "Members can cancel own pending applications"
  on public.loan_applications for update
  to authenticated
  using (borrower_id = auth.uid() and status = 'pending')
  with check (status = 'cancelled');

create policy "Treasurers can review and update applications"
  on public.loan_applications for update
  to authenticated
  using (public.is_treasurer());

-- LOANS POLICIES
create policy "Borrowers view their own loans, treasurers view all"
  on public.loans for select
  to authenticated
  using (borrower_id = auth.uid() or public.is_treasurer());

create policy "Treasurers can manage loans"
  on public.loans for all
  to authenticated
  using (public.is_treasurer());

-- LOAN PAYMENTS POLICIES
create policy "Borrowers view their own payments, treasurers view all"
  on public.loan_payments for select
  to authenticated
  using (borrower_id = auth.uid() or public.is_treasurer());

create policy "Treasurers can record loan payments"
  on public.loan_payments for all
  to authenticated
  using (public.is_treasurer());

-- APP SETTINGS POLICIES
create policy "All authenticated users view settings"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "Treasurers can update app settings"
  on public.app_settings for update
  to authenticated
  using (public.is_treasurer());

-- ==============================================================================
-- AUTH TRIGGER: AUTO-CREATE PROFILE ON SIGNUP
-- ==============================================================================
-- The first user to register in the system is automatically made a 'treasurer',
-- while subsequent users are registered as standard 'member's unless specified.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first boolean;
  assigned_role text;
  username_val text;
  full_name_val text;
begin
  select count(*) = 0 into is_first from public.profiles;

  if is_first then
    assigned_role := 'treasurer';
  else
    assigned_role := coalesce(new.raw_user_meta_data->>'role', 'member');
  end if;

  username_val := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'user_' || substr(new.id::text, 1, 8)
  );

  full_name_val := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    username_val
  );

  insert into public.profiles (
    id,
    username,
    full_name,
    role,
    avatar_url,
    phone_number,
    joined_date,
    status
  ) values (
    new.id,
    username_val,
    full_name_val,
    assigned_role,
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone_number',
    current_date,
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
