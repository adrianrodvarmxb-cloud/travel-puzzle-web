# Gates — taxonomía de los tours de Tangol (12 nov 2026)

Petición del PO (12 nov 2026, 07:22), literal: «se le debe dar el mismo tratamiento que se le da la base de freetour para convertir a nuestra taxonomía».

Folios: REQ-3465 (mapeo), REQ-3466 (pruebas), REQ-3467 (red de seguridad). Frente #454. Rama `feat/tangol-taxonomia`.

## 1. NO CUMPLIDO: no se puede igualar a FREETOUR categoría por categoría

FREETOUR tiene 29 categorías vivas (`src/taxonomy/data/mapping/freetour.json`), cada una con su formato base, sus temas, sus atributos y sus reglas por palabra, porque el PO homologó la lista real del proveedor en `docs/freetour/categorias.csv` (firmada 6-11-2026).

**De Tangol no existe esa lista en el repo.** Lo único que hay:

| Dónde | Qué dice | Qué falta |
|---|---|---|
| `src/tangol/lib/schemas.ts` (`infoTourSchema`) | Cada tour de `GetTourListByDestination` trae `TypeCode` (texto), `SubTypeCode` (texto) y `TourType` (número) | Ni un valor de esos tres campos, ni su significado, ni cuántos hay |
| `docs/tangol-inventario-2026-11-11.md` | 2,237 tours en 10 países y 184 ciudades, con el conteo por país y por ciudad | No trae nombres de tours ni categorías: no se puede ni deducir la lista de los títulos |
| `docs/plan-tangol.md` | Las 5 lecturas permitidas: `Autenticacion`, `GetTourCountries`, `GetTourDestinations`, `GetTourListByDestination`, `GetTourRates` | No hay método de catálogo de tipos (`GetTourTypes` o equivalente) documentado |

Por eso el mapeo entregado tiene **una sola categoría comodín** con el trato que FREETOUR le da a sus categorías «ciegas» (13 «Otros» y 14 «Top selección»), y no 29 categorías inventadas. Lo que falta para igualar a FREETOUR es dato del proveedor, no código.

### Las dos formas de conseguir la lista (ninguna se hizo en este PR: llamar a Tangol es candado del PO)

1. **Preguntar a Tangol** (Hernán Garriga). Preguntas exactas:
   - La tabla completa de `TypeCode` con su descripción (¿cuántos hay y qué significa cada uno?).
   - La tabla de `SubTypeCode` y de qué `TypeCode` depende cada uno.
   - Qué significa `TourType` (número) y en qué se diferencia de `TypeCode`.
   - Si hay un método de la API que devuelva ese catálogo (para no tener que deducirlo por muestreo).
   - Si algún tipo es traslado, transporte, boleto de entrada, alquiler o circuito de varios días, para no tener que adivinarlo por el título.
   - Pendiente de REQ-1546, que sigue abierto: significado de los códigos de idioma (0–4) y de moneda (0–3).
2. **Deducirla con una corrida de solo lectura** por la pasarela (IP registrada), al estilo de `gateway/scripts/inventario-tangol.js` (REQ-1558): contar los valores distintos de `TypeCode`/`SubTypeCode`/`TourType` y 3 títulos de ejemplo de cada uno. No agrega datos nuevos ni escribe nada. **Necesita OK del PO** porque llama al proveedor.

## 2. Gate A — qué mapeo se publica mientras no haya lista

- **A (lo entregado).** Una categoría comodín (id `9000001`), formato base `tour`, reglas por palabra de traslado, entradas y clase o taller, y `porDefecto` visita guiada: ningún tour de Tangol cae en «por-revisar» y el tipo lo deciden la duración y las palabras del título. Igual que FREETOUR 13 y 14.
- **B.** Dejar a Tangol sin mapeo hasta tener la lista (como `extime.json`): los 2,237 tours quedarían en «por-revisar», fuera de los filtros, del carrito por tipo y del inicio.
- **C.** Inventar 20 o 30 categorías probables y mapearlas: queda bonito y es falso; el sync no podría usarlas porque no se sabe con qué código vienen.

Recomendación: **A**, y cambiar a la lista real en cuanto Tangol conteste (el REQ viejo quedaría REEMPLAZADO y el nuevo cita este).

## 3. Decisiones del mapeo que sí están sostenidas

| Campo | Valor | Por qué |
|---|---|---|
| `precioCeroEsPiezaLibre` | `false` | Tangol es mayorista B2B con tarifas rack y comisión del 20 % (`docs/plan-tangol.md`); un precio 0 es dato raro, no un free tour a propina |
| `permiteConfirmacionInmediata` | `false` | Cada opción trae `HoursBooking` (horas de antelación) en `src/tangol/lib/schemas.ts`: la reserva no se confirma al instante, así que el atributo «confirmación inmediata» no se puede prometer |
| id de categoría entero desde `9000001` | rango reservado | `Tour.categoryId` es `Int` y FREETOUR ya ocupa 1–35; es la misma convención que el PO aceptó para `City.id` en REQ-1624 (rango por proveedor desde 9,000,000) |
| Temas | vacíos en la categoría | Sin lista de categorías, los temas salen de las palabras del título y del resumen (`classifyTemas`), que es la otra fuente que ya usa FREETOUR |

## 4. Tabla lista para llenar cuando Tangol conteste

Un renglón por `TypeCode` confirmado; el id sale del rango reservado y se agrega también a `CODIGOS_TANGOL` en `src/tangol/lib/taxonomia.ts`.

| id | `TypeCode` de Tangol | nombre del proveedor | formato | temas | atributos | reglas por palabra | notas |
|---|---|---|---|---|---|---|---|
| 9000001 | — | Tangol sin tipo confirmado | `tour` | — | — | traslado, entradas, experiencia-unica | comodín; `porDefecto` visita-guiada |
| 9000002 | (pendiente) | | | | | | |

## 5. Lo que este frente NO toca

- No se llamó a Tangol ni a la pasarela.
- No se tocó `wrangler.jsonc`: `TANGOL_ENABLED` sigue apagada y el filtro de REQ-3311 sigue escondiendo al proveedor.
- No se tocó `dictionary.json` (afecta a todos los proveedores y al buscador con `SEARCH_TAXONOMY_SYNONYMS_ENABLED` encendida).
- El sync de la ola 2 todavía no usa este mapeo: `catalogClassifier` (`src/taxonomy/lib/publish.ts`) clasifica TODA fila del catálogo como `proveedor: "freetour"` con su `categoryId`. Mientras eso no cambie, un tour de Tangol se clasificaría con las categorías de FREETOUR o caería en «por-revisar». Es trabajo del frente del sync y necesita folio propio del PO.
