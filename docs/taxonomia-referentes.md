# Ordena Travel Puzzle con dos ejes y facetas

> **Nota del repo (6 nov 2026, PR de plan; manda sobre este documento).** Versión homologada del PO (06:09), copiada tal cual salvo esta nota; la tabla de alineación final se completó. Lo que cambió después y prevalece:
> 1. **Menú — gate G1 FIRMADO por el PO (06:12, opción A, ratifica lo de las 05:57):** «Experiencias» es el concepto base (paraguas del eje Formato) y **reemplaza a «Tours» en el menú**: Inicio · La Primera Pieza · Destinos · Experiencias · Traslados · Cómo Funciona. Dentro van Tours, Circuitos, Caminatas, etc.; Circuitos no es pestaña. `/tours` se mantiene como listado. Donde este documento dice «se queda Tours en el menú» o «no hay pestaña Experiencias», **ya no aplica**. REQ-093 queda REEMPLAZADO por REQ-185.
> 2. **Transporte:** `TRANSPORT_ENABLED` está en `true` desde el 6-11 (#127) y el transporte vive en su sección de /traslados, fuera de /tours (#136, REQ-172). Donde dice «tras bandera (`TRANSPORT_ENABLED=false`)», ya no aplica.
> 3. **Diferencias con el pedido literal del PO del 6-11** (el pedido manda; quedan como gates de confirmación en `docs/plan-taxonomia.md` §7): ids 1, 2, 6 y 9 → `por-revisar` **no se publican en ningún lado** (aquí: «visible en /tours»); Autoguiado → `CartItem.tipo = tour` (aquí: `tickets`).
> 4. Nombre del formato «Experiencia única»: propuesta de cambio en el gate G-T6 del plan, para no chocar con el paraguas.

Travel Puzzle ya tiene una taxonomía mejor armada que la de cualquier referente revisado, y lo que le falta es podarla y encender solo lo que tiene datos, no inventar más categorías. La recomendación es mantener los **dos ejes que no se mezclan** del diccionario interno: **Formato** (un solo valor: qué compras y cómo se reserva) y **Tema** (de 1 a 3 valores: de qué va), y sumar un tercer eje de **atributos y público** copiado de Google Things to do y Viator, además de un bloque de **facetas exclusivas de circuitos** (confort, tipo de grupo, tipo de guía, perfil, dificultad y duración en días) tomado de Intrepid, G Adventures y TourRadar. Todos los referentes muestran al usuario una sola lista que mezcla formato y tema; por dentro, los mejores (Viator, Google, OCTO) usan etiquetas múltiples. Separar los ejes es la ventaja de Travel Puzzle, y conviene mostrarlos como filtros dentro de /tours y /destinos, sin pestaña nueva, porque el menú firmado (REQ-093) ya usa la palabra que usa todo el mercado mexicano: **"Tours"**. De los 8,018 tours activos de FREETOUR y los 176 viajes propios del ensayo interno, todos reciben formato y solo el 3.4 % se queda sin tema, así que el formato se puede publicar ya. Los temas se publican después de revisar a mano una muestra. Presupuesto, modalidad, accesibilidad, temporada, perfil del viajero y etiquetas especiales no tienen datos hoy y deben quedar **tras bandera**. Todo lo que sigue es una propuesta que necesita gate del PO. No lleva números de REQ. **La base es lo que se acaba de definir para Travel Puzzle** (taxonomia-diccionario.csv y taxonomia.md): este reporte no la reemplaza, solo le propone ajustes. El cruce con las **29 categorías vivas de FREETOUR** (freetour_categorias.csv) sale limpio: cada id cae en **exactamente un formato base**, ninguno queda sin mapear y ninguno está mapeado dos veces; el 8 (Tour Online) y el 31 (Servicios de viaje) van a `fuera`. Solo hay una incoherencia de redacción en la regla de precio 0, que hoy no afecta a ningún tour.

## Ajustes propuestos sobre el diccionario vigente

| # | Qué hay hoy en el diccionario | Ajuste propuesto | Por qué | Impacto en datos |
|---|---|---|---|---|
| 1 | Pieza libre: "precio 0 salvo 8, 17, 20, 24, 28, 29, 30, 35" (CSV anterior; ya corregido) | Agregar **26 y 31** a la lista de excepciones, para que el texto coincida con la precedencia de taxonomia.md §4.1, donde `fuera` y `alquiler` ganan antes que Pieza libre | Hoy un alquiler o un servicio de viaje gratis caería en La Primera Pieza según el texto del CSV, y en alquiler o `fuera` según la tabla de precedencia | Ninguno hoy: las categorías 26 y 31 tienen 0 tours |
| 2 | Duración en días: 1–5 · 6–14 · 15+ | Cortes 1–5 · 6–9 · 10–14 · 15+ | Casi todo Asia y Perú cae en 6–14; Mapaplus usa cinco rangos | Solo cambia los cortes de `durationDays` |
| 3 | Faceta "presupuesto" (económico…élite), tras bandera | Fusionarla en una faceta de **confort** con 4 niveles definidos por inclusiones; el precio se queda como deslizador | Duplica los niveles Genki; Intrepid y G Adventures usan una sola escala | Sigue tras bandera |
| 4 | Faceta "modalidad" (grupo, individual, luna de miel, negocios, 60+), tras bandera | Partirla en **tipo de grupo** (activo: grupo/privado/a la medida), **tipo de guía** y **perfil del viajero** (estos dos tras bandera) | Mezcla tres ejes que TourRadar separa | "Privado" ya tiene dato (REQ-053) |
| 5 | Sin dificultad física | Agregar una escala de 1 a 5 para circuitos | Estándar de G Adventures y TourRadar; IWP ya la entrega | Se muestra solo donde haya valor |
| 6 | Atributos: privado y nocturno activos; accesibilidad y etiquetas especiales tras bandera | Agregar como facetas idioma español, calificación real y vuelo incluido (activas), y franja horaria, grupo pequeño, familias, solo adultos, parejas, sin filas, interior y cancelación gratuita (tras bandera) | Google, Viator y FREETOUR | Solo lectura de campos existentes |
| 7 | G1-A: «Experiencias» sustituye a «Tours» en el menú | Mantener «Tours» y poner la taxonomía como filtro dentro de /tours y /destinos; G1-A sigue como opción del PO | Las 5 agencias mexicanas revisadas usan «Tours»; comparacion.md §2.5 | Ninguno; no toca REQ-093 |
| 8 | Biomas, Idiomático, Estético y De temporada (Categorias.xlsx 2023) fuera del CSV | Biomas como sinónimos de tema; Pueblos Mágicos, Idiomático y De temporada tras bandera; Estético se descarta, igual que Salud | Sin inventario; riesgo de promesa médica | Ninguno |
| 9 | Geografía: continente → país → ciudad | Región y atracción ícono como niveles tras bandera; evaluar México como bloque propio | Categorias.xlsx 2023, Tiqets, Mundo Joven | Sin dato hoy |

## Los referentes mezclan formato y tema; Travel Puzzle ya los separa

Ningún marketplace expone dos ejes al usuario. Civitatis pone en el mismo nivel "Visitas guiadas", "Free tours", "Excursiones de un día", "Gastronomía y enoturismo", "Zoológicos y acuarios" y "Senderismo" ([Civitatis CDMX](https://www.civitatis.com/es/ciudad-de-mexico/)). FREETOUR tiene una lista plana de unas 28 categorías en la que conviven formatos ("Walking Tour", "Audio guides", "Transfers") con temas ("Food & Drink", "Wellness"), y hasta muestra categorías vacías y un cajón "Other" ([FREETOUR Madrid](https://www.freetour.com/madrid)). Viator duplica en su interfaz "Cultura", "Tours culturales" y "Arte y cultura" ([Viator Madrid](https://www.viator.com/es-ES/Madrid/d566-ttd)). Por dentro la historia cambia. Viator organiza sus tags en una malla donde un tag tiene varios padres (Dinner Cruises cuelga de seis), los agrupa por función (categoría, atributo, público, ocasión, distinción) y solo muestra los tags que tienen productos ([Viator Tags](https://partnerresources.viator.com/travel-commerce/tags/)). Google Things to do define etiquetas combinables con **pares que se excluyen**: guided-tours/self-guided, private-tours/small-group-tours y adults-only/family-friendly ([Google Things to do](https://developers.google.com/travel/things-to-do/reference/feed-spec/product-category?hl=es-419)). OCTO, el estándar de conectividad, ni siquiera define un tipo de producto: solo ofrece `categoryLabels[]`, la duración en minutos y `features[]` de accesibilidad ([OCTO Content](https://docs.octo.travel/capabilities-optional/content.md)).

El diccionario interno ya resolvió lo que los referentes dejan mezclado. El **Formato** tiene 13 valores con orden de precedencia (gana la primera regla que se cumple) y sale de la categoría, el precio y la duración del proveedor, así que es confiable. El **Tema** se depuró de 26 términos de 2024 a 13, y los duplicados quedaron como sinónimos de búsqueda (Trekks, Trekking, Hikes y Senderismo pasan a `montana-senderismo`, y Escalada a `aventura`) (interno: taxonomia.md §4.1–4.2; taxonomia-diccionario.csv). El ensayo encontró ruido medible: "Ciudad y barrios" marca el **70 % del catálogo**, así que sirve como base y no como filtro que distinga. "Parques y ocio" atrapa tours de "Juego de Tronos" por la palabra "game", y "Aventura" tiene falsos positivos como "Casa Cueva" (interno: taxonomia.md §6.3). Por eso la regla interna propuesta, publicar un tema solo si la muestra de 200 da **90 % de precisión o más**, es la correcta.

Lo que sí falta es un eje de atributos y público. Google y Viator tratan "privado", "grupo pequeño", "familias", "solo adultos", "romántico", "accesible en silla de ruedas" y "sin filas" como etiquetas aparte del tema, y GetYourGuide usa ocasiones como "Rainy Day" y "At Night" en su navegación ([GYG Madrid](https://www.getyourguide.com/madrid-l46/)). Travel Puzzle tiene datos para dos de ellos: **privado** (388 tours por palabra clave) y **nocturno** (238). El resto no tiene dato: `Trip.accessibility` está vacío en los 176 viajes y FREETOUR no lo trae (interno: taxonomia.md §4.3). La accesibilidad nunca debe inferirse.

## Los circuitos necesitan seis facetas que hoy se enciman en "modalidad"

La "modalidad" de 2024 (grupo, individual, luna de miel, negocios, 60+) mezcla tres ejes que TourRadar separa. El primero es el **tipo de grupo**: grupo, privado o personalizado. El segundo es el **tipo de guía**: guiado completo, semiguiado o autoguiado. El tercero es el **perfil del viajero** ([TourRadar operator help](https://help.tourradar.com/en/operators/group-type-guide-type-physical-ratings)). Con esa separación, "A tu aire" deja de ser un nivel de servicio y pasa a ser un valor del tipo de guía. A su vez, el "presupuesto" (económico, moderado, lujo, élite) duplica a los niveles Genki Lite/Esencial/Plus/Premium. Los operadores grandes usan una sola escala de confort definida por lo que incluye: Intrepid tiene **Basic/Original/Comfort/Premium**, con estrellas del hotel, tipo de transporte, traslado de llegada, propinas y una experiencia insignia ([Intrepid](https://intrepidtravel.com/adventures/everything-you-need-to-know-about-intrepids-travel-styles)). G Adventures tiene Basic/Standard/Upgraded ([Estravel](https://www.estravel.ee/en/what-is-g-adventures/)). Los cuatro niveles Genki encajan casi uno a uno con Intrepid. La propuesta es una sola faceta de **confort** con cuatro niveles genéricos, definidos por inclusiones para que se puedan comparar entre DMC (Genki queda como nombre de línea de producto de Japón), y el precio como deslizador. "Élite" y "Lujo" tienen precedente en español: el catálogo "Elite" de Mapaplus y los "Programas en Lujo" de Surland ([Mapaplus](https://www.mapaplus.com); [Surland](https://www.surland.com)). Ojo: hoy solo Fantástica China declara un nivel ("Gran Lujo"), así que la faceta va tras bandera (interno: taxonomia-diccionario.csv, baseline FCH).

La **dificultad física** es la faceta que más falta y la que menos cuesta. La escala de 1 a 5 es estándar: G Adventures va de Easy a Challenging ([Estravel](https://www.estravel.ee/en/what-is-g-adventures/)) y TourRadar va de Relaxing a Heart-pumping, como campo obligatorio que llena el operador ([TourRadar](https://help.tourradar.com/en/operators/group-type-guide-type-physical-ratings)). Pesa para Perú (Camino Inca, altura) y para el público de 60+. Inca World ya entrega dificultad en su tarifario y el esquema de viajes ya tiene el campo (interno: comparacion.md §1-D; taxonomia-diccionario.csv). Ningún vendedor de circuitos en español publica una escala, así que aquí Travel Puzzle se diferenciaría. La **duración en días** de 2024 (1–5 / 6–14 / 15+) es gruesa: Mapaplus usa cinco rangos (1–8, 9–12, 13–15, 16–20, más de 20) ([Mapaplus](https://www.mapaplus.com)) y casi todo Asia y Perú caería en 6–14. Conviene partir el rango en **1–5 · 6–9 · 10–14 · 15+**. "Luna de miel" aparece en todos los vendedores de circuitos como colección con página propia (Surland como bloque, Exoticca como landing) ([Exoticca MX](https://www.exoticca.com/mx/landing/luna-de-miel)). Funciona mejor como colección curada que como filtro, y solo cuando haya inventario. Exoticca enseña además que, con poco catálogo, los menús curados (temporada, interés, grupo) venden mejor que muchos filtros. Es el modelo adecuado para los 94 circuitos propios de hoy.

## El mercado mexicano dice "Tours" y no "Experiencias"

Las cinco agencias mexicanas revisadas usan "Tours" en su menú: Mundo Joven, PriceTravel, El Corte Inglés México, Best Day y Despegar ([Mundo Joven](https://www.mundojoven.com/); [Viajes El Corte Inglés MX](https://www.viajeselcorteingles.com.mx/); [Despegar](https://www.despegar.com.mx/actividades/)). "Traslados" lo usan PriceTravel, Best Day y Civitatis. Ninguna usa "Excursiones" ni "Experiencias" como elemento de menú. "Circuitos" vive como etiqueta propia ("Los Mejores Circuitos") o dentro de Tours ([Viajes El Corte Inglés MX](https://www.viajeselcorteingles.com.mx/)). Esto resuelve un conflicto interno. Taxonomia.docx (2024) pedía una pestaña "Experiencias", y el análisis interno de taxonomía recomendaba que "Experiencias" sustituyera a "Tours" (gate G1-A). La auditoría posterior, en cambio, recomienda que la taxonomía sea un filtro dentro de /tours, porque "Experiencias" ya es un valor de `?tipo=` y usarla también como pestaña haría que la palabra significara dos cosas (interno: taxonomia.md §10 G1; comparacion.md §2.5). Con la evidencia del mercado, la segunda opción es la buena: **el menú firmado se queda**, y cualquier renombre necesitaría que el PO firmara un cambio a REQ-093.

En vocabulario, "boleto" suena más mexicano que "billete", y "entrada" se entiende en cualquier región para admisiones ([Inklingo](https://www.inklingo.app/spanish/compare/boleto-vs-billete-vs-entrada)). Las fichas mexicanas usan "boleto de avión en viaje redondo", "traslados" y "guías de habla hispana" ([Mundo Joven – Japón con vuelo](https://paquetes.mundojoven.com/en/idea/4746592/japon-con-vuelo)). "Paseos" es léxico argentino: Despegar lo usa en AR y no en MX ([Despegar AR](https://www.despegar.com.ar/actividades/tdypx/actividades-en-estado+de+mexico)). "Excursión" funciona como palabra clave en títulos ("Excursión desde {ciudad}"), no como etiqueta de menú. No hay datos públicos de volumen de búsqueda para estos términos en México, así que la elección de palabras es una inferencia que conviene medir con Search Console o Keyword Planner. Las agencias mexicanas ponen los **MSI en portada**: hasta 18 en El Corte Inglés MX y hasta 24 en Mundo Joven ([Viajes El Corte Inglés MX](https://www.viajeselcorteingles.com.mx/); [Mundo Joven](https://www.mundojoven.com/)). Travel Puzzle no puede imitarlo: `CART_PAYMENTS_ENABLED` y `STRIPE_HOLD_ENABLED` están en `false` (interno: comparacion.md §1-B), así que ningún filtro, etiqueta ni copy debe mencionar MSI, "paga después" ni "opciones de pago".

El cumplimiento con FREETOUR no impide clasificar ni reagrupar el catálogo, pero marca tres límites para la interfaz de la taxonomía (interno: taxonomia.md §10; Complementos_y_proveedores_API.md). Primero, el H1 y las tarjetas conservan el **título real del tour** y el nombre del operador (C4). Segundo, las insignias de formato o tema van **debajo o al lado de la foto, nunca encima** (C5), y eso descarta también la marca de agua de 2024. Tercero, "La Primera Pieza" se usa **solo como nombre de colección** y la insignia "Tú decides cuánto vale" sale solo si `fullPricePerGroup = 0` para el grupo (REQ-095). Tampoco se copian las insignias "Verified by FREETOUR" de su sitio, porque FREETOUR no se menciona (C6).

## Jerarquía de destinos y patrones de URL

La convención mexicana es **Región o continente → País → Ciudad**, con **México como bloque propio** al mismo nivel que Europa o Asia. Mundo Joven lista Europa, Medio Oriente, Asia, Norteamérica, Centroamérica y Caribe, Sudamérica, México, África y Oceanía ([Mundo Joven](https://www.mundojoven.com/)). Nadie usa "Nacional / Internacional" como agrupador principal. Tiqets es el referente más completo en profundidad: país, región, ciudad y lugar ([Tiqets](https://www.tiqets.com/es/atracciones-madrid-c66342/)). El Categorias.xlsx del PO (oct 2023) ya pedía cinco niveles, de general a particular: Continente → País → Región (Riviera Maya, Alsacia) → Ciudad → Experiencia ícono (Machu Picchu, Torre Eiffel) (interno: Categorias.xlsx de Drive). Hoy el sitio tiene 6 continentes en `continents.ts`, rutas /destinos/{país}/{ciudad} (REQ-088, tras `PRIMERA_PIEZA_ENABLED`), países por ISO-2 y ciudades por geonameid. Taxonomia.docx traía 9 o 10 bloques con duplicados (Irán en dos, regiones que no son países) (interno: comparacion.md §1-A). La propuesta es quedarse con los continentes del código y evaluar en un gate si México se separa como bloque propio. Región y atracción ícono quedan tras bandera hasta tener datos: FREETOUR trae POIs, pero los viajes propios no, y `Trip.cities` guarda nombres en texto, no ids (interno: taxonomia.md §9.1). Exoticca suma contadores de ofertas por continente y país ([Exoticca MX](https://www.exoticca.com/mx/landing/luna-de-miel)), una idea barata que solo funciona si **nunca se muestra una categoría o un destino en cero** (regla de Viator y fallo visible de FREETOUR).

Para URLs, el patrón más legible y más fácil de copiar en español es el de Civitatis: /es/{ciudad}/{categoría}/, con slugs en español como "excursiones", "circuitos" y "free-tours" ([Civitatis Madrid](https://www.civitatis.com/es/madrid/)). La debilidad que hay que evitar es la de Viator: slugs en inglés e ids dentro de URLs en español ([Viator Madrid](https://www.viator.com/es-ES/Madrid/d566-ttd)). FREETOUR separa las landings temáticas como /{ciudad}/tag/{tag} y /{ciudad}/collections/{colección} ([FREETOUR Madrid](https://www.freetour.com/madrid)). Despegar demuestra que el mercado indexa páginas "Atracciones y Actividades en {destino}" a cualquier nivel, sea estado, pueblo o zona ([Despegar Morelos](https://www.despegar.com.mx/actividades/zbcvm/actividades-en-morelos)).

| Nivel | Patrón propuesto | Estado hoy | Regla |
|---|---|---|---|
| Hub de destinos | `/destinos` agrupado por continente (sin continente en la URL salvo que lo pida el PO) | /destinos da 404 en vivo; tras bandera | Agrupación con `continents.ts` |
| País | `/destinos/{pais}` | Código listo (REQ-088) | Slug = nombre en español; ISO-2 interno |
| Ciudad | `/destinos/{pais}/{ciudad}` | Código listo, tras bandera | Secciones por formato: Free tours (La Primera Pieza), Tours y caminatas, Excursiones desde {ciudad}, Entradas, Experiencias, Traslados. Online fuera |
| Ciudad × formato (propuesta) | `/destinos/{pais}/{ciudad}/{formato}` con slugs `free-tours`, `excursiones`, `circuitos`, `entradas`, `visitas-guiadas` | No existe | Solo indexable con ≥ 3 productos presenciales (excluir `fuera`) |
| Colección temática (propuesta) | `/destinos/{pais}/{ciudad}?tema={slug}` o `/tours?tema=…` | No existe | No indexable mientras el tema no pase la muestra |
| Listado con filtros | `/tours?formato=…&tema=…&destino=…&duracion=…` | `?tipo=` y `?duracion=` existen (REQ-051, REQ-056) | Canónico a /tours; slugs TP, nunca `categoryId` del proveedor (interno: taxonomia.md §8 #6) |
| Colección free tours | `/la-primera-pieza` | Existe | `price = 0` y formato presencial |
| Región / atracción ícono | `/destinos/{pais}/{region}` · `/destinos/{pais}/{ciudad}/{atraccion}` | No existe | Tras bandera; sin dato |

Los slugs se congelan al publicarse (ya existe un trigger en `Tour.slug`), y las URL por idioma con `hreflang` siguen pendientes (interno: comparacion.md §1-D).

## Lo mejor de cada referente

| Referente | Lo que se copia (una línea) |
|---|---|
| Civitatis | Slugs en español por ciudad y separación de "excursiones" (un día) y "circuitos" (varios días), con landing propia de free tours ([Civitatis CDMX](https://www.civitatis.com/es/ciudad-de-mexico/)) |
| GetYourGuide | Categorías por necesidad del viajero ("Rainy Day", "At Night", "Family Friendly") como colecciones de ocasión ([GYG Madrid](https://www.getyourguide.com/madrid-l46/)) |
| Viator | Malla de tags con varios padres, traducidos por idioma, y la regla de no mostrar tags sin productos ([Viator Tags](https://partnerresources.viator.com/travel-commerce/tags/)) |
| Klook | Separar "Cosas que hacer" de "Transporte", que equivale al /tours vs /traslados del menú firmado ([Klook](https://www.klook.com/es/city/30-madrid-things-to-do/)) |
| Tiqets | Jerarquía completa país / región / ciudad / lugar ([Tiqets](https://www.tiqets.com/es/atracciones-madrid-c66342/)) |
| Airbnb Experiences | Landings por lugar × tipo (/s/{lugar}/experiences/{tipo}) con sitemap propio ([Airbnb](https://www.airbnb.com/s/Paris--France/experiences/concerts)) |
| FREETOUR | Filtros de franja horaria (antes de 12, 12–17, después de 17), fecha relativa e idioma ([FREETOUR Madrid](https://www.freetour.com/madrid)) |
| Google Things to do | Lista estándar de etiquetas con pares que se excluyen, útiles como reglas de validación del diccionario ([Google](https://developers.google.com/travel/things-to-do/reference/feed-spec/product-category?hl=es-419)) |
| OCTO | Duración en minutos (desde/hasta) y accesibilidad como `features[]` estructurados, el modelo de datos para proveedores nuevos ([OCTO](https://docs.octo.travel/capabilities-optional/content.md)) |
| Intrepid | Niveles de confort definidos por una lista fija de inclusiones, no por precio ([Intrepid](https://intrepidtravel.com/adventures/everything-you-need-to-know-about-intrepids-travel-styles)) |
| G Adventures | Escala de dificultad física de 1 a 5 con nombre y una línea por nivel ([Estravel](https://www.estravel.ee/en/what-is-g-adventures/)) |
| TourRadar | Tipo de grupo, tipo de guía y nivel físico como ejes separados, que llena el operador ([TourRadar](https://help.tourradar.com/en/operators/group-type-guide-type-physical-ratings)) |
| Exoticca | Colecciones curadas (temporada / interés / grupo) y contadores por destino cuando hay poco catálogo ([Exoticca MX](https://www.exoticca.com/mx/landing/luna-de-miel)) |
| Surland / Mapaplus | Rangos de duración en días más finos y "Lujo"/"Élite" como precedente de nombres en español ([Mapaplus](https://www.mapaplus.com); [Surland](https://www.surland.com)) |
| Agencias mexicanas | "Tours" y "Traslados" como menú, México como bloque propio y la fórmula "{Destino} con vuelo" solo si el vuelo va incluido ([Mundo Joven](https://www.mundojoven.com/)) |

## Taxonomía recomendada para Travel Puzzle

Estados: **Activo** = hay dato hoy y se puede mostrar. **Activo (muestra)** = hay dato, pero se publica solo si pasa la muestra de precisión. **Tras bandera** = sin dato o sin inventario; el código puede existir, pero el copy no lo promete. Todo es una propuesta para gate del PO.

| Eje | Valor | Inspiración | Regla de dato | categoryIds FREETOUR | Estado |
|---|---|---|---|---|---|
| Formato | La Primera Pieza (free tour a propina) | Civitatis /free-tours, FREETOUR | `priceValue = 0` y presencial; insignia solo si `fullPricePerGroup = 0` (REQ-095); gana sobre caminata, tour y excursión | No es un id: cualquiera con precio 0 salvo 8, 17, 20, 24, 26, 28, 29, 30, 31, 35 (ajuste 1) | Activo (3,464) |
| Formato | Caminata (tour a pie) | Google walking-tours | Precio > 0 | **12, 10** | Activo (1,515) |
| Formato | Tour (visita guiada) | GYG Tours & sightseeing | Resto guiado de pago; Trip `tour` | **3, 5, 13, 14, 19, 22, 25** (3 y 25 pasan a excursión por duración; 5 a experiencia si dice clase o taller; 13 y 14 se reparten por palabras) | Activo (1,270) |
| Formato | Excursión de un día | Civitatis /excursiones | O ≥ 360 min con "excursión/day trip/desde" en el título | **4** (+ 3, 13, 14, 25 por duración o título) | Activo (1,228) |
| Formato | Circuito (varios días) | Civitatis /circuitos, Mundo Joven | Trip `circuito`, o ≥ 1440 min, o "N días" en el título | Ninguno base (30 de FREETOUR por duración o título) | Activo (124) |
| Formato | Experiencia única | Airbnb, Google classes | Trip `unica` | **7, 16, 18, 21, 23, 27, 32, 33, 34** (+ 5 con clase o taller) | Activo (369) |
| Formato | Entradas y pases | Tiqets, Civitatis Tarjetas turísticas | O "entrada/ticket/pass" en el título | **20, 24, 28, 35** (+ 13, 14 por palabras) | Activo (28) |
| Formato | Autoguiado (audioguía) | Google self-guided | Copy sin "con un guía local" | **17** | Activo (29), corregir copy |
| Formato | Traslado | Klook Transporte, Kiwitaxi | Kiwitaxi; vive en /traslados | **29** (+ 13, 14 con transfer/traslado sin "tour") | Activo |
| Formato | Viaje a la medida | Pop-up 2023 "Viaje personalizado" (interno) | Trip `personalizado`; "a cotizar" | — | Activo (4) |
| Formato | Transporte turístico (hop-on) | Civitatis Autobuses turísticos | Trip `transporte` (Big Bus) | **30** | Tras bandera (`TRANSPORT_ENABLED=false`) |
| Formato | Alquiler | FREETOUR Rentals | — | **26** | Tras bandera (0) |
| Formato | Crucero | Surland Cruceros fluviales | Por definir con el proveedor | — (3 es de menos de un día) | Tras bandera (0) |
| Formato | (fuera) Online y servicios | — | Fuera de Destinos, sitemap e indexación | **8, 31** | Oculto (124) |
| Tema | Cultural e historia | GYG Culture & history | + palabras (histor*, museo, unesco…) | 22, 24, 27 | Activo (muestra) |
| Tema | Ciudad y barrios | Viator Visitas urbanas | + palabras | 10, 12, 19 | Activo como base, no como filtro fino (70 %) |
| Tema | Gastronomía | Civitatis Gastronomía | + palabras (tapas, vino, mercado…) | 5 | Activo (muestra) |
| Tema | Naturaleza | Airbnb Nature | + palabras | 25, 35 | Activo (muestra) |
| Tema | Montaña y senderismo | Civitatis Senderismo | Solo palabras (hik*, trek*, senderismo) | — | Activo (muestra) |
| Tema | Aventura | GYG Active | + palabras | 16, 18, 23 | Activo (muestra), revisar falsos positivos |
| Tema | Playa y mar | Google beaches | + palabras | 3, 32 | Activo (muestra) |
| Tema | Noche y espectáculos | GYG At Night, Civitatis Folclore | + palabras | 7, 27 | Activo (muestra) |
| Tema | Religioso y espiritual | Klook "Lugar religioso"; Surland Turismo Religioso | Solo palabras (templo, santuario, peregrin*) | — | Activo (muestra) |
| Tema | Bienestar | FREETOUR Wellness | + palabras (spa, temazcal, termal) | 33 | Activo (muestra), 44 tours |
| Tema | Talleres y aprendizaje | Google classes | + palabras | 34 | Activo (muestra) |
| Tema | Deportes | GYG Sports | + palabras | 10, 23 | Activo (muestra) |
| Tema | Parques y ocio | Civitatis Zoológicos y acuarios | + palabras | 21, 35 | Activo (muestra), revisar "game" |
| Tema | (solo por palabras) | — | Sin tema implícito por categoría | 4, 13, 14, 17, 20, 28 | — |
| Tema | (sin tema) | — | No llevan tema | 8, 26, 29, 30, 31 | — |
| Tema | Idiomático / De temporada (2023) | Categorias.xlsx (interno) | Sin inventario | — | Tras bandera |
| Tema | Salud / Estético (2023) | Categorias.xlsx (interno) | Riesgo de promesa médica; spa va a Bienestar | — | Descartar |
| Entorno / bioma | Playa e islas · Montaña · Selva y bosque · Grutas | Categorias.xlsx "Biomas" (interno) | Hoy duplica temas; como eje aparte necesita dato por destino | — | Tras bandera (se usan como sinónimos de tema) |
| Entorno / bioma | Pueblos Mágicos | Categorias.xlsx (interno) | Lista oficial cruzada con ciudades del catálogo; colección de destino | — | Tras bandera (sin dato cargado) |
| Atributos | Privado | Google private-tours | "private/privado" en el título; `options` en propios (REQ-053) | — | Activo (388) |
| Atributos | Nocturno | GYG At Night | Palabra en el título o cat 7 | 7 | Activo (238) |
| Atributos | Cómo te mueves: a pie, bici, vehículo, barco | Taxonomía 9 de 2024 (interno) | Categoría + título | a pie 12, 10; vehículo 19; barco 3, 32 | Activo; tren y avión solo en circuitos |
| Atributos | Idioma español | FREETOUR filtro de idioma | Idiomas del evento o del viaje; nunca la garantía fija | — | Activo donde haya dato |
| Atributos | Calificación | FREETOUR Rating | Solo reseñas reales (REQ-100) | — | Activo (FREETOUR); propios sin reseñas |
| Atributos | Franja horaria y fecha (hoy/mañana) | FREETOUR | Hora del evento; filtro `days` de la API | — | Tras bandera hasta verificar que el sync guarda la hora |
| Atributos | Grupo pequeño | Google small-group-tours | Máximo de participantes declarado | — | Tras bandera |
| Atributos | Familias · Solo adultos · Parejas/romántico | Google, Viator | Sin dato; par excluyente familias/solo adultos | — | Tras bandera |
| Atributos | Accesible (silla de ruedas, visual, auditiva) | OCTO ACCESSIBILITY_INFORMATION | Casillas sí/no capturadas; nunca inferir | — | Tras bandera |
| Atributos | Sin filas · Interior · Cancelación gratuita · Confirmación inmediata | Viator, GYG, Klook | Sin campo hoy | — | Tras bandera |
| Atributos | Sostenible · VIP | Taxonomía 10 de 2024 (interno) | "Sostenible" solo con certificación del operador | — | Tras bandera |
| Circuitos: confort | Básico · Esencial · Confort · Premium (Genki como línea de Japón) | Intrepid, G Adventures | Solo si el operador declara inclusiones o categoría de hotel (FCH "Gran Lujo") | — | Tras bandera |
| Circuitos: tipo de grupo | En grupo · Privado · A la medida | TourRadar Adventure type | `trip.ts` grupo/privado; `personalizado` | — | Activo |
| Circuitos: tipo de guía | Guiado completo · Semiguiado · A tu aire | TourRadar Guide type, Exoticca | Sin campo; "A tu aire" sin inventario | — | Tras bandera |
| Circuitos: perfil del viajero | Parejas y luna de miel · Familia · Viajero solo · 60+ · Jóvenes 18–35 · Negocios | Intrepid, G Adventures, Exoticca | Sin dato; luna de miel como colección cuando haya inventario | — | Tras bandera |
| Circuitos: dificultad física | 1 Relajado · 2 Ligero · 3 Moderado · 4 Exigente · 5 Muy exigente | G Adventures, TourRadar | Campo de dificultad (IWP lo entrega); sin valor no se muestra | — | Activo donde haya dato (tras firmar la escala) |
| Circuitos: altitud | Indicador de altura | Inferencia propia (Andes) | Sin dato | — | Tras bandera |
| Circuitos: vuelo incluido | "Con vuelo" | Mundo Joven | `flightsIncluded` | — | Activo |
| Duración | Horas: < 2 · 2–4 · 4–8 · > 8 | OCTO duración en minutos | `durationMinutes` (REQ-056) | — | Activo |
| Duración | Días: 1–5 · 6–9 · 10–14 · 15+ | Mapaplus, Surland | `Trip.durationDays` | — | Activo en circuitos |
| Precio | Propina · rangos en MXN (deslizador) | TourRadar Price | `priceValue` + moneda; sin MSI ni "paga después" | — | Activo |
| Temporada / eventos | Mejor época · Eventos del mes | Exoticca; Categorias.xlsx feb 2024 | Sin dato | — | Tras bandera |

**Comprobación de los 29 ids** (freetour_categorias.csv contra el formato base). Caminata: 10, 12. Tour: 3, 5, 13, 14, 19, 22, 25. Excursión: 4. Experiencia única: 7, 16, 18, 21, 23, 27, 32, 33, 34. Entradas: 20, 24, 28, 35. Autoguiado: 17. Traslado: 29. Transporte: 30. Alquiler: 26. Fuera: 8, 31. Suman **29 ids, cada uno con un solo formato base**: ninguno sin mapear y ninguno duplicado. Las reasignaciones por duración, título o precio 0 son reglas secundarias con precedencia, no un segundo mapeo. Los ids históricos 1, 2, 6 y 9 ya no existen; si reaparecen, el sync los deja `por-revisar`. Pendiente del ajuste 1: la regla de precio 0 del CSV debe excluir también 26 y 31.

## Conclusión

El trabajo pendiente no es diseñar más categorías, sino gobernar las que ya existen. Faltan tres cosas: un mapeo por proveedor en el repo que no publique nada sin dato, una muestra de precisión antes de encender cada tema, y una regla dura de "categoría vacía no se muestra". Lo que distingue a Travel Puzzle de Civitatis o Viator no es tener más filtros. Es mezclar free tours de FREETOUR con circuitos de DMC, y eso pide justo lo que los marketplaces de actividades no tienen y los operadores de circuitos sí: confort definido por inclusiones, dificultad física y tipo de guía. Esas tres facetas, más "español" y "con vuelo", forman el diferenciador para el viajero mexicano. Hoy solo la dificultad y el vuelo tienen datos.

Las decisiones del PO, en orden de impacto, son estas. Confirmar que la taxonomía vive como filtros dentro de /tours y /destinos, sin tocar REQ-093. Firmar los 13 formatos y 13 temas, y la regla de publicar temas con precisión de 90 % o más. Fusionar "presupuesto" con "confort" y partir "modalidad" en grupo, guía y perfil. Decidir si México se separa como bloque propio en Destinos y si se abren landings ciudad × formato. Lo que no se sabe todavía: el volumen de búsqueda real en México de "tour", "excursión" y "free tour", los filtros dinámicos de Civitatis, GYG y Viator (no se pudieron leer sin navegador), y si el sync guarda la hora de cada evento para el filtro de franja horaria.

## Alineación con la decisión del PO del 5-11-2026 (prevalece sobre este reporte)

La decisión firmada (rutas por destino, «Arma tu viaje», carrusel, sync blindado) ya está casi implementada. Donde este reporte la contradice, **gana la decisión firmada**. Estos son los cambios:

| Tema | Decisión firmada | Lo que decía este reporte | Cómo queda |
|---|---|---|---|
| Página de ciudad | Tres secciones: Free tours (La Primera Pieza) · Tours · Traslados | Una sección por formato | **Las tres secciones firmadas.** El formato sirve como filtro y orden *dentro* de «Tours» (caminata, tour, excursión, experiencia, entradas, autoguiado), sin secciones nuevas. |
| URL ciudad × formato | `/destinos/{pais}/{ciudad}/{slug-del-tour}` es la ficha | Proponía `/destinos/{pais}/{ciudad}/{formato}` | **Se retira la propuesta.** Chocaría con los slugs de tours (un tour llamado «Excursiones…» o un slug `entradas`). Si algún día se quieren landings por formato, que sea con query (`?formato=excursion-dia`), con canonical a la ciudad y noindex. |
| Regla de indexación | Ciudad: ≥ 3 tours activos, o ≥ 1 tour + guía propia de 300 palabras; noindex después de 14 días sin cumplirla | ≥ 3 productos presenciales para la landing por formato | **Se usa la regla firmada.** Solo se precisa que los tours con formato `fuera` (8 online y 31 servicios) no cuentan como tours activos. |
| Insignia de favorito | Con un criterio real (por ejemplo, ≥ 4.7) | Calificación solo con reseñas reales | Compatibles. Se propone **≥ 4.7 con un mínimo de reseñas** (por ejemplo, ≥ 20) para que 1 reseña de 5★ no la gane. Lo decide el PO. |
| Título y SEO de la ficha | «{título real} – Free tour en {Ciudad}» o «– Tour en {Ciudad}» | Etiquetas por formato | **Se mantiene el firmado.** Opcional para un gate: usar «– Excursión desde {Ciudad}» cuando el formato es `excursion-dia`. |
| Orden del carrusel | Tour de pago o de día → traslado → eSIM → tickets → seguro → interurbano → alojamiento | Mismo orden (Complementos) | Sin cambio. |
| Menú (REQ-093) | Inicio · La Primera Pieza · Destinos · Tours · Traslados · Cómo Funciona | Mantener «Tours» (ajuste 7) | **Firmado por el PO el 6-11 (06:12, opción A): «Experiencias» reemplaza a «Tours»** y es el paraguas del eje Formato. Solo cambia la etiqueta; `/tours` sigue siendo el listado. Circuitos vive dentro de Experiencias (REQ-185). |
| Transporte turístico | `TRANSPORT_ENABLED=true` (#127); fuera de /tours, sección en /traslados (#136, REQ-172) | «Tras bandera» | **Activo en /traslados**; nunca en /tours ni en sus chips o conteos. |
| Favorito (cifra firmada) | REQ-098: ≥ 4.7 y ≥ 50 reseñas (gate 2 del 5-11) | Proponía ≥ 20 | Se propone mantener ≥ 50 (998 tours activos lo cumplen; con ≥ 20 serían 1,419). Gate G-T1. |

### Formato del diccionario → tipo de `CartItem`

| Formato (diccionario) | `CartItem.tipo` | Nota |
|---|---|---|
| La Primera Pieza | `free_tour` | — |
| Caminata · Tour · Experiencia única | `tour` | El formato va como atributo del ítem, no como tipo nuevo. |
| Excursión de un día | `day_trip` | — |
| Entradas y pases · Autoguiado | `tickets` | Homologado con `taxonomia.md` §8 #12: la audioguía se vende como boleto. |
| Traslado | `transfer` | — |
| Transporte turístico | `transport` | Tras bandera. |
| Alquiler | `car_rental` | Tras bandera. |
| **Circuito** | **sin tipo** | **Hueco:** el modelo firmado no tiene `multi_day`. Hoy los circuitos se cotizan y no pasan por el carrito, así que no bloquea nada. Si un día se reservan, hay que agregar el tipo (con REQ nuevo). |
| **Viaje a la medida** | **sin tipo** | Va por el asesor de WhatsApp, fuera del carrito. Es correcto. |
| Crucero | sin tipo | Tras bandera y sin inventario. |
| (no son formato) | `esim`, `insurance`, `lodging`, `visa` | Son complementos del carrusel, no formatos del catálogo. |
