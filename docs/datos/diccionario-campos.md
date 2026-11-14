# Diccionario de campos por proveedor (REQ-755, Ola R2)

Para cada campo de Travel Puzzle: de qué campo del proveedor sale y qué transformación se le aplica. La copia exacta
del proveedor vive en R2 privado (`raw/<proveedor>/<externalId>/<huella>.json`, REQ-741) y el índice en
`ProviderRecord` (migración propuesta 0022); cualquier valor de abajo se rastrea hasta ese objeto por `rawHash`.
La clasificación vive en la tabla propia `ExperienceTaxonomy` con su procedencia (migración propuesta 0023) y nunca
se escribe sobre campos del proveedor (REQ-409).

## FREETOUR (API Partners, `GET /tours?page=N`)

Transformación: `src/catalog/lib/tour-rows.ts` (`toTourRows`). Volátiles fuera de la huella: `updatedAt`, `rating`, `reviewsNumber`.

| Campo de Travel Puzzle | Campo del proveedor | Transformación |
|---|---|---|
| `Tour.externalId` | `id` | Igual |
| `Tour.providerTitle` | `providerTitle` | Igual (nombre del operador; FREETOUR C4) |
| `Tour.providerPhone` | `providerPhone` | Igual o `null` |
| `Tour.priceValue` | `price.value` | Igual (EUR, D4) |
| `Tour.priceCurrency` | `price.currency` | Igual |
| `Tour.duration` | `length` | Igual (texto `H:MM`) |
| `Tour.durationMinutes` | `length` | `durationMinutes()` (minutos enteros o `null`) |
| `Tour.titleImageURL` | `titleImageURL` | Igual o `null` |
| `Tour.categoryId` | `categoryId` | Igual (denominación original: `docs/freetour/categorias.csv`) |
| `Tour.rating` | `rating` | Igual o `null` (volátil) |
| `Tour.reviewsNumber` | `reviewsNumber` | Igual o 0 (volátil) |
| `Tour.cityId` | `cityId` | Igual |
| `Tour.countryId` | `countryId` | Igual |
| `Tour.meetingPoint` | `meetingPoint` | Igual (JSON) |
| `Tour.includes` | `includes` | Igual o `[]` |
| `Tour.POIs` | `POIs` | Igual o `null` |
| `Tour.images` | `images` | Igual o `[]` |
| `Tour.videoURL` | `videoURL` | Igual o `null` |
| `Tour.isActive` | — | `true` al verlo en una corrida exitosa (presencia, REQ-074) |
| `Tour.lastSeenAt` | — | Inicio de la corrida |
| `Tour.contentHash` | (todo lo anterior + traducciones) | sha-256 sin `rating`, `reviewsNumber`, `isActive`, `lastSeenAt` (REQ-073) |
| `TourTranslation.title` | `title.<idioma>` | Uno por idioma (en, es, pt, de, fr, it) con título y URL |
| `TourTranslation.brief` | `brief.<idioma>` | Igual o `null` |
| `TourTranslation.description` | `description.<idioma>` | Igual o `null` |
| `TourTranslation.url` | `URLs.<idioma>` | Igual |
| `ProviderRecord.providerUpdatedAt` | `updatedAt` | Igual (no entra en la huella) |
| Taxonomía: formato | `categoryId` + `price.value` + `length` + `title`/`brief` | `classify()` con `mapping/freetour.json`; procedencia en `sourceField`/`sourceValue`/`matchedTerm` |
| Taxonomía: temas | `categoryId` + `title`/`brief` | Temas de la categoría y palabras del diccionario |
| Taxonomía: atributos | `categoryId`, `title`, `guideLanguages` (eventos), `rating`/`reviewsNumber` | `classifyAtributos()` |


## tangol (API por la pasarela firmada; ola 2 de `docs/plan-tangol.md`)

Copia exacta: `src/ingest/lib/tangol-raw.ts` (REQ-3472) e índice `ProviderRecord` con `provider='tangol'` (REQ-3473).
Volátiles fuera de la huella: **ninguno**. Tangol no manda marca de tiempo del registro, y lo único que se mueve solo
(`ToursQty`, `MinRate`) es información real de inventario y precio: ocultarla taparía justo lo que hay que auditar.

**Qué se guarda (decisión marcada para el PO):** la respuesta ÍNTEGRA, incluidos el neto y la utilidad (`Utilidad`,
`NetRate*`) que el esquema del sitio descarta a propósito (REQ-1543). Vive solo en el bucket R2 PRIVADO
`travel-puzzle-raw` (`raw/tangol/…`, sin acceso público, REQ-747); en `ProviderRecord` no va ningún campo de dinero.

| Campo del índice | Campo del proveedor | Transformación |
|---|---|---|
| `ProviderRecord.externalId` (ficha del tour, `getTourList`) | `TourId` | Igual, pelado, para rastrear por `Tour.externalId` con `providerId='tangol'` (REQ-1623) |
| `ProviderRecord.externalId` (tarifas, `getTourRates`) | `TourId` | `tarifas-<TourId>` (registro distinto del mismo tour) |
| `ProviderRecord.externalId` (país, `getCountries`) | `IsoCode` | `pais-<IsoCode>` |
| `ProviderRecord.externalId` (destino, `getDestinations`) | `Id` | `destino-<Id>` |
| `ProviderRecord.experienceKind` | — | `tour` en `getTourList` y `getTourRates`; `null` en países y destinos |
| `ProviderRecord.experienceId` | — | `null`: el enlace es `Tour(providerId='tangol', externalId=TourId)` |
| `ProviderRecord.sourceRef` | — | `tangol:<operación>?<parámetros ordenados>` (p. ej. `tangol:getTourList?destinationId=12`) |
| `ProviderRecord.rawHash` | (todo el registro) | sha-256 del JSON canónico, sin quitar nada |
| `ProviderRecord.providerUpdatedAt` | — | `null` (Tangol no lo manda) |
| `ProviderRecord.originalField` / `originalCategory` | `TypeCode` | Denominación original del proveedor (REQ-753), para la reclasificación con linaje |
| `ProviderRecord.schemaOk` | (todo el registro) | 0 si no pasa el esquema del sitio; el registro se guarda igual (la copia no se filtra) |
| — (solo copia exacta) | `Utilidad`, `NetRate*`, `UrlTour`, cualquier campo extra | Nunca se publican; quedan en la copia privada |

## Big Bus por API Ventrata OCTO (`bigbus-octo`, `GET /products`)

REQ-3413 a REQ-3415. Proveedor `bigbus-octo` (distinto de `bigbus`, que es la carga por archivo de las 29 ciudades).

| Campo de Travel Puzzle | Campo OCTO | Nota |
|---|---|---|
| `ProviderRecord.externalId` | `id` del producto | Huella sin volátiles conocidos |
| Ciudad (ref de `imports/bigbus-2026.json`) | `internalName` + `reference` | Mapa curado `src/octo/data/bigbus-ciudades.json`; sin coincidencia única no se liga |
| Opción y personas | `options[].id`, `options[].units[]` (`type`, `restrictions.minAge/maxAge`) | |
| Precio al cliente | `pricingFrom[].retail` / `pricing.retail` (unidades menores, `currencyPrecision`) | El `net` solo va al archivo privado, nunca al plan ni a la ficha |
| Se vende directo | Producto presente en la API y con precio en todas sus unidades | Lo que no venga es exclusivo de su web (REQ-1607) |

## Agencias por archivo (`imports/*.json` → `Trip`)

Un solo formato para las 7 agencias: `extime`, `exoticescapes`, `bigbus`, `incaworld`, `destinocolombia`,
`fantasticachina`, `turismoasiatico`. El item del archivo ya viene **reescrito por Travel Puzzle** desde el documento
del proveedor; por eso la copia exacta guarda además el documento original (`source/<agencia>/…`, gate 4) y cada
viaje apunta a él (`sourceDocKey`, `sourcePage`). Volátiles fuera de la huella: ninguno.

| Campo de Travel Puzzle | Campo del item | Transformación |
|---|---|---|
| `Trip.id` | `agency.initials` + `ref` | `idFor()` (minúsculas, guiones) |
| `Trip.code` | `agency.initials`, `trip.countries`, `trip.kind`, `trip.durationDays`, orden | `tripCode()` (gate H) |
| `Trip.slug` | `trip.titleEs` + código | `slugify()` |
| `Trip.status` | `status` | `published` solo si pasa `publishChecklist()`; si no, `draft` |
| `Trip.priceFrom` | `trip.options[].prices` | `priceFrom()` (el menor) |
| `Trip.images` | `photos[]` | Se bajan (Pixabay o archivos del operador) y se suben a R2 `travel-puzzle-trips` |
| `Trip.kind`, `purchaseMode`, `category`, `titleEs`, `titleEn`, `summaryEs`, `summaryEn`, `descriptionEs`, `descriptionEn`, `countries`, `cities`, `durationDays`, `currency`, `priceNote`, `dates`, `meetingPoints`, `hotelPickup`, `itinerary`, `includes`, `excludes`, `visaInfo`, `highlights`, `importantInfo`, `whatToBring`, `accessibility`, `difficulty`, `flightsIncluded`, `languages`, `minPax`, `maxPax`, `options`, `extras`, `availability`, `minNoticeHours`, `cancellation`, `endPoint`, `videoUrl`, `videoCaption` | `trip.<mismo nombre>` | Validados con `tripInputSchema`; iguales |
| `ProviderRecord.externalId` | `ref` | Igual (código del operador cuando el operador lo tiene) |
| `ProviderRecord.sourceRef` | `source` | Igual |
| `ProviderRecord.sourcePage` | `original.pagina` | Igual (página del PDF original) |
| `ProviderRecord.originalCategory` / `originalField` | ver tabla siguiente | `originalOf()` (`src/ingest/lib/originals.ts`) |
| `ProviderRecord.declaredTaxonomy` | `taxonomia` | `declaredOf()`: solo formatos y temas válidos del diccionario |
| — (solo copia exacta) | `hold`, `photos[].alt`, cualquier campo extra | No se publican; quedan en la copia |
| Taxonomía: formato | denominación original (si hay) y si no `trip.kind`; `trip.durationDays`; títulos | REQ-753: primero `mapping/<agencia>.json`, si no `mapping/propios.json` |
| Taxonomía: temas | `trip.category` + títulos | `temasPorFuente` de `propios` y palabras del diccionario |
| Taxonomía: atributos | `trip.options[].mode`, `trip.languages`, `trip.flightsIncluded`, títulos | `classifyAtributos()` |

### Denominación original por agencia (de dónde sale)

| Agencia | Campo del proveedor | Denominaciones (mapeo) | Documento que lo respalda |
|---|---|---|---|
| bigbus | `source` (URL del producto) | `tour-tickets-and-passes` → transporte | bigbustours.com, URL de cada ciudad (Boston no la trae: hueco) |
| fantasticachina | `ref` (`FCH-R…`, `FCH-L…`) | `TOUR REGULAR`, `TOUR GRAN LUJO` → circuito | PDF «TOUR REGULAR 2027-2028» y «TOUR GRAN LUJO 2027-2028» |
| destinocolombia | `ref` (`PC-…`) | `PC` → circuito | PDF «PC 0xx – … – Salidas Diarias» |
| incaworld | `ref` (`PROG-…` / `LIM-`, `CUS-`, …) | `PROGRAMA` → circuito, `SERVICIO` → tour | TARIFARIO B2B 2026-2027 (columnas «PROGRAMA» y «SERVICIO») |
| exoticescapes | `original.categoria` (por capturar) | `Extensión` → circuito | PDF «Extensión Mumbai/Amritsar 2027»; los demás no traen categoría |
| turismoasiatico | `original.categoria` (por capturar) | `SIC`, `Hoteles & Tours` | PDF «SIC_…» y «… Hoteles & Tours» |
| extime | `original.categoria` (por capturar) | ninguna todavía | No hay documento original disponible |

Los mapeos por agencia son una **propuesta pendiente de firma del PO** (`revisado` en cada JSON).
