# Fuego Fast

Carta digital de comida rápida casual con carrito de compras y Google Sheets como backend (take-home).

**URL live:** _pendiente de deploy — reemplazar tras publicar en Vercel/Netlify/GitHub Pages_

## Marca

"Fuego Fast" — fast food casual moderno. Paleta negro `#161616` / naranja `#ff5a1f` / fondo cálido `#f4f1ee`, tipografía sans-serif bold en headers, copy corto y directo ("Armá tu pedido", "Mandar pedido").

## Stack

- Astro (estático, sin frameworks JS adicionales — el carrito es JS vanilla en un `<script>`).
- Google Sheets: pestaña `Menu` (id, name, description, price) y pestaña `Orders` (timestamp, name, email, items JSON, total).
- Google Apps Script Web App (`apps-script/Code.gs`) como puente: `doGet` devuelve el menú, `doPost` agrega una fila a `Orders`.

## Setup

1. Crear un Google Sheet con dos pestañas: `Menu` (header: id, name, description, price) y `Orders` (header: timestamp, name, email, items, total).
2. Extensiones → Apps Script → pegar `apps-script/Code.gs` → Implementar → Aplicación web (ejecutar como Yo, acceso Cualquiera). Copiar la URL `/exec`.
3. Copiar `.env.example` a `.env` y setear `PUBLIC_APPS_SCRIPT_URL` con esa URL.
4. `npm install && npm run dev`.

## Supuestos

- El id de producto en `Menu` es único y estable; se usa como key del carrito.
- No hay autenticación de cliente: el email en el formulario es solo un dato de contacto, no se valida contra nada.
- `doPost` no valida stock ni duplicados — cualquier POST bien formado agrega una fila.
- El precio se confía tal cual viene del Sheet (no hay recalculo server-side); para un MVP de take-home es aceptable, en producción el total debería recalcularse en `doPost` a partir del Sheet, no del carrito del cliente.
- No hay tests automatizados dado el alcance de una hora; se validó manualmente el flujo cargar menú → agregar/quitar → enviar orden.

## Con otra hora

Agregaría manejo de errores más robusto en el POST (reintentos, estado de orden pendiente persistido en localStorage por si falla la red), recalcularía el total server-side en Apps Script contra los precios reales del Sheet, y sumaría un test simple (Vitest) para la lógica del carrito extraída a un módulo separado.

## Plan

Hecho:
- [x] Scaffold Astro estático.
- [x] Apps Script `doGet`/`doPost` (`apps-script/Code.gs`).
- [x] Página con menú, carrito client-side y envío de orden (`src/pages/index.astro`).
- [x] Identidad de marca "Fuego Fast" aplicada (paleta, tipografía, copy).
- [x] README con setup, supuestos y "con otra hora".

Pendiente (pasos operativos, no de código):
- [ ] Crear el Google Sheet real con pestañas `Menu`/`Orders` y pegar `apps-script/Code.gs`.
- [ ] Deploy en Vercel/Netlify con `PUBLIC_APPS_SCRIPT_URL` seteada.
- [ ] Reemplazar `chat.md` con la transcripción real y poner la URL live acá arriba.
