# Task 5: Design System Tokens & Base UI Component Library (Astryx / Impeccable / Hallmark)

**Files:**
- Create: `src/components/common/Button.tsx`
- Create: `src/components/common/Card.tsx`
- Create: `src/components/common/Badge.tsx`
- Create: `src/components/common/StatCard.tsx`
- Create: `src/components/common/Modal.tsx`
- Create: `src/components/common/Table.tsx`
- Create: `src/components/common/EmptyState.tsx`
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Test: `src/components/common/components.test.tsx`

**Design Principles (Strict Astryx / Impeccable / Hallmark):**
1. **Zero AI Slop**: Avoid gratuitous purple gradients, washed-out low contrast text, and huge empty pastel cards.
2. **Financial Precision**: All numeric statistics, amounts, and dates use `font-mono tabular-nums` for strict alignment.
3. **Structured Surfaces**: Crisp 1px zinc borders (`border-zinc-200` light / `border-zinc-800` dark), clean white/zinc-900 surfaces, subtle shadows.
4. **Accessible Semantics**: Emerald for positive cash inflow/paid, Amber for pending review, Rose for cash outflow/rejected/overdue, Zinc for neutral. Clear focus rings (`focus-visible:ring-2 focus-visible:ring-zinc-950`).

**Component Specifications:**
1. **`Button`**:
   - Variants: `'primary'` (zinc-900 text-white), `'secondary'` (zinc-100 text-zinc-900 border-zinc-200), `'outline'` (transparent border-zinc-300), `'danger'` (rose-600 text-white), `'ghost'` (hover:bg-zinc-100)
   - Sizes: `'sm'`, `'md'`, `'lg'`
   - Props: `isLoading?: boolean`, `icon?: React.ReactNode`, `iconPosition?: 'left' | 'right'`, standard HTML button props
2. **`Badge`**:
   - Variants: `'emerald'`, `'amber'`, `'rose'`, `'zinc'`, `'indigo'`, `'sky'`
   - Props: `dot?: boolean`, `size?: 'sm' | 'md'`
3. **`Card`**:
   - Composition: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
4. **`StatCard`**:
   - Props: `title: string`, `value: string | number`, `change?: string`, `changeType?: 'positive' | 'negative' | 'neutral'`, `icon?: React.ReactNode`, `subtitle?: string`, `badge?: string`
   - Numeric values formatted with `tabular-nums font-mono`
5. **`Modal`**:
   - Props: `isOpen: boolean`, `onClose: () => void`, `title: string`, `description?: string`, `children: React.ReactNode`, `footer?: React.ReactNode`, `size?: 'sm' | 'md' | 'lg' | 'xl'`
   - Traps or closes on `Escape` key, backdrop click, body scroll lock when open.
6. **`Table`**:
   - Composition: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
7. **`EmptyState`**:
   - Props: `icon?: React.ReactNode`, `title: string`, `description: string`, `action?: { label: string; onClick: () => void; icon?: React.ReactNode }`
8. **`Navbar`**:
   - Brand logo / name "Huluga"
   - Quick Demo Switcher integrated
   - Current user badge + role
   - Mobile hamburger toggle
9. **`Sidebar`**:
   - Navigation links: Dashboard (`/`), Funds (`/funds`), Loans (`/loans`), Applications (`/applications`), Members (`/members`), Settings (`/settings`)
   - Highlights active route (using `useLocation` from `react-router-dom`)
   - Badges for pending applications count
   - Role-aware: Highlights treasurer-specific items
10. **`AppShell`**:
    - Wraps children with `Navbar`, `Sidebar`, `ToastContainer`, and responsive container
    - Handles mobile drawer state smoothly
