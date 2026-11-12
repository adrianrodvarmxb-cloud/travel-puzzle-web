# Plan do-plan · Mila toma los seguimientos de todos los proveedores (REQ-3457)

Para firma del PO antes de programar. Frente: issue #445. Se construye sobre el PR #385 (Mila administra proveedores, REQ-1291…1299 y siguientes), que aún no está fusionado.

Petición literal (PO, 12 nov 2026): «de una vez que mila tome los eguimientos de todos estos provedores».

## 1. Auditoría (solo lectura, rama `feat/proveedores-mila` al 12 nov)
- **Lo que Mila ya hace (PR #385):**
  - Revisión diaria (`src/proveedores/diario.ts`), con recordatorios a los 5 y 10 días hábiles, «sin respuesta» y reintento a los 2 meses.
  - Respeta el horario del proveedor.
  - Antes de escribir, consulta la lista compartida con la revisión cada 6 h (REQ-3430).
- **Lo que pide en sus recordatorios:** solo la lista de alta genérica en 8 grupos (`lib/checklist.ts`). No conoce las preguntas propias de cada proveedor, como fuerza mayor de Fantástica China, Sri Lanka 21 días de Exotic o las fechas del Eid de Jordan Experience.
- **Bloqueo por negociación:** se detiene si el proveedor tiene `bloqueos.acuerdoEnNegociacion` (REQ-1669). Hoy casi todos tienen acuerdo en negociación, así que con esa regla Mila no escribiría a ninguno.
- **Correo entrante** (`entrante.ts`): identifica al proveedor y guarda documentos. No sabe cuáles preguntas quedaron contestadas.
- **Calendario:** el punto «tarifas» de la lista no pide los elementos del calendario (días de salida, recargos por fecha, aviso mínimo y vigencia) que necesita REQ-3456.
- **Todavía no corre:** falta fusionar el PR #385, aplicar la migración 0027, cargar el directorio y encender `PROVEEDORES_MILA_ON`. Además, el PO tiene pendientes el reenvío de cPanel, el DNS de Resend y los secretos.
- **Contacto compartido:** una misma persona, Angela Ballén, representa a Exotic Escapes, Jordan Experience, Multitravel y Mondial Trails.

## 2. Estructura de carpetas
Sin carpetas nuevas. Todo en la rama del PR #385 o en una que salga de ella.
- **Modificado** `migrations/0027_proveedores_mila.sql` (todavía sin aplicar): columna `"preguntas" TEXT NOT NULL DEFAULT '[]'` en `Proveedor`.
  - Formato JSON: `[{ id, es, en, req, desde, cerrada }]`.
  - Si el PO prefiere no tocar la 0027, va en una 0028 aparte.
- **Nuevo** `src/proveedores/lib/preguntas.ts`: funciones puras.
  - `abiertas()`: las preguntas sin cerrar.
  - `textoRecordatorio()`: primero las preguntas propias y luego la lista de alta.
  - `cerrar(id)`.
  - `agruparPorContacto()`: un solo correo por persona cuando representa a varios proveedores.
- **Modificado** `src/proveedores/lib/checklist.ts`: el punto «tarifas» pide además días de salida, temporadas con fechas, recargos obligatorios por fecha, aviso mínimo, vigencia y todos los suplementos (REQ-3456).
- **Modificado** `src/proveedores/diario.ts`: el recordatorio lleva las preguntas abiertas.
- **Modificado** `src/proveedores/lib/choques.ts`: con acuerdo en negociación, Mila puede recordar las preguntas de ese acuerdo. No puede proponer cambios al acuerdo; esos siguen siendo del PO (según G2).
- **Modificado** `src/proveedores/entrante.ts`: cuando llega una respuesta, avisa al PO qué preguntas parecen contestadas. No las cierra solo (según G3).
- **Datos:** carga inicial de las preguntas por proveedor desde el tablero (`docs/requisitos.md`) con el script de carga del directorio. No lleva montos ni datos fiscales; los correos de contacto viven en la base, no en el repo.

## 3. Carga inicial: preguntas abiertas por proveedor (de los REQ del tablero)
| Proveedor | Qué falta que contesten |
|---|---|
| Exotic Escapes | Vuelos internos (REQ-1375); Sri Lanka 21 días (REQ-1376); cancelación para agencias y fotos (REQ-1377); datos legales y Anexo 2 (REQ-1378); fechas del Festival de Kandy; precio de Navidad en India; actualización de tarifas por correo (8.2) |
| Fantástica China | Lo que sigue abierto del correo del 11 nov tras su respuesta del 12 nov (REQ-1675): plazo y medio de pago, anexo de cuenta, reubicación si cambia un vuelo, 8.2, datos legales, correo de reservas; ¿hay salidas del 18 al 30 ene? |
| Destino Colombia | Las 8 preguntas del 11 nov; anticipación mínima (24 h o sin mínimo); tarifas para compras después del 15 dic |
| Big Bus | Las 8 preguntas del 11 nov (cancelación, base del 20 %, pago, fotos y logo, términos, 8.2, datos legales, Ventrata OCTO) |
| Extime | Puntos a–g, 20 fotos, idioma de 46 productos y la llamada del 17 o 18 nov; diferencia del 5D4N entre documentos |
| Tangol | Las 5 preguntas del 11 nov |
| Eurowelcome | Los 5 puntos del 12 nov (URL de la API, documentación, acceso, IP y esquema comercial) |
| Turismo Asiático | Neto o comisión; precio de las noches de hotel sin monto; confirmar las salidas en domingo |
| Jordan Experience | Fechas del Eid 2027-28; precio de la cena del 31 dic, de la noche extra en Aqaba y de la carpa de lujo; acuerdo (REQ-1395) |
| Mondial Trails | Tarifario vigente 2026-27; qué es «valor noche adicional» |
| Canadian Receptive Tours | Tarifario 2026-27 (pedido el 4 nov) y si podemos publicar (REQ-1406) |
| Multitravel | Tarifario vigente; el PO decide antes si sale el borrador del 6 nov (REQ-1396) |
| Oku Japan | Monto del suplemento individual y de las noches extra (después de que el PO defina la respuesta, REQ-1522) |
| Central Inca World | Fotos prometidas el 9 nov (REQ-1524); tarifario B2B en un formato que se pueda leer; suplementos |
| Kyoto Tours | Sin respuesta desde el 4 nov (REQ-1406) |
| BeMyGuest | Clave de demo de la API (REQ-1408) |
| Eurorutas | Respuesta de su oficina central sobre la API (REQ-1394) |

**Quedan fuera:**
- FREETOUR: nunca se le escribe por esta vía (regla B3).
- Hotelbeds: confirmar la cuenta es tarea del PO (REQ-1409).
- Portal de Extime antes del 17 nov: tarea del PO (REQ-1398).

## 4. Pruebas (rojo → verde, `npx vitest run <archivo>`)
| Pieza | Test existente | Test nuevo |
|---|---|---|
| Preguntas | — | `src/proveedores/lib/preguntas.test.ts`: solo salen las abiertas; en el idioma del proveedor; un solo correo por contacto que representa a varios; cerrar no borra el historial |
| Lista de alta | `src/proveedores/lib/proveedores.test.ts` | «tarifas» pide los elementos del calendario |
| Revisión diaria | `src/proveedores/proveedores-io.test.ts` | el recordatorio lleva las preguntas; con acuerdo en negociación sí recuerda preguntas y no manda nada más |
| Entrante | `src/proveedores/proveedores-io.test.ts` | una respuesta genera aviso al PO y no cierra preguntas sola |
| Candado | `src/ingest/privacy.test.ts` | ningún monto ni dato fiscal en los datos del repo |

## 5. SOLID
- **S:** `preguntas.ts` solo decide qué preguntar, `diario.ts` solo orquesta y `entrante.ts` solo lee lo que llega.
- **O:** una pregunta nueva es un renglón de datos, no código nuevo.
- **L:** sin preguntas cargadas, el recordatorio sale igual que hoy (test de caracterización).
- **I:** `textoRecordatorio` recibe solo las preguntas y el idioma.
- **D:** la base, el envío y el día de hoy entran por parámetro (`deps.ts`).

## 6. Gates para el PO (uno por uno)
- **G1 · Quién sigue a quién.**
  - A) Mila manda los recordatorios y la revisión cada 6 h solo lee, actualiza el tablero y te avisa (Recomendado: así nadie le escribe dos veces al mismo proveedor).
  - B) Las dos siguen, coordinadas por la lista compartida (REQ-3430).
  - C) Se apaga la revisión cada 6 h.
- **G2 · Acuerdo en negociación.**
  - A) Mila recuerda las preguntas abiertas, pero no negocia: cualquier cambio al acuerdo te llega a ti (Recomendado).
  - B) Mila no escribe mientras haya acuerdo en negociación (como hoy).
- **G3 · Cerrar preguntas.**
  - A) Mila te propone cuáles quedaron contestadas y tú o el agente las cierran (Recomendado: un «sí» suelto no cierra nada).
  - B) Mila las cierra sola.
- **G4 · Un contacto con varios proveedores (Angela Ballén).**
  - A) Un solo correo por persona con un apartado por proveedor (Recomendado).
  - B) Un correo por proveedor.
- **G5 · Arranque.**
  - A) En cuanto se encienda Mila, con los 7 publicados primero y luego el resto (orden P5) (Recomendado).
  - B) Primero una prueba con un proveedor.

## 7. Publicación
Todo detrás de `PROVEEDORES_MILA_ON = "false"`. Orden, cada paso con OK del PO:
1. Fusionar el PR #385.
2. Aplicar la migración.
3. Cargar el directorio y las preguntas.
4. Preview con la bandera encendida y prueba de humo.
5. Encender.

Plan de regreso: apagar la bandera. Las preguntas quedan en la base sin efecto.
