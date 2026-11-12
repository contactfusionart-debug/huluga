# Task 1: Project Scaffolding & Build Configuration

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: Working Vite build and test harness with Tailwind CSS configured with custom font-mono tabular tokens and neutral/zinc color palette.

- [ ] **Step 1: Create package.json with scripts and dependencies**
```json
{
  "name": "huluga",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.48.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.16.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "~5.6.2",
    "vite": "^6.0.1",
    "vitest": "^2.1.6"
  }
}
```

- [ ] **Step 2: Install dependencies**
Run: `npm install`
Expected: Dependencies installed with zero errors.

- [ ] **Step 3: Create Vite, TypeScript, and Vitest configurations**
Configure `vite.config.ts` with `base: './'` for GitHub Pages compatibility. Configure `tailwind.config.js` with custom zinc-slate aesthetic and font classes.

- [ ] **Step 4: Verify test runner works**
Run: `npm test`
Expected: Passes or reports no tests found yet.

- [ ] **Step 5: Commit scaffolding**
```bash
git add .
git commit -m "chore: scaffold vite react typescript tailwind vitest"
```
