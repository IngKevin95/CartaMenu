# Take-home

Menú de restaurante con carrito de compras, con Google Sheets como backend.

## Tiempo

Objetivo menos de 1 hora. Sin tope estricto — puedes tomar más tiempo, pero registramos el tiempo entre la postulación y el momento en que pegas el URL del repo en el formulario. Optimizar el flujo con LLM importa.

## Cuándo hacerlo

El take-home es independiente del screening del CV. Puedes hacerlo ahora (y tu postulación pasa al estado take-home enviado apenas pegas la URL del repo) o esperar a que revisemos tu CV y te lo pidamos explícitamente (~5 días hábiles). Ambos caminos son igual de válidos. Si rechazamos en CV no evaluamos el take-home — pero te avisamos en ~5 días para que no quedes esperando.

## Stack

Astro (estático, islands si hace falta).

- Google Sheets como backend — una pestaña para el menú (productos), otra para órdenes.
- Google Apps Script Web App como puente lectura/escritura (`doGet` devuelve el menú; `doPost` agrega una fila de orden).
- Claude (Code, web, API — lo que sea) como herramienta. La transcripción completa va en `chat.md` (ver Entregable).

## Qué construir

1. Una página que lea productos de la hoja de menú y los renderice como tarjetas (nombre, descripción, precio).
2. Un carrito client-side: agregar / quitar ítems, ver subtotales y total.
3. Un botón "Enviar orden" que haga POST del carrito al endpoint de Apps Script, que agrega una fila a la hoja de órdenes (nombre + email del cliente, items en JSON o aplanados, total, timestamp).
4. Desplegar en algo público (GitHub Pages, Vercel, Netlify — tú eliges) y poner la URL live en el README.

## Qué evaluamos

Las mismas tres dimensiones que en la entrevista:

- Criterio — decisiones visibles en el repo: qué cortaste, qué falseaste, qué documentaste como limitación.
- Autonomía — entregaste algo funcional desde un spec ambiguo sin pedir aclaraciones. Documentar supuestos cuenta más que preguntar.
- Técnico — calidad de código, estructura, tests donde importen, el deploy funciona.

## Entregable

1. Repo público en GitHub con el código.
2. README: URL live, un párrafo sobre qué harías con otra hora, lista de supuestos.
3. `chat.md` en el repo — un copy-paste de toda la conversación que tuviste con Claude (o con el LLM que hayas usado). Un solo archivo, transcripción cruda. Queremos ver prompts, correcciones y callejones sin salida, no un resumen curado.
4. Reabre tu formulario de postulación (con el link de edición de tu email de confirmación) y pega la URL del repo en el campo "URL del repo del take-home".

## Reglas

No hagas preguntas clarificadoras — documenta tus supuestos. El spec es ambiguo a propósito; ese es el test.

- Lee la tarea completa cuidadosamente antes de empezar, y síguela exactamente como está escrita.

Usa Claude como quieras. Te contratamos para que lo uses, no para esconderlo.
