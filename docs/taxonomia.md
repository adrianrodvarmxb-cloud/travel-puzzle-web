# Taxonomía de Travel Puzzle: análisis, diccionario, clasificación de ensayo y gates

> **Nota del repo (6 nov 2026, PR de plan; manda sobre este documento).** Versión homologada del PO (06:09), copiada tal cual salvo esta nota y la omisión de los ids del Drive y de la mención a archivos personales (el repo es público). Lo que cambió después y prevalece:
> 1. **Menú — gate G1 FIRMADO por el PO (06:12, opción A, ratifica lo de las 05:57):** «Experiencias» es el concepto base (paraguas del eje Formato) y **reemplaza a «Tours» en el menú**: Inicio · La Primera Pieza · Destinos · Experiencias · Traslados · Cómo Funciona. Dentro van Tours, Circuitos, Caminatas, etc.; Circuitos no es pestaña. `/tours` se mantiene como listado. Donde este documento dice «se queda Tours en el menú» o «no hay pestaña Experiencias», **ya no aplica**. REQ-093 queda REEMPLAZADO por REQ-185.
> 2. **Transporte:** `TRANSPORT_ENABLED` está en `true` desde el 6-11 (#127) y el transporte vive en su sección de /traslados, fuera de /tours (#136, REQ-172). Donde dice «tras bandera (`TRANSPORT_ENABLED=false`)», ya no aplica.
> 3. **Diferencias con el pedido literal del PO del 6-11** (el pedido manda; quedan como gates de confirmación en `docs/plan-taxonomia.md` §7): ids 1, 2, 6 y 9 → `por-revisar` **no se publican en ningún lado** (aquí: «visible en /tours»); Autoguiado → `CartItem.tipo = tour` (aquí: `tickets`).
> 4. Nombre del formato «Experiencia única»: propuesta de cambio en el gate G-T6 del plan, para no chocar con el paraguas.

Fecha: 6 nov 2026. Análisis sin código: no hay PR y no se escribió nada en el repo ni en D1.

> **Versión homologada (6 nov 2026).** Se alineó con la decisión del PO del 5-11-2026 (rutas por destino, «Arma tu viaje», sync blindado), con el reporte «Taxonomía de referentes de viajes» y con Categorias.xlsx. Cuando algo choca, **prevalece la decisión del 5-11**. Cambios respecto a la versión anterior:
> 1. **Menú (G1):** se queda «Tours» (REQ-093). La taxonomía vive como filtros dentro de /tours y como chips dentro de la sección «Tours» de cada ciudad. No hay hub `/experiencias` ni pestaña nueva.
> 2. **Ciudad:** se mantienen las 3 secciones firmadas (Free tours · Tours · Traslados). El formato ordena y filtra dentro de «Tours». No hay URL `/{formato}` porque chocaría con `/{slug-del-tour}`.
> 3. **La Primera Pieza:** precio 0 → pieza-libre, salvo las categorías 8, 17, 20, 24, **26**, 28, 29, 30, **31** y 35 (se agregaron la 26 y la 31).
> 4. **Ejes nuevos:** C · Atributos (privado, nocturno, idioma, etc.) y D · Facetas de circuitos (confort, tipo de grupo, tipo de guía, perfil, dificultad 1–5). «Presupuesto» se funde en confort y «Modalidad» se divide en grupo, guía y perfil (§4.3–4.5).
> 5. **Duración en días:** 1–5 · 6–9 · 10–14 · 15+ (antes 1–5 / 6–14 / 15+).
> 6. **Formato `por-revisar`:** se usa para categorías nuevas o históricas (1, 2, 6, 9).
> 7. **De Categorias.xlsx entran tras bandera:** región, atracción ícono, Pueblos Mágicos, biomas (como sinónimos), Idiomático y De temporada. Estético se descarta.
> 8. **Indexación de ciudad:** se aplica la regla firmada (≥ 3 tours activos, o 1 + guía propia). `fuera` y `por-revisar` no cuentan.

- Base de código: `origin/main` en 64e85fa, en un worktree de solo lectura.
- Datos de los tours: respaldo de D1 del 5 nov 2026, el artefacto `respaldo` del sync-guard (`Tour.json`, `TourTranslation.json`).
- Datos de los viajes propios: `imports/*.json`.
- Categorías de FREETOUR: `freetour_categorias.csv`, el archivo del PO con 29 categorías.

Diccionario en CSV: `taxonomia-diccionario.csv`, en esta misma carpeta.

> **Lo que falta para cerrar el ensayo:**
> - El respaldo es del 5 nov. No disparé ningún workflow para sacar un export nuevo.
> - No hay tabla `Trip` en el respaldo. Los viajes propios salen de `imports/`.
> - Sin credenciales no pude leer `fullPricePerGroup` por evento. «Pieza libre» se calculó por tour (`priceValue = 0`); la insignia final sigue saliendo por evento (REQ-095).
> - Las reglas de tema son de ensayo. Su precisión no está medida: falta una muestra revisada a mano (gate G4).

---

## 0. Resumen ejecutivo

- **Eje A, Formato** (qué compras; un solo valor por experiencia): Pieza libre · Caminata · Tour · Excursión de un día · Circuito (varios días) · Experiencia única · Entradas y pases · Autoguiado · Transporte turístico · Traslado · A la medida. Alquiler y Crucero quedan tras bandera.
- **Eje B, Tema** (de qué va el viaje; de 1 a 3 por experiencia): Cultural e historia · Ciudad y barrios · Gastronomía · Naturaleza · Montaña y senderismo · Aventura · Playa y mar · Noche y espectáculos · Religioso y espiritual · Bienestar · Talleres y aprendizaje · Deportes · Parques y ocio.
- **Eje C, Atributos:** privado, nocturno, cómo te mueves, idioma español, calificación y vuelo incluido, con datos de hoy. Familias, solo adultos, accesible, sin filas, sostenible, VIP y franja horaria quedan tras bandera.
- **Eje D, Facetas de circuitos:** tipo de grupo (activo) y dificultad 1–5 (activa donde haya dato). Confort, tipo de guía, perfil del viajero y altitud quedan tras bandera.
- **Facetas generales:** duración (en horas y en días) y precio, activas. Temporada y eventos quedan tras bandera `false`.
- **Ensayo** con 8,018 tours activos de FREETOUR y 176 viajes propios. Toda experiencia recibe un formato. 124 tours online (categoría 8) quedan fuera de los filtros y de Destinos, y 275 no reciben tema (3.4 %).
- **Hallazgos del barrido:**
  - Las excursiones de un día de FREETOUR (1,109) nunca entran como «excursión» al carrusel.
  - El filtro «Visitas guiadas y free tours» mezcla tours a pie de pago, audioguías y running.
  - Las audioguías y los tours online dicen «con un guía local», y eso es falso.
  - Los tours online cuentan para que una ciudad sea indexable.
  - El código del operador de los viajes propios solo vive dentro del `id`; su nombre original y la URL de origen no se guardan.
- **Menú (homologado):** se queda el menú firmado con «Tours» (REQ-093). Las 5 agencias mexicanas revisadas usan «Tours» y ninguna «Experiencias». La taxonomía va como filtros en /tours (gate G1).
- **Drive (§11):**
  - No hay taxonomía en los xlsx; solo geografía e imágenes.
  - Los ids de ciudad coinciden con FREETOUR (966 de 967), pero los **ids de país están desplazados**: solo 14 de 83 coinciden. Unir por id pondría la foto de un país en otro.
  - En 2025 existían categorías (1, 2, 6, 9) que hoy no existen.
  - Reporte_Tours se leyó solo en parte (95 filas).
- **§12 y §13:** baseline por proveedor (8 fichas y una plantilla) y diseño de la base de taxonomía (6 tablas aditivas, migración propuesta sin aplicar, recálculo en el sync, consumidores y proceso por proveedor).

---

## 1. Fuente interna: «Taxonomia.docx» (Drive de Adri)

Lo que dice el documento sobre la navegación: «Los clientes visualizaran las opciones de viaje desde las pestañas **Destinos** y **Experiencias**», o desde el buscador universal (continente, país, ciudad, experiencia, tour, circuito, tipo de viaje). Destinos usa solo la Taxonomía 1 (geográfica). Experiencias usa solo la Taxonomía 2 (tipo de viaje).

| Taxonomía | Contenido | Estado en el doc | Qué hago con ella |
|---|---|---|---|
| 1 Geográfica | Continentes y países (lista de centraldereceptivos.com) | En uso: Destinos | Fuera de alcance. Destinos ya usa ISO-2 y geonameid (REQ-085). |
| 2 Tipos de viaje | Aventura, Relax, Cultural, Playa, Naturaleza, Urbano, Montaña, Educativo, Deportivo, Salud, Parques Temáticos, Ecoturismo, Ecoturismo-Cultural, Senderismo, Escalada en Roca, Escalada, Espeleísmo, Avistamiento de Aves, Hikes (caminatas), Trekks (pistas), Buceo, Trekking, Experiencias Gastronómicas, Religioso, Temática, Bienestar (26) | En uso: Experiencias | La depuro para el **Eje B** (§4.2). |
| 3 Duración | Corta 1–5 días, Media 6–14, Larga 15+, Mini paquetes, Extensiones | Sin aplicar | Faceta de duración para circuitos (§4.3). |
| 4 Modalidades | Grupo, Individual, Luna de miel, Negocios, Plateados 60+, Personalizados | Sin aplicar | «Personalizados» corresponde al formato A la medida. Lo demás va tras bandera. |
| 5 Presupuesto | Económico, Moderado, Lujo, Elite | Sin aplicar | Rangos de precio reales. «Lujo» solo donde el operador lo dice. |
| 7 Eventos especiales | Festivales, Eventos deportivos, Celebraciones, Ferias, Congresos, Exposiciones, Conferencias | Ventana emergente | Tras bandera. No hay inventario. |
| 8 Temporada | Verano…Otoño, Alta/Media/Baja | Sin aplicar | Tras bandera. No hay datos. |
| 9 Transporte | Avión, Tren, Crucero, Coche, Autobús | Sin aplicar | Faceta «cómo te mueves». Crucero queda como formato futuro. |
| 10 Etiquetas especiales | Sostenible, Experiencia local, Viaje familiar, Aventura extrema, VIP | Sin aplicar | Tras bandera, con reglas anti-promesa (§4.3). |

Nota: el documento no tiene sección 6; la numeración salta de 5 a 7.

---

## 2. Lo que ya existe en el sitio

### 2.1 Viajes propios: `src/trips/lib/trip.ts:6,17`

| Campo | Valores |
|---|---|
| `kind` (TP; el formato) | `tour` · `circuito` · `unica` («Experiencia única») · `personalizado` · `transporte` |
| `category` (TP; el tema), en `src/trips/schemas/trip.ts:12` | `cultural`, `aventura`, `ecoturismo`, `gastronomico`, `sol-y-playa`, `urbano`, `bienestar` |
| Letra de tipo en el código del viaje, en `src/trips/lib/code.ts:9` | T, C, E, P, M (transporte = movilidad) |

En los imports hay 176 viajes únicos: 122 publicados y 54 en borrador.

| Archivo | Lo que trae |
|---|---|
| Big Bus (`bigbus-2026`) | 29 viajes `transporte`/`urbano`, en modo cotización |
| Destino Colombia | 10 `circuito` (cultural y sol-y-playa) |
| Fantástica China | 51 `circuito` cultural |
| Inca World etapa 1 | 45 `tour` (cultural, aventura, ecoturismo, gastronómico) |
| Inca World etapa 2 | 30 viajes (`circuito` y `personalizado`) |
| Turismo Asiático | 11 viajes (`tour` y `circuito`) |

Ningún import trae etiquetas propias del operador: los DMC no mandan categorías.

### 2.2 FREETOUR

- La API v2.1/v2.2 tiene `GET /categories`, que devuelve `id` y `title` en 6 idiomas.
- Cada tour de `GET /tours` trae **un solo** `categoryId`.
- `/tours` no filtra por categoría. Sus filtros son `onlyFree`, `onlyPaid`, `days`, `bid`, `countryId` y `cityId`.
- El catálogo oficial (CSV del PO) tiene 29 ids: 3–5, 7, 8, 10, 12–14, 16–35. No existen 1 (Bike Tour) ni 2 (Bus Tour) aunque salgan en el ejemplo de Swagger, ni tampoco 6, 9, 11 y 15.
- `Tour.categoryId` se guarda en D1 (`prisma/schema.prisma`, modelo Tour), pero los **nombres** de las categorías no se guardan en ningún lado. Solo existen en el CSV y en los ids escritos a mano en `CATEGORY_GROUPS`.

### 2.3 Filtros de /tours: `src/tours/lib/extra-filters.ts:16-27` (REQ-051)

Hoy hay 10 grupos, «como Civitatis». Los viajes propios se asignan con `ownTripGroup` (`:73-77`).

| Grupo | categoryId |
|---|---|
| visitas | 12, 10, 19, 17, 22 |
| barcos | 3, 32 |
| entradas | 20, 24, 35, 28 |
| excursiones | 4, 25 |
| varios-dias | ninguna (solo viajes propios) |
| gastronomia | 5 |
| espectaculos | 27, 7 |
| experiencias | 16, 18, 23, 21, 33, 34 |
| transporte | 29, 30, 26 |
| otros | 13, 14, 31, 8 |

### 2.4 «Pieza libre» y «Caminatas»

- **Pieza libre** es la colección La Primera Pieza: free tours a propina con la insignia «🧩 Primera Pieza · Tú decides cuánto vale». La insignia sale solo si el free tour tiene `fullPricePerGroup = 0` para el grupo elegido (`src/tours/lib/badge.ts:15`).
- La regla de colección es `priceValue = 0` a nivel tour, que es lo que usa `destinations/lib/catalog.ts:101`.
- **Caminata** es un tour guiado **a pie de pago** (FREETOUR 12 «Tour a Pie» o 10 «Tour Corriendo» con precio mayor que 0).
- Un tour a pie de pago **no es** Pieza libre. Un free tour a pie **sí es** Pieza libre: gana la colección.
- En el catálogo, la categoría 12 tiene 3,096 free y 1,531 de pago. Hoy los dos tipos caen juntos en el grupo «Visitas guiadas y free tours».
- **Ambigüedad del doc del PO:** la Taxonomía 2 dice «Hikes (caminatas)», que es senderismo en naturaleza. Propongo reservar «Caminata» para el formato urbano a pie y mandar los hikes al tema «Montaña y senderismo» (gate G2).

---

## 3. Proveedores y referentes

| Referente | Tipos o categorías que usa | Fuente |
|---|---|---|
| **FREETOUR** | Las 29 del CSV: Cruceros y barcos, Viajes de 1 día, Tour gastronómico, Vida nocturna, Tour online, Tour corriendo, Tour a pie, Otros, Top selección, Aventura, Audioguías, Aviación, Tours en vehículo, Entradas, Juegos y ocio, Sitios históricos, Deportes de motor, Museos, Naturaleza y parques, Alquileres, Espectáculos, Pases urbanos, Traslados, Transporte público, Servicios de viaje, Actividades acuáticas, Bienestar, Talleres, Zoológicos y acuarios | CSV del PO; Swagger `/categories` |
| **Civitatis** | Free tours y visitas guiadas, Excursiones de un día, Espectáculos (flamenco), Tours en bus, Zoos y acuarios, Gastronomía (tapas), eSIM, Pases (Go City). REQ-051 copió su estructura: visitas, barcos, entradas, excursiones, varios días, gastronomía, espectáculos, actividades, traslados | civitatis.com/en/madrid/guided-tours («More activities»); REQ-051 |
| **GetYourGuide** | Day trips · Tours & sightseeing · Tickets & passes · Outdoor activities · Cruises & water tours · Food & drink · Culture & history · Transfers & services | getyourguide.com/llms.txt |
| **Viator** | Etiquetas jerárquicas (tags) que reemplazaron a las categorías en la API v1. No pude verificar hoy la lista exacta (la página «Viator Tags» no se pudo leer). | partnerresources.viator.com (glosario) |
| **Airbnb Experiencias** (2025) | Sightseeing and tours · Culinary · Nature and outdoors · Arts and culture | news.airbnb.com, 26 jun 2025 |
| **Klook** | Attraction tickets · Tours & experiences · Day trips · Cultural experiences · Outdoor & sports · Water sports · Massages & hot springs · Cruises · Airport transfers · Car rentals · Rail (JR, Europe, Korea, China) · eSIM · Hotels · Events & shows · Insurance | klook.cn/llms.txt |
| **BeMyGuest** | `productTypes` (opciones del producto) y `categories` jerárquicas con nombre y uuid; los ejemplos son «Themepark» y «Shopping». El producto lleva `typeName`, p. ej. «Attraction». | docs.bemyguest.com.sg; `scratchpad/bmg/*.json` |
| **Big Bus** | Hop-on hop-off de 24 y 48 h, tour nocturno, crucero por el río, cata de vinos y paquetes combinados | bigbustours.com (París, other tours) |
| **Kiwitaxi** (Travelpayouts) | Traslados privados aeropuerto–hotel; desde 2023, también tours en auto para escalas largas | travelpayouts.com/blog (Kiwitaxi) |
| **Travelpayouts** (otras marcas) | Tiqets (entradas), Go City (pases), TicketNetwork (eventos), WeGoTrip (audioguías), GYG y Viator | travelpayouts.com/blog/?p=4008 |
| **Google Things to do** (estándar del feed) | 29 etiquetas: day-trips, guided-tours, self-guided, audio-guide, walking-tours, bike-tours, boat-tours, hop-on-hop-off, city-cards, fast-track, museums, history, food, nightlife, live-music, outdoors, beaches, animals, theme-parks, sports, classes, private-tours, small-group-tours, family-friendly, adults-only, romantic, wheelchair-accessible, literature, recurring-events | developers.google.com/travel/things-to-do/…/product-category |

### Tipos que usan los proveedores y que faltan en la lista del PO

Lo que falta de la lista «Tours, Circuitos, Caminatas, Pieza libre + Taxonomía 2»:

| Tipo que falta | Quién lo usa | Inventario hoy | Propuesta |
|---|---|---|---|
| Excursión de un día | Todos | 1,109 en FREETOUR (cat 4) y 6 propios | **Formato A** |
| Entradas y pases (tickets, museos, city pass, sin colas) | GYG, Klook, Civitatis, Tiqets, Go City | 28 | **Formato A** |
| Autoguiado y audioguía | Google, WeGoTrip, FREETOUR 17 | 29 | **Formato A** (sin «guía local») |
| Traslados | GYG, Klook, Kiwitaxi | Kiwitaxi + 9 de FREETOUR | Formato A; ya tiene su pestaña Traslados |
| Transporte turístico (hop-on, transporte público, tren) | Klook, Big Bus, Google | 29 Big Bus y 1 de FREETOUR | Formato A |
| Experiencias y actividades (clases, talleres, pub crawl, juegos) | Airbnb, Klook, Google `classes` | 369 | Formato A «Experiencia única» |
| Actividades acuáticas y cruceros | GYG, Klook | 119 + 3 | Se clasifican como Tour o Experiencia, con medio **barco** y tema **Playa y mar**. «Crucero» de varios días queda como formato tras bandera. |
| Gastronomía | Todos | 407 en cat 5 | Tema B |
| Vida nocturna y espectáculos | Civitatis, Google, Klook | 138 + 2 | Tema B y faceta «nocturno» |
| Privados | Google, Viator | 388 por palabra clave | Faceta (ya existe el filtro `privado`) |
| Varios días | GYG, Viator | 94 propios y 30 de FREETOUR | Formato A «Circuito» |
| Alquileres (bici, auto) | Klook, FREETOUR 26 | 0 | Formato tras bandera |
| eSIM, seguro y servicios de viaje | Klook, FREETOUR 31 | 0 de FREETOUR | **No son experiencias**: complementos del carrusel |
| Tour online | FREETOUR 8 | 124 | **Fuera de los filtros y de Destinos** (no es viaje) |
| Zoos, acuarios y parques temáticos | Civitatis, BeMyGuest, Google | 6 + 122 | Tema B «Parques y ocio» |
| Familiar, solo adultos y romántico | Google | Sin dato | Etiquetas tras bandera |

---

## 4. Taxonomía propuesta: dos ejes que no se mezclan

**Regla de oro:**
- El **Formato** responde a «¿qué estoy comprando y cómo funciona la reserva?». Tiene un valor exacto y define la ficha, la cancelación, la insignia y el carrusel.
- El **Tema** responde a «¿de qué va?». Admite de 1 a 3 valores y solo filtra y agrupa. Nunca cambia el precio ni la política de cancelación.
- Las **Facetas** son atributos medibles del producto.

### 4.1 Eje A: Formato (precedencia de arriba abajo; gana la primera regla que se cumple)

| # | Slug | Nombre | Regla operativa | Estado |
|---|---|---|---|---|
| 0 | `fuera` | (no se muestra) | FREETOUR cat 8 (online) o cat 31 (servicios de viaje) | Oculto de los filtros y de Destinos |
| 1 | `traslado` | Traslado | FREETOUR 29; o cat 13/14 con «transfer/traslado/shuttle» sin «tour» en el título; Kiwitaxi | Activo (/traslados) |
| 2 | `transporte` | Transporte turístico | FREETOUR 30; «hop-on» en el título; Trip `kind = transporte` (Big Bus) | Tras `TRANSPORT_ENABLED` (hoy `false`) |
| 3 | `alquiler` | Alquiler | FREETOUR 26 | Tras bandera (0 tours) |
| 4 | `entradas` | Entradas y pases | FREETOUR 20, 24, 28, 35; o cat 13/14 con «entrada/ticket/skip-the-line/pass» en el título | Activo |
| 5 | `autoguiado` | Autoguiado (audioguía) | FREETOUR 17 | Activo, **sin** «con un guía local» |
| 6 | `pieza-libre` | La Primera Pieza (free tour) | FREETOUR `priceValue = 0`, salvo las categorías 8, 17, 20, 24, 26, 28, 29, 30, 31 y 35 (ganan antes por precedencia). La insignia sale por evento: `fullPricePerGroup = 0` (REQ-095). Etiqueta pública: «Free tour» | Activo |
| 7 | `circuito` | Circuito (varios días) | Trip `circuito`; o duración ≥ 1440 min; o «N días / N days / overnight / multi-day» en el título | Activo (viajes propios) |
| 8 | `excursion-dia` | Excursión de un día | FREETOUR 4; o duración ≥ 360 min con «excursión/day trip/full day/desde/from» en el título; o Trip `tour` de 1 día con esas palabras | Activo |
| 9 | `caminata` | Caminata (tour a pie) | FREETOUR 12 o 10 con precio > 0 | Activo |
| 10 | `experiencia-unica` | Experiencia única | FREETOUR 7, 16, 18, 21, 23, 27, 32, 33, 34; o cat 5 con «clase/taller/cooking» en el título; Trip `unica` | Activo |
| 11 | `tour` | Tour | Todo lo guiado de pago que no cae arriba (FREETOUR 3, 5, 19, 22, 25, 13, 14); Trip `tour` | Activo |
| 12 | `a-la-medida` | Viaje a la medida | Trip `personalizado` | Activo (a cotizar) |
| — | `crucero` | Crucero | Varios días en barco | Tras bandera (0) |
| — | `por-revisar` | (sin mapear) | `categoryId` nuevo o histórico (1, 2, 6, 9) | Oculto; alerta en el log del sync; no aborta |

**Formato → `CartItem.tipo`** (decisión del 5-11): pieza-libre → `free_tour` · caminata, tour y experiencia-unica → `tour` · excursion-dia → `day_trip` · entradas y autoguiado → `tickets` · traslado → `transfer` · transporte → `transport` · alquiler → `car_rental`. Circuito y a-la-medida no tienen tipo porque se cotizan; si un día se reservan, será un REQ nuevo con `multi_day`.

### 4.2 Eje B: Tema (Taxonomía 2 depurada)

| Slug | Nombre | Absorbe (de la Taxonomía 2) | Categorías de FREETOUR que lo implican |
|---|---|---|---|
| `cultural` | Cultural e historia | Cultural, Temática (misterio, leyendas), Educativo (parte histórica) | 22, 24, 27 |
| `urbano` | Ciudad y barrios | Urbano | 12, 19, 10 |
| `gastronomia` | Gastronomía | Experiencias gastronómicas | 5 |
| `naturaleza` | Naturaleza | Naturaleza, Ecoturismo, Avistamiento de aves | 25, 35 |
| `montana-senderismo` | Montaña y senderismo | Montaña, Senderismo, Hikes (caminatas), Trekks (pistas), Trekking | ninguna (por palabra clave) |
| `aventura` | Aventura | Aventura, Escalada, Escalada en roca, Espeleísmo, Aventura extrema | 16, 18, 23 |
| `playa-mar` | Playa y mar | Playa, Buceo | 3, 32 |
| `noche-espectaculos` | Noche y espectáculos | (nuevo, lo usan los proveedores) | 7, 27 |
| `religioso` | Religioso y espiritual | Religioso | ninguna (por palabra clave) |
| `bienestar` | Bienestar | Bienestar, Relax, Salud (solo spa, termas y yoga) | 33 |
| `talleres-aprendizaje` | Talleres y aprendizaje | Educativo | 34 |
| `deportivo` | Deportes | Deportivo | 10, 23 |
| `parques-ocio` | Parques y ocio | Parques temáticos | 21, 35 |

**Términos que sobran**, con el motivo:
- **Ecoturismo-Cultural:** es la suma de Naturaleza y Cultural, y un producto puede llevar dos temas.
- **Trekks, Trekking, Hikes y Senderismo:** son sinónimos. Quedan como sinónimos de búsqueda de `montana-senderismo`.
- **Escalada y Escalada en roca:** están duplicadas. Pasan a ser sinónimos de `aventura`.
- **Relax:** se funde en Bienestar.
- **Salud:** turismo médico. No hay inventario y prometer salud es riesgoso. Lo que es spa va a Bienestar.
- **Temática:** es demasiado vago. Lo concreto se reparte: leyendas en Cultural, cine en Parques y ocio.
- **Educativo:** pasa a Talleres y aprendizaje; los grupos escolares serían una modalidad.

### 4.3 Facetas opcionales

| Faceta | Valores | Fuente del dato | Estado |
|---|---|---|---|
| Duración (horas) | < 2 h · 2–4 h · 4–8 h · > 8 h | `durationMinutes` | Activa (ya existe el slider, REQ-056) |
| Duración (días, Taxonomía 3) | 1–5 · 6–9 · 10–14 · 15+ | `Trip.durationDays` | Activa en circuitos (reemplaza 1–5 / 6–14 / 15+: casi todo Asia y Perú caía en 6–14) |
| Precio | Propina · < 30 · 30–80 · > 80 EUR (con MXN aprox.) | `priceValue` y la moneda | Activa (PriceSlider) |
| Presupuesto (Taxonomía 5) | **Reemplazada** por la faceta de confort (§4.5) | — | — |
| Cómo te mueves (Taxonomía 9) | A pie · Bici · Vehículo · Barco · Tren · Avión | Categoría y título | Activa: a pie, bici, vehículo y barco |
| Privado | sí/no | Palabra «private/privado» en el título; `options` en propios | Activa (filtro `privado`) |
| Nocturno | sí/no | Palabra en el título o cat 7 | Activa |
| Modalidad (Taxonomía 4) | **Dividida** en tipo de grupo, tipo de guía y perfil del viajero (§4.5) | — | — |
| Temporada (Taxonomía 8) | Estaciones, alta, media y baja | Sin dato (`availability.seasons` en propios) | Tras bandera |
| Accesibilidad | Silla de ruedas | `Trip.accessibility` vacío en los 176; FREETOUR no lo trae | Tras bandera; nunca se infiere |
| Eventos especiales (Taxonomía 7) | Festivales, ferias, congresos… | Sin inventario | Tras bandera |
| Etiquetas especiales (Taxonomía 10) | **Pasan al eje C** (§4.4) | — | «Experiencia local» no se usa como etiqueta: el copy «guía local» ya existe y aplicaría a casi todo. |

### 4.4 Eje C: Atributos (de 0 a N por experiencia)

Se inspira en las etiquetas combinables de Google Things to do y Viator. Los pares que se excluyen se validan por test: guiado/autoguiado, privado/grupo pequeño y familias/solo adultos.

| Slug | Nombre | Fuente del dato | Estado |
|---|---|---|---|
| `privado` | Privado | «private/privado» en el título; `options` (REQ-053) | Activo (388) |
| `nocturno` | Nocturno | Título o cat 7 | Activo (238) |
| `medio` | Cómo te mueves: a pie · bici · vehículo · barco (tren y avión solo en circuitos) | Categoría + título | Activo |
| `idioma-es` | En español | Idiomas del evento o del viaje; nunca la garantía fija | Activo donde haya dato |
| `calificacion` | Calificación | Solo reseñas reales (REQ-100) | Activo (FREETOUR) |
| `favorito` | ★ Favorito de los viajeros | Calificación ≥ 4.7 y un mínimo de N reseñas | Gate G11 |
| `vuelo-incluido` | Con vuelo | `flightsIncluded` | Activo |
| `franja-horaria` | Mañana · tarde · noche; hoy · mañana | Hora del evento (falta confirmar si el sync la guarda) | Tras bandera |
| `grupo-pequeno`, `familias`, `solo-adultos`, `parejas`, `sin-filas`, `apto-lluvia`, `cancelacion-gratis`, `confirmacion-inmediata`, `sostenible`, `vip` | — | Sin dato hoy | Tras bandera |
| `accesibilidad` | Silla de ruedas · visual · auditiva (sí/no) | Casillas capturadas; nunca inferir | Tras bandera (migración) |

### 4.5 Eje D: Facetas de circuitos (solo viajes propios de varios días)

| Faceta | Valores | Inspiración | Estado |
|---|---|---|---|
| Tipo de grupo | En grupo · Privado · A la medida | TourRadar | Activo (`trip.ts`) |
| Dificultad física | 1 Relajado · 2 Ligero · 3 Moderado · 4 Exigente · 5 Muy exigente | G Adventures, TourRadar | Activa donde haya dato; la escala la firma el PO |
| Confort | Básico · Esencial · Confort · Premium, definido por lo que incluye (hotel, transporte, traslados); Genki Lite/Esencial/Plus/Premium es la línea de Japón | Intrepid | Tras bandera; hoy solo FCH «Gran Lujo» lo declara |
| Tipo de guía | Guiado · Semiguiado · A tu aire | TourRadar, Exoticca | Tras bandera; «A tu aire» sin inventario |
| Perfil del viajero | Parejas y luna de miel · Familia · Viajero solo · 60+ · 18–35 · Negocios | Intrepid, Exoticca | Tras bandera; luna de miel como colección con landing cuando haya inventario |
| Altitud | Indicador de altura | Inferencia propia (Andes) | Tras bandera |

### 4.6 Destino y entorno (de Categorias.xlsx, oct 2023)

- **Región** (Riviera Maya, Alsacia) y **atracción ícono** (Machu Picchu, Torre Eiffel): tras bandera, sin dato.
- **Biomas** (playa e islas, montaña, grutas): son sinónimos de los temas playa-mar, montana-senderismo y aventura/naturaleza.
- **Pueblos Mágicos:** colección de destino, tras bandera.
- **Idiomático y De temporada:** tras bandera. **Estético** se descarta por riesgo de promesa médica.

---

## 5. Diccionario

El CSV tiene todas las columnas. Aquí va la versión legible. «Ejemplos» son títulos reales del catálogo con su slug o código.

### 5.1 Formatos

| Slug | Para el cliente (1–2 frases) | Regla operativa | Sinónimos de búsqueda | Ejemplos reales |
|---|---|---|---|---|
| `pieza-libre` | Recorrido con guía local en el que reservar es gratis; al final le das al guía lo que consideres justo. Si el grupo es grande, el proveedor puede aplicar una tarifa fija y te avisamos antes de reservar. | `priceValue = 0`; insignia solo con `fullPricePerGroup = 0` para el grupo | free tour, tour gratis, tour gratuito, free walking tour, visita gratuita, tour a propina, tip tour, la primera pieza | Free Tour de Budapest (`free-tour-de-budapest`); El original free tour de Berlín (`el-original-free-tour-de-berlin`) |
| `caminata` | Recorrido guiado a pie con precio fijo. | FREETOUR 12/10 con precio > 0 | walking tour, tour a pie, recorrido a pie, paseo guiado, visita a pie | Recorrido a pie por Madrid: Bebida y pintxo (`recorrido-a-pie-por-madrid-bebida-y-pintxo`); Visita guiada al Bairro Alto y al centro de Lisboa |
| `tour` | Visita guiada con precio, en vehículo, bici, barco o mixta, que dura menos de un día. | Resto de lo guiado de pago (3, 5, 19, 22, 25, 13, 14); Trip `tour` | tour, visita guiada, city tour, recorrido | Balkan Bites: recorrido gastronómico (`balkan-bites-recorrido-gastronomico`); City Tour Virreinal de Lima [IWP-LIM-01] |
| `excursion-dia` | Sales de la ciudad y vuelves el mismo día. | FREETOUR 4 o duración ≥ 6 h con «excursión/desde/day trip» | excursión, day trip, full day, desde, viaje de un día | Excursión en grupo: molinos de viento, Edam, Volendam y Marken; Paracas e Islas Ballestas desde Lima [IWP-LIM-08] |
| `circuito` | Viaje de varios días con itinerario y noches incluidas. | Trip `circuito`; ≥ 1440 min; «N días» | circuito, paquete, viaje de varios días, multi-day, tour de X días | Colombia Esencial: Bogotá, Medellín y Cartagena, 8 días [DCO-PC-016]; China: Beijing-Xi'an-Shanghai 8 días [FCH] |
| `experiencia-unica` | Actividad para hacer, no solo para ver: talleres, clases, espectáculos, aventura o vida nocturna. | FREETOUR 7, 16, 18, 21, 23, 27, 32, 33, 34; cat 5 con «clase»; Trip `unica` | experiencia, actividad, clase, taller, pub crawl, show | Tour por los bares de Dublín (`tour-por-los-bares-de-dublin`); Tour de degustación de cerveza en Praga |
| `entradas` | Boleto o pase para entrar a una atracción, museo o varias atracciones. | FREETOUR 20, 24, 28, 35 o palabra «entrada» en cat 13/14 | entradas, tickets, boletos, sin colas, skip the line, city pass, pase | Recorrido a pie por Mdina y Rabat con entrada a las catacumbas (cat 14) |
| `autoguiado` | Recorres a tu ritmo con una audioguía o una app; no hay guía en persona. | FREETOUR 17 | audioguía, audio guide, autoguiado, self-guided | 29 tours de cat 17 (ninguno con más de 40 reseñas) |
| `transporte` | Bus turístico o transporte para moverte por la ciudad; subes y bajas cuando quieras. | FREETOUR 30, «hop-on», Trip `transporte` | hop on hop off, bus turístico, big bus, transporte | Bus turístico hop-on hop-off en Nueva York [BBT-NYC] |
| `traslado` | Te llevan del aeropuerto, la estación o el puerto a tu hotel. | FREETOUR 29, Kiwitaxi | traslado, transfer, aeropuerto, shuttle, taxi | Kiwitaxi (/traslados); 3 de FREETOUR en cat 29 |
| `a-la-medida` | Lo armamos contigo; tu asesor te cotiza. | Trip `personalizado` | a la medida, personalizado, cotizar | Machu Picchu Premium o Luxury a cotizar [IWP-MP-06] |
| `alquiler` (tras bandera) | Renta de bici, moto o auto. | FREETOUR 26 | renta, alquiler, rent a car | 0 |
| `crucero` (tras bandera) | Crucero de varios días. | Por definir | crucero, cruise | 0 |

### 5.2 Temas

Las definiciones para el cliente, los sinónimos y los ejemplos completos están en el CSV. Ejemplos reales:
- **Cultural:** Free Tour Budapest: Barrio Judío y Holocausto; Visita guiada gratuita por el casco antiguo de Riga.
- **Gastronomía:** Visita gratuita de Bruselas y degustación de chocolate; Tour Gastronómico en Lima [IWP-LIM-02].
- **Noche y espectáculos:** Free Tour Córdoba Nocturna; Free Tour Budapest Nocturno.
- **Religioso:** Visita guiada gratuita sobre Gaudí, la Sagrada Familia y el modernismo.
- **Naturaleza:** Paseo gratuito por Central Park; Freiburg Free Tour: la puerta de la Selva Negra.
- **Aventura:** circuitos de Inca World (Lares Trek y Machu Picchu 5 días).

---

## 6. Clasificación de ensayo (no se escribió nada)

Script: `scratchpad/taxo-ensayo/clasificar.py`. Resultado: `scratchpad/taxo-ensayo/resultado.json`.

Entradas:
- 8,200 tours en el respaldo, de los cuales 8,018 están activos.
- Títulos y resúmenes en es y en.
- 176 viajes propios únicos (Inca World MP-01 aparece duplicado en `incaworld-mp01-precio.json`).

### 6.1 Tours por categoryId (activos) y formato asignado

| categoryId | Nombre FREETOUR | Total | Free | De pago | Formato resultante en el ensayo |
|---|---|---|---|---|---|
| 3 | Cruceros y barcos | 119 | 1 | 118 | tour 91 · excursión 26 · pieza libre 1 · circuito 1 |
| 4 | Viajes de 1 Día | 1,109 | 72 | 1,037 | excursión 1,032 · pieza libre 72 · circuito 5 |
| 5 | Tour Gastronómico | 407 | 116 | 291 | tour 205 · experiencia 81 · pieza libre 116 · excursión 5 |
| 7 | Vida Nocturna | 138 | 32 | 106 | experiencia 102 · pieza libre 32 · excursión 4 |
| 8 | Tour Online | 124 | 3 | 121 | **fuera 124** |
| 10 | Tour Corriendo | 20 | 12 | 8 | pieza libre 12 · caminata 6 · circuito 2 |
| 12 | Tour a Pie | 4,627 | 3,096 | 1,531 | pieza libre 3,096 · caminata 1,509 · excursión 21 · circuito 1 |
| 13 | Otros | 463 | 37 | 426 | tour 374 · excursión 24 · pieza libre 37 · entradas 15 · traslado 7 · circuito 6 |
| 14 | Top selección | 25 | 1 | 24 | tour 19 · entradas 2 · excursión 2 · pieza libre 1 · traslado 1 |
| 16 | Tours de aventura | 76 | 9 | 67 | experiencia 60 · excursión 7 · pieza libre 9 |
| 17 | Audioguías | 29 | 0 | 29 | autoguiado 29 |
| 19 | Tours en vehículo | 442 | 43 | 399 | tour 342 · excursión 53 · pieza libre 43 · circuito 4 |
| 20 | Entradas | 7 | 0 | 7 | entradas 7 |
| 21 | Juegos y ocio | 122 | 1 | 121 | experiencia 121 · pieza libre 1 |
| 22 | Sitios históricos | 28 | 12 | 16 | tour 13 · pieza libre 12 · excursión 3 |
| 23 | Deportes de motor | 1 | 0 | 1 | experiencia 1 |
| 24 | Museos | 6 | 4 | 2 | entradas 6 (incluye 4 que tienen precio 0: van como Entradas, no como Pieza libre) |
| 25 | Naturaleza y parques | 256 | 32 | 224 | tour 168 · excursión 45 · pieza libre 32 · circuito 11 |
| 27 | Espectáculos | 2 | 0 | 2 | experiencia 2 |
| 29 | Traslados | 3 | 0 | 3 | traslado 3 |
| 30 | Transporte público | 1 | 0 | 1 | transporte 1 |
| 32 | Actividades acuáticas | 3 | 0 | 3 | experiencia 2 · excursión 1 |
| 33 | Bienestar | 1 | 0 | 1 | experiencia 1 |
| 34 | Talleres | 9 | 0 | 9 | experiencia 9 |
| 18, 26, 28, 31, 35 | Aviación, Alquileres, Pases, Servicios, Zoos | 0 | — | — | Sin tours hoy; mapeo listo |

### 6.2 Conteo por formato

| Formato | FREETOUR | Propios | Total |
|---|---|---|---|
| Pieza libre | 3,464 | — | 3,464 |
| Caminata | 1,515 | — | 1,515 |
| Tour | 1,227 | 43 | 1,270 |
| Excursión de un día | 1,222 | 6 | 1,228 |
| Experiencia única | 369 | 0 | 369 |
| Circuito | 30 | 94 | 124 |
| Entradas y pases | 28 | — | 28 |
| Autoguiado | 29 | — | 29 |
| Transporte turístico | 1 | 29 | 30 |
| Traslado | 9 | (Kiwitaxi por widget) | 9 |
| A la medida | — | 4 | 4 |
| **Fuera (online)** | 124 | — | 124 |
| **Sin formato** | **0** | **0** | **0** |

Nota: 3,471 tours tienen `priceValue = 0`, pero solo 3,464 quedan como Pieza libre. Los otros 7 (3 online y 4 de museos) caen antes por precedencia.

### 6.3 Conteo por tema (multi-etiqueta, máximo 3)

| Tema | FREETOUR | Propios |
|---|---|---|
| Ciudad y barrios | 5,634 | 39 |
| Cultural e historia | 2,344 | 104 |
| Gastronomía | 738 | 1 |
| Naturaleza | 628 | 16 |
| Parques y ocio | 450 (⚠ incluye tours de «Juego de Tronos» por la palabra «game»; revisar) | 0 |
| Noche y espectáculos | 389 | 2 |
| Aventura | 389 (⚠ falsos positivos como «Casa Cueva») | 23 |
| Playa y mar | 343 | 5 |
| Religioso | 247 | 6 |
| Montaña y senderismo | 183 | 5 |
| Deportes | 140 | 0 |
| Talleres y aprendizaje | 90 | 0 |
| Bienestar | 44 | 0 |

- **Sin tema:** 275 de FREETOUR (excursión 94, tour 47, traslado 4, entradas 2, circuito 2, pieza libre 2), sin contar los 124 online.
- **Por número de temas:** 4,360 tours con 1, 2,890 con 2 y 493 con 3.

**Facetas (FREETOUR):**
- **A pie:** 4,894 · **vehículo:** 417 · **barco:** 169 · **bici:** 104
- **Privado:** 388 · **nocturno:** 238
- **Duración:** < 2 h 1,544 · 2–4 h 4,820 · 4–8 h 1,094 · > 8 h 560
- **Precio:** propina 3,471 · < 30 € 2,025 · 30–80 € 1,578 · > 80 € 944

**Lectura:**
- El Formato es confiable porque sale de la categoría y el precio del proveedor.
- El Tema depende de palabras clave y tiene ruido conocido. Antes de mostrarlo hay que revisar a mano una muestra de 200 (gate G4): si la precisión baja de 90 %, ese tema no se publica.
- «Ciudad y barrios» marca el 70 % del catálogo: sirve como base, no como filtro que distinga.

---

## 7. Mantenimiento: cómo crece la lista con cada proveedor

1. **Tabla de mapeo en el repo**, revisada por PR (no en D1). Propuesta: `src/taxonomy/mapping/{provider}.json`, con estas columnas:
   - `provider_id`, `provider_category_id` y `provider_category_name` (por idioma, tal cual);
   - `formato` (o `fuera`), `temas[]` y `notas`;
   - quién lo revisó y la fecha.

   El diccionario es `src/taxonomy/dictionary.json`, con slug, nombres en 6 idiomas, definiciones, sinónimos y estado. Lo validaría Zod en el build. La lógica iría en `src/taxonomy/lib/classify.ts` (pura): `classify(product, mapping, dictionary) → { formato, temas, facetas, reglas[] }`.
2. **Alerta de categorías nuevas:** el sync (Ola 1) compara las categorías de FREETOUR (`/categories` o los `categoryId` vistos) con el mapeo.
   - Si hay una sin mapear, el tour queda con `formato = por-revisar`: se oculta de los filtros, de Destinos y de los carruseles, pero sigue en /tours.
   - El sync escribe la alerta en el log de la corrida y en STATUS.md («categorías sin mapear: N»).
   - El sync **no se aborta** por esto.
3. **Proveedor nuevo** (BeMyGuest, GYG, Viator, Civitatis): un archivo de mapeo nuevo con sus categorías o tags, y una prueba con fixtures que cubra cada categoría. No se toca el clasificador.
4. **Viajes propios:** el formato sale de `kind` y el tema de `category`. Si el gestor suma temas, el enum `CATEGORIES` se amplía en el mismo PR que el diccionario.
5. **Métrica en STATUS.md:** porcentaje de experiencias sin tema (meta < 5 %), categorías sin mapear (meta 0) y precisión de la última muestra.
6. **Sinónimos del buscador:** salen del diccionario y alimentan una expansión de consulta en `src/search/lib/` (ver la skill buscador-multilingue-tolerante). La tabla FTS no se toca.

---

## 8. Barrido integral: dónde se usan hoy las categorías y los tipos

| # | Lugar | Campo que usa | Problema o incoherencia | Archivo:línea | Propuesta |
|---|---|---|---|---|---|
| 1 | Filtro «Tipo de actividad» de /tours | `categoryGroupOf(categoryId)` | El grupo `visitas` («Visitas guiadas y **free tours**») mete juntos 3,096 free, 1,531 tours a pie de pago, 29 **audioguías** (sin guía) y running. El nombre promete «free tours» para productos de pago. | `src/tours/lib/extra-filters.ts:17` | Reemplazar los grupos por el Eje A (Pieza libre · Caminata · Tour · Excursión · …) y sacar 17 a «Autoguiado». |
| 2 | Filtro /tours, grupo `otros` | categorías 13, 14, 31 y 8 | Los tours **online** (124) y «Top selección» caen en «Otros». «Otros» tiene 463 tours que en realidad son tours, excursiones, entradas o traslados. | `extra-filters.ts:26` | Dejar «fuera» para 8 y clasificar 13/14 por palabras clave (§4.1). |
| 3 | Filtro /tours, grupo `excursiones` | categorías 4 y 25 | «Naturaleza y parques» (256) se cuenta como excursión aunque el 66 % sean tours de menos de 6 h. Mezcla formato con tema. | `extra-filters.ts:20` | 25 pasa al tema Naturaleza; el formato se decide por duración y título. |
| 4 | Filtro /tours, grupo `transporte` | categorías 29, 30, 26 | Los traslados de FREETOUR se muestran como tours de /tours, mientras que Kiwitaxi vive en /traslados. Dos lugares para lo mismo. | `extra-filters.ts:24` | Formato Traslado en /traslados (registro de complementos). Los 3 de FREETOUR quedan fuera de /tours. |
| 5 | Viajes propios en el filtro | `ownTripGroup(kind, category)` | `unica` y `personalizado` caen por su categoría («cultural» → «visitas», es decir, «free tours»). Un viaje a la medida aparece como «Visitas guiadas y free tours». `sol-y-playa` → «excursiones» aunque sea un tour. | `extra-filters.ts:73-77` | Formato desde `kind` y tema desde `category`, cada uno en su eje. |
| 6 | API pública /api/tours | `categoryId` crudo | Expone el id del proveedor como filtro público. Si cambia el proveedor, se rompen los enlaces. | `src/app/api/tours/route.ts:20` | Filtro por `formato` o `tema` (slug TP). `categoryId` solo interno. |
| 7 | Filtro por categoría en la consulta | `categoryId === f.categoryId` | Funciona, pero solo existe para FREETOUR. | `src/catalog/lib/query.ts:111,117` | Igual que #6. |
| 8 | /destinos/{país}/{ciudad} | `isFreeTour = price === 0` → secciones Free tours / Tours | «Tours» mezcla excursiones de un día, audioguías, online, traslados de FREETOUR y entradas. Los online no son de la ciudad. | `src/destinations/lib/catalog.ts:101,150-151`; `src/app/destinos/[pais]/[ciudad]/page.tsx:45-55` | **Homologado con la decisión del 5-11:** se quedan las 3 secciones firmadas (Free tours · Tours · Traslados). Dentro de «Tours», chips de formato (caminata, tour, excursión, experiencia, entradas, autoguiado) y de tema que ordenan y filtran. Online fuera. |
| 9 | Indexación de ciudades (≥ 3 tours) | Conteo de todos los tours activos | Los tours **online** y las audioguías cuentan para que una ciudad sea indexable. | `src/catalog/guarded-repository.ts:166`; `src/destinations/lib/catalog.ts:143-144` | Contar solo los formatos con experiencia presencial (excluir `fuera`). |
| 10 | Ficha (`page-model`) | `isFreeTour` | La descripción dice «{Free tour/Tour} en {ciudad} **con un guía local**» también para audioguías (17) y online (8). Es una promesa falsa (CLAUDE.md: «el copy solo promete lo que hay»). | `src/destinations/lib/page-model.ts:171` | El copy depende del formato: autoguiado dice «a tu ritmo con audioguía», excursión dice «Excursión desde {ciudad}». |
| 11 | Title SEO de la ficha | `isFreeTour` → «Free tour» / «Tour» | Una excursión de un día o una entrada se titula «– Tour en {ciudad}». | `src/seo/lib/titles.ts:22-23` | **Homologado:** se queda el patrón firmado («– Free tour en {Ciudad}» / «– Tour en {Ciudad}»). El patrón por formato («– Excursión desde {ciudad}») queda como opción de gate y cambiaría REQ-099. |
| 12 | Carrusel «Ya tienes tu primera pieza» | El adaptador FREETOUR declara `types: ["free_tour","tour"]` | `day_trip` y `tickets` nunca se llenan con FREETOUR, aunque hay 1,222 excursiones y 28 entradas. La regla de Perú, «excursiones y tickets primero», no tiene con qué llenarse. | `src/cart/adapters/freetour.ts:39`; `src/cart/lib/page-model.ts:46-48`; `src/companions/lib/carousel.ts:13-16` | Mapeo del formato al `CartItemType` (§4.1): pieza-libre → `free_tour`, caminata/tour/experiencia → `tour`, excursion-dia → `day_trip`, entradas/autoguiado → `tickets`, transporte → `transport`, traslado → `transfer`, alquiler → `car_rental`. |
| 13 | Registro de complementos (Big Bus) | `category: "tickets"`, `group: "transporte"` | Big Bus es **tickets** en el carrusel, **transporte** en /traslados y `kind = transporte` (letra M) en el gestor: tres clasificaciones. En el carrusel, `transport` se titula «Transporte entre ciudades», lo que no describe un hop-on. | `src/companions/registry.json` (entrada `bigbus`); `src/cart/lib/page-model.ts:43` | Formato Transporte turístico en los tres lugares, con su propio título en el carrusel («Bus turístico»). |
| 14 | Venta cruzada de viajes propios | Tours del país por reseñas, sin filtrar | Puede sugerir tours **online**, traslados o audioguías de FREETOUR como «tour para tu viaje». | `src/trips/cross-sell-deps.ts:13-16` | Filtrar los formatos presenciales (Tour, Caminata, Excursión, Experiencia, Pieza libre). |
| 15 | Home: destacados | `priceValue = 0` (free) y `> 0` (de pago, con `PAID_TOURS_ENABLED`) | Los destacados de pago pueden incluir online (121 de pago). | `src/home/load.ts:127-128` | Excluir `fuera`. |
| 16 | /la-primera-pieza | `isFreeTour` (`price = 0`) | Correcto como colección, pero incluye 3 online free y 4 museos con precio 0. | `src/app/la-primera-pieza/page.tsx:27-28` (vía `catalog.ts:150`) | Pieza libre = `price 0` y formato presencial. |
| 17 | Buscador (FTS5, `SEARCH_V2`) | title, brief, place | No indexa formato, tema ni sinónimos. «Tour gratis» solo encuentra lo que diga «gratis» en el título. «Excursión» solo encuentra las excursiones que traen esa palabra en el título o el resumen, no todas las de la categoría 4 «Viajes de 1 Día». | `src/search/lib/fts-query.ts:9-15`; `migrations/0011_busqueda_fts.sql:4-11` | Expansión de consulta con los sinónimos del diccionario (lib pura) y facetas como filtros; sin migración. |
| 18 | Sitemaps | slug y estado | No usan categoría. Las fichas de online y audioguías entran al sitemap. | `src/seo/lib/sitemaps.ts:42` | Excluir `fuera`; las audioguías se quedan. |
| 19 | Datos de prueba | `categoryId: 9` y `6` | Son ids que no existen en el catálogo oficial. | `src/lib/mock-data.ts:65,175` | Usar ids reales (12 y 4) para que los tests se parezcan a producción. |
| 20 | Nombres de las categorías de FREETOUR | — | No están ni en D1 ni en el repo; solo hay ids escritos a mano. | `extra-filters.ts:15-27` | Mapeo con nombres originales (§7). |

---

## 9. Control estricto de identidad (REQ-069, `docs/diccionario-datos.md`)

**Regla:** nunca mezclar ni sobrescribir el nombre o el código del proveedor con los de Travel Puzzle.
- Lo del proveedor se guarda **tal cual, por idioma, sin editar**.
- Lo de Travel Puzzle va en campos propios.
- Lo que se ve en pantalla se calcula al renderizar (skill sitio-destinos §4).

### 9.1 Campos por entidad (propuesta)

| Entidad | provider_id | Código del proveedor | Nombre original del proveedor | Código TP | Nombre TP | Slug | Categoría del proveedor | Categoría TP |
|---|---|---|---|---|---|---|---|---|
| Experiencia FREETOUR (`Tour`) | `providerId` = `freetour` (existe) | `externalId`. Hoy es Int **@unique global**; debe ser texto y único solo junto con `providerId`. | `TourTranslation.title`/`brief` por idioma (existe; es lo que entrega FREETOUR). `providerTitle` es el **nombre del operador** (p. ej. «Free Tour Budapest»), no el título del tour. | `Tour.id` (cuid) = `tour_uid` | No existe ni debe existir para FREETOUR: el H1 es el título real (C4, REQ-094). Solo se permite el sufijo «(operador)» en homónimos (`page-model.ts:164`). | `Tour.slug` (existe; congelado) | `categoryId` (existe) + nombre original (falta: mapeo §7) | `formato` y `temas[]` calculados (no se guardan en Tour; si se cachean, en una tabla aparte) |
| Viaje propio (`Trip`) | `agencyId` → `Agency.initials` (IWP, FCH, DCO, TAS, BBT). Falta un `provider_id` estable en texto. | **Falta.** Hoy la referencia del operador (`ref`: LIM-01, PC-016, NYC) solo vive dentro de `Trip.id` en minúsculas (`idFor`, `bulk-import.ts:38-39,63`), y de ahí no se recupera tal cual. | **Falta.** `titleEs` es el nombre editorial TP; el nombre del PDF del DMC («PC 016 - Colombia Esencial Bog Mde Ctg 7N») no se guarda. | `Trip.code` (IWP-PE-T01-001; BBT-…), congelado al publicar | `titleEs`/`titleEn` | `Trip.slug` | **Falta.** Los DMC no mandan categoría; el campo quedaría en null. | `kind` (formato) + `category` (tema) |
| Ciudad (`City`) | Implícito: FREETOUR | `City.id` **es** el `cityId` de FREETOUR: el código del proveedor se usa como llave TP. | `City.translations` (de FREETOUR) | `city_code` = geonameid (`City.geonameid`, REQ-085) | Por ahora el mismo nombre; un nombre editorial iría aparte | `City.slug` | — | — |
| País (`Country`) | Implícito: FREETOUR | `Country.id` = `countryId` de FREETOUR | `Country.translations` | `iso2` | — | iso2 en minúsculas | — | — |
| Categoría | `freetour` | `categoryId` | `title` por idioma (de `/categories`) | slug de formato o tema | Nombre en el diccionario TP | slug | ella misma | mapeo §7 |
| Viaje propio → ciudad | — | — | `Trip.cities` es una lista de **nombres** en texto («Lima»), no ids | — | — | — | — | — |

### 9.2 Hallazgos de identidad

1. **`Tour.externalId Int @unique`** (`prisma/schema.prisma`, modelo Tour). El diccionario dice «texto» y la llave natural es `(providerId, externalId)`. Con un segundo proveedor por API (BeMyGuest usa uuid), el entero único global choca o no cabe. Arreglo: columna aditiva `externalRef TEXT`, con único `(providerId, externalRef)`, en una migración nueva que solo agrega. No se borra nada.
2. **`City.id` y `Country.id` son los ids de FREETOUR.** El código del proveedor funciona como identidad TP. Si entra otro proveedor con su propio id de ciudad, no hay dónde cruzarlo. Arreglo: tabla `CityProviderRef(providerId, externalCityId, cityId)` y usar `geonameid` como `city_code` (ya planeado en la Ola 3).
3. **`providerTitle` es un nombre engañoso:** guarda el nombre del **operador** («Free Tour Budapest»), no el título. Arreglo: documentarlo en el diccionario como `provider_operator_name`, sin renombrar la columna.
4. **Viajes propios sin código del operador como dato.** `ref` solo existe en el JSON del import y queda dentro del `id` en minúsculas: `PC-016` pasa a `dco-pc-016`. Dos referencias que solo difieren en puntuación chocarían. Arreglo: `Trip.providerRef` (texto, tal cual) con único `(agencyId, providerRef)`.
5. **Viajes propios sin nombre original del operador:** solo existe el título editorial. Para conciliar con el tarifario del DMC hay que adivinar. Arreglo: `Trip.providerTitle` (texto tal cual, del PDF o la tarifa).
6. **Big Bus: `source` (la URL del producto en bigbustours.com) viene en el import, pero `Trip` no tiene esa columna**, así que se pierde. `ref` = «NYC» es la ciudad, no el código del producto Big Bus. Arreglo: `Trip.providerUrl` + `providerRef` con el código del producto del portal de partners.
7. **El código TP de un borrador puede cambiar.** `tripCode` depende de `kind`, `durationDays` y `seq`, y el upsert es `ON CONFLICT("code")` mientras el `id` sale de `ref` (`bulk-import.ts:56,63,81`). Si se reimporta un borrador con otra duración, el código cambia y el insert choca con el `id` existente. Arreglo: upsert por `id` (o por `(agencyId, providerRef)`) y código congelado desde la primera carga, aunque sea borrador.
8. **Precio duplicado de MP-01:** `incaworld-mp01-precio.json` repite IWP MP-01. La idempotencia funciona por `id`, así que no es un duplicado en la base, pero confirma que la identidad depende de `ref`.
9. **Categorías:** los ids viven a mano en el código y sus nombres originales no se guardan (§8 #20).
10. **Lo que está bien:** el H1 de FREETOUR es el título real; el sufijo de homónimos se calcula al renderizar; el slug está congelado por trigger; `Tour.id` (cuid) es independiente del proveedor.

### 9.3 Texto listo para `docs/diccionario-datos.md` (se agrega; no reemplaza lo que hay)

```markdown
## Identidad: lo del proveedor y lo de Travel Puzzle nunca se mezclan (REQ-069)

Regla: lo que viene del proveedor se guarda tal cual, por idioma, y nunca se edita ni se sobrescribe con texto o códigos de Travel Puzzle. Lo de Travel Puzzle va en campos propios. Lo que se muestra se calcula al renderizar.

| Entidad | Campo | Definición | Dueño | ¿Cambia? |
|---|---|---|---|---|
| Experiencia | `provider_id` | `Tour.providerId` (`freetour`, …) | Código | Nunca |
| Experiencia | `external_ref` | Id del proveedor en texto, tal cual (hoy `Tour.externalId` Int; *pendiente*: columna `externalRef` TEXT, única con `provider_id`) | Proveedor | Nunca |
| Experiencia | `provider_title[lang]` | `TourTranslation.title` por idioma, tal cual lo entrega el proveedor. Es el H1 (C4) | Proveedor | Solo con el sync |
| Experiencia | `provider_operator_name` | `Tour.providerTitle`: nombre del operador o guía («Operado por un guía local · {nombre}») | Proveedor | Solo con el sync |
| Experiencia | `tour_uid` | `Tour.id` (cuid) | Travel Puzzle | Nunca |
| Experiencia | `provider_category` | `Tour.categoryId` + nombre original por idioma (mapeo `src/taxonomy/mapping/{provider}.json`) | Proveedor | Solo con el sync |
| Experiencia | `tp_formato`, `tp_temas[]` | Calculados por `taxonomy/lib/classify.ts` desde el mapeo; nunca se escriben sobre el registro del proveedor | Travel Puzzle | Al cambiar el mapeo (PR) |
| Viaje propio | `provider_id` | `Agency.initials` (IWP, FCH, DCO, TAS, BBT) | Travel Puzzle | Nunca |
| Viaje propio | `provider_ref` | Código del producto en el tarifario del operador, tal cual (`LIM-01`, `PC-016`). *Pendiente*: `Trip.providerRef`, único con `agencyId` | Operador | Nunca |
| Viaje propio | `provider_title` | Nombre del producto en el tarifario del operador, tal cual. *Pendiente*: `Trip.providerTitle` | Operador | Con nueva tarifa |
| Viaje propio | `provider_url` | Página o archivo de origen. *Pendiente*: `Trip.providerUrl` | Operador | Con nueva tarifa |
| Viaje propio | `code` | Código TP `AGENCIA-REGIÓN-TIPO+DÍAS-NÚM`; se congela en la primera carga | Travel Puzzle | Nunca |
| Viaje propio | `title_es/en` | Nombre editorial TP | Travel Puzzle | Editorial |
| Viaje propio | `kind`, `category` | Formato y tema TP | Travel Puzzle | Editorial |
| Ciudad | `provider_city_ref` | Id de ciudad de cada proveedor. Hoy `City.id` = cityId de FREETOUR; *pendiente*: `CityProviderRef(providerId, externalCityId, cityId)` | Proveedor | Nunca |
| Ciudad | `city_code` | geonameid (`City.geonameid`) | Travel Puzzle | Solo se corrige |
| País | `provider_country_ref` | Hoy `Country.id` = countryId de FREETOUR | Proveedor | Nunca |
| País | `iso2` | ISO 3166-1 alfa-2 | ISO | Nunca |
| Categoría | `provider_category_id`, `provider_category_name[lang]` | Tal cual de `/categories` del proveedor | Proveedor | Solo con el proveedor |
| Categoría | `tp_slug` | Slug del diccionario de taxonomía (`src/taxonomy/dictionary.json`) | Travel Puzzle | Por PR |

Prohibido: reemplazar `provider_title` con un nombre TP, guardar el código TP en `external_ref` o `provider_ref`, o inferir `provider_ref` desde un `id` en minúsculas.
```

Las columnas «pendiente» necesitan una **migración aditiva**, que es candado. Lo decide el gate G7.

---

## 10. Choque con reglas firmadas y gates para el PO

**Reglas firmadas que se tocan:**
- REQ-093: menú Inicio · La Primera Pieza · Destinos · Tours · Traslados · Cómo Funciona.
- REQ-051: grupos de tipo de actividad.
- REQ-099: patrones de title.
- REQ-095/097: insignia y tours de pago.
- Skill sitelinks-google: los nombres del menú deben coincidir con el H1.
- C3/C6 de FREETOUR: Travel Puzzle no se presenta como operador y FREETOUR no se menciona.

Ninguna regla de FREETOUR prohíbe clasificar ni reagrupar; reorganizar el catálogo está permitido (regla I). El título real y el operador no se tocan (C4).

**G1. Menú «Experiencias»** (homologado 6 nov: la recomendación cambia a **D**)
- **D (recomendada, nueva).** Se queda el menú firmado (REQ-093) con «Tours». La taxonomía va como filtros `?formato=` y `?tema=` en /tours y como chips dentro de la sección «Tours» de cada ciudad. No se crea `/experiencias`. Motivos: las 5 agencias mexicanas revisadas dicen «Tours» y ninguna «Experiencias», y «Experiencias» ya es un valor de `?tipo=`, así que como pestaña significaría dos cosas.
- **A (ya no recomendada).** «Experiencias» ocupa el lugar de «Tours»: Inicio · La Primera Pieza · Destinos · **Experiencias** · Traslados · Cómo Funciona.
  - Sigue habiendo 6 pestañas, como en el menú firmado.
  - `/experiencias` es un hub con tarjetas por formato y tema.
  - `/tours` sigue vivo como listado con filtros, sin 301, y el hub enlaza a `/tours?formato=…`.
  - Va tras la bandera `EXPERIENCIAS_ENABLED=false`.
- **B.** «Tours» se queda y «Experiencias» entra como un submenú dentro de Tours. Esto choca con «menú = H1» para sitelinks.
- **C.** Agregar una 7.ª pestaña «Experiencias». Esto rompe REQ-093 y pide firmar un menú nuevo.

**G2. Qué es «Caminata»**
- **A (recomendada).** Tour guiado a pie de pago. Los free tours a pie son Pieza libre. El chip «Caminata» muestra los de pago; los free tours a pie están en La Primera Pieza.
- **B.** Todo lo que es a pie, incluida Pieza libre (como colección cruzada).
- **C.** Senderismo en naturaleza (Hikes).

**G3. Temas**
- **A (recomendada).** Los 13 temas depurados de §4.2, con los «sobra» como sinónimos.
- **B.** Los 26 términos tal como están en el documento.
- **C.** 8 temas mínimos: Cultural, Ciudad, Gastronomía, Naturaleza, Aventura, Playa, Noche y Bienestar.

**G4. Cómo se clasifica**
- **A (recomendada).** Reglas automáticas (categoría + precio + duración + palabras clave) y revisión manual de una muestra de 200. Un tema se publica solo con precisión ≥ 90 %. El formato se publica ya, porque sale de los datos del proveedor.
- **B.** Solo la categoría del proveedor, sin palabras clave. Habría menos temas y más tours sin tema.
- **C.** Clasificación manual de todo, lo que no escala a 8,000 tours.

**G5. Mantenimiento**
- **A (recomendada).** Mapeo y diccionario en el repo (JSON + Zod), cambios por PR, alerta de categorías sin mapear en el log del sync y en STATUS.md, y el tour queda `por-revisar` (oculto de los filtros) sin abortar el sync.
- **B.** Tabla editable en el admin (D1). Requiere migración y no deja historial de revisión.
- **C.** Seguir con los ids escritos a mano en el código, como hoy.

**G6. Lo que no es una experiencia presencial**
- **A (recomendada).** Los tours online (124) salen de los filtros, Destinos, indexación, sitemaps, home y venta cruzada, tras bandera. Las audioguías se quedan como «Autoguiado», sin «con un guía local».
- **B.** Dejarlo como hoy.
- **C.** Quitarlos solo del índice de Google.

**G7. Identidad**
- **A (recomendada).** Migración aditiva nueva (número por asignar después de la 0015), con:
  - `Tour.externalRef`;
  - `Trip.providerRef`, `providerTitle` y `providerUrl`;
  - `CityProviderRef`.
  
  Además, upsert de imports por `(agencyId, providerRef)` y backfill desde `imports/*.json`. Aplicar la migración es candado del PO.
- **B.** Solo documentar en el diccionario y no tocar el esquema por ahora.
- **C.** Guardar `ref` y el nombre original dentro de `Trip.translations` u otro JSON existente, sin migración. Esto mezcla los datos del proveedor con los editoriales y **no lo recomiendo**.

**G8. Facetas**
- **A (recomendada, homologada).** Encender lo que tiene dato: duración (horas y días 1–5 · 6–9 · 10–14 · 15+), precio, cómo te mueves, privado, nocturno, idioma español, calificación, vuelo incluido, tipo de grupo y dificultad (donde haya dato). Lo demás de §4.4–4.6 queda tras bandera `false`. Presupuesto pasa a confort y modalidad se divide en grupo, guía y perfil.
- **B.** Todas desde ya.
- **C.** Ninguna; solo los dos ejes.

**G9. Dónde vive la clasificación (§13)**
- **A (recomendada).** Las 6 tablas aditivas de §13.1, cargadas desde el repo y recalculadas en cada sync con barrera de cordura.
- **B.** Columnas `formato` y `temas` dentro de Tour y Trip. Esto mezcla datos del proveedor con datos TP y va contra §9.
- **C.** Sin base de datos: clasificar en memoria desde el JSON del repo en cada render. Es simple, pero no sirve para filtrar en SQL ni deja bitácora.

**G10. Imágenes del Drive (§11)**
- **A (recomendada).** No usar ninguna imagen del Drive hasta verificar su licencia. Si se usan, unir países por nombre → ISO-2, nunca por id.
- **B.** Usar las de países uniendo por nombre, después de verificar la licencia de cada una.
- **C.** Descartarlas y seguir con las fotos que da la API.

**G11. Favorito de los viajeros** (nuevo)
- **A (recomendada).** Calificación ≥ 4.7 **y** un mínimo de N reseñas (por ejemplo, 20). El PO firma N.
- **B.** Solo calificación ≥ 4.7. Un tour con 1 reseña de 5★ ganaría la insignia.

**G12. México en Destinos** (nuevo)
- **A.** México como bloque propio al nivel de los continentes, como hacen Mundo Joven y otras agencias mexicanas.
- **B.** México dentro de su continente, como hoy en `continents.ts`.

**REQ por registrar (número al abrir el PR, para no chocar con los que están en curso):**
- Diccionario y mapeo (G3/G5).
- Clasificador puro con tests por categoryId (G4).
- Filtros de /tours por formato y tema (G1-D/G2, reemplaza REQ-051).
- Chips de formato y tema dentro de la sección «Tours» de la ciudad (§8 #8).
- Atributos y facetas de circuitos (§4.4–4.5; los campos nuevos de Trip son migración).
- Excluir online (G6).
- Copy por formato (§8 #10-11).
- Carrusel con day_trip y tickets desde FREETOUR (§8 #12-13).
- Sinónimos del buscador (§8 #17).
- Identidad (G7).

Cada REQ va en su propio PR, con su bandera en `false` y prueba de humo con la bandera encendida en preview, según el blindaje de CLAUDE.md.

---

## Fuentes

- Taxonomia.docx (versión homologada en `docs/taxonomia/Taxonomia.docx`; el id del Drive no se publica en el repo público)
- [FREETOUR Partners API v2.2](https://www.freetour.com/docs/api-docs-v.2.2.json): `/categories` y `/tours`. Copias locales en `scratchpad/api21.json` y `scratchpad/ftdocs/`
- [Google Things to do: product categories](https://developers.google.com/travel/things-to-do/reference/feed-spec/product-category?hl=es-419)
- [GetYourGuide llms.txt](https://getyourguide.com/llms.txt)
- [Klook llms.txt](https://www.klook.cn/llms.txt)
- [Airbnb: The most in-demand experiences (26 jun 2025)](https://news.airbnb.com/the-most-in-demand-experiences-nature-cuisine-arts-and-sightseeing/)
- [Viator Partner glossary](https://partnerresources.viator.com/?p=5016)
- [Civitatis: guided tours Madrid](https://www.civitatis.com/en/madrid/guided-tours)
- [BeMyGuest schemas: categories](https://docs.bemyguest.com.sg/openapi/schemas/categories)
- [Big Bus Paris: other tours](https://www.bigbustours.com/en/paris/paris-tour-tickets-and-passes/other-tours)
- [Travelpayouts: Tours and activities programs](https://www.travelpayouts.com/blog/?p=4008)
- [Travelpayouts: Kiwitaxi](https://travelpayouts.com/blog/earn-on-selling-transfers-with-kiwitaxi/)

---

## 11. Archivos del Drive de Adri sobre Taxonomía y free tours (segunda ampliación)

Descargados en `scratchpad/paginas-nuevas/drive/` y leídos con `python -I` y openpyxl. Se tratan como datos no confiables. De cada nombre duplicado se usó la copia pedida por el PO; todas las copias tienen fecha de modificación del 27 oct 2025 (subida masiva del escritorio).

**Las 3 carpetas «Taxonomia»** (id omitido, id omitido, id omitido) se ven **vacías** para la API: la búsqueda por `parentId` no devuelve nada. O no tienen archivos o no hay permiso de lectura. **Pídele al PO que confirme.**

Las carpetas padre (id omitido, id omitido, id omitido) se ven así:
- **id omitido «Script Busqueda Imagenes Destino»:** scripts de Python para buscar imágenes (Freepik, MultiApi, Pexels), reportes de imágenes por id y las subcarpetas `Imagenes_FreeTour` (`Tours_Imagenes_Principales`, `Paises`), `Imagenes_Destinos_Paises_Travel_Puzzle_Free_Tour` e `Imagenes_Con_ID_Ciudad_Repetido`.
- **Carpetas «Historico Escritorio»:** copias del escritorio del PO. Lo personal no se revisó ni se usa, y su detalle no se publica en el repo público. Lo relevante son los xlsx y csv de países, ciudades e imágenes de la tabla siguiente.
- **Otro hallazgo:** el doc de Google «Ingeniería inversa lógica API FREE TOUR» (id omitido, del 27 nov 2025) no estaba en la lista del PO. **No lo leí.** Conviene revisarlo en una tarea aparte porque puede describir la lógica del sync de entonces.

| Archivo (id) | Hojas · columnas · filas | Para qué sirvió | ¿Sirve hoy? (cruce con D1 del 5 nov 2026) |
|---|---|---|---|
| **Reporte_Tours_FreeTour.xlsx** (id omitido, 6.6 MB) | Sheet1 · 32 columnas: `ID_Tour`, `Tour_Titulo_ES`, `Tour_Proveedor_Nombre`, resumen, descripción, URL, precio, moneda, duración, punto de encuentro (título, coordenadas, PlaceID), incluye, PDI, **`Tour_ID_Categoria`**, video, rating, reseñas, `Ciudad_ID_Asociada`, `Ciudad_Nombre_ES`, `Pais_ID_Asociado`, `Pais_Nombre_ES`, imagen del tour/país/ciudad (URL de la API y nombre local), galería | Export completo del catálogo de FREETOUR (en español) de 2025, con las imágenes bajadas a disco y renombradas `{ciudad}_{nombre}_tour_{id}_TravelPuzzle_{hash}.jpg` | **Leído parcialmente.** La descarga binaria falló (el archivo es demasiado grande para el conector). La versión en texto viene cortada a ~1 MB, de la que salen **95 filas completas** (Albania, Andorra y parte de Argentina). De esas 95, **55 siguen activas** con el mismo `externalId` y la misma ciudad, 50 mantienen la categoría, 49 el precio y 51 la imagen. Tiene **categorías que hoy no existen (1, 2, 6, 9)**: FREETOUR renumeró o retiró categorías, así que el mapeo debe tolerar ids que desaparecen. No sirve como fuente: el sync ya trae todo esto en vivo. **Falta revisar el archivo completo** (pedir al PO un CSV o pasarlo a Google Sheets). |
| **Pais o Ciudad Free tour.xlsx** (id omitido) | «Consulta»: Pais o Ciudad, ID (4,790 filas) · «Hoja1»: 3,772 filas (ciudades desde el id 1002) | Lista mezclada de países y ciudades con id para armar el buscador «país o ciudad» | **No por id:** países y ciudades comparten el mismo espacio de ids (Albania = 1 y Berat = 1). |
| **… Sin Imagen.xlsx** (id omitido) | «Consulta Completo» 4,642 · «Hoja1» 3,772 · «Consulta» 4,604 (Ciudad, ID, País) | Lista de lo que **no** tenía imagen | Sí como **lista de ciudades**: sus ids de ciudad coinciden con D1. Las imágenes no aplican. |
| **… con Imagen.xlsx** (id omitido) | Sheet1: Ciudad, ID, País, Nombre_Imagen · 4,604 filas | Ciudades con su imagen | **La columna Nombre_Imagen está vacía en las 4,604 filas.** Los ids de ciudad sí son los de FREETOUR: 967 están en D1 y 966 tienen el mismo nombre; 961 tienen tours activos hoy; 58 ciudades con tours hoy no están en el archivo. |
| **Destinos_Travel _Puzzle_Freetour.xlsx** (id omitido) | «Consulta»: Pais o Ciudad, ID · 2,085 filas (ids de 2,684 a 5,212) | Altas posteriores de ciudades (Japón, Australia…) | 522 están en D1 (521 con el mismo nombre) y 519 tienen tours. El resto ya no existe o no tiene tours. |
| **Pais Destino Travel Puzzle Free tour.xlsx** (id omitido) | «Consulta Completo» 4,642 · «Hoja1» 3,772 · «Consulta» 103 países | Lista de países destino | **Los ids de país NO son los de hoy.** De 83 países que pude cruzar por nombre (con los nombres del respaldo SQL del 26 oct 2025), solo 14 tienen el mismo id. Ejemplos: Drive 28 = China (hoy 28 = Chile), Drive 99 = Mongolia (hoy 99 = México), Drive 26 = Cabo Verde (hoy 26 = Canadá). |
| **Pais Destino Travel Puzzle Freetour.xlsx** (id omitido) | Sheet1: Pais o Ciudad, ID, Nombre_Imagen · 103 países, todos con imagen | Asignación de imagen por país | Mismos ids desplazados. **Unir por id pondría la foto de un país en otro.** Si se usa, hay que unir por nombre → ISO-2 y revisar a mano. |
| **Imagenes_Destino_Travel_Puzzle_Free_Tour.csv** (id omitido) | ID, Nombre, Nombre de la Imagen · unas 250 filas | Imagen por destino | Mezcla países (9 Azerbaiyán) y ciudades (9 Pogradec) con el **mismo id**, y muchas filas no tienen imagen. No se puede usar por id. |
| **Imagenes_Destino_Paises_Travel_Puzzle_Free_Tour.csv** (id omitido) | ID, Nombre, Nombre de la Imagen · unas 110 filas, todas con imagen | Imagen por país | Mismo problema de ids desplazados. Cubre unos 78 de los 138 países con tours hoy (cruce por nombre). |

**Conclusiones del Drive:**
1. **La taxonomía no está en estos archivos.** Solo hay geografía (país y ciudad) e imágenes. La única fuente de taxonomía sigue siendo `Taxonomia.docx`.
2. **Las ciudades** sirven como lista de control de nombres en español (966 de 967 coinciden). Los **países** no se pueden unir por id.
3. **Las imágenes:**
   - Las de tours, países y ciudades del Reporte se bajaron de `freetour.com/images/...`. Volver a alojarlas como propias es AMBIGUO (cumplimiento-freetour C1/C2): la API ya da `titleImageURL` e `images` del tour, y el sitio las muestra desde ahí.
   - Las de países salieron de scripts de Freepik y otras APIs de imágenes. **Su licencia no consta en ningún archivo**, así que no se publican sin verificarla.
   - Cuál de las dos fuentes alimentó cada foto no se puede saber sin revisar las carpetas de imágenes, que no abrí.
4. **El respaldo SQL del 26 oct 2025** (`scratchpad/respaldos/`) tenía las tablas `LocationProviderMapping(provider, locationType, isoCode, canonicalName, providerId, …)` y `ApiProvider`, ambas vacías. Es un precedente del mapeo proveedor→ubicación que proponemos en G7. `ApiProvider` guardaba `apiKey` en la base, algo que **no** debe volver (E7).

---

## 12. Baseline por proveedor (ficha reusable)

**Plantilla** que se llena por cada proveedor nuevo; va a `docs/{proveedor}/baseline.md` en el PR de alta:

| Campo | Qué se anota |
|---|---|
| Proveedor y modo | api / deeplink / solicitud; quién cobra |
| Tipos o categorías que trae | Lista original (id + nombre por idioma) y cómo se obtiene (endpoint, PDF, tarifario) |
| Cómo nombra y codifica | Formato del id o código de producto; si el título es traducido o del operador |
| Campos disponibles | Precio y moneda, duración, idiomas, punto de encuentro, fotos, reseñas, cancelación, accesibilidad… |
| Identidad | `provider_id`, `external_ref`, `provider_title`, `provider_url` (§9) |
| Mapeo a la taxonomía | Categoría → formato · temas; reglas extra (precio, duración, palabras clave) |
| Lo que NO trae | Qué faceta queda vacía y nunca se infiere |
| Cumplimiento | Reglas del proveedor que afectan el copy o la clasificación |
| Cambios conocidos | Ids que desaparecieron o se renombraron, con fecha |

### 12.1 FREETOUR (api, Modo 2; reserva y cobro Travel Puzzle)

| Campo | Detalle |
|---|---|
| Tipos | `GET /categories`: 29 ids hoy (CSV del PO). Un `categoryId` por tour. En 2025 existían además 1 (Bike), 2 (Bus), 6 y 9 (Reporte del Drive). |
| Nombres y códigos | `id` entero (hasta 126,693); título en 6 idiomas (`TourTranslation`) tal como lo da FREETOUR; `providerTitle` es el nombre del operador o guía; ciudad y país con ids enteros de FREETOUR. |
| Campos | `priceValue`/`priceCurrency` (EUR), `duration` y `durationMinutes`, `meetingPoint`, `includes`, `POIs`, `images`, `videoURL`, `rating`/`reviewsNumber`; por evento: `fullPricePerGroup`, plazas y `isPhoneRequired`. |
| No trae | Accesibilidad, temporada, modalidad, privado (solo en el título), presupuesto. |
| Mapeo | §6.1 y CSV (`mapeo-freetour`). |
| Cumplimiento | C3/C6: no se menciona FREETOUR y no se presenta como operador. C4: el H1 es el título real. D1/D2: Pieza libre solo con precio 0 y la insignia por evento. |

### 12.2 Inca World Peru (IWP, solicitud; cotiza Travel Puzzle)

| Campo | Detalle |
|---|---|
| Tipos | No manda categorías. El tarifario PDF (2026–2027) separa tours de un día por ciudad (LIM, CUS…), Machu Picchu (MP-01…06) y programas (PROG-…). |
| Nombres y códigos | `ref` del tarifario (`LIM-01`, `MP-01`, `PROG-TRK-05`); el nombre original del PDF **no se guarda** (§9.2). |
| Campos | Precio neto en USD (`options`), `durationDays`, `difficulty`, idiomas, `itinerary`, `includes`/`excludes`, `minPax`. |
| Mapeo | `kind` tour → Tour o Excursión de un día (si dice «desde» o «full day»); `circuito` → Circuito; `personalizado` → A la medida. El tema sale de `category` (cultural, aventura, ecoturismo, gastronómico). |
| Conteo | 76 únicos: 43 tour, 6 excursión, circuitos y 4 a la medida. |

### 12.3 Fantástica China (FCH, solicitud)

| Campo | Detalle |
|---|---|
| Tipos | Circuitos regulares y de gran lujo 2027–2028 (dos PDF). |
| Códigos | `FCH-R1…` (regular) y su par de gran lujo. |
| Mapeo | Circuito · Cultural. **Gran Lujo** es el único dato real para la faceta Presupuesto «Lujo» (tras bandera). |
| Conteo | 51 circuitos (corta 1–5 y media 6–14 días). |

### 12.4 Destino Colombia (DCO, solicitud)

| Campo | Detalle |
|---|---|
| Tipos | Planes «PC-0xx» de 7 a 13 noches (PDF por plan). |
| Códigos | `PC-016` … `PC-030`; el nombre del PDF trae ciudades abreviadas y noches («Bog Mde Ctg 7N»). |
| Mapeo | Circuito · Cultural o Playa y mar (`sol-y-playa`). |
| Cumplimiento | Correo de Paulina (5 nov 2026): no hace falta mencionarlos como operador. |
| Conteo | 10. |

### 12.5 Turismo Asiático (TAS, solicitud)

| Campo | Detalle |
|---|---|
| Tipos | Circuitos (Malasia, Borneo, pre-extensión de Singapur) y city tours compartidos (PDF y tarifas de hoteles y tours 2027). |
| Códigos | `MYS-01`… |
| Mapeo | Circuito o Tour · Cultural, Ciudad o Naturaleza (Borneo). «Pre-extensión» corresponde a «Extensiones de viaje» de la Taxonomía 3 (faceta de duración, tras bandera). |
| Pendiente | Neto o comisión por confirmar. |
| Conteo | 11. |

### 12.6 Big Bus Tours (BBT, solicitud; Travel Puzzle compra en el portal de partners)

| Campo | Detalle |
|---|---|
| Tipos | Hop-on hop-off (24 y 48 h), tour nocturno, crucero por el río, cata y combos (bigbustours.com). |
| Códigos | `ref` = ciudad (`NYC`, `CHI`); **no es el código del producto**. `source` = URL del producto (**se pierde en `Trip`**). |
| Mapeo | Transporte turístico · Ciudad. Los combos con crucero llevan el medio barco. **Hoy está clasificado 3 veces distinto** (§8 #13). |
| Conteo | 29. |

### 12.7 Travelpayouts / Kiwitaxi (deeplink de afiliado; cobra Kiwitaxi)

| Campo | Detalle |
|---|---|
| Tipos | Traslados privados aeropuerto–hotel y, desde 2023, tours en auto para escalas. |
| Códigos | No hay catálogo propio en D1: es un widget o deeplink (`src/cart/adapters/kiwitaxi.ts`, marker 800669). |
| Mapeo | Traslado. Los tours en auto de Kiwitaxi serían Tour con medio vehículo, solo si se integran. |
| Otras marcas de Travelpayouts | Tiqets/Go City → Entradas y pases; WeGoTrip → Autoguiado. Entrarían como adaptadores deeplink. |

### 12.8 BeMyGuest (en evaluación; sin adaptador en `main`)

| Campo | Detalle |
|---|---|
| Tipos | `typeName` del producto (p. ej. «Attraction») + `categories[]` jerárquicas con `name` y `uuid` (p. ej. «Themepark», «Shopping») + `productTypes` (opciones con `durationDays/Hours/Minutes`, `instantConfirmation`, `isNonRefundable`, `meetingLocation`, `minAdultAge`…). |
| Códigos | `uuid` (texto). **No cabe en `Tour.externalId Int`** (§9.2 #1). |
| Campos | `title`/`titleTranslated`, `guideLanguages`, `audioHeadsetLanguages`, `hotelPickup`, `airportPickup`, `minPax`/`maxPax`, `reviewAverageScore`, `locations[]` (cityUuid, countryUuid). |
| Mapeo propuesto | `typeName` → formato (Attraction → Entradas; Tour → Tour; Transfer → Traslado). `categories.name` → tema (Themepark → Parques y ocio). `durationDays` > 1 → Circuito. `hotelPickup` → faceta. |
| Pendiente | Lista completa de categorías (endpoint `/categories` en su OpenAPI, `scratchpad/bmg/openapi.yaml`) al dar de alta. |

---

## 13. Diseño de la base de datos de taxonomía (cuando el PO firme las definiciones)

Solo es diseño: **no hay migración aplicada ni PR**. Aplicar es candado.

### 13.1 Tablas propuestas (solo agregan; no se toca nada existente)

| Tabla | Columnas | Para qué |
|---|---|---|
| `TaxonomyTerm` | `id` TEXT PK (slug, p. ej. `formato:excursion-dia`) · `axis` TEXT (`formato` / `tema` / `faceta`) · `slug` · `parentId` NULL (sinónimos o subtemas) · `labels` JSON (6 idiomas) · `defClient` JSON · `defRule` TEXT · `synonyms` JSON (por idioma) · `status` (`active` / `flagged` / `deprecated`) · `sort` INT · `updatedAt` | El diccionario firmado. Se carga desde `src/taxonomy/dictionary.json` en el deploy (fuente de verdad = repo). |
| `ProviderCategory` | `providerId` · `externalCategoryId` TEXT · `names` JSON (tal cual por idioma) · `firstSeenAt` · `lastSeenAt` · `status` (`active` / `gone`) · PK (`providerId`, `externalCategoryId`) | Las categorías originales del proveedor, sin editar. El sync las actualiza. |
| `ProviderCategoryMap` | `providerId` · `externalCategoryId` · `formatoTermId` NULL · `temaTermIds` JSON · `rules` JSON (precio, duración, palabras clave) · `reviewedBy` · `reviewedAt` · `source` (`repo`) | Categoría original → término. Se carga desde `src/taxonomy/mapping/{provider}.json` (por PR). |
| `ExperienceTaxonomy` | `experienceKind` (`tour` / `trip`) · `experienceId` (Tour.id o Trip.id) · `termId` · `origin` (`auto` / `manual`) · `ruleId` (qué regla lo puso) · `confidence` REAL · `mappingVersion` (hash del mapeo) · `computedAt` · PK (`experienceKind`, `experienceId`, `termId`) | La clasificación de cada experiencia: un formato y de 1 a 3 temas, más facetas booleanas. |
| `ExperienceTaxonomyOverride` | Mismas llaves + `action` (`add` / `remove`) · `note` · `by` · `at` | Correcciones manuales. **Siempre ganan sobre `auto`** y sobreviven al recálculo. |
| `TaxonomyRun` | `id` · `startedAt` · `finishedAt` · `mappingVersion` · `counts` JSON (por término) · `unmapped` JSON (categorías sin mapear) · `unclassified` INT · `status` | Bitácora de cada recálculo: alimenta la alerta y STATUS.md. |

La migración aditiva propuesta (número por asignar después de la 0015; **no aplicar**) va en el bloque siguiente:

```sql
-- PROPUESTA (no aplicar). Solo agrega tablas; no modifica Tour ni Trip.
CREATE TABLE IF NOT EXISTS "TaxonomyTerm" ("id" TEXT PRIMARY KEY, "axis" TEXT NOT NULL CHECK ("axis" IN ('formato','tema','faceta')), "slug" TEXT NOT NULL, "parentId" TEXT, "labels" TEXT NOT NULL DEFAULT '{}', "defClient" TEXT NOT NULL DEFAULT '{}', "defRule" TEXT NOT NULL DEFAULT '', "synonyms" TEXT NOT NULL DEFAULT '{}', "status" TEXT NOT NULL DEFAULT 'active', "sort" INTEGER NOT NULL DEFAULT 0, "updatedAt" TEXT NOT NULL, UNIQUE ("axis","slug"));
CREATE TABLE IF NOT EXISTS "ProviderCategory" ("providerId" TEXT NOT NULL, "externalCategoryId" TEXT NOT NULL, "names" TEXT NOT NULL DEFAULT '{}', "firstSeenAt" TEXT NOT NULL, "lastSeenAt" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'active', PRIMARY KEY ("providerId","externalCategoryId"));
CREATE TABLE IF NOT EXISTS "ProviderCategoryMap" ("providerId" TEXT NOT NULL, "externalCategoryId" TEXT NOT NULL, "formatoTermId" TEXT, "temaTermIds" TEXT NOT NULL DEFAULT '[]', "rules" TEXT NOT NULL DEFAULT '{}', "reviewedBy" TEXT, "reviewedAt" TEXT, PRIMARY KEY ("providerId","externalCategoryId"));
CREATE TABLE IF NOT EXISTS "ExperienceTaxonomy" ("experienceKind" TEXT NOT NULL, "experienceId" TEXT NOT NULL, "termId" TEXT NOT NULL, "origin" TEXT NOT NULL DEFAULT 'auto', "ruleId" TEXT, "confidence" REAL, "mappingVersion" TEXT NOT NULL, "computedAt" TEXT NOT NULL, PRIMARY KEY ("experienceKind","experienceId","termId"));
CREATE INDEX IF NOT EXISTS "ExperienceTaxonomy_term" ON "ExperienceTaxonomy" ("termId","experienceKind");
CREATE TABLE IF NOT EXISTS "ExperienceTaxonomyOverride" ("experienceKind" TEXT NOT NULL, "experienceId" TEXT NOT NULL, "termId" TEXT NOT NULL, "action" TEXT NOT NULL CHECK ("action" IN ('add','remove')), "note" TEXT NOT NULL DEFAULT '', "by" TEXT NOT NULL, "at" TEXT NOT NULL, PRIMARY KEY ("experienceKind","experienceId","termId"));
CREATE TABLE IF NOT EXISTS "TaxonomyRun" ("id" TEXT PRIMARY KEY, "startedAt" TEXT NOT NULL, "finishedAt" TEXT, "mappingVersion" TEXT NOT NULL, "counts" TEXT NOT NULL DEFAULT '{}', "unmapped" TEXT NOT NULL DEFAULT '[]', "unclassified" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'running');
```

**Por qué tablas y no columnas en Tour/Trip:**
- No se escribe nada sobre el registro del proveedor (regla de identidad §9).
- El recálculo es atómico por corrida.
- Se puede reconstruir desde cero, igual que `TourSearch`.

### 13.2 Recálculo al sincronizar

1. **Al cerrar un sync exitoso** (Ola 1, sync-guard), en el mismo paso donde hoy se reconstruye FTS:
   - se actualiza `ProviderCategory` con lo visto (por `/categories` o por los `categoryId` de la corrida);
   - las categorías que no vinieron se marcan `gone`, sin borrarse.
2. **Clasificación:** `taxonomy/lib/classify.ts` (pura) recibe cada experiencia activa, el mapeo y el diccionario, y devuelve los términos con su `ruleId`. La raíz (`taxonomy/recompute.ts`) hace I/O con sus dependencias inyectadas y escribe en una tabla de staging.
   - Si la barrera de cordura pasa, hace un intercambio atómico con `ExperienceTaxonomy`.
   - La barrera: abortar si hay más de 20 % de experiencias sin formato, o si un formato cae más de 30 % contra la corrida anterior.
3. **Overrides:** se aplican al final. `remove` quita y `add` agrega, con `origin = manual`.
4. **Categoría sin mapear:** las experiencias quedan con `formato:por-revisar` (oculto de los filtros, de Destinos y de los carruseles; visible en /tours), se anota en `TaxonomyRun.unmapped` y se avisa en el log y en STATUS.md. El sync **no** se aborta.
5. **Viajes propios:** se recalculan al publicar o editar un Trip y al correr un import.
6. **Caché:** se invalidan las llaves `home`, `map-city`, `destinos:*` y `tours:*` al terminar (igual que tras el sync).

### 13.3 Qué consume cada parte del front

| Consumidor | Lee | Hoy (archivo) | Con taxonomía |
|---|---|---|---|
| Filtros de /tours | `ExperienceTaxonomy` (formato, tema, facetas) | `CATEGORY_GROUPS` y `ownTripGroup` (`extra-filters.ts`) | Chips de Formato + Tema + facetas; URL `?formato=…&tema=…` |
| Hub `/experiencias` | — | No existe | **No se crea** (G1-D) |
| Ciudad `/destinos/{p}/{c}` | Formato | `isFreeTour` (`catalog.ts:150-151`) | 3 secciones firmadas (Free tours · Tours · Traslados) con chips de formato y tema dentro de «Tours»; los online fuera |
| `/la-primera-pieza` | `formato:pieza-libre` | `price = 0` | Formato |
| Etiquetas de la tarjeta y la ficha | Formato (una) + temas (hasta 2) | Solo la insignia de Pieza libre | Etiqueta de formato fuera de la foto (C5); insignia igual que hoy (REQ-095) |
| Copy, title y description de la ficha | Formato | `isFreeTour` (`page-model.ts:171`, `titles.ts:23`) | Plantillas por formato (gate de REQ-099) |
| Carrusel «Ya tienes tu primera pieza» | Formato → `CartItemType` | El adaptador FREETOUR solo declara `free_tour` y `tour` | excursion-dia → `day_trip`, entradas/autoguiado → `tickets`, transporte → `transport`, traslado → `transfer` |
| Carrusel y destacados del home | Formatos presenciales | `priceValue` | Excluir `fuera` y `por-revisar` |
| Venta cruzada de viajes propios | Formatos presenciales | Sin filtro (`cross-sell-deps.ts`) | Filtro por formato |
| Buscador (`SEARCH_V2`) | `TaxonomyTerm.synonyms` | Solo FTS en título y resumen | La consulta «tour gratis» se expande a `formato:pieza-libre` y «day trip» a `excursion-dia` (lib pura; sin tocar FTS) |
| Indexación y sitemaps | Formatos presenciales | Conteo de todos | Excluir `fuera` |
| Agente de WhatsApp (REQ-148…, apagado) | Formato y tema en el catálogo de solo lectura | `kind` | Mismos slugs |
| STATUS.md y ops | `TaxonomyRun` | — | % sin tema, categorías sin mapear, conteo por término |

### 13.4 Proceso de actualización por proveedor (paso a paso, uno a la vez)

1. **Baseline:** llenar la ficha §12 del proveedor (`docs/{proveedor}/baseline.md`) con su lista original de categorías y la fecha.
2. **Mapeo por PR:** crear o editar `src/taxonomy/mapping/{proveedor}.json` (validado con Zod en el build), con una prueba por cada categoría (`REQ-xxx: categoría N → formato/tema`), en rojo y luego en verde.
3. **Ensayo de solo lectura:** un script (como `taxo-ensayo/clasificar.py`, pasado a TS en `src/scripts/`) corre contra el último respaldo de D1 y produce:
   - categorías nuevas o sin mapear;
   - conteo por formato y tema;
   - lista de lo que cambia de término contra la corrida anterior;
   - muestra aleatoria de 50 para revisar a mano.

   La salida va al PR.
4. **Revisión del PO:** firma del mapeo y de la muestra. Un tema solo se publica con precisión ≥ 90 % (G4).
5. **Preview con la bandera encendida:** reclasificación en el entorno de preview, prueba de humo (390/1366) de /tours, una ciudad y una ficha de cada formato.
6. **Merge con OK del PO** (merge = publicar). En el siguiente sync exitoso se recalcula solo en producción, con prueba de humo después del deploy.
7. **Verificación:** `TaxonomyRun` sin `unmapped`, conteos dentro de ±10 % del ensayo y STATUS.md actualizado.
8. **Alerta continua:** si aparece una categoría nueva entre PRs, queda `por-revisar` y se reporta. Se repite desde el paso 2.

