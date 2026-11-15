# Plan: actualización diaria de proveedores y taxonomía guardada en la base (do-plan, para firma del PO)

**Folio del plan:** REQ-10671 (FIRMADO por el PO el 15 nov 2026). **Peticiones:** REQ-10668, REQ-10669 y REQ-10670.
**Petición literal del PO (15 nov 2026, 02:06 hora de México):** «Sí ambos puntos, para Freetour y Tangol, y también Mila debe revisar todos los días si hay actualizaciones en mail de los otros proveedores». Antes (02:02): «confirmar que tanto Freetour como Tangol sigan conservando la instrucción de actualización diaria de base de datos y que la página consume la información actualizada de base de datos ya con nuestra taxonomía para que la página sea más rápida».
**Regla:** nada de esto se enciende con este documento. Cada pieza va en su PR, con su bandera apagada, preview, humo y OK del PO.

## 1. Auditoría (15 nov 2026, verificado)

| Tema | Cómo está hoy | Evidencia |
|---|---|---|
| FREETOUR, actualización diaria | **Sí corre sola**, a las 3:00 a. m. de México | `wrangler.jsonc` (`triggers.crons`), `worker.ts` (`/api/cron/sync-tours`); en D1 `MAX(lastSeenAt)` = 14 nov 09:00 UTC, 8,400 tours, 8,165 activos |
| Tangol, actualización diaria | **No.** Solo a mano | `.github/workflows/tangol-sync.yml` (`workflow_dispatch`, sin `schedule`); REQ-3464; en D1 última corrida 14 nov 06:25–07:34 UTC, 1,215 tours |
| La página lee de la base | Sí para fichas, listados, buscador y mapa. Los tours de pago de FREETOUR además piden fechas en vivo (INC-024) | `src/tours/detail-props.ts`, `src/lib/api/freetour-client.ts` |
| Taxonomía guardada en la base | **No.** Se calcula en memoria en cada carga (decisión 8, REQ-10587) | `TAXONOMY_SYNC_ENABLED = "false"`; INC-015 ABIERTO (la corrida dejaba ~50 mil filas sin borrar y la base llegó a 9,998 MB de 10 GB); corrección REQ-3511 pendiente |
| Mila y el correo de proveedores | Existe el recorrido de **seguimientos**: `PROVEEDORES_MILA_ON` encendida, reenvío `comercial@` → `copia@mila…` y Email Routing al Worker (REQ-1655, REQ-1657, REQ-1659). **No existe** una revisión diaria que detecte cambios de tarifas, programas o condiciones en esos correos | `docs/requisitos.md`, `worker.ts` (`/api/proveedores/correo`) |

## 2. Qué se construye

### A. Tangol se actualiza solo cada día (REQ-10668; reemplaza a REQ-3464 cuando se publique)
- El workflow de Tangol gana un horario diario con escritura, fuera de la hora del sync de FREETOUR y nunca a la par de un deploy.
- Reusa lo que ya protege el sync a mano: lotes, guarda de 90 KB por sentencia (INC-016), detalle por lotes de 50 (INC-017), punto de regreso de D1 antes de escribir y prueba de humo al terminar.
- Topes: si la corrida trae menos del 80 % de los tours del día anterior, no retira nada y avisa (un fallo de Tangol no vacía el catálogo).
- Arreglo previo obligatorio: el paso de humo de ese workflow hoy falla siempre porque no instala el navegador.

### B. Taxonomía guardada en la base para FREETOUR y Tangol (REQ-10669; reemplaza la decisión 8, REQ-10587)
- Primero se cierra INC-015 (REQ-3511): la corrida borra lo que ya no se lee y tiene tope de filas; sin eso no se enciende.
- Al cerrar cada sync diario se recalcula la clasificación solo de los tours que cambiaron y se guarda una fila por tour (tipo, temas, atributos, dificultad), con la versión del diccionario.
- La página lee esa fila. Si falta o es de una versión vieja del diccionario, clasifica en memoria como hoy (nunca una ficha sin etiquetas).
- Las reglas firmadas (decisión 9, dificultad, atributos) no cambian: cambia dónde se calcula, no qué sale. Prueba de paridad: lo guardado es idéntico a lo calculado en memoria para los 9,600 tours.
- Se mide antes y después: tiempo de respuesta de ficha, listado y buscador, para confirmar que sí es más rápida.

### C. Mila revisa cada día el correo de los demás proveedores (REQ-10670)
- Una vez al día Mila lee lo que llegó de los proveedores por correo (los de tarifario: Exotic, Fantástica China, Turismo Asiático, Mondial Trails, Jordan Experience, Destino Colombia, Canadian Receptive, Multitravel, Extime, Eurowelcome y los demás del directorio).
- Clasifica cada correo: tarifario o vigencia nueva, cambio de programa, cambio de condiciones, respuesta a una duda, o nada que actualizar.
- **No cambia precios ni fichas sola.** Entrega al PO un resumen diario con lo detectado y, por cada cambio, una propuesta para aprobar (regla del acuerdo: el proveedor avisa por correo, Travel Puzzle confirma, y solo entonces se actualiza el anexo de tarifas).
- Los correos no se envían solos: cualquier respuesta al proveedor queda como borrador.

## 3. Estructura de carpetas
Sin módulos nuevos de primer nivel. Archivos nuevos previstos:
```
src/tangol/lib/daily-guard.ts          tope del 80 % y decisión de retirar o no (puro)
src/taxonomy/lib/stored.ts             leer la fila guardada o caer a memoria; versión del diccionario (puro)
src/taxonomy/lib/recompute-plan.ts     qué tours recalcular y qué filas borrar (puro; cierra REQ-3511)
src/taxonomy/repository.ts             lectura y escritura; recibe la base por parámetro
src/proveedores/lib/correo-cambios.ts  clasifica un correo de proveedor (puro)
src/proveedores/lib/resumen-diario.ts  arma el resumen para el PO (puro)
migrations/<número apartado>           solo si la tabla de taxonomía necesita columnas (se aparta con folio.ts migracion)
```
Se modifican: `.github/workflows/tangol-sync.yml`, `worker.ts` (tarea diaria), `src/destinations/lib/page-model.ts` y los lectores de tarjetas, `wrangler.jsonc`.

## 4. Pruebas (primero, rojo → verde)
| Pieza | Qué prueba | Comando |
|---|---|---|
| Tope diario de Tangol | Con menos del 80 % no retira nada y avisa | `npx vitest run src/tangol/lib/daily-guard.test.ts` |
| Limpieza del recálculo | Nunca deja más filas que tours × versiones vigentes (INC-015) | `npx vitest run src/taxonomy/lib/recompute-plan.test.ts` |
| Lectura guardada | Fila vigente se usa; fila vieja o ausente cae a memoria | `npx vitest run src/taxonomy/lib/stored.test.ts` |
| Paridad | Lo guardado = lo calculado en memoria en el fixture real de 350 tours y en una muestra de FREETOUR | `npx vitest run src/taxonomy/lib/stored-parity.test.ts` |
| Correo de proveedores | Tarifario, cambio de programa, respuesta y ruido se clasifican bien con correos reales anonimizados | `npx vitest run src/proveedores/lib/correo-cambios.test.ts` |
| Resumen diario | Sin netos en el texto que sale; un cambio = una propuesta | `npx vitest run src/proveedores/lib/resumen-diario.test.ts` |

## 5. SOLID
SRP: decidir (puro) separado de leer y escribir. OCP: proveedor nuevo = entra al sync diario y a la lectura guardada sin tocar la página. LSP: la clasificación guardada y la de memoria cumplen el mismo contrato. ISP: la página recibe solo las etiquetas, no la fila entera. DIP: base, reloj y banderas por parámetro.

## 6. Banderas nuevas, en `false`
| Bandera | Qué enciende |
|---|---|
| `TANGOL_SYNC_DIARIO_ENABLED` | El horario diario de Tangol |
| `TAXONOMY_SYNC_ENABLED` (existente, detenida) | El guardado al cerrar cada sync |
| `TAXONOMY_STORED_READ_ENABLED` | Que la página lea la clasificación guardada |
| `PROVEEDORES_CORREO_DIARIO_ON` | La revisión diaria de Mila y su resumen |

## 7. Olas (un cambio por PR)
| Ola | Contenido | Candados |
|---|---|---|
| D1 | Humo del workflow de Tangol con navegador; tope del 80 % | Merge |
| D2 | Horario diario de Tangol tras bandera; primera corrida vigilada | Escritura en producción; llamar a Tangol; encendido |
| D3 | Cierre de INC-015 (REQ-3511): limpieza y tope de filas | Merge; borrar filas de corridas viejas en producción |
| D4 | Guardado al cerrar el sync, FREETOUR y Tangol, con paridad | Migración si hace falta; encendido |
| D5 | La página lee lo guardado; medición antes y después | Encendido |
| D6 | Mila: clasificación de correos y resumen diario al PO | Encendido; nunca envía correos |

## 8. Gates para el PO (se preguntan uno por uno)
| Gate | Pregunta | Recomendado |
|---|---|---|
| G-D1 | Hora del sync diario de Tangol | 1:00 a. m. de México, dos horas antes del de FREETOUR |
| G-D2 | Si Tangol deja de mandar un tour | Ocultarlo tras dos corridas seguidas sin verlo, no a la primera |
| G-D3 | Avisar a Tangol (Hernán) que se consultará su API cada día | Sí, en el mismo borrador pendiente; no se enciende sin su visto bueno |
| G-D4 | Qué pasa si la clasificación guardada y la de memoria difieren | Gana la de memoria y se registra; la guardada se recalcula |
| G-D5 | A dónde llega el resumen diario de Mila | Al correo del PO; WhatsApp cuando el puente de avisos esté publicado |
| G-D6 | Qué puede hacer Mila sola con un cambio de tarifas | Nada: propone y el PO aprueba |

### Gates firmados (PO, 15 nov 2026)
| Gate | Firma literal | Folio |
|---|---|---|
| G-D1 | «1:00 a. m.» | REQ-10673 |
| G-D2 | «Tras dos corridas» | REQ-10674 |
| G-D3 | «2 pero consulta si hay algo sobre el tema en documentación antes» (avisar y encender; la documentación no pone límites) | REQ-10675 |
| G-D4 | «Recalcular al publicar» (la página lee solo lo guardado) | REQ-10676 |
| G-D5 | «A tu correo» | REQ-10677 |
| G-D6 | «3 hay que meter validaciones con ISO para garantizar que la lectura sea óptima» (Mila aplica todo y avisa) | REQ-10678 |

Con G-D6 cambia la sección 2.C: Mila **sí aplica sola** los cambios que pasen las validaciones, envía ella la confirmación al proveedor (REQ-10679) y después el correo de aplicación con el detalle de cada cambio (REQ-10680), siempre con copia al PO y a Claudia; todo correo de Mila a proveedores lleva esa copia (REQ-10681).

## 9. Candados (OK explícito del PO, uno por uno)
Todo merge; el horario diario de Tangol; cada llamada a la API de Tangol; borrar filas en producción (limpieza de INC-015); migraciones; cada encendido de bandera; el envío de cualquier correo a un proveedor.

## 10. Firma del plan
- [x] **PO:** firmado el 15 nov 2026, ~02:15 hora de México. Pregunta: «¿Firmas el plan de actualización diaria (PR #587)? … Firmarlo no enciende nada.» Respuesta literal: «Firmo el plan» (REQ-10671). Los gates G-D1 a G-D6 se preguntan uno por uno.
