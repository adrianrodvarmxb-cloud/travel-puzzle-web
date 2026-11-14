# Plan: ficha con todo el detalle del proveedor (Tangol primero)

**Petición del PO (13 nov 2026, 22:23):** «jala del API todos los datos disponibles y vemos dónde los acomodamos».
**Decisiones del PO (22:30):** ~~la casilla Proveedor sigue diciendo «Travel Puzzle» (marca blanca, cláusulas 1.3 y 7.3 del acuerdo con Tangol)~~ REEMPLAZADA a las 22:47/22:50 por REQ-10542 (ver abajo). Entran los cuatro bloques: Condiciones, Antes de ir, Detalles prácticos e Idiomas del guía.

## Auditoría (lo que hay hoy)
- La API entrega en `GetTourDetailsList`: Summary, Description, PicList, StartPoint, EndPoint, DetIncluye, DetNoIncluye, WhatToBring, PhysicalReq, Difficulty, Others, CancelationPolicy, TourLanguages, ChdFrom/To, InfFrom/To, Reviews, ReviewsQty, Popularity. En `GetTourRates`: opciones con horario de salida, HoursBooking, HoursCancelation y días de operación.
- **Ya en la ficha** (con #543): descripción, resumen, fotos, punto de encuentro, qué incluye y reseñas.
- **Ya guardado, sin mostrar:** `excludes`, `cancellationPolicy`, `availabilityRules` (horarios, horas de cancelación), `guideLanguages` (vacío: formato no entendido).
- **Sin guardar:** EndPoint, WhatToBring, PhysicalReq, Difficulty, Others, edades de niño e infante.
- Ficha: `src/components/tours/one/TourDetailClient.tsx` (secciones), franja de datos en `src/tours/lib/hero-facts.ts`.

## Requisitos
| ID | Qué | Datos | Migración |
|---|---|---|---|
| REQ-10536 | Bloque **Condiciones** bajo «Qué incluye»: qué no incluye + política de cancelación + horas para cancelar sin cargo | ya guardados | no |
| REQ-10537 | Bloque **Antes de ir** tras la descripción: qué llevar, requisitos físicos, dificultad, notas | nuevos | sí (0032) |
| REQ-10538 | **Detalles prácticos** en la franja: horario(s) de salida, punto de término, edades de niño e infante | parte nueva | sí (0032) |
| REQ-10539 | **Idiomas del guía**: entender el formato de `TourLanguages` (diagnóstico de solo lectura, solo códigos) y mapearlo a ISO | ya guardado | no |
| REQ-10540 | **Marca blanca en los textos nuevos**: ningún bloque muestra «Tangol», tangol.com ni teléfonos o correos del proveedor (mismo filtro que la descripción) | — | no |
| REQ-10541 | La franja no deja casillas vacías (la 4.ª casilla gris de la captura del PO) | — | no |

## Estructura de carpetas
No cambia. Archivos nuevos:
- `migrations/0032_tour_info_practica.sql` (una columna por dato, gate A) y su test `src/tangol/migration-0032.test.ts`.
- `src/tours/practical-load.ts` (+ test): lectura con SQL aparte (no Prisma), con filtro del gate C y regreso a las columnas de la 0031 si la 0032 no está aplicada.
- `src/tours/lib/practical-info.ts` (+ test): arma los bloques a partir de la fila, puro.
- `src/components/tours/one/TourConditions.tsx`, `TourBeforeYouGo.tsx` (un componente por bloque, SRP).
Se tocan: `src/tangol/lib/details.ts`, `tour-rows.ts`, `extra-sql.ts`, `src/tours/lib/hero-facts.ts`, `TourDetailClient.tsx`, la carga de la ficha y los textos es/en.

## Unit tests (primero, rojo → verde)
- `details.test.ts`: EndPoint, WhatToBring, PhysicalReq, Difficulty, Others y edades se leen; vacíos quedan en null.
- `practical-info.test.ts`: cada bloque aparece solo si tiene datos; el filtro de marca blanca quita «Tangol» y URLs/teléfonos del proveedor.
- `hero-facts.test.ts`: horario de salida, punto de término e idiomas entran a la franja; nunca hay casilla vacía.
- `extra-sql.test.ts`: la columna nueva respeta el tope de 90 KB (REQ-10525).
- Comando: `npx vitest run <archivo>`; antes del PR, suite completa, build y humo 390/1366.

## SOLID
SRP: un componente por bloque y la lógica en `lib/`. OCP: bloques genéricos por datos (cualquier proveedor que traiga esos campos los muestra, regla de catálogo único). ISP: cada componente recibe solo su bloque ya armado. DIP: la carga del servidor entrega la vista; el componente no sabe de Tangol.

## Gates para firma
- **A. Dónde se guardan los datos nuevos:** una sola columna JSON `practicalInfo` (recomendado: una migración, crece sin migrar) o una columna por dato.
- **B. Alcance:** bloques genéricos para cualquier proveedor que traiga el dato (recomendado, catálogo único) o solo para Tangol.
- **C. Orden de entrega:** primero lo que no necesita migración (Condiciones, Idiomas y la franja: REQ-10536, 10539, 10540, 10541) y después Antes de ir y Detalles prácticos con la 0032 (recomendado). La otra opción es todo junto.

## Gates firmados por el PO (13 nov 2026, 22:40)
- **A: una columna por dato** (no JSON): `endPoint`, `whatToBring`, `physicalRequirements`, `difficulty`, `providerNotes`, `childAgeFrom`, `childAgeTo`, `infantAgeFrom`, `infantAgeTo` en `Tour`, migración 0032.
- **B: cualquier proveedor.** El bloque aparece cuando el tour tiene el dato.
- **C: todo junto.** Un solo PR con la migración y los seis REQ.

## Cambio de alcance (PO, 13 nov 2026 22:47 y 22:50) — REQ-10542
- Petición literal: «así deben decir los de Tangol» y «así todos dicen quien opera hasta lo freetour».
- **REEMPLAZA** la decisión de las 22:30 («la casilla Proveedor sigue diciendo Travel Puzzle»). Ahora la casilla «Proveedor» de un tour de Tangol dice **«Tangol Tours»**, igual que FREETOUR muestra a su operador. Sin línea aparte de «Opera en destino».
- REQ-10540 se ajusta: se filtran URLs, dominios, teléfonos y correos escritos por el proveedor (cláusula 7.2), no el nombre del operador.
- El dato (`providerTitle`) se refresca con la próxima corrida del sync, ya planeada tras la migración 0032.

## Candados
- Migración 0032: OK explícito del PO, punto de regreso de D1 antes de aplicar.
- Después de la migración, otra vuelta del sync (~1 h 15 min) para llenar los datos nuevos.
- Cada PR con humo 390/1366 y capturas de una ficha de Tangol real.

## Plan de regreso
Cada bloque se oculta si su dato no existe; revertir el PR quita el bloque sin tocar datos. La columna nueva queda sin usar si se revierte (no se borra).
