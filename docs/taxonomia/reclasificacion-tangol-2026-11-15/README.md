# Reclasificación de Tangol (decisión 13): dudas del mapeo para la firma del PO (15 nov 2026)

**Folios:** REQ-10688 (código: lista de dudas y gates, `src/taxonomy/lib/dudas-mapeo.ts`, `src/scripts/dudas-mapeo-tangol.ts`) y REQ-10689 (gate: firma de esta lista). **Decisión firmada:** 13 (REQ-10592, 14 nov): «El PO aprueba la reclasificación de Tangol, de las 7 agencias y también la de FREETOUR… Antes de aplicar cada una se le muestra la lista de cambios y de dudas». **Frente:** #549, ficha única, ola 3.
**Regla del plan:** nada cambia en producción con este documento. Cada gate firmado «B» (o un «A» que cambie algo, G-R6) entra al mapeo en su propio PR, con la lista «antes y después» en `tmp/`, humo a 390/1366 y el índice del buscador reconstruido.

## Qué hay hoy

El mapeo de Tangol (`src/taxonomy/data/mapping/tangol.json`, REQ-3502, PR #459) está en producción con 34 categorías, una por par `TypeCode|SubTypeCode` real de Tangol. 15 de esas categorías llevan en su nota una decisión marcada «PENDIENTE PO» que nunca se firmó. Esta lista las junta en 9 gates A/B. La ya resuelta (decisión 9, aventura y senderismo, REQ-10661/REQ-10662) no se repite aquí.

Los conteos salen de la tabla real de tipos (`tests/fixtures/tangol-tipos-2026-11-12.json`, corrida de solo lectura REQ-3487: 2,059 tours leídos, 184 destinos). Producción hoy tiene 1,215 tours de Tangol (los que pasan el filtro de carga), así que las cifras son el techo, no el conteo exacto en el sitio.

## Cómo se arma (REQ-10688)

1. Se toma cada categoría del mapeo cuya nota lleva «PENDIENTE PO» y se recorta el texto desde la marca.
2. Se le suman los tours de sus pares de Tangol en la tabla real (`CODIGOS_TANGOL`, `src/tangol/lib/taxonomia.ts`).
3. Cada duda cae en un gate; la prueba (`npx vitest run src/taxonomy/lib/dudas-mapeo.test.ts`) falla si una duda queda sin gate o un gate apunta a una categoría sin duda.
4. Regenerar: `npx tsx src/scripts/dudas-mapeo-tangol.ts` (solo lectura).

**«A» es siempre lo que hay hoy en producción o el cambio más chico.** Con «A» en los nueve gates, lo único que cambia es G-R6: 20 tours de «Traslado en bus entre ciudades» pasan de Traslado a Transporte (misma sección Traslados, carrito `transport` como los boletos de bus).

## Firma del PO

- [ ] **PO:** pendiente (REQ-10689). Pregunta: «¿Firmas los nueve gates de las dudas de Tangol con la recomendación (A en todos)?» Si cambia alguno, se anota aquí gate por gate.

Categorías del mapeo: 34 · con duda: 15 · gates: 9 · tours que tocan las dudas: 735 de 2059 leídos (corrida de solo lectura REQ-3487, 12 nov 2026)

## Gates para el PO (REQ-10689)

| Gate | Pregunta | Categorías (tours) | A (hoy o cambio mínimo) | B | Recomendada | Por qué |
|---|---|---|---|---|---|---|
| G-R1 | Red de seguridad 9000001 (un par TypeCode\|SubTypeCode nuevo que Tangol empiece a mandar) | 9000001 Tangol, código sin mapear (0) | Falla abierta, como hoy: el tour se publica como Tour (visita guiada por omisión) y la prueba de cobertura avisa del par nuevo | Falla cerrada, como FREETOUR con una categoría desconocida: el tour queda «por-revisar» (oculto) hasta mapear el par | **A** | Los 38 pares reales ya tienen categoría propia; un par nuevo sería raro y la prueba de cobertura (REQ-3467) lo detecta. Ocultar vende menos sin ganar exactitud. |
| G-R2 | Alquiler de equipo de ski y snowboard dentro de «Excursiones de aventura» (9000003) | 9000003 Excursiones de aventura (406) | Se quedan como Momentos de autor · Aventura hasta que el formato «alquiler» salga de `tras_bandera` en el diccionario | Pasan ya al formato «alquiler»: como está `tras_bandera`, quedarían ocultos del sitio | **A** | Son pocos (los dos títulos de ejemplo de la corrida) y B los esconde. Cuando el diccionario encienda «alquiler», se mueven con regla por palabra («alquiler», «rental») en su propio PR. |
| G-R3 | «Día de estancia» (9000007): el diccionario no tiene tema «rural / campo / estancia» | 9000007 Día de estancia (13) | Se queda con tema Naturaleza (el más cercano), como hoy | Se agrega al diccionario el tema «Campo y vida rural» (es/en) y se usa aquí; cambia el contrato del diccionario y los filtros | **A** | 13 tours no justifican un tema nuevo en el filtro; el diccionario se amplía cuando haya volumen de varios proveedores. |
| G-R4 | «Excursiones en barco y costa» (9000008): «shore excursion» (para pasajeros de crucero) no tiene término | 9000008 Excursiones en barco y costa (7) | Se queda como Tour · Playa y mar · medio barco, como hoy | Se agrega el atributo «Para pasajeros de crucero» al diccionario y se pone aquí | **A** | Son 7 tours y el dato «pasajero de crucero» no lo confirma la API; el atributo saldría sin respaldo. |
| G-R5 | «Excursiones en tren» (9000009): el atributo «medio» no tiene «tren» | 9000009 Excursiones en tren (6) | Se queda con medio «vehículo», el más cercano, como hoy | Se agrega el medio «tren» al diccionario (es/en), al filtro y a las tarjetas | **A** | 6 tours; el medio «tren» es un cambio del diccionario que conviene hacer con FREETOUR (Tren a las Nubes también está ahí) en su propio PR. |
| G-R6 | Trayectos largos en bus entre ciudades: «Traslados varios» (9000014) y «Traslado en bus entre ciudades» (9000015) | 9000014 Traslados varios (21); 9000015 Traslado en bus entre ciudades (20) | 9000015 (TRF IN: Ruta 40 en bus, Potosí–Uyuni) pasa a Transporte (carrito `transport`, como los boletos de bus 9000027); 9000014 (TRF, mezcla aeropuerto–hotel y rutas largas) se queda como Traslado | Las dos se quedan como Traslado (carrito `transfer`), como hoy | **A** | Los 20 de TRF IN son trayectos entre ciudades, no un traslado aeropuerto–hotel; igualarlos a los boletos de bus deja el carrito y la sección coherentes. Ambas siguen en la sección Traslados. |
| G-R7 | Paquetes de varios días de Tangol (9000018 a 9000025): ¿siguen como `Tour` con formato Circuito o se mueven a la tabla `Trip` (viajes de agencia)? | 9000018 Paquetes clásicos (150); 9000019 Paquetes todo incluido (48); 9000020 Escapadas (46); 9000021 Viajes de aventura (8); 9000022 Viajes en auto (self-drive) (6); 9000023 Viajes a festivales (2); 9000024 Viajes fly & drive (1); 9000025 Viajes con glamping (1) | Siguen como `Tour` con formato Circuito, como hoy; la ficha única (ola 6, adaptador de Tangol) los presenta igual que un viaje de agencia sin mover filas | Se migran a `Trip` (migración de D1 + cambio del sync + nueva vuelta de Tangol); mientras, quedan como hoy | **A** | La decisión 1 de la ficha única ya dice que la sección la decide el tipo de producto, no la tabla; mover 262 filas cuesta una migración y una vuelta del sync y no cambia lo que ve el cliente. |
| G-R8 | «Escapadas» (9000020) y «Viajes en auto / self-drive» (9000022): el diccionario no tiene esos términos | 9000020 Escapadas (46); 9000022 Viajes en auto (self-drive) (6) | Se quedan como Circuito, el más cercano, como hoy | Se agregan al diccionario los formatos «Escapada» y «Viaje en auto por tu cuenta» y se usan aquí | **A** | 46 y 6 tours; un formato nuevo entra al filtro y al carrito y conviene decidirlo con los adicionales de la ola 12, no aquí. |
| G-R9 | «Viajes fly & drive» (9000024): el atributo «vuelo incluido» no se puede poner desde el mapeo (el esquema solo deja nocturno y medio) | 9000024 Viajes fly & drive (1) | Se queda sin el atributo; el vuelo se describe en la ficha con el texto del proveedor | Se amplía el esquema del mapeo para aceptar «vuelo-incluido» y se marca aquí | **A** | Es 1 tour; ampliar el esquema por un caso no se justifica. Si llegan más, entra como dato real del producto (decisión 11: por dato, no por mapeo). |

## Dudas tal como quedaron en el mapeo (REQ-3502, PR #459)

| Categoría | Nombre | Hoy (formato · temas · atributos) | Pares de Tangol | Tours | Duda |
|---|---|---|---|---|---|
| 9000001 | Tangol, código sin mapear | tour · — · — | — (red de seguridad) | 0 | dejarla así (falla abierta: el tour se publica con un tipo aproximado) o volverla «por-revisar» como FREETOUR con una categoría desconocida (falla cerrada: el tour se esconde hasta mapearlo). El tour con SubTypeCode «[METHOD ERROR 504]» es basura del servidor de Tangol que se descarta en la carga; no tiene categoría propia. |
| 9000003 | Excursiones de aventura | experiencia-unica · aventura · — | EXCURSION|AVENTURA | 406 | el alquiler de equipo de ski y snowboard queda como aventura y no como `alquiler` (tras bandera en el diccionario). REQ-10662 (decisión 9, REQ-10588; lista firmada REQ-10661, 15-11-2026): la caminata con guía y el lugar de montaña sin otra actividad pasan a excursion-dia con aventura y montana-senderismo; el resto se queda. |
| 9000007 | Día de estancia | excursion-dia · naturaleza · — | EXCURSION|ESTANCIAS | 13 | el diccionario no tiene tema «rural / campo / estancia»; se usa naturaleza, el más cercano. |
| 9000008 | Excursiones en barco y costa | tour · playa-mar · medio:barco | EXCURSION|SHOREEXCURSIONS | 7 | «shore excursion» (excursión para pasajeros de crucero) no tiene término en el diccionario. |
| 9000009 | Excursiones en tren | tour · — · medio:vehiculo | EXCURSION|EN TREN | 6 | el atributo medio no tiene «tren»; se usa vehículo, el más cercano. |
| 9000014 | Traslados varios | traslado · — · — | TRASLADO|TRF | 21 | las rutas largas en bus entre ciudades podrían ser Transporte (`transport`); las dos van a la sección traslados. |
| 9000015 | Traslado en bus entre ciudades | traslado · — · — | TRASLADO|TRF IN | 20 | son trayectos en bus entre ciudades: Traslado o Transporte (`transport`). |
| 9000018 | Paquetes clásicos | circuito · — · — | VIAJES|CLASICOS | 150 | Tour o viaje (`Trip`): decisión del PO en el PR #459. |
| 9000019 | Paquetes todo incluido | circuito · — · — | VIAJES|ALLINCLUSIVE | 48 | Tour o viaje (`Trip`): decisión del PO en el PR #459. |
| 9000020 | Escapadas | circuito · — · — | VIAJES|ESCAPADAS | 46 | el diccionario no tiene «escapada / estancia en hotel»; Circuito es el más cercano. Tour o viaje (`Trip`): decisión del PO en el PR #459. |
| 9000021 | Viajes de aventura | circuito · aventura · — | VIAJES|AVENTURA | 8 | Tour o viaje (`Trip`): decisión del PO en el PR #459. |
| 9000022 | Viajes en auto (self-drive) | circuito · — · — | VIAJES|SELF-DRIVE | 6 | no hay término «self-drive / en auto por tu cuenta»; Circuito es el más cercano. Tour o viaje (`Trip`): decisión del PO en el PR #459. |
| 9000023 | Viajes a festivales | circuito · noche-espectaculos · — | VIAJES|FESTIVALES | 2 | Tour o viaje (`Trip`): decisión del PO en el PR #459. |
| 9000024 | Viajes fly & drive | circuito · — · — | VIAJES|FLYDRIVE | 1 | el atributo «vuelo-incluido» no se puede poner desde un mapeo (el esquema solo deja nocturno y medio). Tour o viaje (`Trip`): decisión del PO en el PR #459. |
| 9000025 | Viajes con glamping | circuito · naturaleza, montana-senderismo · — | VIAJES|GLAMPING | 1 | Tour o viaje (`Trip`): decisión del PO en el PR #459. |
