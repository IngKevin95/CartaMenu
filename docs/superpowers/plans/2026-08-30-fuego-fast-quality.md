# Fuego Fast Quality Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract cart/API logic out of `src/pages/index.astro` into testable TypeScript modules, add Vitest coverage, harden Apps Script `doPost` validation, and add a CI workflow that runs build + test on every push/PR.

**Architecture:** Two new pure/IO-separated modules (`src/lib/cart.ts` for cart state, `src/lib/api.ts` for network calls) consumed by a thinned-down `index.astro` that only wires DOM events. `apps-script/Code.gs` gets input validation added to `doPost`. `.github/workflows/ci.yml` runs `npm ci && npm run build && npm test`.

**Tech Stack:** Astro (existing), TypeScript (new, Astro supports it natively), Vitest (new devDependency), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-30-fuego-fast-quality-design.md`

## Global Constraints

- No framework de UI (React/Preact) — carrito sigue en vanilla JS/TS (spec: "Fuera de alcance").
- Sin deploy automático en CI — solo build + test (spec: "CI").
- No recalcular precios server-side contra el Sheet en este cambio (spec: "Fuera de alcance").
- `apps-script/Code.gs` no lleva test automatizado — validado por revisión manual (spec: "Riesgos / trade-offs aceptados").
- Toda la lógica de negocio sale de `index.astro`; la página solo hace wiring de DOM (spec: "Arquitectura → Módulos").

---

### Task 1: Add Vitest and a `test` script

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `npm test` command available for all later tasks' test steps.

- [ ] **Step 1: Install Vitest as a dev dependency**

Run: `npm install -D vitest`

- [ ] **Step 2: Add the `test` script**

Edit `package.json` scripts block to:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: Verify the command runs (no tests yet, should report 0 tests, exit 0)**

Run: `npm test`
Expected: Vitest starts, reports "No test files found" or exits 0 (no test files exist yet — this just confirms the binary is wired correctly, not a failure).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Agrega vitest para tests unitarios"
```

---

### Task 2: `src/lib/cart.ts` — cart state module + tests

**Files:**
- Create: `src/lib/cart.ts`
- Test: `src/lib/cart.test.ts`

**Interfaces:**
- Produces:
  - `interface CartItem { id: string; name: string; price: number; qty: number }`
  - `type Cart = Record<string, CartItem>`
  - `addItem(cart: Cart, item: { id: string; name: string; price: number }): Cart`
  - `changeQty(cart: Cart, id: string, delta: number): Cart`
  - `total(cart: Cart): number`
  - `interface OrderPayload { name: string; email: string; items: { name: string; price: number; qty: number }[]; total: number; timestamp: string }`
  - `toOrderPayload(cart: Cart, customer: { name: string; email: string }): OrderPayload`
- Consumed by: Task 4 (`index.astro`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/cart.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { addItem, changeQty, total, toOrderPayload, type Cart } from './cart';

describe('cart', () => {
  it('total is 0 for an empty cart', () => {
    expect(total({})).toBe(0);
  });

  it('total sums price*qty across items', () => {
    const cart: Cart = {
      a: { id: 'a', name: 'Burger', price: 10, qty: 2 },
      b: { id: 'b', name: 'Fries', price: 5, qty: 1 },
    };
    expect(total(cart)).toBe(25);
  });

  it('addItem adds a new item with qty 1', () => {
    const cart = addItem({}, { id: 'a', name: 'Burger', price: 10 });
    expect(cart.a).toEqual({ id: 'a', name: 'Burger', price: 10, qty: 1 });
  });

  it('addItem increments qty for an existing item', () => {
    let cart = addItem({}, { id: 'a', name: 'Burger', price: 10 });
    cart = addItem(cart, { id: 'a', name: 'Burger', price: 10 });
    expect(cart.a.qty).toBe(2);
  });

  it('changeQty removes the item when qty drops to 0', () => {
    let cart = addItem({}, { id: 'a', name: 'Burger', price: 10 });
    cart = changeQty(cart, 'a', -1);
    expect(cart.a).toBeUndefined();
  });

  it('changeQty on a missing id is a no-op', () => {
    const cart: Cart = {};
    expect(changeQty(cart, 'missing', 1)).toBe(cart);
  });

  it('toOrderPayload includes a valid ISO timestamp and the correct total', () => {
    const cart = addItem({}, { id: 'a', name: 'Burger', price: 10 });
    const payload = toOrderPayload(cart, { name: 'Kevin', email: 'k@example.com' });
    expect(payload.total).toBe(10);
    expect(payload.items).toEqual([{ name: 'Burger', price: 10, qty: 1 }]);
    expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './cart'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/cart.ts`:

```ts
export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export type Cart = Record<string, CartItem>;

export function addItem(
  cart: Cart,
  item: { id: string; name: string; price: number }
): Cart {
  const existing = cart[item.id];
  return {
    ...cart,
    [item.id]: existing
      ? { ...existing, qty: existing.qty + 1 }
      : { id: item.id, name: item.name, price: item.price, qty: 1 },
  };
}

export function changeQty(cart: Cart, id: string, delta: number): Cart {
  const existing = cart[id];
  if (!existing) return cart;
  const qty = existing.qty + delta;
  if (qty <= 0) {
    const rest = { ...cart };
    delete rest[id];
    return rest;
  }
  return { ...cart, [id]: { ...existing, qty } };
}

export function total(cart: Cart): number {
  return Object.values(cart).reduce((sum, i) => sum + i.price * i.qty, 0);
}

export interface OrderPayload {
  name: string;
  email: string;
  items: { name: string; price: number; qty: number }[];
  total: number;
  timestamp: string;
}

export function toOrderPayload(
  cart: Cart,
  customer: { name: string; email: string }
): OrderPayload {
  return {
    name: customer.name,
    email: customer.email,
    items: Object.values(cart).map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
    total: total(cart),
    timestamp: new Date().toISOString(),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cart.ts src/lib/cart.test.ts
git commit -m "Extrae logica de carrito a src/lib/cart.ts con tests"
```

---

### Task 3: `src/lib/api.ts` — network module + tests

**Files:**
- Create: `src/lib/api.ts`
- Test: `src/lib/api.test.ts`

**Interfaces:**
- Consumes: nothing from Task 2 (independent module).
- Produces:
  - `interface MenuItem { id: string; name: string; description: string; price: number }`
  - `class ApiError extends Error`
  - `fetchMenu(url: string): Promise<MenuItem[]>`
  - `submitOrder(url: string, payload: unknown): Promise<{ ok: boolean }>`
- Consumed by: Task 4 (`index.astro`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMenu, submitOrder, ApiError } from './api';

describe('fetchMenu', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses JSON on a successful response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: '1', name: 'Burger', description: '', price: 10 }],
    } as Response);

    const items = await fetchMenu('http://example.com');
    expect(items).toEqual([{ id: '1', name: 'Burger', description: '', price: 10 }]);
  });

  it('throws ApiError on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(fetchMenu('http://example.com')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('submitOrder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retries once on network failure and then succeeds', async () => {
    let calls = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error('network down'));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response);
    });

    await expect(submitOrder('http://example.com', {})).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('propagates ApiError if the retry also fails on network', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(submitOrder('http://example.com', {})).rejects.toBeInstanceOf(ApiError);
  });

  it('does not retry on an explicit ok:false from the server', async () => {
    let calls = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      calls += 1;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ ok: false, error: 'Falta email' }),
      } as Response);
    });

    await expect(submitOrder('http://example.com', {})).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './api'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/api.ts`:

```ts
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchMenu(url: string): Promise<MenuItem[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError(`El menú respondió con error ${res.status}`);
  }
  return res.json();
}

async function postOrder(url: string, payload: unknown): Promise<{ ok: boolean }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || (data && data.ok === false)) {
    throw new ApiError(data?.error || `El pedido respondió con error ${res.status}`);
  }
  return data;
}

export async function submitOrder(
  url: string,
  payload: unknown
): Promise<{ ok: boolean }> {
  try {
    return await postOrder(url, payload);
  } catch (err) {
    if (err instanceof ApiError) throw err; // validation error, retry won't help
    try {
      return await postOrder(url, payload);
    } catch (err2) {
      if (err2 instanceof ApiError) throw err2;
      throw new ApiError('No se pudo enviar el pedido, intentá de nuevo');
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all `cart.test.ts` and `api.test.ts` tests green (11 total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/lib/api.test.ts
git commit -m "Extrae logica de red a src/lib/api.ts con tests y retry"
```

---

### Task 4: Wire `index.astro` to the new modules

**Files:**
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `addItem`, `changeQty`, `total`, `toOrderPayload` from `src/lib/cart.ts`; `fetchMenu`, `submitOrder` from `src/lib/api.ts`.
- Produces: nothing new — this is the final consumer.

- [ ] **Step 1: Replace the single inline `<script define:vars>` block with a vars-bridge script plus a module script**

In `src/pages/index.astro`, replace the entire existing `<script define:vars={{ APPS_SCRIPT_URL }}>...</script>` block (the one containing `const cart = {}` and all cart/menu/order logic) with:

```astro
<script define:vars={{ APPS_SCRIPT_URL }}>
  window.__APPS_SCRIPT_URL__ = APPS_SCRIPT_URL;
</script>
<script>
  import { addItem, changeQty, total, toOrderPayload } from '../lib/cart';
  import { fetchMenu, submitOrder } from '../lib/api';

  const APPS_SCRIPT_URL = (window as any).__APPS_SCRIPT_URL__;
  let cart: ReturnType<typeof addItem> = {};

  const menuEl = document.getElementById('menu')!;
  const cartItemsEl = document.getElementById('cart-items')!;
  const totalEl = document.getElementById('total')!;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
  const statusEl = document.getElementById('status')!;
  const form = document.getElementById('order-form') as HTMLFormElement;

  function money(n: number) {
    return `$${Number(n).toFixed(2)}`;
  }

  function renderCart() {
    const items = Object.values(cart);
    cartItemsEl.innerHTML = items.length
      ? items
          .map(
            (i) => `
          <li data-id="${i.id}">
            <span>${i.name} x${i.qty}</span>
            <span>
              ${money(i.price * i.qty)}
              <button data-action="dec" data-id="${i.id}">−</button>
              <button data-action="inc" data-id="${i.id}">+</button>
            </span>
          </li>`
          )
          .join('')
      : '<li class="empty">Vacío</li>';
    totalEl.textContent = `Total: ${money(total(cart))}`;
    submitBtn.disabled = items.length === 0;
  }

  cartItemsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (!btn) return;
    const { id, action } = (btn as HTMLElement).dataset;
    if (!id) return;
    cart = changeQty(cart, id, action === 'inc' ? 1 : -1);
    renderCart();
  });

  async function loadMenu() {
    if (!APPS_SCRIPT_URL) {
      menuEl.innerHTML = '<p class="empty">Falta configurar PUBLIC_APPS_SCRIPT_URL.</p>';
      return;
    }
    try {
      const items = await fetchMenu(APPS_SCRIPT_URL);
      menuEl.innerHTML = items
        .map(
          (item) => `
        <div class="card">
          <h3>${item.name}</h3>
          <p>${item.description || ''}</p>
          <div class="price">${money(item.price)}</div>
          <button data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">Sumar</button>
        </div>
      `
        )
        .join('');
    } catch (err) {
      menuEl.innerHTML = `<p class="empty">No se pudo cargar el menú: ${(err as Error).message}</p>`;
    }
  }

  menuEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button[data-id]') as HTMLElement | null;
    if (!btn) return;
    const { id, name, price } = btn.dataset;
    if (!id || !name || !price) return;
    cart = addItem(cart, { id, name, price: Number(price) });
    renderCart();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const items = Object.values(cart);
    if (!items.length) return;
    const name = (document.getElementById('customer-name') as HTMLInputElement).value.trim();
    const email = (document.getElementById('customer-email') as HTMLInputElement).value.trim();
    const payload = toOrderPayload(cart, { name, email });
    submitBtn.disabled = true;
    statusEl.textContent = 'Enviando…';
    try {
      await submitOrder(APPS_SCRIPT_URL, payload);
      statusEl.textContent = '¡Pedido en camino a cocina!';
      cart = {};
      renderCart();
      form.reset();
    } catch (err) {
      statusEl.textContent = `Error al enviar: ${(err as Error).message}`;
    } finally {
      submitBtn.disabled = Object.keys(cart).length === 0;
    }
  });

  loadMenu();
</script>
```

- [ ] **Step 2: Build to verify the module script compiles and bundles cleanly**

Run: `npm run build`
Expected: Build succeeds with no TypeScript/Vite errors, `dist/index.html` generated.

- [ ] **Step 3: Run the existing unit tests to confirm nothing broke**

Run: `npm test`
Expected: PASS — same tests from Task 2/3 still green (this task doesn't add new tests; DOM wiring is verified manually in the browser, not unit-tested, per spec scope).

- [ ] **Step 4: Manual smoke test in the dev server**

Run: `npm run dev`, open the printed local URL, confirm: menu loads (or shows the "Falta configurar" message if `.env` isn't set), clicking "Sumar" adds an item to the cart panel, the +/− buttons adjust quantity and remove at 0, and the total updates correctly.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "Refactoriza index.astro para usar src/lib/cart y src/lib/api"
```

---

### Task 5: Harden `doPost` validation in Apps Script

**Files:**
- Modify: `apps-script/Code.gs`

**Interfaces:**
- Consumes: nothing (standalone Apps Script file, not part of the npm build/test pipeline).
- Produces: `doPost` now returns `{ok:false, error:"..."}` without writing a row when the payload is invalid.

- [ ] **Step 1: Replace the `doPost` function**

In `apps-script/Code.gs`, replace the existing `doPost` function with:

```javascript
// Orders!A:E = timestamp | name | email | items(JSON) | total
function doPost(e) {
  const body = JSON.parse(e.postData.contents);

  if (typeof body.name !== 'string' || body.name.trim() === '') {
    return jsonResponse({ ok: false, error: 'Falta el nombre del cliente' });
  }
  if (typeof body.email !== 'string' || body.email.trim() === '') {
    return jsonResponse({ ok: false, error: 'Falta el email del cliente' });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return jsonResponse({ ok: false, error: 'El carrito está vacío' });
  }
  if (typeof body.total !== 'number' || body.total < 0) {
    return jsonResponse({ ok: false, error: 'Total inválido' });
  }

  const sheet = SpreadsheetApp.getActive().getSheetByName(ORDERS_SHEET);
  sheet.appendRow([
    body.timestamp || new Date().toISOString(),
    body.name,
    body.email,
    JSON.stringify(body.items),
    body.total,
  ]);
  return jsonResponse({ ok: true });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Also replace the tail of `doGet` (`return ContentService.createTextOutput(...).setMimeType(...)`) with `return jsonResponse(items);` so both handlers share the same helper — check `doGet`'s current return statement and swap it to use `jsonResponse(items)`.

- [ ] **Step 2: Syntax-check the file (Apps Script has no local test runner; this only catches JS syntax errors)**

Run: `node --check apps-script/Code.gs`
Expected: No output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add apps-script/Code.gs
git commit -m "Valida payload en doPost antes de escribir en Orders"
```

---

### Task 6: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run build` (Task 4 must pass) and `npm test` (Tasks 2/3 must pass).
- Produces: nothing consumed by later tasks — this is the last task.

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm test
```

- [ ] **Step 2: Validate the YAML is well-formed**

Run: `node -e "require('js-yaml') ? '' : ''" 2>/dev/null; python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))" 2>&1 || echo "no local yaml parser available, skip"`

If no local YAML parser is available (expected — this repo has none), skip this step's tool output and instead visually re-read the file for indentation correctness before committing.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "Agrega CI: build y test en cada push/PR"
```

- [ ] **Step 4: Push the branch and confirm the workflow runs green on GitHub**

Run: `git push`
Then check the Actions tab on GitHub (or `gh run watch` if the `gh` CLI is available) for the `CI` workflow triggered by this push.
Expected: `build-test` job passes.

---

## Self-Review Notes

- **Spec coverage:** Módulos (Task 2, 3, 4) ✓, flujo de datos (Task 4 wiring) ✓, manejo de errores cliente (Task 3 `ApiError`/retry, Task 4 catch blocks) ✓, manejo de errores servidor (Task 5) ✓, testing (Task 2, 3) ✓, CI (Task 6) ✓.
- **Placeholder scan:** none found — every step has literal code or an exact command.
- **Type consistency:** `Cart`/`CartItem`/`OrderPayload` from Task 2 are the exact types imported in Task 4; `MenuItem`/`ApiError`/`fetchMenu`/`submitOrder` from Task 3 match Task 4's imports and usage.
