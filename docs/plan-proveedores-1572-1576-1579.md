# Plan do-plan · REQ-1572, REQ-1576, REQ-1579 (para firma del PO, REQ-1578)

## Estructura de carpetas
Nuevos:
- `src/proveedores/lib/checklist.ts` — REQ-1572: los 8 grupos de alta; qué aplica según tipo (DMC con neto o plataforma, P10b); `faltantes()` y `pedidosDeAlta()`.
- `src/proveedores/lib/choques.ts` — REQ-1576: `puedeEscribir()` (no escribe si hay borrador sin enviar, acuerdo en negociación, folio abierto de la revisión 6 h o hilo sin copia a comercial@).
- `src/proveedores/lib/tarifas.ts` — REQ-1579: validar un cambio de tarifa (producto, neto antes/después, vigencia), texto del aviso al PO y del «quedamos enterados», nuevo precio con `sellPrice()` de `src/trips/lib/markup.ts` (se reutiliza, no se copia).
- `src/proveedores/tarifa.ts` — I/O: guardar el aviso pendiente, y al confirmar: responder en el hilo, escribir el anexo y actualizar el precio del viaje vía `saveTrip()`.
- `src/app/api/proveedores/tarifa/confirmar/route.ts` — entrada del comando del PO (con secreto).
Modificados:
- `migrations/0026_proveedores_mila.sql` (aún sin aplicar): columna `checklist` (JSON) en `Proveedor`, `bloqueos` (JSON) y tabla `ProveedorTarifa` (anexo: producto, neto, desde, estado pendiente/confirmada, quién confirmó).
- `src/proveedores/lib/integracion.ts`: el cobro depende del tipo (DMC: condiciones de pago, depósito y datos bancarios; plataforma: liga de pago y comisión).
- `src/proveedores/lib/plantillas.ts` y `borrador.ts`: presentación como respuesta «Re: …» en el hilo existente (REQ-1577); pedidos desde `checklist`.
- `src/proveedores/entrante.ts`: si el correo trae cambio de tarifa, lo registra pendiente y avisa al PO; nunca toca precios.
- `src/proveedores/diario.ts`: llama a `puedeEscribir()` antes de cada recordatorio.
- `docs/proveedores/plantillas-correo.md`, `STATUS.md`, `docs/requisitos.md`.

## Unit tests
- Existía: `src/proveedores/lib/proveedores.test.ts` (33 verdes) — se agregan casos `REQ-1572`, `REQ-1576`, `REQ-1579`, `REQ-1577`.
- Existía: `src/proveedores/proveedores-io.test.ts` — casos nuevos de `tarifa.ts` (sin confirmación no cambia nada; con confirmación: respuesta, anexo y precio).
- Existía: test de `src/trips/lib/markup.ts` — no cambia.
- Comandos: `npx vitest run src/proveedores/lib/proveedores.test.ts` y `npx vitest run src/proveedores/proveedores-io.test.ts`; al final `npx vitest run`.

## SOLID
- SRP: cada archivo de `lib/` hace una sola regla; I/O solo en la raíz del dominio.
- OCP: un grupo nuevo de la lista de alta se agrega como dato, sin tocar la lógica.
- LSP: `pedidosDeIntegracion` conserva su firma; el tipo de proveedor es un parámetro opcional.
- ISP: cada función recibe solo los campos que usa del proveedor.
- DIP: base de datos, correo, WhatsApp y `saveTrip` llegan por parámetro (`deps.ts`).

## Gates pendientes (uno por uno, después de la firma)
- G1 · Cómo confirma el PO un cambio de tarifa: WhatsApp, botón en el panel o ambos.
- G2 · Si el neto nuevo baja, ¿el precio en la página también baja o se queda?
- G3 · Qué hace Mila si el aviso no trae fecha de vigencia.

## Fuera de alcance
Aplicar la migración, encender `PROVEEDORES_MILA_ON` y el puente de WhatsApp (REQ-1570) siguen siendo candados aparte.
