# Security Hardening Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 5 findings from a manual security/best-practices audit: stored XSS via unescaped Sheet content, a `.gitignore` rule shadowing `.env.example`, missing email format validation in `doPost`, a fragile Node version pin in CI, and no type checking in CI.

**Architecture:** Five independent, narrowly-scoped fixes across `src/pages/index.astro`, `.gitignore`, `apps-script/Code.gs`, and `.github/workflows/ci.yml` + `package.json`. No shared code between tasks — each is self-contained and can be reviewed/merged independently.

**Tech Stack:** Astro, vanilla TypeScript, Google Apps Script, GitHub Actions. New devDependencies: `@astrojs/check`, `typescript`.

**Spec:** `docs/superpowers/specs/2026-08-31-security-hardening-design.md`

## Global Constraints

- No new runtime dependencies — only `@astrojs/check`/`typescript` as devDependencies for Task 5.
- `escapeHtml()` is a hand-written function, not a sanitization library (spec: "Riesgos / trade-offs aceptados").
- Email regex is deliberately permissive (`/^\S+@\S+\.\S+$/`), not RFC-complete (spec: Fix 3).
- CSRF/origin control on `doPost` is explicitly out of scope for this plan (spec: "Fuera de alcance").
- Verified before this plan was written: `npx astro check` on the current codebase returns 0 errors, 0 warnings, 1 non-blocking hint — Task 5 is low-risk, not a guess.

---

### Task 1: Escape user-controlled Sheet content before rendering (XSS fix)

**Files:**
- Modify: `src/pages/index.astro` (the `<script>` block containing `loadMenu()` and `renderCart()`)

**Interfaces:**
- Produces: `escapeHtml(value: string): string`, a local function in the page's script, used only within this file.

- [ ] **Step 1: Add the `escapeHtml` function**

In `src/pages/index.astro`, inside the `<script>` block (after the imports, before `const APPS_SCRIPT_URL = ...`), add:

```ts
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

- [ ] **Step 2: Apply it in `renderCart()`**

Find this line (inside `renderCart()`):

```ts
<span>${i.name} x${i.qty}</span>
```

Replace with:

```ts
<span>${escapeHtml(i.name)} x${i.qty}</span>
```

- [ ] **Step 3: Apply it in `loadMenu()`**

Find this block (inside `loadMenu()`, the `.map((item) => ...)` template):

```ts
<div class="card">
  ${item.image ? `<img src="${item.image}" alt="${item.name}" loading="lazy" />` : ''}
  <h3>${item.name}</h3>
  <p>${item.description || ''}</p>
  <div class="price">${money(item.price)}</div>
  <button data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">Sumar</button>
</div>
```

Replace with:

```ts
<div class="card">
  ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />` : ''}
  <h3>${escapeHtml(item.name)}</h3>
  <p>${escapeHtml(item.description || '')}</p>
  <div class="price">${money(item.price)}</div>
  <button data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-price="${item.price}">Sumar</button>
</div>
```

Note: `data-name` on the button also gets escaped since it's read back via `btn.dataset.name` and displayed in the cart — keeps the whole round-trip safe. `item.id` and `item.price` are not escaped: `id` comes from the Sheet's id column (used only as an object key, never rendered as HTML text) and `price` is coerced with `Number(...)` on read, so neither can carry an XSS payload.

- [ ] **Step 4: Run build to verify it compiles**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open the local URL. Since there's no live `PUBLIC_APPS_SCRIPT_URL` in this environment, you won't see real Sheet data — instead, verify by reading the built output: run `npm run build`, then `grep -o "escapeHtml" dist/index.html` (or open `dist/index.html` and confirm the `escapeHtml` function appears in the bundled script). This confirms the function shipped; the full behavioral proof (a `<script>` in a Sheet cell rendering as literal text) requires a live Sheet and is a manual check the project owner does post-deploy, not something to fabricate here.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro
git commit -m "Escapa contenido del Sheet antes de renderizarlo (XSS)"
```

---

### Task 2: Un-shadow `.env.example` in `.gitignore`

**Files:**
- Modify: `.gitignore`

**Interfaces:**
- None — standalone config file.

- [ ] **Step 1: Add the negation rule**

Current end of `.gitignore`:

```
.vercel
.env*
```

Change to:

```
.vercel
.env*
!.env.example
```

- [ ] **Step 2: Verify the file is no longer shadowed**

Run: `git check-ignore -v .env.example`
Expected: No output, exit code 1 (meaning the file is NOT ignored).

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "Excluye .env.example del sombreado de .env*"
```

---

### Task 3: Validate email format in `doPost`

**Files:**
- Modify: `apps-script/Code.gs`

**Interfaces:**
- None — standalone Apps Script file, no automated test runner available (documented limitation, same as the original `doPost` validation task in the prior quality-architecture plan).

- [ ] **Step 1: Replace the email validation line**

Find this line in `doPost`:

```javascript
  if (typeof body.email !== 'string' || body.email.trim() === '') {
    return jsonResponse({ ok: false, error: 'Falta el email del cliente' });
  }
```

Replace with:

```javascript
  if (typeof body.email !== 'string' || !/^\S+@\S+\.\S+$/.test(body.email.trim())) {
    return jsonResponse({ ok: false, error: 'Email inválido' });
  }
```

- [ ] **Step 2: Syntax-check the file**

Run: `node --check apps-script/Code.gs`
Expected: No output, exit code 0.

- [ ] **Step 3: Manual verification of the 3 cases**

Read the modified regex and confirm by inspection:
- `""` (empty string) → `.trim()` gives `""`, regex requires at least one non-whitespace char before `@` → no match → rejected. Correct.
- `"asd"` (no `@`) → regex requires `@` → no match → rejected. Correct.
- `"a@b.com"` (valid-looking) → matches `\S+@\S+\.\S+` → accepted. Correct.

State these three cases and their outcomes in the commit message or PR description as the verification evidence (no test runner exists for this file).

- [ ] **Step 4: Commit**

```bash
git add apps-script/Code.gs
git commit -m "Valida formato de email en doPost"
```

---

### Task 4: Bump Node version in CI

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- None — standalone CI config.

- [ ] **Step 1: Change the Node version**

Find:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 20
```

Replace with:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 22
```

- [ ] **Step 2: Regenerate `package-lock.json` for Node 22 parity**

The project's lockfile must be generated with the same major Node version CI uses, or `npm ci` can fail (this exact problem happened before with Node 20 vs 25 — see git history commit "Fix: regenera package-lock.json con Node 20"). If you have Node 22 available, run `rm -rf node_modules && npm install` with it and confirm `npm ci` succeeds afterward. If only Node 20 or the local machine's default is available, skip regeneration and note it as a concern in your report — the CI run itself is the real verification and will surface any mismatch.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml package-lock.json
git commit -m "CI: sube Node de 20 a 22"
```

(Omit `package-lock.json` from the `git add` if Step 2 was skipped.)

---

### Task 5: Add type checking to CI

**Files:**
- Modify: `package.json` (add devDependencies + script)
- Modify: `.github/workflows/ci.yml` (add typecheck step)

**Interfaces:**
- Produces: `npm run typecheck` command, usable by CI and locally.
- Consumes: nothing from earlier tasks. Depends on whatever Node version is active when it runs (Task 4's CI change, if merged first) — but this task's own local verification works with whatever Node the implementer has.

- [ ] **Step 1: Install the devDependencies**

Run: `npm install -D @astrojs/check typescript`

- [ ] **Step 2: Add the `typecheck` script**

In `package.json`, add to the `scripts` object:

```json
"typecheck": "astro check"
```

Full scripts block should read:

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "test": "vitest run",
  "typecheck": "astro check"
}
```

- [ ] **Step 3: Run it locally to confirm it's clean**

Run: `npm run typecheck`
Expected: `0 errors` (there may be 1 non-blocking hint about `is:inline` on the `define:vars` script — that is expected and not a failure; do not attempt to fix it, it's out of scope for this task).

- [ ] **Step 4: Add the CI step**

In `.github/workflows/ci.yml`, insert `npm run typecheck` between `npm ci` and `npm run build`:

```yaml
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - run: npm test
```

- [ ] **Step 5: Run the full local sequence to confirm nothing broke**

Run: `npm ci && npm run typecheck && npm run build && npm test`
Expected: All four commands succeed in order.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .github/workflows/ci.yml
git commit -m "CI: agrega astro check antes del build"
```

- [ ] **Step 7: Push the branch and confirm the workflow runs green on GitHub**

Run: `git push`
Then check the Actions tab on GitHub (or `gh run watch` if the `gh` CLI is available) for the `CI` workflow triggered by this push.
Expected: `build-test` job passes, including the new typecheck step.

---

## Self-Review Notes

- **Spec coverage:** Fix 1 (Task 1) ✓, Fix 2 (Task 2) ✓, Fix 3 (Task 3) ✓, Fix 4 (Task 4) ✓, Fix 5 (Task 5) ✓.
- **Placeholder scan:** none found — every step has literal code, exact commands, or an explicit inspection-based verification (Task 1 Step 5, Task 3 Step 3) with the reasoning shown, not just asserted.
- **Type consistency:** `escapeHtml` signature is defined once in Task 1 and used consistently in the same file; no other task touches `index.astro`. Tasks are otherwise fully independent (different files), so no cross-task interface risk.
