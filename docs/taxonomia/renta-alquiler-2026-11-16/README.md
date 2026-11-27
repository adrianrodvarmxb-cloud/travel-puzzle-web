# Renta encendida y alquiler de equipo de Tangol (REQ-10699, 16 nov 2026)

Ficha única, ola 3, gate G-R2 firmado por el PO el 15-11-2026 («3 … Encender «Alquiler» y moverlos»). Un cambio por PR.

## Qué cambia
- Diccionario: el formato `alquiler` («Renta» / «Rentals») pasa de `tras_bandera` a `activo`, con sus palabras de título («alquiler», «alquileres», «rental», «rentals», «renta de», «rent a»). Sigue en la sección Traslados (REQ-261): no es un tipo de /tours ni cuenta como experiencia.
- Mapeo de Tangol: 9000003 (Excursiones de aventura) permite la regla por palabra `alquiler`; 9000032 y 9000033 (ALQUILERES) quedan `activo`.
- Clasificador (`src/taxonomy/lib/format.ts`, precedencia #3): donde la categoría lo permite, «alquiler» o «rental» en el título es Renta, para cualquier proveedor (REQ-10709).
- Contrato del diccionario (fila 13) y `docs/taxonomia-diccionario.csv` actualizados a «activo (/traslados; REQ-10699)».

## Antes y después (datos reales)
Consulta de solo lectura a D1 de producción el 16-11-2026 (1,216 tours de Tangol publicados; 274 en 9000003):

| Ciudad | Título | Antes | Después |
|---|---|---|---|
| Colonia (UY) | Alquiler De Bicicleta (6 h) | Actividades · Aventura, en Tours | Renta, en Traslados de la ciudad |
| Paraty (BR) | Alquiler De Bicicleta (4 h) | Actividades · Aventura, en Tours | Renta, en Traslados de la ciudad |

Ningún otro tour publicado cambia: las categorías 9000032 y 9000033 (Alquiler de scooter, buggy playero) y los alquileres de equipo de ski y snowboard que menciona el gate no están hoy en los países publicados; cuando el sync los traiga entran como Renta sin tocar código. FREETOUR 26 sigue con 0 tours activos.

Fixture de pruebas (`tests/fixtures/tangol/aventura-decision9-2026-11-15.tsv`, 350 tours): los mismos dos títulos cambian; los 77 de la decisión 9 y el resto quedan igual (`src/taxonomy/lib/renta-alquiler.test.ts`, `decision9-aplicada.test.ts`).

## Regreso
Revertir el PR (o `estado: "tras_bandera"` en `alquiler` y quitar `alquiler` de `reglasPorPalabra` de 9000003).
