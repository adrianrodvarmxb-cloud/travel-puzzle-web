# Plan do-plan · REQ-3430 consulta mutua Mila ↔ revisión cada 6 h (PO, 12 nov 2026)

Petición literal (REQ-3429): «cada una debe consulyar alal otra antes de enviar».

## Auditoría (solo lectura)
- `src/proveedores/lib/choques.ts` (`puedeEscribir`, REQ-1669): Mila ya no escribe si el proveedor trae `bloqueos` (borrador sin enviar, acuerdo en negociación, folio abierto). Nadie llena `bloqueos` hoy.
- `src/proveedores/diario.ts`: revisión diaria de Mila; envía por `deps` (correo de comercial@).
- La revisión cada 6 h (REQ-1397, REQ-1413) es una tarea de Claude: lee Gmail y `docs/requisitos.md`, crea borradores en Gmail; no tiene acceso a la base D1 de producción.
- El repo es público: el estado de negociación de un proveedor no puede vivir en el repo ni en issues.

## Regla común (no depende del mecanismo)
1. Antes de enviar, cada una lee el estado de la otra para ese proveedor.
2. Si la otra tiene algo vivo (borrador sin enviar, negociación, folio abierto, o un envío de Mila en las últimas 48 h o programado), no envía y lo deja anotado como «en espera de la otra».
3. Desempate: gana quien apartó primero (marca de tiempo); la otra espera 24 h y vuelve a consultar.
4. Si no puede consultar (falla la red o la lectura), no envía (falla cerrado).

## Gate G1 · mecanismo de consulta — FIRMADO «A» (PO, 12 nov 2026, REQ-3447)
- **A (recomendada):** tabla `ContactoProveedor` en D1 (migración 0027) con «quién, qué, cuándo y hasta cuándo». Mila la lee y escribe directo; la revisión cada 6 h la consulta y aparta por un endpoint protegido `/api/proveedores/contacto` con secreto `PROVEEDORES_CONTACTO_TOKEN` (lo carga el PO en Cloudflare). Privado, en tiempo real.
- **B:** sin endpoint: Mila consulta los borradores de Gmail de travelpuzzlemexico@ (permiso de solo lectura de Gmail para el Worker) y la revisión cada 6 h consulta los correos enviados por comercial@ en copia. Sin tabla nueva, pero depende de los buzones y es más lento.

## Estructura de carpetas (con A)
- Nuevo `src/proveedores/lib/consulta.ts` (puro: regla común y desempate) + `consulta.test.ts`.
- Nuevo `src/proveedores/contacto-repo.ts` (I/O D1) y `src/app/api/proveedores/contacto/route.ts` (endpoint protegido, apagado tras `PROVEEDORES_MILA_ON`).
- Modificados: `choques.ts` (usa `consulta.ts`), `diario.ts` (consulta antes de enviar), `migrations/0027_proveedores_mila.sql` (tabla nueva, sin aplicar).

## Unit tests
- `npx vitest run src/proveedores/lib/consulta.test.ts` (nuevo, `REQ-3430: …`): espera si la otra tiene algo vivo, desempate por hora, falla cerrado.
- `npx vitest run src/proveedores/lib/proveedores.test.ts` (existente, REQ-1669 se conserva).

## SOLID
- SRP: la regla vive en `lib/consulta.ts`; el I/O en repo y endpoint.
- OCP/LSP: `puedeEscribir` mantiene su firma; la consulta se agrega como entrada.
- ISP: el endpoint expone solo «consultar» y «apartar».
- DIP: `diario.ts` recibe la consulta por `deps`.

## Candados
Migración, secreto y encender la bandera piden OK del PO. Nunca se escribe a un proveedor real para probar.
