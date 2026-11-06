# Plan de taxonomía del catálogo (decisión del PO, 6 nov 2026)

Continúa el plan del 5-11 (`docs/plan-primera-pieza.md`), que **sigue vigente y manda** sobre este. Aquí solo se agrega la taxonomía: un diccionario único de dos ejes (Formato y Tema), un eje de Atributos y las facetas de circuitos, para FREETOUR, los viajes propios y los proveedores futuros, sin código por país ni por proveedor, sin escribir sobre los datos sincronizados y cumpliendo los términos de FREETOUR.

Estado: **PLAN, sin código** (fase «Antes de código» del pedido). Cada ola es un PR con tests primero, suite, build, humo a 390/1366 px con la bandera ENCENDIDA en preview y OK visual del PO. Las migraciones son candado.

## 0. Gate de inicio: menú y jerarquía — FIRMADO

| Lectura | Qué dice | Fuente |
|---|---|---|
| **A** | «Experiencias» es el concepto base (paraguas del eje Formato) y **reemplaza a «Tours» en el menú**; dentro van Tours, Circuitos, Caminatas… | PO, 6-11 05:57 |
| B | El menú REQ-093 se queda con «Tours» y la taxonomía vive solo como filtros | Insumos homologados (06:09) y punto 4 del pedido |

**Decisión del PO (6-11, ~06:12): A.** Menú: Inicio · La Primera Pieza · Destinos · Experiencias · Traslados · Cómo Funciona (6 ítems). Circuitos no es pestaña. `/tours` se mantiene como listado y no se crean rutas nuevas, así que el punto 4 del pedido se cumple en rutas y pestañas; solo cambia la etiqueta. REQ-093 queda **REEMPLAZADO por REQ-185**; la etiqueta ya está escrita en la rama de REQ-174 (en espera, sobre #141). Las partes de los homologados que dicen «Tours en el menú» quedan anotadas como superadas en cada documento. `/experiencias` y el nombre del formato `experiencia-unica` («Momentos de autor», firmado a las 06:22): §7.1 y §7.3.

Documentos de este frente (versiones **homologadas** del PO, 6-11 06:09, copiadas tal cual; cada `.md` lleva al inicio una «Nota del repo» con lo que cambió después):
- `docs/taxonomia.md`: análisis, precedencia de formatos (§4.1), ejes C y D, ensayo y gates. Se omitieron los ids del Drive y la mención a archivos personales porque el repo es público.
- `docs/taxonomia-diccionario.csv`: diccionario (145 filas: formatos, temas, atributos C, facetas D, entorno E, geografía F, mapeo FREETOUR, identidad y baselines).
- `docs/freetour/categorias.csv`: los 29 ids con `Formato_TP`, `Formato_secundario`, `Temas_TP`, `Precio0_es_La_Primera_Pieza`, `CartItem_tipo` y `Estado`, más los históricos 1, 2, 6 y 9.
- `docs/taxonomia-referentes.md`: reporte «Taxonomía de referentes de viajes», con la tabla de alineación completada (menú firmado, transporte activo, Favorito).
- `docs/taxonomia/comparacion.md`, `docs/taxonomia/complementos-y-proveedores-api.md`, `docs/taxonomia/Taxonomia.docx` y `docs/taxonomia/Pagina_Web_Travel_Puzzle.docx`: auditoría contra el documento de 2024, investigación de complementos y las dos versiones homologadas en Word.
- REQ-185…REQ-218 y REQ-230 en `docs/requisitos.md`.

**Diferencias entre los homologados y el pedido literal** (el pedido manda salvo contra el plan del 5-11; quedan como confirmación en G-T10 y G-T11):
- Ids 1, 2, 6, 9 o nuevos → `por-revisar`: el pedido dice «no se publican»; `categorias.csv` dice «oculto de filtros y Destinos; visible en /tours». REQ-193 sigue al pedido.
- Autoguiado → `CartItem.tipo`: el pedido dice `tour`; los homologados, `tickets`. REQ-213 sigue al pedido.
- Términos de 2024: el diccionario homologado trae 25 de los 26 de Taxonomia.docx (falta «Escalada en roca») más 3 de Categorias.xlsx 2023 (Idiomático, De temporada, Estético). El diccionario del repo (T1) agrega «Escalada en roca» como sinónimo de `aventura`.
- Atributo «accesible»: está en el pedido (tras bandera) y no en el eje C del CSV; T1 lo agrega.

---

## 1. Auditoría de lo que existe (solo lectura, `origin/main` en f3657cc)

### 1.1 Filtros y tipos

| Pieza | Hoy | Archivo:línea |
|---|---|---|
| `?tipo=` (gate L) | Chips de /tours: `all · free · tour · circuito · unica` (transporte ya no: REQ-172 lo manda con 301 a /traslados). `free` = precio 0; los demás filtran **solo viajes propios** por `kind`. | `src/trips/lib/public.ts:20,28-31,49-53`; `src/components/tours/ToursPageClient.tsx:96-107`; `src/middleware.ts:10` |
| `?tipo_act=` (REQ-051) | 10 grupos «como Civitatis» a partir de los 29 ids escritos a mano. Mezcla formato y tema: «Visitas guiadas y **free tours**» junta free, caminatas de pago, audioguías (17) y running; «Excursiones de un día y naturaleza» mete la 25 (66 % < 6 h); «Otros» junta online (8), servicios (31), 13 y 14. Un viaje propio cae por su categoría: un `personalizado` cultural sale como «free tours». | `src/tours/lib/extra-filters.ts:16-32,73-78` |
| `?duracion=` | `short ≤ 2 h · mid 2–4 h · long > 4 h` sobre `durationMinutes`. Además, REQ-056 tiene un deslizador `?durmin=&durmax=`. | `src/tours/lib/duration.ts:14-27`; `extra-filters.ts:42-43` |
| Otros filtros REQ-052…055 | `cancelacion`, `privado` (solo propios), `recogida` (solo propios), `novedad`. | `extra-filters.ts:48-49` |
| `kind` de viajes propios | `tour · circuito · unica · personalizado · transporte`; `category`: `cultural, aventura, ecoturismo, gastronomico, sol-y-playa, urbano, bienestar`; `difficulty`: `facil · moderada · exigente`; `options.mode`: `group · private`; `flightsIncluded`; `accessibility` (texto). | `src/trips/lib/trip.ts:5,17`; `src/trips/schemas/trip.ts:12,17,26,69-70`; `prisma/schema.prisma` (Trip) |
| Duración en días 1–5 / 6–14 / 15+ | **No existe en el código.** Es la Taxonomía 3 de Taxonomia.docx. | — |
| Continentes | 6 continentes por ISO-2 (México dentro de `america-norte`). Hoy solo los usa el home. | `src/home/lib/continents.ts` |
| API pública | `/api/tours?categoryId=` expone el id del proveedor. | `src/app/api/tours/route.ts:20` |

### 1.2 Regla actual de La Primera Pieza

- **En el código no hay ninguna excepción por categoría:** `isFreeTour = Number(t.price) === 0` (`src/destinations/lib/catalog.ts:103`). Eso decide la sección «Free tours» de la ciudad y el hub `/la-primera-pieza`.
- **En el diccionario del insumo anterior** la regla decía «precio 0 salvo 8, 17, 20, 24, 28, 29, 30, 35»: **confirmado que faltaban la 26 y la 31**. Los homologados ya las agregan; el código de main todavía no tiene ninguna excepción.
- **Impacto hoy** (respaldo del 5-11, 8,018 activos): 3,471 tours con precio 0; 7 de ellos están en categorías de la excepción (3 online de la 8 y 4 museos de la 24), y ninguno en la 26 ni la 31 (0 tours). Con la regla corregida, Pieza libre = 3,464.
- La insignia «Tú decides cuánto vale» sale por evento con `fullPricePerGroup = 0` (`src/tours/lib/badge.ts`, REQ-095) y **no cambia**.

### 1.3 Lo publicado hoy (6 nov 2026) y lo que está en curso

| PR | Qué | REQ | Cómo lo toma este plan |
|---|---|---|---|
| #130 | Garantías solo con lo que el viaje tiene; sin transporte en el carrusel del home | 153, 154, 156, 157 | «Guía en español» solo con dato = misma regla que el atributo `idioma-es` (REQ-202) |
| #127 + #136 | `TRANSPORT_ENABLED=true`; el transporte sale de /tours y tiene su sección en /traslados | 158, 172 | El formato `transporte` es **activo, pero en /traslados**; nunca en chips ni conteos de /tours |
| #133, #134, #139 | Precio de pago en EUR con MXN aproximado; reseñas que nombran la plataforma ocultas | 170, 171 | Facetas de precio en EUR + MXN aprox.; «calificación» solo con reseñas reales; ningún sinónimo de búsqueda con la marca |
| #141 (abierto) | Copy genérico «experiencias» | 173 | Ya aplica el paraguas en el copy |
| rama de #141 (en espera) | Menú, footer, H1 y title de /tours = «Experiencias» | 174 | **Es la implementación de la etiqueta del menú** que firmó el PO a las 05:57 (REQ-185) |
| #122, #138 (abiertos) | Destino dentro del texto y palabra exacta en SEARCH_V2; encenderlo | 122, 048 | REQ-216 extiende `splitDestination` a continente y término; no se duplica |
| #128, #135, #137 (abiertos) | Encender La Primera Pieza y Arma tu viaje; datos de la reserva | 088…110, 180…184 | La taxonomía va **después** y sobre esas banderas |

### 1.4 Avance del plan del 5-11

| Ola | Estado en main |
|---|---|
| 0 Plan | Hecho |
| 1 Blindaje del sync | Código y 0014 en main; `SYNC_GUARD_ENABLED=true`. Pendientes: REQ-075, 076, y el canal de alerta de REQ-077/078 |
| 2 Comunicación Modo 2 | Código listo, banderas apagadas; faltan la prueba de release (REQ-080) y el copy legal |
| 3 Identidad y slugs | 0015 y 0016 en main; slugs asignados por el sync blindado |
| 4–6 Destinos, ficha y SEO | Código listo tras `PRIMERA_PIEZA_ENABLED=false`; encender = PR #128 |
| 7 Arma tu viaje | Código listo tras `ARMA_TU_VIAJE_ENABLED=false`; PR #135 y #137 |
| 8 Métricas | EN CURSO (REQ-111) |

### 1.5 Qué se reutiliza y qué se reemplaza

| Pieza existente | Decisión | Por qué |
|---|---|---|
| `CATEGORY_GROUPS`, `categoryGroupOf`, `ownTripGroup` (REQ-051) | **Se reemplaza** por `?formato=` + `?tema=` (REQ-198). El código **se conserva oculto** (no borrar) y `?tipo_act=` se traduce al filtro nuevo | Mezcla formato y tema y promete «free tours» en productos de pago |
| `?tipo=` (gate L) | **Se reemplaza** por `?formato=`; `free → pieza-libre`, `tour → tour`, `circuito → circuito`, `unica → experiencia-unica` | Hoy solo filtra propios por `kind`; el formato cubre a todos los proveedores |
| `?duracion=` y `?durmin/durmax` (REQ-056) | **Se reutiliza** tal cual; la pantalla de filtros estilo Civitatis también | Ya sale de `durationMinutes` |
| Filtro `privado` (REQ-053, solo propios) | **Se reemplaza** por el atributo `privado` (REQ-202), que además lee el título del proveedor | Tiene dato para FREETOUR |
| `cancelacion`, `recogida`, `novedad` (REQ-052, 054, 055) | Se reutilizan sin cambio | No chocan con la taxonomía |
| `isFreeTour = price === 0` | **Se reemplaza** por `isPiezaLibre()` con las 10 excepciones (REQ-191) | Corrige 26 y 31 y saca online y museos |
| Regla de indexación (REQ-089) | **Se reemplaza** por REQ-192 (misma regla, sin contar `fuera` ni `por-revisar`) | Hoy los online cuentan para indexar una ciudad |
| Carrusel «primera tarjeta» (REQ-108) | **Se reemplaza** por REQ-214 (`tp_formato` ∈ {caminata, tour, excursion-dia, experiencia-unica}) | El adaptador FREETOUR solo declara `free_tour` y `tour`: las 1,222 excursiones nunca llegan como `day_trip` |
| Menú REQ-093 | **Reemplazado** por REQ-174 (etiqueta) y REQ-185 | Firma del PO de las 05:57 |
| `KIND_LABEL`, `TRIP_KINDS`, `CATEGORIES` del gestor | Se reutilizan como **entrada** del clasificador; no se renombran | Son datos editoriales de Travel Puzzle |
| `Trip.difficulty` (3 valores) | Se reutiliza como fuente; la escala 1–5 va en columna nueva (REQ-210) | No se borra ni se cambia la columna |
| `continents.ts` | Se reutiliza para agrupar /destinos (REQ-211) | Ya tiene los 6 continentes por ISO-2 |
| `favorite.ts` (REQ-098: ≥4.7 y ≥50) | Se reutiliza para el atributo «Favorito» | Criterio ya firmado |
| `splitDestination` (PR #122) | Se extiende a continente y término (REQ-216) | No duplicar el buscador |
| `CartItem`, `ProviderAdapter`, `carousel.ts` (REQ-104…110) | Se reutilizan; solo se agrega el mapeo formato → tipo (REQ-213) | El modelo ya tiene `day_trip`, `tickets`, `transport`, `car_rental` |
| `content-hash.ts` (REQ-073) | Sin cambio: la clasificación vive fuera del hash | REQ-194 |
| Flujo de traducción pt/de/fr/it | Se reutiliza | REQ-201 |

---

## 2. Cumplimiento FREETOUR (skill `cumplimiento-freetour`)

**Paso 1, releer las fuentes: NO VERIFICADO HOY.** En esta sesión `admin.freetour.com` y `freetour.com` no están en la lista de sitios permitidos (la petición se rechazó). Se usa la instantánea de la skill (5-11) más la relectura del 5-11 desde el Chrome del PO (términos de afiliados y generales, sin cambios; ver `plan-primera-pieza.md` §5). La copia local de la especificación v2.2 (4-11) sí se revisó: `/categories` existe y cada evento trae `date` y `utcDate` **con hora** («2022-07-04 10:00:00»). Antes del primer PR de código que muestre etiquetas, hay que releer las fuentes 3 a 9 desde un navegador.

Veredictos: **P** permitido · **X** prohibido · **A** ambiguo, pedir por escrito · **O** obligatorio que falta.

| # | Elemento | Regla | Veredicto | Ajuste |
|---|---|---|---|---|
| 1 | Clasificar y reagrupar el catálogo de FREETOUR por formato y tema | I, C1 | **P** | Nada en los términos lo restringe |
| 2 | Clasificación en tabla propia, recalculada en cada sync, sin tocar los campos del proveedor | C1 (reflejar sus cambios) | **O** | REQ-194: se recalcula en cada sync exitoso |
| 3 | Etiquetas de formato y tema en tarjetas y ficha | C5 | **P** solo fuera de la foto | REQ-200; test visual y de DOM |
| 4 | H1 = título real; el formato nunca reemplaza el título | C4, A2 | **O** (ya cumple REQ-094) | REQ-200 y REQ-218 lo vuelven a probar |
| 5 | Definiciones del diccionario como texto propio de Travel Puzzle | C2 | **P** | No se copian descripciones de FREETOUR al diccionario |
| 6 | «Con un guía local» en autoguiado (17) y online (8) | C6 y «el copy solo promete lo que hay» | **O** (hoy falla) | REQ-201: el copy depende del formato |
| 7 | Definición de Pieza libre («reservar es gratis; al final das lo justo») | D1, D2, D3 | **P** | Solo con la regla corregida (REQ-191); la insignia sigue por evento (REQ-095) |
| 8 | Atributo «En español» | A2, copy | **P** solo con dato del evento | Nunca como garantía (REQ-202) |
| 9 | Calificación y «Favorito» | C7 | **P** con reseñas reales | Reseñas del tour, nunca de Travel Puzzle; filtro de REQ-171 vigente |
| 10 | Atributo «Cancelación gratuita» | D3 | **P** con el texto exacto | Free: siempre; pago: hasta 24 h antes. Queda tras bandera por pedido del PO |
| 11 | Atributo «Confirmación inmediata» | D1 (el proveedor puede rechazar por aforo), A3 | **X** para FREETOUR | Tras bandera; nunca en un producto de FREETOUR |
| 12 | «Sin filas», «Grupo pequeño», «Accesible», «Familias» sin dato | C6, §19 (información tal cual) | **X** sin dato | Tras bandera; «accesible» nunca se infiere |
| 13 | Faceta de precio | D4 | **O** | Rangos en EUR con MXN aproximado |
| 14 | Cualquier texto de taxonomía con MSI, «paga después», «opciones de pago» | D5, D6; `CART_PAYMENTS_ENABLED=false` | **X** | REQ-218, test de contenido |
| 15 | `fuera` (online y servicios) fuera de Destinos, sitemaps e indexación | C1 | **P** | REQ-192 |
| 16 | `por-revisar` no se publica | C1, E9 | **P** | REQ-193 |
| 17 | Sinónimos «free walking tour», «tour gratis» → Pieza libre en el buscador | B1 (promover free tours requiere aprobación; pregunta 7) | **A** | La misma ambigüedad que la colección (plan 5-11, #32). Sin cambio de exposición |
| 18 | Usar «freetour» o «freetour.com» como sinónimo | C3; regla del PO; REQ-171 | **X** | Ningún sinónimo lleva la marca |
| 19 | Nombres de las 29 categorías en `docs/freetour/categorias.csv` (repo público) | C2, §17–18 | **P** como dato técnico | Nunca se muestran al cliente: se muestra el término TP |
| 20 | Páginas o chips por tema indexables | C2 | **A** | Canonical a /tours y `noindex` en combinaciones (REQ-198); sin landings por formato |
| 21 | Excursiones y entradas de FREETOUR en el carrusel como `day_trip` y `tickets` | D6, I | **P** | Cobro separado por adaptador (REQ-107) |
| 22 | Patrón de title «– Excursión desde {Ciudad}» (opcional) | C4 | **P** | El título real va primero; cambia REQ-099 (gate opcional G-T9) |
| 23 | Franja horaria | E3 | **O** cuando se encienda | Calcularla con `date` (hora local de la ciudad), no con `utcDate` |
| 24 | Atributo «Privado» desde el título | C1, C6 | **P** | Solo lo que dice el proveedor; no se infiere más |
| 25 | Formato y tema para el agente de WhatsApp | B2 («bots») | **X** para FREETOUR | Ya bloqueado (REQ-148) |
| 26 | Medir el uso de filtros | G1, G5 | **O** | Agregado y anónimo, en el servidor; si se mide en el navegador, con la política de cookies (REQ-084) |
| 27 | «La Primera Pieza» como nombre del formato Pieza libre | C4 | **P** solo como colección | El H1 sigue siendo el título real |
| 28 | FREETOUR nombrado al cliente | C3 y regla del PO | **X** | «Operado por un guía local · {proveedor}» (REQ-098) |
| 29 | Mapeo de proveedores futuros sin código | I | **P** | Cada proveedor revisa sus propios términos en su PR de alta |
| 30 | Campos de Trip (dificultad, confort…) | — (no son de FREETOUR) | **P** | Solo viajes propios |

**Críticos:** 6 (quitar «guía local» de audioguías y online), 11 y 12 (nada de «confirmación inmediata» ni atributos sin dato), 14 (sin MSI ni pagos), 18 (sin la marca en sinónimos), 17 y 20 (ambiguos: siguen la pregunta 5 y 7 del correo a Ignacio, aún en borrador).

---

## 3. Respuesta: ¿el sync guarda la hora de cada evento?

**No.** La API la trae (`date` y `utcDate` con hora), pero el adaptador de salidas la corta: `e.date!.slice(0, 10)` (`src/departures/sources/freetour.ts:12`). El modelo común guarda solo `{ date, language }` (`src/departures/lib/types.ts`) y la base guarda `Tour.departureDates` como lista de fechas (`migrations/0012_salidas.sql`). Los viajes propios sí tienen horas (`Trip.dates[].times`, `availability.slots[].time`), pero el resumen tampoco las usa. Por eso la **franja horaria queda tras bandera** (REQ-203) y encenderla pide gate G-T4.

---

## 4. Olas (cada una es un PR; una bandera a la vez)

| Ola | Qué (una línea) | REQ | Bandera / candado |
|---|---|---|---|
| **T0** | Este PR: auditoría, cumplimiento, diccionario y documentos, REQ y muestra de 200 | 185…218 (registro) | Ninguno |
| **T1** | Diccionario, mapeos y clasificador puros en `src/taxonomy/` con Zod y tests (no se ve nada) | 186–191, 193, 196, 202, 204, 206–208, 213 | Ninguno (sin I/O) |
| **T2** | Migración 0017 (tablas propias) en su PR, y recálculo al cerrar el sync blindado con log de `por-revisar` | 193, 194 | **Migración 0017** · `TAXONOMY_SYNC_ENABLED=false` |
| **T3** | Exclusiones y regla de Pieza libre en /destinos, /la-primera-pieza, sitemaps, home y venta cruzada; indexación sin `fuera` | 191, 192, 197 | `TAXONOMY_PUBLISH_ENABLED=false` (sobre `PRIMERA_PIEZA_ENABLED`) |
| **T4** | /tours con `?formato=&tema=&destino=` y atributos activos; canonical y noindex; `?tipo=`/`?tipo_act=` traducidos | 195, 197, 198, 202, 204, 205 | `TAXONOMY_FILTERS_ENABLED=false` |
| **T5** | Chips en «Tours» de la ciudad, etiquetas en la ficha fuera de la foto y copy por formato en 6 idiomas | 199, 200, 201, 218 | La misma `TAXONOMY_PUBLISH_ENABLED` |
| **T6** | Circuitos: tipo de grupo, dificultad 1–5 y días; migración 0018 de Trip en su PR | 206–210 | **Migración 0018** · `TAXONOMY_CIRCUIT_EXTRA_ENABLED=false` |
| **T7** | Formato → `CartItem.tipo` y carrusel con `tp_formato`; adaptador FREETOUR declara `day_trip` y `tickets` | 213, 214 | `ARMA_TU_VIAJE_ENABLED` (ya en `false`) |
| **T8** | Búsqueda: sinónimos del diccionario y continente o término dentro del texto (sobre #122) | 215, 216 | `SEARCH_TAXONOMY_ENABLED=false` (requiere `SEARCH_V2_ENABLED`) |
| **T9** | Firma de la muestra y encendido de temas uno por uno; métricas en STATUS.md | 195, 217 | Cambio de estado en el diccionario por PR (OK del PO) |

Orden: T1 → T2 → T3 → T4 → T5; T6, T7 y T8 pueden ir en paralelo después de T1; T9 al final. **Nada de esto se enciende antes que #128 (La Primera Pieza)**, para no mezclar dos encendidos (blindaje 9).

---

## 5. Estructura de carpetas nueva

El pedido dice `lib/taxonomy/`. Según CLAUDE.md la lógica pura vive en `src/<dominio>/lib/`, así que el dominio es `src/taxonomy/` y su lógica `src/taxonomy/lib/`.

```
docs/
  plan-taxonomia.md                 NUEVO (este plan)
  taxonomia.md                      NUEVO (análisis + recuadro de ajustes)
  taxonomia-diccionario.csv         NUEVO (fuente de revisión del diccionario)
  taxonomia-referentes.md           NUEVO (reporte de referentes)
  freetour/categorias.csv           NUEVO (29 vivas + 4 históricas)
migrations/
  0017_taxonomia.sql                T2  ExperienceTaxonomy, ExperienceTaxonomyOverride, TaxonomyRun   (candado)
  0018_trip_facetas.sql             T6  Trip.difficultyLevel, comfort, guideType, travelerProfiles, accessible (candado)
src/taxonomy/
  data/dictionary.ts                T1  términos tipados: slug, eje, es, en, definición, sinónimos, estado, precedencia
  data/mapping/freetour.ts          T1  29 categoryIds → formato base + temas implícitos
  data/mapping/own-trips.ts         T1  kind/category del gestor → formato/tema
  schemas/dictionary.ts             T1  Zod del diccionario y de cada mapeo (lo corre el test y el build)
  lib/types.ts                      T1  Formato, Tema, Atributo, ClassifyInput, ClassifyResult
  lib/format.ts                     T1  precedencia 0–12 de `docs/taxonomia.md` §4.1                                    puro
  lib/themes.ts                     T1  1–3 temas; exclusiones «game», «Casa Cueva»           puro
  lib/attributes.ts                 T1  atributos activos y pares excluyentes                 puro
  lib/classify.ts                   T1  classify(input, dictionary, mapping) → resultado      puro
  lib/primera-pieza.ts              T1  isPiezaLibre (10 excepciones)                         puro
  lib/cart-type.ts                  T1  formato → CartItemType | null                         puro
  lib/circuits.ts                   T1  tipo de grupo, dificultad 1–5, rangos de días         puro
  lib/publish.ts                    T3  visibleTerms(estados, conteos, banderas): nada en cero, tema sin firmar oculto  puro
  lib/filters.ts                    T4  ?formato ?tema ?destino ?duracion + traducción de ?tipo/?tipo_act  puro
  lib/copy.ts                       T5  etiqueta y definición por idioma                      puro
  lib/metrics.ts                    T9  las 5 métricas de STATUS.md                           puro
  recompute.ts                      T2  I/O inyectado: lee activos, clasifica, staging, cambio atómico, log
  repository.ts                     T2  D1 (tablas de 0017)
src/search/lib/synonyms.ts          T8  expansión de la consulta desde el diccionario        puro
src/search/lib/scope.ts             T8  continente o término dentro del texto                 puro
src/destinations/lib/hub-groups.ts  (gate G-T2) bloque México en /destinos                    puro
src/scripts/taxonomy-sample.ts      T9  muestra estratificada (versión TS de la de este PR), solo lectura
Modificados (sin borrar; lo viejo queda oculto y reversible):
  src/catalog/guarded-sync.ts       T2  llama a recompute() al cerrar, después del FTS
  src/destinations/lib/catalog.ts   T3  isFreeTour → isPiezaLibre; `fuera`/`por-revisar` fuera de la lista
  src/tours/lib/extra-filters.ts    T4  CATEGORY_GROUPS se conserva; parse traduce a formato/tema
  src/cart/adapters/freetour.ts     T7  types: + day_trip, tickets
  src/companions/lib/carousel.ts    T7  primera tarjeta por tp_formato
```

### SOLID
- **SRP:** formato, temas, atributos, publicación y filtros son funciones separadas; `classify` solo las compone.
- **OCP:** un proveedor nuevo es un archivo de mapeo nuevo; el clasificador no cambia (REQ-189 lo prueba con un proveedor ficticio).
- **LSP:** todo mapeo cumple el mismo esquema Zod; un viaje propio y un tour de FREETOUR producen el mismo `ClassifyResult`.
- **ISP:** el front lee solo `{ formato, temas, atributos }`; nunca el mapeo ni las reglas.
- **DIP:** `recompute.ts` recibe repositorio, reloj y logger por parámetro; `lib/` no importa I/O ni `process.env` (las banderas llegan como argumento).

### Unit tests propuestos (rojo → verde; cada uno con su `REQ-###` en el nombre)

| Archivo | Casos mínimos | Comando |
|---|---|---|
| `src/taxonomy/schemas/dictionary.test.ts` | 7 campos por término; 5 estados; 13 formatos y 13 temas exactos; slugs únicos; 26 sinónimos de 2024 sin chip; ningún formato se llama «Experiencias» (REQ-185, 186, 188) | `npx vitest run src/taxonomy/schemas/dictionary.test.ts` |
| `src/taxonomy/data/mapping/freetour.test.ts` | los 29 ids una sola vez, igual que `docs/freetour/categorias.csv` (REQ-189) | `npx vitest run src/taxonomy/data/mapping/freetour.test.ts` |
| `src/taxonomy/lib/format.test.ts` | orden 0–12; 26 y 31 con precio 0 no dan pieza-libre; id 1/2/6/9/999 → por-revisar; 359/360 min; 1439/1440 min; «3 días» en el título (REQ-187, 191, 193) | `npx vitest run src/taxonomy/lib/format.test.ts` |
| `src/taxonomy/lib/themes.test.ts` | máx. 3; «Juego de Tronos» sin parques-ocio; «Casa Cueva» sin aventura; urbano no es chip (REQ-188, 196) | `npx vitest run src/taxonomy/lib/themes.test.ts` |
| `src/taxonomy/lib/attributes.test.ts` | pares excluyentes; «en español» solo con dato; vuelo solo con `flightsIncluded` (REQ-202, 204) | `npx vitest run src/taxonomy/lib/attributes.test.ts` |
| `src/taxonomy/lib/classify.test.ts` | determinismo; cambio de título recalcula temas sin tocar slug ni `contentHash`; proveedor ficticio solo con mapeo (REQ-189, 190, 194) | `npx vitest run src/taxonomy/lib/classify.test.ts` |
| `src/taxonomy/lib/publish.test.ts` | tema `muestra` oculto; término con 0 productos no sale; atributo tras bandera oculto con la bandera apagada (REQ-195, 197, 203) | `npx vitest run src/taxonomy/lib/publish.test.ts` |
| `src/taxonomy/lib/circuits.test.ts` | días 5/6, 9/10, 14/15; dificultad sin dato no se muestra; tipo de grupo (REQ-206, 207, 208) | `npx vitest run src/taxonomy/lib/circuits.test.ts` |
| `src/taxonomy/lib/cart-type.test.ts` | tabla completa; circuito y a-la-medida sin tipo (REQ-213) | `npx vitest run src/taxonomy/lib/cart-type.test.ts` |
| `src/taxonomy/lib/filters.test.ts` | URL ida y vuelta; `?tipo=free` → `?formato=pieza-libre`; canonical y noindex (REQ-198) | `npx vitest run src/taxonomy/lib/filters.test.ts` |
| `src/taxonomy/lib/copy.test.ts` | sin MSI, pagos, «guía en español» sin dato ni «FREETOUR» en 6 idiomas; autoguiado sin «guía local» (REQ-201, 218) | `npx vitest run src/taxonomy/lib/copy.test.ts` |
| `src/taxonomy/recompute.test.ts` | staging + cambio atómico; corrida fallida conserva la anterior; log de `por-revisar`; sin escrituras en `Tour` (REQ-193, 194) | `npx vitest run src/taxonomy/recompute.test.ts` |
| `src/destinations/lib/catalog.test.ts` (ampliado) | `fuera` no cuenta para indexar; Pieza libre con excepciones (REQ-191, 192) | `npx vitest run src/destinations/lib/catalog.test.ts` |
| `src/companions/lib/carousel.test.ts` (ampliado) | primera tarjeta por `tp_formato` (REQ-214) | `npx vitest run src/companions/lib/carousel.test.ts` |
| `src/search/lib/synonyms.test.ts`, `scope.test.ts` | «trekking», «free walking tour», «Europa», «aventura»; con la bandera apagada, igual que hoy (REQ-215, 216) | `npx vitest run src/search/lib/synonyms.test.ts` |

Al cerrar cada ola: `npx vitest run`, `npx vitest run -t "REQ-"` y el cruce `grep -r "REQ-" src tests`.

---

## 6. Candados: migraciones (se muestran; no se aplican)

### 6.1 `0017_taxonomia.sql` (T2) — tablas propias, solo agrega

El diccionario y los mapeos viven en el repo (revisados por PR), así que no hacen falta las 6 tablas del insumo (§13.1): bastan 3.

```sql
-- PROPUESTA (no aplicar sin OK del PO). Solo agrega tablas; no toca Tour, TourTranslation ni Trip.
CREATE TABLE IF NOT EXISTS "ExperienceTaxonomy" (
  "experienceKind" TEXT NOT NULL CHECK ("experienceKind" IN ('tour','trip')),
  "experienceId"   TEXT NOT NULL,            -- Tour.id o Trip.id (ids de Travel Puzzle, nunca el del proveedor)
  "axis"           TEXT NOT NULL CHECK ("axis" IN ('formato','tema','atributo')),
  "term"           TEXT NOT NULL,            -- slug del diccionario
  "ruleId"         TEXT NOT NULL,            -- regla que lo decidió (P5, tema:cat, …)
  "mappingVersion" TEXT NOT NULL,            -- hash del diccionario + mapeos
  "runId"          TEXT NOT NULL,            -- corrida que lo escribió (publicación atómica)
  "computedAt"     TEXT NOT NULL,
  PRIMARY KEY ("experienceKind","experienceId","axis","term","runId"));
CREATE INDEX IF NOT EXISTS "ExperienceTaxonomy_term" ON "ExperienceTaxonomy" ("runId","axis","term");
CREATE TABLE IF NOT EXISTS "ExperienceTaxonomyOverride" (
  "experienceKind" TEXT NOT NULL, "experienceId" TEXT NOT NULL, "axis" TEXT NOT NULL, "term" TEXT NOT NULL,
  "action" TEXT NOT NULL CHECK ("action" IN ('add','remove')), "note" TEXT NOT NULL DEFAULT '', "by" TEXT NOT NULL, "at" TEXT NOT NULL,
  PRIMARY KEY ("experienceKind","experienceId","axis","term"));
CREATE TABLE IF NOT EXISTS "TaxonomyRun" (
  "id" TEXT PRIMARY KEY, "startedAt" TEXT NOT NULL, "finishedAt" TEXT, "mappingVersion" TEXT NOT NULL,
  "counts" TEXT NOT NULL DEFAULT '{}', "unmapped" TEXT NOT NULL DEFAULT '[]', "unclassified" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'running' CHECK ("status" IN ('running','published','aborted')));
```

- **Publicación atómica:** el render lee solo el último `TaxonomyRun` con `status = 'published'`. Si la corrida falla, se sigue leyendo la anterior. Las corridas viejas se podan conservando las 3 últimas (no se borran datos del proveedor).
- **Barrera:** se aborta si más de 20 % de los activos queda sin formato o si un formato cae más de 30 % contra la corrida anterior.
- **Respaldo y regreso:** son tablas nuevas y vacías, así que no hay nada que respaldar antes. Para volver atrás basta `TAXONOMY_SYNC_ENABLED=false`: las tablas se quedan y nadie las lee.

### 6.2 `0018_trip_facetas.sql` (T6) — columnas nuevas de Trip, solo agrega

```sql
-- PROPUESTA (no aplicar sin OK del PO). Solo agrega columnas; "difficulty" y "accessibility" se conservan.
ALTER TABLE "Trip" ADD COLUMN "difficultyLevel" INTEGER CHECK ("difficultyLevel" BETWEEN 1 AND 5);  -- NULL = sin dato
ALTER TABLE "Trip" ADD COLUMN "comfort" TEXT CHECK ("comfort" IN ('basico','esencial','confort','premium'));
ALTER TABLE "Trip" ADD COLUMN "guideType" TEXT CHECK ("guideType" IN ('guiado','semiguiado','a-tu-aire'));
ALTER TABLE "Trip" ADD COLUMN "travelerProfiles" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Trip" ADD COLUMN "accessible" BOOLEAN;                                                  -- NULL = sin dato; nunca se infiere
```

Respaldo **antes** de correrla (lo corre el PO o el workflow con su OK; no se corrió):

```bash
# 1) Respaldo de la tabla Trip (solo lectura) al artefacto del workflow, guardado también en tmp/ (en .gitignore)
npx wrangler d1 export travel-puzzle --remote --table=Trip --output=tmp/respaldo-trip-$(date +%Y%m%d-%H%M).sql
# 2) Comprobar el conteo antes y después
npx wrangler d1 execute travel-puzzle --remote --command='SELECT COUNT(*) FROM "Trip"'
# 3) Aplicar solo con OK del PO (workflow «Publicar en Cloudflare» con migraciones=true)
```

El llenado de `difficultyLevel` desde los 3 valores de hoy (`facil` 131, `moderada` 32, `exigente` 14 viajes en `imports/`) es **escritura de datos de producción** (candado) y depende de G-T8. El nombre exacto de la base D1 se toma de `wrangler.jsonc` al preparar el PR.

---

## 7. Gates para el PO

### 7.1 Firmados

| # | Gate | Decisión |
|---|---|---|
| G1 | Menú y jerarquía (A: decisión de las 05:57; B: homologados y punto 4 del pedido) | **Firmado A el 6-11 (~06:12), ratifica lo de las 05:57:** «Experiencias» es el paraguas y reemplaza a «Tours» en el menú: Inicio · La Primera Pieza · Destinos · Experiencias · Traslados · Cómo Funciona (6 ítems). Dentro van los formatos; Circuitos **no** es pestaña. Solo cambia la etiqueta: `/tours` sigue siendo el listado y no hay rutas nuevas. Resuelve el choque: el punto 4 se cumple en rutas y pestañas; REQ-093 queda REEMPLAZADO por REQ-185 (la etiqueta la implementa REQ-174). **`/experiencias` como alias: recomiendo NO hacer 301 hoy.** Motivos: (1) el pedido pide no crear rutas; (2) una 301 /experiencias → /tours queda guardada en el navegador sin vencimiento, y si un día /experiencias pasa a ser la URL principal (con /tours → /experiencias), quien la tenga guardada cae en un ciclo de redirecciones; (3) sin enlaces a /experiencias no hay nada que recuperar. Si el PO quiere que la URL exista ya (por ejemplo, para campañas), que sea una **307 temporal** a /tours; si algún día se muda el listado, se hace al revés con 301 /tours → /experiencias en su propio PR (rutas, sitemaps, canonical y hreflang a la vez). Nunca dos URLs que sirvan el mismo listado. |
| G-T6 | Nombre visible del formato `experiencia-unica` (choca con el paraguas «Experiencias») | **Firmado por el PO el 6-11 a las 06:22: «Momentos de autor»** (se descartó la propuesta «Actividades»). El slug interno `experiencia-unica` y el `kind = unica` del gestor no cambian. Inglés propuesto: «Signature moments» (**por firmar**). Copy y traducciones en §7.3 (REQ-230). |
| — | Favorito (5-11, gate 2) | ≥ 4.7 y ≥ 50 reseñas (REQ-098) |

### 7.2 Pendientes (uno por uno, en este orden)

**G-T1. Criterio de «Favorito de los viajeros».** Recomiendo **A: el mismo criterio ya firmado, ≥ 4.7 y ≥ 50 reseñas reales** (REQ-098), para no tener dos «favoritos». Con el respaldo del 5-11 lo cumplen **998** tours. B: ≥ 4.7 y ≥ 20 (1,419 tours; sale más, pero con menos evidencia). C: ≥ 4.7 y ≥ 100 (677).

**G-T2. México como bloque en Destinos.** Recomiendo **A:** en /destinos, México va **primero y como bloque propio**, antes de «América del Norte» (que queda con EE. UU., Canadá, Centroamérica y el Caribe). Se hace con una función pura de agrupación (`hub-groups.ts`) que solo cambia cómo se pinta el hub; `continents.ts` no cambia, las URL no llevan continente y el home sigue igual. Es la convención de las agencias mexicanas (Mundo Joven pone México al nivel de Europa). B: México dentro de América del Norte, como hoy en el home. C: «Nacional / Internacional» (no recomendada: ningún referente la usa como agrupador principal).

**G-T3. Metas de las métricas (REQ-217).**

| Métrica | Meta propuesta | Hoy (ensayo del 5-11) |
|---|---|---|
| % de tours con formato | 100 % (contando `fuera` como clasificado) | 100 % |
| % de tours presenciales sin tema | ≤ 5 % | 1.9 % (151 de 7,894) |
| categoryIds por revisar | 0 (alerta en el log si > 0) | 0 |
| Precisión por tema de la última muestra | ≥ 90 % para publicar; se repite cada trimestre o al cambiar el mapeo | Por medir (muestra entregada) |
| Chips, conteos o secciones en cero | 0 | Sin medir (no existen todavía) |
| Uso de filtros por formato y por tema | Se mide 4 semanas y luego se fija la meta (como el carrusel en REQ-111) | — |

**G-T4. Franja horaria.** El sync **no** guarda la hora (§3). A (recomendada): sigue tras bandera; si se quiere, un PR aparte agrega las horas al resumen de salidas (cambio en `departures/` + columna nueva, migración y candado) y se enciende con su protocolo. B: descartarla.

**G-T5. Dónde vive la clasificación.** A (recomendada): las 3 tablas de 0017 (§6.1), con el diccionario y los mapeos en el repo. B: columnas en Tour y Trip (el pedido lo permite, pero mezcla datos del proveedor con los de Travel Puzzle). C: en memoria en cada render (sin migración, pero no deja bitácora ni sirve para filtrar en SQL).

**G-T6.** Firmado (ver §7.1).

**G-T7. Regla de excursión por duración.** A (recomendada): **≥ 360 min con palabra de salida** en el título («excursión, day trip, full day, desde, from»), además de la categoría 4: 1,222 excursiones. B: **solo ≥ 360 min**, como dice la verificación del pedido: 1,523 excursiones, pero 301 tours cambian, entre ellos 75 caminatas de pago y 86 de la categoría 19 («Tours en vehículo por la ciudad») que duran 6 h o más pero no dicen en el título que salgan de la ciudad. Los tests de límite (359/360) aplican a las dos opciones.

**G-T8. Dificultad 1–5 desde los 3 valores de hoy.** A (recomendada): `facil` → 2 Ligero, `moderada` → 3 Moderado, `exigente` → 4 Exigente; los niveles 1 y 5 solo cuando el operador los declare (se capturan en el gestor). B: pedir a cada DMC la escala 1–5 y no mostrar nada hasta tenerla. Descripciones propuestas: 1 Relajado «Casi sin caminar; apto para casi todos» · 2 Ligero «Caminatas cortas en terreno plano» · 3 Moderado «Varias horas a pie o algo de altura» · 4 Exigente «Caminatas largas, desnivel o altura» · 5 Muy exigente «Trekking de varios días o gran altitud; requiere buena condición».

**G-T10. `por-revisar` en /tours (confirmación).** El pedido dice que los ids 1, 2, 6, 9 o nuevos «no se publican»; `docs/freetour/categorias.csv` homologado dice «visible en /tours». Recomiendo **A: no se publican en ningún lado** (lo literal del pedido; un tour sin mapear puede ser online o un servicio). B: visibles solo en /tours, sin chips ni Destinos.

**G-T11. Autoguiado en el carrito (confirmación).** El pedido mapea autoguiado → `tour`; los homologados, → `tickets`. Recomiendo **A: `tour`** (lo literal del pedido; con el formato como atributo del ítem, la tarjeta ya puede decir «audioguía»). B: `tickets` (la audioguía se compra como un boleto; así entra en la regla de Perú «tickets primero»).

**G-T9 (opcional). Title de la ficha por formato.** «{título real} – Excursión desde {Ciudad}» cuando el formato es `excursion-dia` (cambia el patrón firmado de REQ-099). A: sí, solo para excursión. B: no (se queda «– Tour en {Ciudad}»).


### 7.3 Copy propuesto de «Momentos de autor» (REQ-230)

El español está firmado. Los demás idiomas son **propuesta por firmar**: en (`termino_en` del diccionario) y pt/de/fr/it por el flujo de traducción que ya existe (REQ-201). El slug y los parámetros de URL no cambian (`?formato=experiencia-unica`).

| Idioma | Nombre (chip y etiqueta) | Definición para el cliente | Estado |
|---|---|---|---|
| es | Momentos de autor | Algo para hacer, no solo para ver: talleres, clases, espectáculos, aventura o vida nocturna. | **Firmado** (nombre); definición por revisar |
| en | Signature moments | Something to do, not just to see: workshops, classes, shows, adventure or nightlife. | **Por firmar** |
| pt | Momentos de autor | Algo para fazer, não só para ver: oficinas, aulas, espetáculos, aventura ou vida noturna. | Por firmar |
| de | Signature-Momente | Etwas zum Erleben, nicht nur zum Anschauen: Workshops, Kurse, Shows, Abenteuer oder Nachtleben. | Por firmar |
| fr | Moments signature | À vivre, pas seulement à voir : ateliers, cours, spectacles, aventure ou vie nocturne. | Por firmar |
| it | Momenti d'autore | Da vivere, non solo da vedere: laboratori, corsi, spettacoli, avventura o vita notturna. | Por firmar |

Reglas del copy:
- «De autor» no debe sonar a que lo diseña Travel Puzzle: en productos de FREETOUR el operador sigue siendo el proveedor («Operado por un guía local · {proveedor}», REQ-098; C6). El nombre describe el formato, no quién lo opera.
- La definición no promete nada que el dato no respalde: sin «exclusivo», «privado» ni «grupo pequeño» (esos son atributos con su propia regla).
- Búsqueda: «momentos de autor», «signature moments» y el nombre anterior «experiencia única» quedan como sinónimos del mismo formato (REQ-215).
- Test (REQ-230, en T1/T5): con el diccionario cargado, la etiqueta en es es «Momentos de autor», ningún texto visible dice «Experiencia única» como nombre de formato, y el slug sigue siendo `experiencia-unica`.

---

## 8. Muestra de 200 tours para validar los temas (REQ-195)

- Archivo: `muestra-temas-200.csv`, entregado en la sesión (no se commitea: `tmp/` está en `.gitignore` y la muestra es de revisión del PO).
- Origen: respaldo de D1 del 5-11 (8,018 activos), con la precedencia de formato de §4.1 (opción A de G-T7) y las reglas de tema del ensayo **sin corregir**, para medir justo lo que se propone publicar.
- **Estratificada:** 15 tours por cada uno de los 13 temas (195) + 5 sin tema = 200, con semilla fija (20261106) y sin repetir tours. Así cada tema tiene su propia precisión.
- Columnas: `n, estrato, tour_id, external_id, titulo_es, titulo_en, ciudad, categoria_proveedor, precio_eur, duracion_min, formato, regla_formato, temas_propuestos, alerta` y, vacías para el PO, `formato_ok, tema1_ok, tema2_ok, tema3_ok, tema_que_falta, notas_PO`.
- La columna `alerta` marca los falsos positivos conocidos: en todo el catálogo, **437 títulos con «game»** y **1 con «Casa Cueva»**.
- Cómo se firma: un tema pasa a `activo` si sus aciertos son ≥ 90 % (al menos 14 de 15 en su estrato). Con 15 por tema la cifra es orientativa (±15 puntos con 95 % de confianza); si un tema queda entre 80 y 93 %, se amplía su estrato a 30 antes de decidir.

---

## 9. Plan de regreso

Este PR solo agrega documentos y cambia filas de `docs/requisitos.md` y `STATUS.md`: se revierte con `git revert` del merge. En las olas de código, cada bandera apagada deja el sitio como hoy, y las migraciones solo agregan (no hay nada que deshacer en los datos).
