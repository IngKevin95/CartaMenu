# Fuego Fast — Security & maintainability hardening pass

Fecha: 2026-08-31
Estado: Aprobado por el usuario, pendiente de implementación.

## Contexto

Una auditoría de seguridad y buenas prácticas sobre el take-home "Fuego Fast" (revisión manual de `apps-script/Code.gs`, `src/lib/api.ts`, `src/lib/cart.ts`, `src/pages/index.astro`, `.github/workflows/ci.yml`, `.gitignore`) encontró 6 hallazgos. El usuario decidió corregir 5 de ellos; el sexto (falta de control de origen/CSRF en `doPost`) queda documentado como riesgo aceptado — es inherente a un Google Apps Script Web App público sin backend propio, y ya está parcialmente reflejado en el README como supuesto.

## Objetivo

Cerrar los 5 hallazgos aprobados sin cambiar el comportamiento observable de la app para un usuario legítimo, y sin introducir dependencias más allá de las estrictamente necesarias para el chequeo de tipos.

## Fuera de alcance

- Control de origen/CSRF en `doPost` (riesgo aceptado, documentado en README).
- Rate limiting o abuso de volumen del endpoint (excluido explícitamente del scope de la auditoría).
- Recalcular precios server-side contra el Sheet (ya documentado como mejora futura en "Con otra hora").

## Diseño

### Fix 1 — XSS almacenado vía contenido del Sheet

**Archivo:** `src/pages/index.astro`

Agregar una función `escapeHtml(value: string): string` en el módulo `<script>` de la página, que reemplaza `&`, `<`, `>`, `"`, `'` por sus entidades HTML (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`). Aplicarla a:
- `item.name`, `item.description`, `item.image` en `loadMenu()` antes de interpolarlos en el template del `<div class="card">`.
- `i.name` en `renderCart()` antes de interpolarlo en el `<li>`.

No se toca `src/lib/cart.ts` ni `src/lib/api.ts` — son módulos puros/de red, no tocan el DOM.

### Fix 2 — `.env.example` no debe quedar sombreado

**Archivo:** `.gitignore`

Agregar `!.env.example` como línea final, después de `.env*`. Git aplica las reglas en orden y una negación posterior desexcluye el path exacto.

### Fix 3 — Validación de formato de email

**Archivo:** `apps-script/Code.gs`

En `doPost`, reemplazar la validación actual de `email` (`typeof === 'string' && trim() !== ''`) por:
```javascript
if (typeof body.email !== 'string' || !/^\S+@\S+\.\S+$/.test(body.email.trim())) {
  return jsonResponse({ ok: false, error: 'Email inválido' });
}
```
Regex deliberadamente permisiva (no RFC 5322 completo) — el objetivo es rechazar basura obvia (`""`, `"asd"`, `"sin arroba"`), no validar exhaustivamente. Sin librerías nuevas — Apps Script no tiene npm.

### Fix 4 — Node version en CI

**Archivo:** `.github/workflows/ci.yml`

Cambiar `node-version: 20` a `node-version: 22` en el step `actions/setup-node@v4`. Vitest 4 soporta `^20.19.0 || >=22.12.0`; 22 da más margen que el piso de la rama 20.x.

### Fix 5 — Type checking en CI

**Archivos:** `package.json`, `.github/workflows/ci.yml`

- Agregar `@astrojs/check` y `typescript` como devDependencies.
- Agregar script `"typecheck": "astro check"` a `package.json`.
- Agregar un step `npm run typecheck` en `ci.yml`, entre `npm ci` y `npm run build`.

Verificado manualmente antes de escribir este spec: `npx astro check` sobre el estado actual del código da **0 errores, 0 warnings, 1 hint** (el hint es sobre `is:inline` en el script `define:vars`, no accionable ni bloqueante). Riesgo de romper CI con este cambio: bajo, confirmado empíricamente, no solo supuesto.

## Testing

- Fix 1: no requiere nuevo test automatizado (es DOM string-escaping simple, fuera del scope de módulos ya testeados); se verifica manualmente inyectando un nombre de producto con `<script>` en el Sheet de prueba y confirmando que se renderiza como texto literal, no como HTML.
- Fix 3: no hay test runner disponible para `Code.gs` (limitación ya documentada en el spec de calidad anterior); se verifica con `node --check` (sintaxis) y revisión manual de los 3 casos: email vacío, email sin `@`, email válido.
- Fix 4 y 5: se verifican corriendo `npm run typecheck && npm run build && npm test` localmente antes de push, y confirmando el run de CI en verde en GitHub Actions tras el push.

## Riesgos / trade-offs aceptados

- La regex de email de Fix 3 no es RFC-completa — puede aceptar algunos formatos técnicamente inválidos y rechazar algunos técnicamente válidos con caracteres raros. Aceptable porque el objetivo es filtrar basura obvia, no ser un validador de email de producción.
- `escapeHtml()` es una función manual, no una librería de sanitización (como DOMPurify) — suficiente porque solo estamos escapando texto plano para insertarlo como contenido/atributo, no permitiendo HTML enriquecido en ningún caso. Traer una librería para este caso sería sobre-ingeniería (YAGNI).
