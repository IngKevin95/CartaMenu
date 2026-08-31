# Plan

Clasificación (superpowers:brainstorming): **bounded** — el flujo de menú/carrito ya existía en el repo; aplicar marca fue un cambio acotado sobre código existente, no un subsistema nuevo. Por eso no hay spec architectural aparte: diseño corto aprobado en chat + este plan.

## Hecho

- [x] Scaffold Astro estático (`astro.config.mjs`, `package.json`).
- [x] Apps Script `doGet`/`doPost` (`apps-script/Code.gs`).
- [x] Página con menú, carrito client-side y envío de orden (`src/pages/index.astro`).
- [x] Identidad de marca "Fuego Fast" — ver [`brand.md`](./brand.md).
- [x] README con setup, supuestos y "con otra hora".
- [x] GitFlow: `main` (solo requerimiento) → `develop` → features vía PR con merge commit.

## Pendiente (pasos operativos, no de código)

- [ ] Crear el Google Sheet real con pestañas `Menu`/`Orders` y pegar `apps-script/Code.gs`.
- [ ] Deploy en Vercel/Netlify con `PUBLIC_APPS_SCRIPT_URL` seteada.
- [ ] Reemplazar `chat.md` con la transcripción real y poner la URL live en el README.
