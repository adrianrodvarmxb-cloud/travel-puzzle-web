# Plan do-plan · Chat puente «Escríbele a tu guía» (REQ-3432; folio del plan REQ-10864)

Para firma del PO antes de programar. Frente 5 (REQ-10742), caso 2 de `docs/dependencias-detenidas.md`. Opción **B** de REQ-10759 («A ahora y B después», PO 17-11-2026): la A (recordatorio del día anterior desde Mila, REQ-10760) va primero; este plan es la B.

Petición de origen (PO, 12 nov 2026, journey §8): «nunca se comparte el teléfono del operador ni del guía; chat puente “Escribirle a mi guía” por el número de Travel Puzzle solo durante la ventana del tour». Dictamen del abogado (19-11-2026, punto 23, §O): aprobado con tres reglas obligatorias (REQ-10807).

## 1. Auditoría (solo lectura, main al 23 nov 2026)
| Lo que pide el chat puente | Ya existe | Dónde |
|---|---|---|
| Número de Travel Puzzle en WhatsApp con Mila (tenant `travel-puzzle`) | sí | zoefel-mila `src/tenants`, `AVISOS_TENANT` |
| Puente sitio → WhatsApp (ruta autenticada, Zod, envío inyectado) | sí, encendido 17-11 (`AVISOS_ON="true"`) | zoefel-mila `src/avisos/puente.js` + `lib/puente.js` (REQ-035/045); sitio REQ-10758, `MILA_AVISOS_URL` |
| Verificación del titular (número o folio + correo) | sí, apagada | zoefel-mila `src/catalogo/lib/consulta.js` (REQ-030, `CONSULTA_ON`); sitio REQ-3357 |
| «Mi reserva» y journey del cliente | sí, apagados | zoefel-mila `src/catalogo/lib/journey.js` (REQ-036…041, `JOURNEY_ON`) |
| Recordatorio del día anterior desde Mila | en curso | REQ-10760 (plantilla utility de Meta: candado del PO) |
| WhatsApp del guía u operador por reserva | **no**: el expediente trae contactos de reservas y emergencias (p. ej. Inca World §2), no el guía de cada salida | `proveedores/<slug>-expediente-*.md` (Proyecto), `src/proveedores/lib/directorio.ts` (sin campo `guia`) |
| Registro temporal de los mensajes del puente (§O.1) | **no** | — |
| Textos §O en T&C y en el convenio con el operador | **no** | `src/legal/` (T&C), `legal/plantilla-acuerdo-intermediacion-2026-11.md` (Proyecto) |
| Aviso en el chat «ningún guía puede pedirte pagos» (§O.3) | **no** | — |
| Ventana del tour (desde X horas antes hasta Y después) | **no** | la reserva tiene fecha y hora; la ventana es una regla pura nueva |

## 2. Cómo funciona (propuesta)
El cliente escribe en el chat de Travel Puzzle (número de Mila) y elige «Escríbele a tu guía» en «Mi reserva» (journey §8). Mila verifica al titular (REQ-3357), comprueba que la reserva está confirmada y dentro de la ventana del tour, muestra una sola vez el aviso §O (monitoreo y conservación; ningún guía puede pedirte pagos) y reenvía el mensaje al WhatsApp del guía u operador **desde el número de Travel Puzzle**, con el folio y el nombre del cliente, nunca su teléfono. El guía responde a ese mismo número y Mila lo entrega al cliente, nunca el teléfono del guía. Fuera de la ventana, Mila contesta con el recordatorio de la A («un día antes recibirás…») y la opción «Hablar con una persona». Emergencias siguen siendo por Travel Puzzle (journey §8).

## 3. Estructura de carpetas
**zoefel-mila** (la conversación vive en Mila):
- Nuevo `src/catalogo/lib/puenteGuia.js` (puro): `ventanaDelTour(reserva, ahora)`, `decidirPuente({ reserva, titularVerificado, destino, texto, encendido })` → `{ accion: "reenviar" | "aviso" | "fuera_de_ventana" | "sin_guia" | "bloqueado", mensajes }`; filtro de pagos (§O.3: si el guía escribe montos o cuentas, Mila no reenvía y avisa al PO por el puente de avisos).
- Nuevo `src/catalogo/puenteGuia.js` (I/O): relevo cliente ↔ guía con `store`, `wa` y `catalogo` inyectados; registro temporal de cada mensaje (§O.1) con vencimiento (propuesta: 30 días tras el tour; gate G4).
- Modificado `src/catalogo/lib/journey.js`: opción «Escríbele a tu guía» solo con `PUENTE_GUIA_ON`.
- `wrangler.toml`: `PUENTE_GUIA_ON = "false"`.
- Textos del aviso §O en `docs/plantillas-meta.md` si el relevo sale fuera de 24 h (plantilla utility: candado del PO).

**travel-puzzle-web** (los datos y lo legal):
- Nuevo `src/reservas/lib/guia.ts` (puro): `contactoGuia(reserva, expedienteProveedor)` → WhatsApp del guía u operador para esa salida o `null`; nunca sale a la pantalla ni al cliente.
- Modificado `src/app/api/agente/cliente/route.ts` (#468, `AGENTE_CLIENTES_ON`): la reserva del titular trae `puenteGuia: { disponible, ventana }` sin el teléfono; el teléfono lo pide Mila por una ruta aparte con la llave del agente (`GET /api/agente/guia?folio=`), solo dentro de la ventana.
- Modificado `src/legal/lib/terminos*.ts`: cláusulas §O.1 y §O.2 (texto del abogado tal cual).
- Proyecto (fuera del repo): el expediente de cada proveedor gana la sección «Guía u operador por salida: WhatsApp» (REQ-10717) y el convenio la cláusula §O.1 para el operador.
- Sin migración nueva: el contacto del guía vive en el expediente/directorio privado, no en D1 (gate G2).

## 4. Pruebas (rojo → verde, `npx vitest run <archivo>`), cada una con el folio en el nombre
| Pieza | Test existente | Test nuevo |
|---|---|---|
| Ventana del tour | — | `tests/catalogo/puenteGuia.test.js`: dentro/fuera de ventana; reserva no confirmada = fuera |
| Decisión del puente | — | mismo archivo: titular no verificado → no reenvía; sin guía → «sin_guia» y aviso al PO; §O.3: texto con montos o cuentas del guía no se reenvía; primer mensaje lleva el aviso §O una sola vez |
| Relevo I/O | `tests/avisos/*` (forma) | `tests/catalogo/puenteGuia-io.test.js`: `wa.sendText` recibe el número del guía solo desde el servidor; al cliente nunca llega un teléfono; registro con vencimiento |
| Candado de teléfonos | `tests/guardian` | guardián: ningún mensaje al cliente contiene un número de teléfono distinto del de Travel Puzzle |
| Contacto del guía (sitio) | — | `src/reservas/lib/guia.test.ts`: sale del expediente; `null` sin dato; nunca en las props públicas |
| Ruta del agente | `src/agente/detalle.test.ts` (puerta) | `src/agente/guia.test.ts`: sin llave 401; fuera de ventana 403; con todo, el número |
| T&C | `src/legal/lib/*.test.ts` | §O.1 y §O.2 presentes, texto literal del abogado |
Conversaciones de prueba (zoefel-mila `tests/conversaciones`): titular dentro de la ventana; titular fuera; no titular; guía que pide un depósito; sin guía en el expediente.

## 5. SOLID
- **S**: ventana y decisión (puro) separados del relevo (I/O) y del dato del guía (sitio).
- **O**: un canal nuevo del guía (correo, otro número) es otra fuente de `contactoGuia`, no otro `if` en Mila.
- **L**: con `PUENTE_GUIA_ON` apagada, «Mi reserva» y el journey quedan exactamente como hoy.
- **I**: `decidirPuente` recibe solo reserva, verificación, destino y texto; no la ficha ni el expediente.
- **D**: `store`, `wa`, `catalogo` y el reloj entran por parámetro; sin `fetch` ni Firestore en `lib/`.

## 6. Gates para el PO (uno por uno)
- **G1 · Ventana del tour.** A) Desde 24 h antes de la hora de salida hasta 6 h después de la hora de fin (Recomendado: cubre retrasos y punto de encuentro, que es el fin logístico de §O.2). B) Solo el día del tour. C) Otra.
- **G2 · Dónde vive el WhatsApp del guía.** A) En el expediente del proveedor en el Proyecto y el directorio privado; el sitio lo lee solo para Mila con la llave del agente, nunca en D1 ni en el repo (Recomendado: es dato de un tercero, no de la reserva). B) Columna cifrada en `Reserva` de D1 por salida. C) Otra.
- **G3 · Quién recibe el mensaje cuando no hay guía asignado.** A) El contacto operativo del proveedor del expediente, y Mila avisa al PO por el puente (Recomendado). B) Mila dice «sin guía asignado» y pasa a persona. C) Otra.
- **G4 · Conservación de los mensajes (§O.1).** A) 30 días después del tour y se borran (Recomendado: lo mínimo para aclarar incidencias). B) 90 días. C) Otra.
- **G5 · Orden de encendido.** A) Primero Tangol (acuerdo v4 con §O.1 en el convenio, contacto operativo claro), luego los DMC por PDF cuando su convenio lleve §O.1; FREETOUR nunca (cumplimiento B3) (Recomendado). B) Todos los proveedores con convenio firmado a la vez. C) Otra.

## 7. Publicación
Todo entra apagado (`PUENTE_GUIA_ON="false"` en zoefel-mila; en el sitio la ruta del guía responde 404 sin `AGENTE_CLIENTES_ON`). Depende de: `AGENTE_CLIENTES_ON` (REQ-3356, OK del PO: Mila habla con clientes reales), `CONSULTA_ON`/`JOURNEY_ON` (ola 11), la plantilla utility si el relevo sale fuera de 24 h (candado de Meta), §O.1 en el convenio con cada operador y el WhatsApp del guía u operador en su expediente. Encendido por proveedor en su PR con conversaciones de prueba antes/después; nunca se escribe a un guía real para probar. Plan de regreso: bandera a `"false"`.

## 8. Firmas del PO
| Gate | Respuesta literal | Fecha |
|---|---|---|
| G1 | — | — |
| G2 | — | — |
| G3 | — | — |
| G4 | — | — |
| G5 | — | — |
