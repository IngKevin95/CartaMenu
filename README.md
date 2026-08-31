# Carta Menú

Menú de restaurante con carrito de compras y Google Sheets como backend (take-home).

**URL live:** _pendiente de deploy — reemplazar tras publicar en Vercel/Netlify/GitHub Pages_

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
