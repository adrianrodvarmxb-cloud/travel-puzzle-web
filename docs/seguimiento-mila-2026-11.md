# Seguimiento de Mila en Travel Puzzle (REQ-10640, 14 nov 2026)

Petición del PO (14 nov 2026 06:03): «dime cómo hago para traer el seguimiento de Mila a este proyecto para asegurar la implementación».
Este tablero junta en un solo lugar lo de Mila que vive en dos repos (`travel-puzzle-web` y `zoefel-mila`). Se actualiza al cerrar cada PR de Mila y en cada cierre de ola del plan `docs/plan-ficha-unica-2026-11.md`.

## Lo firmado (no se vuelve a preguntar)
- Plan de acceso de Mila al catálogo: firmado (REQ-3353, 12 nov). Recorrido de 10 etapas en WhatsApp: firmado (REQ-3365, 12 nov), `docs/journey-mila-whatsapp.md` en la rama `feat/mila-acceso-catalogo`.
- Mila nunca ve netos ni márgenes (REQ-3358) y verifica al titular por número o por folio y correo (REQ-3357).
- Cliente ↔ guía solo por Travel Puzzle, sin compartir teléfonos (REQ-3412); chat puente «Escribirle a mi guía» durante la ventana del tour (REQ-3432).
- En la ficha única: decisiones 39 a 45 (REQ-10617 a REQ-10622).

## Estado por pieza
| Pieza | Repo y PR | Bandera | Estado | Qué falta |
|---|---|---|---|---|
| Mila consulta ficha, contenido, legal y reservas del titular | `travel-puzzle-web` #468 (borrador) | `AGENTE_CLIENTES_ON` apagada | Construido en rama | Rehacerlo sobre el modelo común (decisión 39, ola 6); merge con OK del PO |
| Mila consulta en línea y manda todas las fotos | `zoefel-mila` #203 (borrador) | — | Construido en rama | Depende de #468; merge |
| Resumen antes de pagar | `zoefel-mila` #204 (borrador) | — | Construido en rama | Merge |
| «Agregar a mi calendario» | `zoefel-mila` #205 (borrador) | — | Construido en rama | Merge |
| «¿Cómo llego?» | `zoefel-mila` #206 (borrador) | — | Construido en rama | Merge |
| Puente de avisos del sitio a WhatsApp | `zoefel-mila` #207 (borrador); sitio REQ-1663 | `AVISOS_ON` apagada | Solo la decisión pura; sin ruta ni envío | Ruta y envío; secreto `MILA_AVISOS_SECRET` (lo carga el PO) |
| RNT al pie de los mensajes | `zoefel-mila` #208 (borrador) | — | Construido en rama | Merge |
| Comprobante, reseña, folio, accesos rápidos, código | `zoefel-mila` #209 | `JOURNEY_ON` apagada | Construido en rama | Plantillas en Meta, liga de reseña, encendido |
| Chat puente «Escribirle a mi guía» (REQ-3432) | Sin PR | — | **NO CUMPLIDO: sin construir** | Plan propio; depende del puente de avisos (#207) y de tener el WhatsApp de cada guía u operador en su expediente (decisión 51) |
| Texto al cliente sobre cómo contactar al guía (REQ-3412) | Sin PR | — | PENDIENTE del PO | El PO dijo «recuérdame que te diga cómo se le debe indicar al cliente» |
| Mila ve Tangol (decisión 40) | Ola 6 y ola 11 del plan | `AGENTE_TOUR_ENABLED` | Sin iniciar | Modelo común |
| Mila en la ficha, apagada en FREETOUR (decisiones 42 y 43) | Ola 11 | `FICHA_MILA_ENABLED` | Sin iniciar | Plantilla nueva |
| Mila lee el carrito (decisión 44) | Ola 10 | `CART_SERVER_ENABLED` | Sin iniciar | Carrito en servidor |

## Cómo se asegura la implementación
1. Cada pieza de arriba tiene su ola en el plan; ninguna ola de Mila se cierra sin revisar este tablero.
2. Lo que se construye en `zoefel-mila` lleva folio en los dos repos (el de allá cita el de aquí), como ya hacen #207 y #209.
3. La ficha, la confirmación y Mila solo prometen lo que esté encendido en producción.
4. Toda sesión que toque Mila agrega el repo `zoefel-mila` y lee este tablero primero.
