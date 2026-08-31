# Fuego Fast — Diseño de calidad de software (arquitectura, testing, CI)

Fecha: 2026-08-30
Estado: Aprobado por el usuario, pendiente de implementación.

## Contexto

El take-home "Fuego Fast" (menú de restaurante con carrito, Google Sheets como backend vía Apps Script) ya está funcional: `src/pages/index.astro` contiene el shell HTML, todo el CSS y toda la lógica de carrito/API embebida en un único `<script>` inline. `apps-script/Code.gs` implementa `doGet`/`doPost` sin validación de payload.

El usuario pidió explícitamente elevar el sistema a "calidad de software y planeación requerida": lógica testeable, manejo de errores explícito, y CI. Este spec cubre esa restructuración — no agrega features de producto nuevas.

## Objetivo

Separar lógica de negocio (carrito, llamadas a API) de la presentación (DOM), hacerla testeable con Vitest, endurecer la validación en el backend de Apps Script, y correr build+test en CI. Mantener Astro estático, sin frameworks de UI adicionales (React/Preact) — el carrito es simple y no lo justifica.

## Fuera de alcance

- Deploy automático en CI (sigue siendo manual, documentado en `docs/plan.md`).
- Autenticación de usuarios.
- Recalcular precios server-side contra el Sheet en `doPost` (documentado como mejora futura en README, "Con otra hora").
- Framework de UI (React/Preact) para el carrito — descartado por sobre-ingeniería (approach B en la discusión de diseño).

## Arquitectura

### Módulos

- **`src/lib/cart.ts`** — estado y operaciones puras del carrito. Sin DOM, 100% testeable.
  - `addItem(cart, item)`: agrega o incrementa qty.
  - `changeQty(cart, id, delta)`: incrementa/decrementa; elimina si qty llega a 0.
  - `total(cart)`: suma `price * qty` de todos los items.
  - `toOrderPayload(cart, customer)`: arma el objeto que se envía a `doPost` (items, total, timestamp ISO).
- **`src/lib/api.ts`** — I/O de red.
  - `fetchMenu(url)`: GET al Apps Script, devuelve `MenuItem[]` o lanza `ApiError`.
  - `submitOrder(url, payload)`: POST con 1 reintento ante fallo de red; lanza `ApiError` tipado si falla tras el reintento o si la respuesta indica `ok:false`.
- **`src/pages/index.astro`** — shell + wiring: importa los módulos de `lib/`, maneja eventos DOM y renderizado. No contiene lógica de negocio propia (ni cálculo de totales ni parsing de payload).
- **`apps-script/Code.gs`** — `doPost` valida el payload antes de escribir: rechaza si falta `name`, `email`, `items` no es array no-vacío, o `total` no es numérico ≥ 0. Responde `{ok:false, error}` sin tocar la hoja si la validación falla.

### Flujo de datos

```
Sheet "Menu" --doGet--> fetchMenu() --> render cards
click "Sumar" --> cart.addItem() --> render carrito
submit --> cart.toOrderPayload() --> submitOrder() --doPost--> valida --> appendRow(Orders)
```

Todo el estado del carrito vive en memoria del cliente (`const cart = {}` en el script de la página) — no hay persistencia entre recargas. Esto ya estaba así y se mantiene; no es parte de este cambio.

## Manejo de errores

- **Cliente**: `fetchMenu`/`submitOrder` distinguen error de red (fetch rechaza) de respuesta no-ok (status ≠ 2xx o `{ok:false}`). La UI muestra el mensaje específico (`ApiError.message`) y no pierde el contenido del carrito ante un fallo — el usuario puede reintentar el submit.
- **Servidor**: `doPost` valida antes de escribir. Nunca se escribe una fila parcial o corrupta en `Orders`.

## Testing

Vitest como dependencia dev-only nueva.

- `src/lib/cart.test.ts`: total con 0/1/N items; `changeQty` que baja a 0 elimina el item; `changeQty` sobre id inexistente es no-op; `toOrderPayload` incluye timestamp ISO válido y refleja qty/total correctos.
- `src/lib/api.test.ts` (mock de `fetch` global): `fetchMenu` parsea JSON correctamente y lanza `ApiError` en respuesta no-ok; `submitOrder` reintenta exactamente una vez ante fallo de red y luego propaga `ApiError` si el reintento también falla; `submitOrder` no reintenta ante `{ok:false}` explícito del servidor (es un error de validación, no de red — reintentar no ayuda).

## CI

`.github/workflows/ci.yml`: en push y pull_request, `npm ci && npm run build && npm test`. Sin paso de deploy.

## Riesgos / trade-offs aceptados

- Vitest agrega una dependencia dev nueva — aceptado porque el usuario pidió explícitamente tests y calidad, no aplica ponytail/YAGNI acá (fue solicitado).
- `apps-script/Code.gs` no tiene test automatizado (Apps Script no corre en el entorno de test local sin mocks del `SpreadsheetApp`); se valida manualmente y por revisión de código. Escribir un mock completo de `SpreadsheetApp` para testear 15 líneas de validación no se justifica (YAGNI dentro del alcance aprobado).
