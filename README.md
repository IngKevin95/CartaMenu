# Fuego Fast

Carta digital de comida rápida casual con carrito de compras y Google Sheets como backend (take-home).

**URL live:** https://carta-menu-ten.vercel.app

## Marca

"Fuego Fast" — fast food casual moderno. Paleta negro `#161616` / naranja `#ff5a1f` / fondo cálido `#f4f1ee`, tipografía sans-serif bold en headers, copy corto y directo ("Armá tu pedido", "Mandar pedido").

## Stack

- Astro (estático, sin frameworks JS adicionales — el carrito es JS vanilla en un `<script>`).
- Google Sheets: pestaña `Menu` (id, name, description, price, image) y pestaña `Orders` (timestamp, name, email, items JSON, total).
- Google Apps Script Web App (`apps-script/Code.gs`) como puente: `doGet` devuelve el menú, `doPost` agrega una fila a `Orders`.

## Setup

1. Crear un Google Sheet con dos pestañas: `Menu` (header: id, name, description, price, image) y `Orders` (header: timestamp, name, email, items, total).
2. Cargar productos en `Menu` — podés importar `menu-sample.csv` de este repo (Archivo → Importar → Subir, "Reemplazar hoja actual" sobre `Menu`) como punto de partida.
3. La columna `image` es una URL pública a la foto del producto (subila a cualquier hosting gratuito — Imgur, Cloudinary free tier, o un archivo de Google Drive con "Cualquier usuario con el enlace"). Es opcional: si queda vacía, la tarjeta se muestra sin imagen.
4. Extensiones → Apps Script → pegar `apps-script/Code.gs` → Implementar → Aplicación web (ejecutar como Yo, acceso Cualquiera). Copiar la URL `/exec`.
5. Copiar `.env.example` a `.env` y setear `PUBLIC_APPS_SCRIPT_URL` con esa URL.
6. `npm install && npm run dev`.

## Supuestos

- El id de producto en `Menu` es único y estable; se usa como key del carrito.
- No hay autenticación de cliente: el email en el formulario es solo un dato de contacto, no se valida contra nada.
- `doPost` no valida stock ni duplicados — cualquier POST bien formado agrega una fila.
- El precio se confía tal cual viene del Sheet (no hay recalculo server-side); para un MVP de take-home es aceptable, en producción el total debería recalcularse en `doPost` a partir del Sheet, no del carrito del cliente.
- 14 tests unitarios (Vitest) cubren `src/lib/cart.ts` y `src/lib/api.ts`; el wiring de DOM en `index.astro` se validó manualmente en el navegador, no tiene tests automatizados.

## Con otra hora

Agregaría manejo de errores más robusto en el POST (reintentos, estado de orden pendiente persistido en localStorage por si falla la red), recalcularía el total server-side en Apps Script contra los precios reales del Sheet, y sumaría un test simple (Vitest) para la lógica del carrito extraída a un módulo separado.

## Plan

Hecho:
- [x] Scaffold Astro estático.
- [x] Apps Script `doGet`/`doPost` (`apps-script/Code.gs`).
- [x] Página con menú, carrito client-side y envío de orden (`src/pages/index.astro`).
- [x] Identidad de marca "Fuego Fast" aplicada (paleta, tipografía, copy).
- [x] README con setup, supuestos y "con otra hora".

- [x] Crear el Google Sheet real con pestañas `Menu`/`Orders` y pegar `apps-script/Code.gs`.
- [x] Deploy en Vercel con `PUBLIC_APPS_SCRIPT_URL` seteada.
- [x] `chat.md` con la transcripción real y URL live en este README.
