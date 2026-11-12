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

## 3b. Información para el calendario (firma G5 del plan del calendario, PO 12 nov 2026)
A Jordan Experience, Mondial Trails, Canadian Receptive Tours y Multitravel Mila les pide primero, en su idioma, lo que necesita el calendario: tarifario vigente con fechas de cada temporada, días de salida, recargos obligatorios por fecha (fiestas, cenas de gala), anticipación mínima, vigencia y todos los suplementos con precio. Sus viajes se cargan cuando llegue (plan `docs/plan-calendario-proveedores-pdf.md`, G5). Turismo Asiático entra aquí si el PO no lo pone en la tanda 2.

## 4. Pruebas (rojo → verde, `npx vitest run <archivo>`)
| Pieza | Test existente | Test nuevo |
|---|---|---|
| Preguntas | — | `src/proveedores/lib/preguntas.test.ts`: solo salen las abiertas; en el idioma del proveedor; no más de un correo al día a una persona que representa a varios proveedores; cerrar no borra el historial |
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

## 8. Preguntas aprobadas por el PO, proveedor por proveedor
Salen del barrido completo de lo que envió cada proveedor (correos, adjuntos y T&C; detalle en el proyecto de Claude, fuera del repo). Mila pide solo esto; lo ya recibido no se vuelve a pedir.

Regla de forma (PO, 12 nov 2026: «aprobado, solo busca la manera de que no se vea tan abrumador, al igual Jordania»; y ante «¿uno o dos correos?», respuesta literal: «A»): Mila manda **un solo correo con dos secciones**: arriba, **máximo 5 puntos agrupados por tema** con lo que desbloquea vender (tarifas, calendario, pago, cancelación); abajo, una sección corta «Para cerrar el alta» en 2 o 3 líneas. Tono breve y cordial, sin numerar pregunta por pregunta. Si no contestan, el recordatorio repite solo lo que falta.

### Jordan Experience: aprobado («si aprobado», PO, 12 nov 2026)
**Arriba (para poder vender):**
1. Tarifas que faltan: niños (precio y edades), grupos, cena de gala del 31 dic, carpa de lujo, vuelo Aqaba–Amman, noches extra y opcionales.
2. Calendario: anticipación mínima para reservar, fecha de la Semana Santa ortodoxa y año de las fechas del Eid.
3. Traslado privado: si aplica siempre a viajeros que salen de México, no en los vuelos de Royal Jordanian desde España.
4. Pago: plazo y moneda de la factura.
5. Cancelación: qué se cobra entre 8 y 14 días antes, cómo reembolsan y cuánto cuesta un cambio.

**Abajo, «Para cerrar el alta»:** reservas por API, portal o correo (¿sales2@ o sales4@?); voucher; razón social, licencia y seguro de RC; términos para agencias y acuerdo de intermediación; datos del pasajero; el archivo de fotos prometido.

### Mondial Trails: aprobado («aprobado», PO, 12 nov 2026)
**Arriba (para poder vender):**
1. Tarifarios vigentes: Tailandia, Norte, Phuket y Phi Phi vencieron el 31 oct 2026; Bali a partir de abr 2027. Si se puede, en Excel.
2. Calendario: días de salida y anticipación mínima por programa; cenas obligatorias de Nochebuena y Año Nuevo 2026 y fecha de Loy Krathong 2026; qué es «valor noche adicional».
3. Precios que faltan: lancha a Phi Phi, traslados, opcionales y grupos; y si Phi Phi es en USD o THB.
4. Pago: depósito, plazo, moneda, cuenta y recargo con tarjeta.
5. Cancelación: tramos que faltan en Phi Phi y Phuket, la de Bali, no-show, reembolsos y cambios.

**Abajo, «Para cerrar el alta»:** API, portal o plugin; contacto de reservas, tiempo de respuesta, teléfono 24/7 y vouchers; licencia, seguro de RC y términos para agencias; acuerdo de intermediación; permiso de fotos con crédito; datos del viajero y visa para Tailandia e Indonesia.

### Canadian Receptive Tours: aprobado («ok», PO, 12 nov 2026)
**Arriba (para poder vender):**
1. Tarifario 2026-27 (verano 2026 e invierno 26-27), con su vigencia y moneda; lo que tenemos (verano 2025 e invierno 25-26) está vencido.
2. Comisión: qué porcentaje aplica a los circuitos comisionables y si los paquetes y suplementos son netos.
3. Pago: depósito al reservar, si aceptan tarjeta y con qué recargo, y si sus cuentas siguen vigentes.
4. Anticipación mínima para reservar y condiciones para grupos.
5. Cancelación: qué aplica a 6 o 7 días, cambios de fecha o de nombre, y plazo de reembolso.

**Abajo, «Para cerrar el alta»:** acceso a su sistema de reservas o API y tiempo de confirmación; teléfono 24/7 y vouchers; seguro de RC y términos completos para agencias; documentos que piden hoy a mexicanos para Canadá (visa o eTA) y seguro de viaje; permiso de fotos con crédito; acuerdo de intermediación.

### Multitravel: aprobado («ok», PO, 12 nov 2026)
El correo del 6 nov 2026 SÍ salió (claulet@, 14:15 UTC) y no tiene respuesta: Mila escribe como seguimiento de ese hilo. El borrador r4281889931072028883 es un sobrante.

**Arriba (para poder vender):**
1. Tarifas 2026-27 de Colombia, Ecuador y Galápagos (cruceros e islas) y USA, como archivo adjunto (el enlace de Drive no abre; lo de Colombia y USA venció el 31 dic 2025).
2. Calendario: fechas de temporada alta, festivos y eventos con su tarifa, y anticipación mínima.
3. Precios que faltan: opcionales, noches extra, vuelos internos y sencilla; en Galápagos, si incluyen la entrada al parque y la tarjeta de tránsito.
4. Pago: qué es «desc. efectivo», tarifa con tarjeta o transferencia, moneda y cuenta.
5. Cancelación: cuál aplica («no reembolsable» o la tabla de penalidades), qué pasa con más de 30 días y cuánto cuestan los cambios.

**Abajo, «Para cerrar el alta»:** recordatorio de lo pedido el 6 nov (integración, neto o comisión, fotos); teléfono 24/7 y vouchers; razón social, RNT (Colombia), Mintur (Ecuador) y seguro de RC; términos para agencias y acuerdo de intermediación; documentos del pasajero para Ecuador y Galápagos.

## 9. Firmas del PO (plan de Mila)
| Gate | Respuesta literal | Queda | Fecha |
|---|---|---|---|
| G1 · Quién sigue a quién | «1 Mila consulta tablero y da doble check a correos antes de responder a proveedores» | A, con doble verificación: Mila manda los recordatorios; la revisión cada 6 h solo lee, actualiza el tablero y avisa al PO. Antes de escribir o responder a un proveedor, Mila (1) consulta el tablero (`docs/requisitos.md` y la lista compartida, REQ-3430) para saber qué está pendiente, contestado o en negociación, y (2) relee el hilo completo de correos de ese proveedor, incluidos los enviados por Adri o Claudia y los borradores vigentes, para no repetir ni contradecir nada. Si algo no cuadra, no escribe y avisa al PO. Test nuevo en `diario.ts`: sin leer tablero e hilo, no envía | 12 nov 2026 |
| G2 · Acuerdo en negociación | «Recuerda, no negocia (Recomendado)» | A: con acuerdo en negociación, Mila recuerda las preguntas abiertas y lo que falta; no propone ni acepta cambios al acuerdo; cualquier cambio o contrapropuesta del proveedor llega al PO | 12 nov 2026 |
| G3 · Cerrar preguntas | «Mila propone, tú cierras (Recomendado)» | A: Mila lee la respuesta y propone al PO cuáles preguntas parecen contestadas y cuáles siguen abiertas; el PO o el agente las cierran. Un «sí» suelto o un adjunto sin revisar no cierra nada | 12 nov 2026 |
| G4 · Un contacto con varios proveedores | «Un correo por proveedor (Recomendado)» | Un correo por proveedor, en su propio hilo y a su propio correo; Mila los espacia: no más de uno al día a la misma persona (Angela Ballén: Exotic, Jordan, Mondial, Multitravel). Reemplaza la opción A del borrador del plan | 12 nov 2026 |
