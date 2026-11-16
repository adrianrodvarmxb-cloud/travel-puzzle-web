# Piezas detenidas por una dependencia sin construir (REQ-10742)

Petición del PO (16-11-2026 16:11 CDMX), al ver que el aviso por WhatsApp no se puede encender porque el puente de Mila sigue en borrador: «pues hagamos lo que se tenga que hacer, busca qué otros casos hay así y súmalos al constructor».

Un «caso así» es algo ya construido o ya firmado que no se puede encender o terminar porque **le falta una pieza que nadie ha construido** (en este repo o en `zoefel-mila`), no porque espere una decisión del PO ni una ola posterior del plan. La constructora de cada 6 h revisa esta lista en cada corrida, construye primero la pieza que destraba más casos y agrega los casos nuevos que encuentre. Las reglas de merge no cambian: en `zoefel-mila` el merge es del PO; Meta/WhatsApp, secretos y correos siguen fuera del autopilot.

| # | Pieza que falta | Dónde | Qué tiene detenido | Estado |
|---|---|---|---|---|
| 1 | Puente de avisos del sitio a WhatsApp: ruta y envío (hoy solo la decisión pura) | `zoefel-mila` #207 (borrador), bandera `AVISOS_ON`; sitio REQ-1663 | Aviso al PO por tipo nuevo por WhatsApp (REQ-10731); resumen semanal por WhatsApp (REQ-1568, `MILA_AVISOS_URL` vacía en `wrangler.jsonc`); avisos al PO del frente de proveedores (`src/proveedores/deps.ts`); chat puente con el guía (REQ-3432) | Sin construir. Al terminar: el PO carga `MILA_AVISOS_SECRET` y se llena `MILA_AVISOS_URL` |
| 2 | Plan propio del chat puente «Escribirle a mi guía» | Sin PR; REQ-3432 | El contacto cliente ↔ guía sin compartir teléfonos (REQ-3412) | NO CUMPLIDO: sin plan. Depende del caso 1 y del WhatsApp de cada guía u operador en su expediente |
| 3 | Lector de Mila sobre el modelo común (rehacer #468) | `travel-puzzle-web` #468; ola 6 del plan de la ficha única | `zoefel-mila` #203 (Mila consulta en línea y manda fotos) | En cola de la ola 6 |
| 4 | Mostrar en la ficha las etiquetas «incluido» con cantidad | `src/taxonomy/lib/incluido-cantidad.ts` (regla lista y firmada) | REQ-10728 y REQ-10733 no se ven en el sitio | Sin construir; tras bandera |
| 5 | Tabla de códigos de tipo en el sync de los demás proveedores | `src/taxonomy/lib/tipo-nuevo.ts` solo engancha Tangol | El aviso por tipo nuevo (REQ-10730) para proveedores que no son Tangol | Sin construir |
| 6 | Calendario con precio por día y carga de adicionales | Rama `feat/calendario-proveedores-pdf`, plan firmado (PR #446) | Adicionales de Fantástica China definidos y sin cargar (REQ-3439, REQ-3456); temporadas de Exotic | En curso, sin publicar |

## Inventario completo

Petición del PO (16-11-2026 16:17 CDMX): «Haz lista exhaustiva». El inventario completo de todo lo que no está cerrado, con qué lo detiene, vive en `docs/dependencias-detenidas-inventario.md` y se regenera con `npx tsx src/scripts/dependencias-detenidas.ts` (lee `docs/requisitos.md`, `wrangler.jsonc` y los workflows). Al 16-11-2026: 1,200 folios, 509 sin cerrar. La tabla de arriba son los casos ya revisados a mano en los que la pieza que falta está sin construir.

Límites del inventario, dichos tal cual: 149 folios tienen un estado que no dice qué les falta («PENDIENTE» o «EN CURSO» a secas) y 18 quedaron sin clasificar; esos se revisan a mano, folio por folio, y se les escribe qué falta. Las banderas de `zoefel-mila` (`wrangler.toml`: `STRIPE_CONNECT_ON`, `LEAD_ADS_ON`, `MP_ON`, `CLIENT_FLOWS_ON`, `VOZ_ON`, `EMAIL_SEQ_ON`) y sus PR en borrador (#203 a #209) no entran al script porque viven en el otro repo; su tablero es `docs/seguimiento-mila-2026-11.md`.
