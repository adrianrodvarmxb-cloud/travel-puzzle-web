# Plan: cambios de proveedores sin API desde «cambios para la página» (do-plan, FIRMADO)

Folio del frente: **REQ-10885**. Plan: **REQ-10886**. Padres: REQ-10670, REQ-10678, REQ-10679, REQ-10680, REQ-10684 (ola D6 del plan de actualización diaria, `docs/plan-actualizacion-diaria-2026-11.md`, REQ-10668…10671). Frente #586 (sesiones en paralelo, REQ-1587).

**Petición literal del PO (26 nov 2026):** «si hay un precio que se actualiza, alguna descripción que cambia, lo que sea, que se actualice con este archivo de proveedores».
**Alcance (PO, 26 nov 2026):** «esto aplica nada más para los proveedores que no tienen API».
**Firma (PO, 26 nov 2026, chat de proveedores):** aprobó el diseño («sí, está bien, así») y ordenó que el plan salga ya firmado («para que de la firma que ya se vaya firmado»). Con esa firma le aplica la autorización global REQ-10743: suite completa, `npx tsc --noEmit`, build y humo 390/1366 en verde; un cambio por PR; aviso al PO de cada paso con evidencia. Lo que manda correos o mensajes a proveedores sigue siendo del PO.

## 1. Auditoría de solo lectura (26 nov 2026, verificado en main `1f0a2a6`)

| Pieza | Qué hay hoy | Líneas |
|---|---|---|
| `src/proveedores/lib/tarifas.ts` | Puro (REQ-1672, 1581, 1582): detecta un aviso de tarifa en un correo (`pareceCambioTarifa`), lee monto, moneda y fecha (`leerCambio`, `leerFecha`), liga el aviso a un renglón del anexo (`renglonDelAviso`), calcula el precio público con el markup (`precioNuevo` → `sellPrice`), valida la confirmación (`puedeConfirmar`), textos del aviso al PO y de los correos «pide fecha» y «quedamos enterados», comando «confirmo T-n». `Moneda` = USD, EUR, MXN. | 125 |
| `src/proveedores/tarifa.ts` | I/O con dependencias por parámetro (`DepsTarifa`: repo, enviar, avisarPO, rates, precioOpcion, guardarPrecio, hoy). `revisarTarifa` crea el `TarifaAviso` por correo; `confirmarTarifa` (botón del panel o «confirmo T-n») manda «quedamos enterados», actualiza el renglón del anexo y, si ya rige, el precio de la opción; `aplicarVigentes` corre cada hora; `descartarTarifa`. **Nada cambia sin la confirmación del PO.** | 122 |
| `src/proveedores/tarifa-repo.ts` | D1 (migración 0027): `ProveedorTarifa` (anexo por proveedor: producto, neto, moneda, kind, publicado, tripId, optionId, desde) y `TarifaAviso` (numero, estado `falta_fecha` / `falta_monto` / `por_confirmar` / `confirmado` / `aplicado` / `descartado`, nota, confirmadoPor). El neto vive solo en D1. | 60 |
| `src/proveedores/entrante.ts` | I/O (REQ-1291, 1296, 1565, 1672, 10811): procesa cada copia de comercial@ (`POST /api/proveedores/correo`, bearer `CRON_SECRET`): duplicados, rebotes, identificación del proveedor, registro del mensaje, adjuntos a R2, `deps.tarifa` opcional para `revisarTarifa`, propuesta de cierre de preguntas al PO. | 83 |
| `src/proveedores/diario.ts` | I/O (REQ-1293, 1294, 10693): revisión diaria de recordatorios, «sin respuesta» y reintentos; **nunca envía directo**: todo correo queda como borrador programado (`deps.borrador`) y el PO recibe el enlace. | 99 |
| `/admin/tarifas` (`src/app/admin/tarifas/page.tsx`, `src/app/api/admin/tarifas/[id]/route.ts`) | Lista los avisos por estado, botón Confirmar / Descartar (`TarifaAvisoControl`); con `PROVEEDORES_MILA_ON` apagada no muestra nada. | — |
| Banderas de hoy | `PROVEEDORES_MILA_ON` "true", `PROVEEDORES_BORRADORES_ON` "true", `PROVEEDORES_BORRADORES_MODO` "manual", `MILA_AVISOS_URL` (puente a WhatsApp, REQ-10758). | `wrangler.jsonc` |

Conclusión: el modelo de aviso → anexo → precio público ya existe y está probado (`tarifas.test.ts`, `tarifa.test.ts`). Lo que falta es (1) otra **entrada**: la lista diaria en vez del correo suelto, con su filtro de alcance; (2) la **regla de aplicación automática** de la ola D6 (hasta 20 % sola y avisa; más de 20 % pide autorización; lo que no es precio queda como propuesta); (3) las **validaciones ISO** de REQ-10678 (doble lectura, dato completo, origen, regreso en un paso, bitácora); (4) el **correo de aplicación** al proveedor con copia (REQ-10680, 10681) como borrador. Nada de esto existe hoy. `/admin/tarifas` se reutiliza para las propuestas y las autorizaciones.

## 2. Cómo llega la lista a Mila (decisión técnica, con alternativas)

El documento `proveedores/cambios-para-la-pagina.md` vive en el Proyecto de Claude «Travel Puzzle» (lo escribe la tarea diaria «Expedientes de proveedor al día»). Es privado: trae netos y adjuntos de proveedores, el Worker no puede abrirlo y el repo es público, así que **nunca entra al repo**.

**Elegida: entrada autenticada en el Worker + repo privado de datos como transporte.**
1. La tarea diaria, además del documento del Proyecto, deja el mismo contenido como `cambios-para-la-pagina.json` (contrato de la sección 3) en un **repo privado** `adrianrodvarmxb-cloud/travel-puzzle-datos` (lo crea el PO; la app de Claude instalada en él). Netos y adjuntos quedan en almacenamiento privado, como pide REQ-10717.
2. Un workflow mínimo de ese repo privado, al recibir un push, hace `POST https://travelpuzzle.com.mx/api/proveedores/cambios` con el JSON y `Authorization: Bearer $PROVEEDORES_CAMBIOS_SECRET` (secreto de GitHub Actions en el repo privado y secreto del Worker en Cloudflare, los dos los carga el PO; el valor nunca pasa por el chat ni por este repo).
3. El Worker valida con Zod (`leerLista`), aplica el filtro de alcance (`filtrarAlcance`: un proveedor «fuera» se ignora y se registra, nunca se aplica), guarda cada cambio en D1 (`ProveedorCambio`, migración apartada al abrir el PR 2) con su origen (nombre del archivo, fecha, hash) y Mila lo procesa con las reglas de la sección 4.

Por qué: no agrega secretos a la tarea de Claude (solo necesita escribir en GitHub, que ya tiene), reutiliza el patrón de `POST /api/proveedores/correo` (bearer + Zod + dependencias inyectadas), deja bitácora y origen, y el repo público no ve un solo neto.

Alternativas anotadas (no elegidas):
- **B. Correo a comercial@** con marcador en el asunto, por la entrada que ya existe (`entrante.ts`). Sin secretos nuevos, pero el remitente se puede suplantar y un correo falso podría mover precios hasta 20 % solos. Descartada mientras no haya firma DKIM verificada en la entrada.
- **C. Subida directa a R2** desde la tarea diaria. Necesita credenciales de R2 en la tarea de Claude. Descartada por eso.
- **D. `repository_dispatch` en este repo** con el JSON como `client_payload`. Los netos quedarían en el registro público de Actions. Descartada.
- **E. Leer el Proyecto de Claude desde el Worker.** No hay API para eso. Descartada.

## 3. Contrato de la lista (`cambios-para-la-pagina.json`)

```json
{
  "version": 1,
  "generadoEn": "2026-11-26",
  "origen": "proveedores/cambios-para-la-pagina.md",
  "alcance": { "fuera": ["tangol", "freetour", "eurowelcome", "big-bus-tours", "extime-travel", "bemyguest", "hotelbeds"],
               "dentro": ["exotic-escapes", "jordan-experience", "multitravel", "mondial-trails", "canadian-receptive-tours", "inca-world-peru", "fantastica-china", "destino-colombia", "turismo-asiatico", "oku-japan", "kyoto-tours-en-espanol", "eurorutas"] },
  "cambios": [
    { "id": "2026-11-26-exotic-01", "proveedor": "exotic-escapes", "tipo": "precio", "producto": "Triángulo de Oro",
      "neto": { "monto": 1080, "moneda": "USD", "montoVerificado": 1080 }, "desde": "2027-04-01",
      "fuente": { "mensajeId": "<…@exotic>", "fecha": "2026-11-25", "adjunto": "Tarifario 2027.pdf", "pagina": 3 } },
    { "id": "2026-11-26-fchina-02", "proveedor": "fantastica-china", "tipo": "descripcion", "producto": "Beijing clásico R1",
      "texto": "…", "fuente": { "mensajeId": "<…>", "fecha": "2026-11-25" } }
  ]
}
```
- `tipo` ∈ precio · descripcion · programa · vigencia · condiciones. Un cambio por producto y tipo.
- `neto.montoVerificado` es la **doble lectura** (REQ-10678): la tarea lo lee dos veces (adjunto y cuerpo, o dos pasadas); si no coincide o falta, el cambio no se aplica solo.
- Ids de proveedor = los del directorio (`src/proveedores/lib/directorio.ts`). Un id desconocido se registra y se ignora.
- El código lee `alcance` de la lista; mover un proveedor de grupo es decisión del PO (se cambia en la tarea diaria, no en el código). Prueba con el folio en el nombre, con uno «fuera» y uno «dentro».
- Gate G-C1 (abajo): si la tarea diaria no puede producir JSON, se agrega un lector del Markdown con tablas fijas; el contrato interno es el mismo.

## 4. Reglas de Mila (ya firmadas; aquí solo se cablean)

| Cambio | Qué hace Mila | Folio |
|---|---|---|
| Precio hasta 20 % (contra el neto vigente del anexo) | Lo aplica sola (anexo + precio público con el markup, desde la fecha) y **siempre** avisa al PO y a Claudia (correo y WhatsApp por el puente) | REQ-10684, REQ-10678 |
| Precio de más de 20 % | No lo aplica; manda solicitud de autorización por correo y WhatsApp a Claudia y a Adrián; si cualquiera autoriza («autorizo C-n» o botón en `/admin/tarifas`), se aplica y se avisa al otro | REQ-10684 |
| Descripción, programa, vigencia, condiciones | Queda como propuesta en `/admin/tarifas` (sección «Propuestas»); la aprueba el PO; nada cambia antes | REQ-10670 |
| Validaciones (todas, antes de aplicar) | doble lectura que coincide; dato completo (moneda, temporada con fechas, programa identificado en el anexo); origen guardado (archivo, fecha, hash); regreso en un paso (`ProveedorCambio` guarda el valor anterior; «revertir C-n»); bitácora (`ProveedorCambioBitacora`) | REQ-10678 |
| Correo de aplicación al proveedor con el detalle de cada cambio, copia al PO y a Claudia | Borrador programado (`deps.borrador`), nunca directo; **se enciende solo con OK del PO** | REQ-10680, REQ-10681, REQ-10693 |
| Nunca | el neto o el margen al cliente; un cambio de un proveedor «fuera»; un correo directo | REQ-10717 |

## 5. Estructura de carpetas

Sin módulos nuevos de primer nivel. Dominio `src/proveedores/`:
```
src/proveedores/lib/cambios-lista.ts        PR 1 · puro: contrato Zod, leerLista, filtrarAlcance, validarCambio (REQ-10887)
src/proveedores/lib/cambios-regla.ts        PR 2 · puro: tope 20 %, decisión aplicar / pedir autorización / propuesta, texto de avisos y de la solicitud
src/proveedores/cambios-repo.ts             PR 2 · D1: ProveedorCambio y ProveedorCambioBitacora (migración apartada con folio.ts migracion)
src/proveedores/cambios.ts                  PR 2 · I/O: recibirLista (guarda con origen), aplicarCambios (anexo + precio + bitácora + avisos), autorizarCambio, revertirCambio; todo por parámetro
src/app/api/proveedores/cambios/route.ts    PR 2 · POST con bearer PROVEEDORES_CAMBIOS_SECRET, tras PROVEEDORES_CAMBIOS_ON
src/proveedores/lib/cambios-propuesta.ts    PR 3 · puro: propuesta de descripción / programa / vigencia / condiciones y su texto para el PO
src/app/admin/tarifas/…                     PR 3 · sección «Propuestas» y botón Autorizar / Revertir (reutiliza TarifaAvisoControl)
src/proveedores/lib/cambios-correo.ts       PR 4 · puro: correo de aplicación al proveedor (es/en) con copia al PO y a Claudia, sin margen ni precio final
tests/proveedores/fixtures/tarifarios/      PR 5 · tarifarios reales anonimizados (sin nombres de proveedor ni netos reales)
```
Se modifican: `wrangler.jsonc` (banderas), `src/proveedores/deps.ts` (dependencias nuevas), `docs/requisitos.md`, `STATUS.md`.

## 6. Pruebas (primero, rojo → verde; el folio en el nombre)

| Pieza | Qué prueba | Comando |
|---|---|---|
| Lector y alcance | Un JSON válido pasa; uno sin `alcance` o con `tipo` desconocido falla con motivo; un cambio de un proveedor «fuera» (Tangol) se ignora y se registra; uno «dentro» (Exotic) entra; id desconocido se registra; la doble lectura que no coincide marca el cambio como no aplicable | `npx vitest run src/proveedores/lib/cambios-lista.test.ts` |
| Regla del tope | 19.9 % aplica y avisa; 20 % aplica; 20.1 % pide autorización; sin neto vigente en el anexo no se calcula y queda propuesta; baja de precio también avisa | `npx vitest run src/proveedores/lib/cambios-regla.test.ts` |
| Aplicación | Guarda el valor anterior, actualiza anexo y precio público desde la fecha, escribe bitácora, avisa a los dos; un proveedor «fuera» nunca llega aquí; «revertir C-n» regresa en un paso | `npx vitest run src/proveedores/cambios.test.ts` |
| Entrada HTTP | Sin bearer 401; bandera apagada 200 con `skipped`; JSON inválido 400 con los motivos; nunca devuelve netos | `npx vitest run src/proveedores/cambios-route.test.ts` |
| Propuestas | Una por cambio; el texto al PO no trae netos ni margen | `npx vitest run src/proveedores/lib/cambios-propuesta.test.ts` |
| Correo al proveedor | es/en; copia a las dos direcciones de Travel Puzzle; detalle de cada cambio «como quedó leído»; nunca margen ni precio final; sale solo como borrador | `npx vitest run src/proveedores/lib/cambios-correo.test.ts` |
| Tarifarios reales anonimizados | Lectura doble coincide en los casos conocidos; los casos ambiguos quedan en propuesta | `npx vitest run tests/proveedores/tarifarios.test.ts` |

## 7. SOLID
- SRP: leer (lista) / decidir (regla) / aplicar (I/O) / avisar (textos) en archivos distintos; el I/O no calcula.
- OCP: un tipo de cambio nuevo entra como caso del contrato y su propuesta; un proveedor nuevo sin API entra por la lista, sin tocar código.
- LSP: `ProveedorCambio` convive con `TarifaAviso`; `/admin/tarifas` muestra los dos con el mismo control (props nuevas opcionales).
- ISP: la regla recibe solo neto vigente, neto nuevo y fecha; el correo recibe solo el detalle leído.
- DIP: base, reloj, envío, borrador, puente de avisos y márgenes por parámetro (como `DepsTarifa`).

## 8. Banderas nuevas, todas en `false`
| Bandera | Qué enciende | Se enciende en |
|---|---|---|
| `PROVEEDORES_CAMBIOS_ON` | La entrada `/api/proveedores/cambios` y el guardado en D1 (solo registra; no aplica) | PR 2, con humo |
| `PROVEEDORES_CAMBIOS_APLICAR_ON` | La aplicación automática hasta 20 % y las solicitudes de autorización | Tras las pruebas con tarifarios reales (PR 5) |
| `PROVEEDORES_CAMBIOS_PROPUESTAS_ON` | Las propuestas de descripción, programa, vigencia y condiciones en `/admin/tarifas` | PR 3, con humo |
| `PROVEEDORES_CAMBIOS_CORREO_ON` | El borrador del correo de aplicación al proveedor | Solo con OK del PO en el momento |
Una bandera por PR; cada encendido con humo en verde y aviso al PO. Secretos nuevos: `PROVEEDORES_CAMBIOS_SECRET` (GitHub Actions del repo privado y Cloudflare).

## 9. Plan de regreso
Cada PR se revierte solo (sin datos). Las banderas en "false" devuelven el comportamiento de hoy. Un cambio aplicado se regresa en un paso con «revertir C-n» (valor anterior en `ProveedorCambio`). Antes de la migración: punto de regreso de D1 y copia en `tmp/` con script de restauración que simula por omisión.

## 10. Olas (un cambio por PR)
| PR | Contenido | Candados |
|---|---|---|
| 1 | Lector y validador puros con filtro de alcance (REQ-10887) | Merge (autorización global) |
| 2 | Regla del tope, repo, migración, entrada HTTP tras `PROVEEDORES_CAMBIOS_ON`; aplicación tras `PROVEEDORES_CAMBIOS_APLICAR_ON` apagada | Migración con punto de regreso; encendido de `CAMBIOS_ON` |
| 3 | Propuestas y sección en `/admin/tarifas` | Encendido |
| 4 | Correo de aplicación al proveedor como borrador, con copia | **OK del PO** para encender (correo a proveedor) |
| 5 | Pruebas con tarifarios reales anonimizados; encendido de `APLICAR_ON` | Encendido |

## 11. Gates (uno por uno; el plan ya está firmado, estos no lo detienen)
| Gate | Pregunta | Recomendado |
|---|---|---|
| G-C1 | Transporte de la lista: repo privado + entrada autenticada (A) o correo a comercial@ con marcador (B) | A |
| G-C2 | Formato que produce la tarea diaria: JSON del contrato (A) o Markdown con tablas fijas y lector propio (B) | A |
| G-C3 | ¿El 20 % se mide contra el neto vigente del anexo (A) o contra el precio publicado (B)? | A (REQ-10684 habla de la tarifa) |
| G-C4 | Autorización de más de 20 %: «autorizo C-n» por WhatsApp o correo y botón en el panel (A) o solo panel (B) | A |

## 12. Candados (OK explícito del PO, uno por uno)
Cualquier correo o mensaje a un proveedor (el correo de aplicación se construye como borrador y no se enciende sin OK); decisiones de producto abiertas (gates); cobros; DNS; borrar datos o ramas; escrituras en datos de clientes. Secretos: los carga el PO.

## 13. Firma
- [x] **PO:** firmado el 26 nov 2026 en el chat de proveedores: «sí, está bien, así» y «para que de la firma que ya se vaya firmado». Arranca el PR 1.
