# Brand: Fuego Fast

## Concepto
Fast food casual moderno. Carta digital directa, sin fricción: elegís, sumás al carrito, mandás el pedido.

## Paleta
| Uso | Color |
|---|---|
| Base / texto / header | `#161616` |
| Acento (precios, botones primarios) | `#ff5a1f` |
| Fondo | `#f4f1ee` |
| Superficie (cards) | `#ffffff` |

## Tipografía
Sans-serif del sistema (`system-ui`), sin fuente custom — headers en mayúsculas con letter-spacing para dar peso sin cargar un web font.

## Tono de copy
Corto, directo, casual. Ejemplos usados en el producto:
- Header: "Armá tu pedido, mandalo directo a cocina."
- Botón agregar: "Sumar"
- Botón enviar: "Mandar pedido"
- Confirmación: "¡Pedido en camino a cocina!"

## Dónde vive
Todo aplicado inline en `src/pages/index.astro` (CSS vars `--ink`, `--accent`, `--bg` + copy). No se creó un design system separado — el alcance de un take-home de una hora no lo justifica (YAGNI).
