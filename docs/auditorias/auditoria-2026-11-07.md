# Auditoría 7 nov 2026: documentación + definiciones del chat vs. código vs. producción

**Pedido literal del PO (7 nov 2026, 04:01):** «/trazabilidad-iso-29148 /escudrinar-error-iso /revision-visual-previa compara la documentación que te entregué + lo que definí en este chat vs Código vs lo vivo en producción».

- **Código:** `origin/main` `5e4b691` (#240); al cierre, main avanzó a `95148e5` (#241, redes del día, banderas en `false`; no cambia lo auditado).
- **Producción:** https://travelpuzzle.com.mx. El deploy de `5e4b691` terminó en verde (run 42367155176) antes de las capturas.
- **Banderas:** `wrangler.jsonc` de main.
- **Fuentes:** definiciones D01–D35 del chat (recopiladas por el coordinador), `taxonomia.md`, `taxonomia-diccionario.csv`, `Taxonomía de referentes`, `comparacion.md`, `Complementos_y_proveedores_API.md`, `barrido-proveedores.md`, `Taxonomia.docx` y `Pagina_Web_Travel_Puzzle.docx`.
- **Taxonomía:** la audita otro agente en un frente aparte (lo que se ve en /tours, el filtro viejo «Tipo de actividad», los chips y las etiquetas). Al cierre de este documento no había ni PR ni INC suyo, así que esas filas dicen **EN AUDITORÍA APARTE** y solo se anota lo que se ve en producción.

> **Actualización (PO, 7 nov 2026, 06:06):** «Pieza libre es la categoría que Travel Puzzle le da a los free tours, por lo tanto en la página en inglés debe decir Categoría: Free Puzzle». **REQ-1103 reemplaza a REQ-1102** (#243, ya en main): en inglés y en pt/de/fr/it la categoría es «Free Puzzle»; la corrección va en el PR #246. Donde abajo dice «En inglés: Free tour» (D10), manda REQ-1103.

Estados: CUMPLIDO EN PRODUCCIÓN · CUMPLIDO TRAS BANDERA APAGADA · NO CUMPLIDO · SIN REQ · SIN TEST · DOCUMENTO DESACTUALIZADO · NO VERIFICADO (con el porqué) · EN AUDITORÍA APARTE.

## 1. Pruebas (corridas en esta sesión)

`npx vitest run -t "REQ-"` sobre `5e4b691`:
```
 Test Files  301 passed | 59 skipped (360)
      Tests  2117 passed | 437 skipped (2554)
   Duration  93.07s
```
Los «skipped» son los tests que no llevan «REQ-» en el nombre: los excluye el filtro `-t`, no un `.skip`. No hay ningún test rojo.

Cruce `grep -r "REQ-" src tests` contra `docs/requisitos.md`: hay 491 REQ registrados y 442 aparecen en algún test.
- **Huérfanos (registrados sin test, 53):** REQ-033 044 047 054 060 061 063 064 065 066 067 069 070 075 076 153 158 222 307 343 344 355 362 364 366 370 400 420 426 427 430 431 432 587 610–625 677 855 1059. La mayoría son encendidos de banderas (610–625, 677), gates de firma (1059, 420) o REQ reemplazados (587). **REQ-153** (sacar el transporte del carrusel de expertos) y **REQ-855** (carruseles completos) son de D01/D06, pero el comportamiento lo cubren REQ-452 y REQ-850…858, que sí tienen test.
- **Citados en el código sin registro (SIN REQ):** REQ-18 (errata de REQ-018), REQ-185, REQ-186 y REQ-270.

## 2. Matriz: definiciones del chat (D01–D35)

| ID | Fuente | Requisito | REQ | Código | Test (verde hoy) | Bandera | Producción (7-11, 11:3x UTC) | Estado |
|---|---|---|---|---|---|---|---|---|
| D01 | chat | Quitar «Viajes armados por nuestros expertos» | REQ-452, REQ-325 (REQ-153 huérfano) | `src/app/page.tsx:107` | `sections.test.ts`, `no-expert-claim.test.ts` ✓ | — | No aparece en el home (`expertos: false` a 390 y 1366) | CUMPLIDO EN PRODUCCIÓN |
| D02 | chat | «Los más elegidos» por medidor de reseñas, cualquier proveedor | REQ-450, REQ-850 | `src/components/home/v2/FeaturedTours.tsx:24` | REQ-450/850 ✓ | CARRUSELES_HOME_ENABLED=true | Sale (h2 «Los más elegidos.», tarjetas 5.0 de 257, 813 y 254 reseñas). El orden exacto del medidor no se puede comprobar sin la base. | CUMPLIDO EN PRODUCCIÓN (en `requisitos.md` REQ-450 dice EN CURSO: DOCUMENTO DESACTUALIZADO) |
| D03 | chat | Carrusel «Excursiones de un día» | REQ-453, REQ-852, REQ-858 | `src/components/home/v2/DayTripsCarousel.tsx:12` | ✓ | CARRUSELES_HOME_ENABLED=true | h2 «Excursiones de un día.» en el home | CUMPLIDO EN PRODUCCIÓN |
| D04 | chat | Se quedan «Explora por continente» y el mapa | — (decisión de no cambiar) | `src/app/page.tsx` | — | — | h2 «Explora por continente» y «Explora el mundo.» | CUMPLIDO EN PRODUCCIÓN · SIN REQ |
| D05 | chat | Sin títulos FreeTour/«free tour» en el inicio | REQ-219, REQ-454 | `src/app/page.tsx:64` | REQ-219 ✓ | — | Las 14 apariciones de «Free tour» son la línea de precio de la tarjeta (excepción permitida por REQ-271); ningún título | CUMPLIDO EN PRODUCCIÓN |
| D06 | chat | Carruseles de la familia de «¿A dónde vamos?», que muestren todo | REQ-850…858 (REQ-855 huérfano) | `FeaturedTours.tsx:24` | REQ-850…858 ✓ | CARRUSELES_HOME_ENABLED=true | 24 tarjetas en el HTML, flechas y «Ver todas»; captura `home-1366-vivo.png` | CUMPLIDO EN PRODUCCIÓN |
| D07 | chat | Mismo header (logo animado) y footer en todas las páginas | REQ-062, REQ-300, REQ-303, REQ-304; **nuevos REQ-1100, REQ-1101** | header: `Navbar` en todas; pie: falta en `src/app/tours/page.tsx` y en `src/app/destinos/[pais]/[ciudad]/[slug]/page.tsx` | REQ-303/304 ✓; REQ-1100/1101 rojo → verde en PR #242 | — | **/tours y la ficha FREETOUR sin `<footer>`** (HTML y capturas `tours-*-vivo.png`, `ficha-freetour-*-vivo.png`). Sí lo tienen el home, /destinos, el país, la ciudad, la ficha de viaje, /la-primera-pieza, /traslados y la 404. | **NO CUMPLIDO** → PR #242 |
| D08 | chat | «Experiencias» reemplaza a «Tours» en el menú y el copy | REQ-174, REQ-400 (huérfano) | `src/components/tours/ToursHeader.tsx:21`, `Navbar.tsx:46` | REQ-174 ✓ | — | Menú: Inicio · Destinos · Experiencias · Traslados · Cómo Funciona; title de /tours «Experiencias \| Travel Puzzle». Las secciones «Tours» de la ciudad y el chip «Tours» de /tours siguen así, como pide REQ-174 (formato dentro de Experiencias). | CUMPLIDO EN PRODUCCIÓN |
| D09 | chat | La Primera Pieza fuera del menú | REQ-600 | `Navbar.tsx:46`, `src/tours/lib/menu.ts` | REQ-600 ✓ | PRIMERA_PIEZA_ENABLED=true | No está en el menú; sigue en el pie | CUMPLIDO EN PRODUCCIÓN |
| D10 | chat | Nombre «Pieza libre»; en inglés «Free tour» | REQ-269, REQ-271, REQ-480; **nuevo REQ-1102** | `src/destinations/lib/hub-copy.ts:105-106` (EN) | REQ-271 ✓; REQ-1102 rojo → verde en PR #243 | LOCALE_URLS_ENABLED=true | ES correcto (sección, intro, chip, pin). **EN: /en/destinos/mx/ciudad-de-mexico dice «Pieza libre (La Primera Pieza)» y «38 in Pieza libre and 39 tours…»** | **NO CUMPLIDO** (EN) → PR #243 |
| D11 | chat | «Momentos de autor» + línea de apoyo | REQ-230, REQ-536 | `src/taxonomy/data/dictionary.json:341,365` | REQ-230 ✓ | La línea de apoyo, tras las banderas TAXONOMY_* | El nombre sale en /tours (27 veces) y en EN «Signature moments». La línea de apoyo no sale en ninguna página auditada. REQ-230 dice PENDIENTE, pero el diccionario y su test ya traen EN «firmado». | Nombre: CUMPLIDO EN PRODUCCIÓN · apoyo: EN AUDITORÍA APARTE · REQ-230: DOCUMENTO DESACTUALIZADO |
| D12 | chat | Botón «Lo quiero» | REQ-220 | `src/lib/translations/es.ts:68` | `book-now.test.ts` ✓ | — | Ficha FREETOUR: botón «Lo quiero» (captura) | CUMPLIDO EN PRODUCCIÓN |
| D13 | chat | «Favorito» solo en ~140 tours (≥ 4.9 y ≥ 180) | REQ-098 (REQ-420 huérfano) | `src/tours/lib/favorite.ts:13-14` | `favorite.test.ts` ✓ | — | «★ Favorito» en tarjetas con 5.0/257 y 4.9/1,133 | CUMPLIDO EN PRODUCCIÓN · REQ-420 (PENDIENTE, ≥ 4.7) está superado por REQ-098: DOCUMENTO DESACTUALIZADO |
| D14 | chat | Tarjeta única | REQ-520…526 | `src/components/tours/ExperienceCard.tsx` | REQ-520…526 ✓ | — | Coincide en el home, /tours y la ciudad: arriba a la derecha la categoría; ciudad · duración; título; descripción; precio en su línea; estrellas y reseñas a la izquierda; operador a la derecha; nunca «FREETOUR». **El precio «Free tour» es amarillo lima (#EAF54F), no verde.** | CUMPLIDO EN PRODUCCIÓN · color: decisión del PO |
| D15 | chat | Etiquetas cortas (opción A); «Tour» → «Visita guiada» | REQ-531, REQ-549, REQ-822 | `src/taxonomy/lib/filters.ts:33` | ✓ | TAXONOMY_LABELS/FILTERS=false | Las tarjetas dicen «Visita guiada»; los chips de /tours siguen siendo los viejos («Tours», «Circuitos») | EN AUDITORÍA APARTE |
| D16 | chat | «★ Favorito» fuera de la foto | REQ-860, REQ-861 | `ExperienceCard.tsx:35` | `favorite-off-photo.test.ts` ✓ | — | Va al lado de «ciudad · duración», debajo de la foto (captura del home) | CUMPLIDO EN PRODUCCIÓN |
| D17 | chat | Una actividad de un día no dice «Tour» | REQ-535, REQ-865…871 | `src/trips/public-load.ts:97` | ✓ | — | — | EN AUDITORÍA APARTE |
| D18 | chat + `taxonomia.md`, CSV, referentes, comparación | Taxonomía homologada en todo proveedor | REQ-400…432 | `src/taxonomy/` | ✓ (los que tienen test) | TAXONOMY_* = false | — | EN AUDITORÍA APARTE |
| D19 | chat | Tipo principal + complementarias | REQ-581, REQ-544 | `src/taxonomy/` | ✓ | TAXONOMY_* = false | — | EN AUDITORÍA APARTE |
| D20 | chat | Criterios de los referentes | REQ-540…542, REQ-865…871 | `src/taxonomy/` | ✓ | — | — | EN AUDITORÍA APARTE |
| D21 | chat | Chips de /tours = categorías principales, automáticos | REQ-546…549 | `src/components/tours/FormatChips.tsx:6` | ✓ | TAXONOMY_FILTERS_ENABLED=false | Chips viejos: Todo · Pieza libre · Tours · Circuitos · Momentos de autor | EN AUDITORÍA APARTE (CUMPLIDO TRAS BANDERA APAGADA según el código) |
| D22 | chat | El filtro «Tipo de actividad» que mezcla está mal | — | `src/tours/lib/extra-filters.ts` | — | TAXONOMY_FILTERS_ENABLED=false | Sale: «Visitas guiadas y Pieza libre», «Paseos en barco…» (captura `tours-390-vivo.png`) | EN AUDITORÍA APARTE |
| D23 | chat | Filtros con scroll propio | REQ-530 | `src/components/tours/filters/FiltersSheet.tsx:9` | ✓ | — | 390: el panel abre a pantalla completa con scroll y el botón «Ver 8,218 actividades» fijo. 1366: columna sticky (captura). | CUMPLIDO EN PRODUCCIÓN |
| D24 | chat | «Arma tu viaje»: cercanas primero, nunca un asesor ni FREETOUR | REQ-320…325, REQ-133 | `src/components/companions/CompanionCarousel.tsx:53` | ✓ | ARMA_TU_VIAJE_ENABLED=false (PR #135 abierto) | No visible | CUMPLIDO TRAS BANDERA APAGADA |
| D25 | chat | Copia exacta, linaje, R2 privado + índice D1 | REQ-740…751 | `src/ingest/raw-archive.ts:2`, `sync-tours/route.ts:78` | ✓ | RAW_ARCHIVE_ENABLED=false, TAXONOMY_LINEAGE_ENABLED=false; PR #235 y #209 abiertos | No aplica a la vista | CUMPLIDO TRAS BANDERA APAGADA (migración 0022 y bucket: candado) |
| D26 | chat | Marcado para Google, Bing e IA | REQ-571…586, REQ-627 | `src/seo/lib/` | ✓ | INDEXNOW_ENABLED=true | JSON-LD: home WebSite+Organization+ItemList; ciudad TouristDestination+FAQPage+ItemList; ficha Product/Offer+Breadcrumb; `/robots.txt` 200 | CUMPLIDO EN PRODUCCIÓN |
| D27 | chat | Sin AggregateRating de terceros; estrellas visibles | REQ-574, REQ-805 | `src/seo/lib/jsonld.ts:60` | ✓ | — | `AggregateRating` ausente en las 15 páginas; estrellas visibles | CUMPLIDO EN PRODUCCIÓN |
| D28 | chat | URL por idioma + hreflang | REQ-660…677 (677 huérfano) | `src/app/destinos/[pais]/[ciudad]/[slug]/page.tsx:47` | REQ-660…676 ✓ | LOCALE_URLS_ENABLED=true | /en 200 con canonical propio; /en/destinos/... 200 | CUMPLIDO EN PRODUCCIÓN |
| D29 | chat | FREETOUR: idioma del guía y punto de encuentro visibles, sin indexar | REQ-588 | `src/components/tours/one/TourHeroSection.tsx:82` | ✓ | — | Se ven «Punto de encuentro METRO VIVEROS» e «Idioma del guía Español»; `data-nosnippet` en el HTML; el JSON-LD sin `inLanguage`/Place | CUMPLIDO EN PRODUCCIÓN |
| D30 | chat | Fichas FREETOUR en noindex | REQ-830…834 | `src/destinations/lib/page-model.ts:224` | ✓ | — | `robots: noindex, follow` en la ficha FREETOUR; `free-tour-coyoacan` no está en los sitemaps | CUMPLIDO EN PRODUCCIÓN |
| D31 | chat | Nunca mencionar FREETOUR al cliente | REQ-244, REQ-800, REQ-801 | `src/site/lib/vocab.ts` | ✓ | — | 0 apariciones de «FREETOUR» en el texto de las 15 páginas × 2 anchos | CUMPLIDO EN PRODUCCIÓN |
| D32 | chat | Terminar los tours de pago de FREETOUR | REQ-930…939 | `src/booking/service.ts:81` | ✓ | PAID_TOURS_ENABLED=false (ensayo #229) | No visible | CUMPLIDO TRAS BANDERA APAGADA (no se verificó si la migración 0009 está aplicada en D1: NO VERIFICADO, sin acceso de lectura a D1 en esta sesión) |
| D33 | chat | Blog diario, «Publica solo cada día» | REQ-960…984, REQ-1040, REQ-1041, REQ-1050…1059 | `src/blog/diario-run.ts`, `.github/workflows/blog-diario.yml` | ✓ | BLOG_ENABLED=true | **/blog da 404**: 0 entradas publicadas (`diario.json` = `[]`; la única manual es `draft: true`). El workflow «Blog diario» tiene **0 corridas**. | **NO CUMPLIDO** (operación, no código) |
| D34 | chat | Solo borradores de correo; nunca push a main ni force-push; un cambio por PR | — (reglas de operación) | — | — | — | Los 15 commits más recientes de main entran por PR (#225…#241) | CUMPLIDO · SIN REQ (es proceso) |
| D35 | chat | Stripe conectado; cobro de prueba de $10 pendiente | REQ-114…119, REQ-610 | `src/trips/lib/request.ts:4` | ✓ | STRIPE_ENABLED=true | Ficha de viaje: «Opciones de pago» visible (correcto con Stripe encendido, REQ-156) | NO VERIFICADO: el cobro real de $10 lo hace el PO |

## 3. Matriz: documentación entregada (fuera de la taxonomía)

| ID | Fuente | Requisito | REQ | Producción | Estado |
|---|---|---|---|---|---|
| DOC-01 | `taxonomia.md`, `taxonomia-diccionario.csv`, referentes, `Taxonomia.docx` | Toda la taxonomía (ejes, diccionario, gates) | REQ-400…432, 530…549, 865…871 | Ver D15–D22 | EN AUDITORÍA APARTE |
| DOC-02 | `comparacion.md` §B / `Pagina_Web_Travel_Puzzle.docx` | Menú «Inicio, Nosotros, Destinos, Blog, Contacto, Cuenta» | REQ-093 → REQ-400/600 | Menú de D09 | DOCUMENTO DESACTUALIZADO (manda D09) |
| DOC-03 | idem | Garantías condicionadas | REQ-154, REQ-156, REQ-157 | Ficha Extime: «Guía en español» y «Opciones de pago» (Stripe encendido) | CUMPLIDO EN PRODUCCIÓN según el criterio; en `requisitos.md` REQ-156/157 dicen EN CURSO: DOCUMENTO DESACTUALIZADO |
| DOC-04 | idem | Teléfono con 🇲🇽 y `tel:` | — | Sin `tel:` en el home ni en el pie | SIN REQ (gate 8 de `comparacion.md`, sin firmar) |
| DOC-05 | idem | Correo contacto@ con `mailto:` | — | Usa info@ | SIN REQ (decisión del PO: ¿contacto@ o info@?) |
| DOC-06 | idem | Redes LinkedIn y X | REQ-1076 (redes del día, apagadas) | Pie: IG, FB, TikTok y YouTube | SIN REQ para el pie (faltan las URL) |
| DOC-07 | idem | Elegir punto de encuentro en el formulario | — | — | SIN REQ (propuesta «Alta» de `comparacion.md`, sin número) |
| DOC-08 | idem | Enlace privado de pasaporte (gate D, Ola 3) | — | — | SIN REQ (candado: datos personales, migración) |
| DOC-09 | idem | Video incrustado | — | Ficha: solo enlace | SIN REQ |
| DOC-10 | idem | Itinerario descargable | — | No existe | SIN REQ |
| DOC-11 | idem | Nosotros / Contacto / Blog | REQ-240…252 | /nosotros y /contacto: 404 (banderas en `false`); /asesores: 404 (EXPERTOS_ENABLED=false) | CUMPLIDO TRAS BANDERA APAGADA |
| DOC-12 | idem | /trenes (Rail Europe, JR Pass por afiliado) | REQ-027 | /trenes: 404 aunque está en `AFFILIATE_PATHS` | NO CUMPLIDO · SIN REQ de página (decisión del PO: alta del afiliado o quitar /trenes de `AFFILIATE_PATHS`) |
| DOC-13 | idem §A | Búsqueda de continente («europa») | REQ-280…294 | `/tours?search=europa`: 107 actividades (texto), no el continente | NO CUMPLIDO · SIN REQ (propuesta «Alta» sin número) |
| DOC-14 | idem §D | URL por idioma con hreflang | REQ-660…677 | Ver D28 | CUMPLIDO EN PRODUCCIÓN |
| DOC-15 | `Complementos_y_proveedores_API.md` | Carrusel de máx. 4 tarjetas por destino y hora; FREETOUR fuera de la venta cruzada | REQ-104…110, REQ-184, REQ-429 | No visible | CUMPLIDO TRAS BANDERA APAGADA (ARMA_TU_VIAJE_ENABLED, TAXONOMY_CART_ENABLED) |
| DOC-16 | idem | Travelpayouts fase 1 / Kiwitaxi | REQ-027, REQ-028, REQ-037 | /traslados 200 con el buscador; la consola muestra un CORS de `emrld.ltd` (script del afiliado) | CUMPLIDO EN PRODUCCIÓN · el error de consola es EXTERNO (no es `pageerror`) |
| DOC-17 | idem | CNSF / PROFECO / CFDI / Stripe Connect | — | — | NO VERIFICADO (legal, fuera del código) |
| DOC-18 | `barrido-proveedores.md` | 49 proveedores, credenciales en texto plano, contratos vencidos | — | — | NO VERIFICADO (operación y buzones, fuera del repo; las alertas de credenciales son para el PO) |

## 4. Revisión visual previa (producción, 390 y 1366)

Capturas en el scratchpad de la sesión (`auditoria/capturas/<pagina>-<ancho>-vivo.png`) y `resultado.json` con title, meta, canonical, robots, hreflang, JSON-LD y consola. **Ninguna página lanzó `pageerror` ni mostró «Application error», y ninguna tiene desborde horizontal.**

| Página | 390 / 1366 | Title · robots | Hallazgo |
|---|---|---|---|
| / | 200 / 200 | «Travel Puzzle · Te armamos tu viaje» | OK. El home dice «8,051 experiencias» y /tours «8,218 actividades» (menor: dos conteos distintos) |
| /tours (filtros abiertos a 390) | 200 / 200 | «Experiencias \| Travel Puzzle» | **Sin pie (D07).** El filtro viejo «Tipo de actividad» sigue (taxonomía, aparte) |
| /destinos | 200 / 200 | «Destinos \| Travel Puzzle» | OK |
| /destinos/mx | 200 / 200 | «México \| Travel Puzzle» | OK |
| /destinos/mx/ciudad-de-mexico | 200 / 200 | «Free tours en Ciudad de México…» | OK en ES. Las FAQ y el title usan «free tour» como palabra de búsqueda (ver decisiones). Un slug trae la entidad HTML: `coyoacan-vibes-tour-y-amp-xochimilco-afterparty` (menor) |
| Ficha FREETOUR `free-tour-coyoacan` | 200 / 200 | noindex, follow | **Sin pie (D07).** El mapa del punto de encuentro sale vacío en la captura de página completa (NO VERIFICADO: es de carga diferida) |
| Ficha Extime (`/viajes/asia/triangulo-de-oro-y-kathmandu-exe-asi-c10-003` → 301 `/destinos/in/agra/...`) | 200 / 200 | noindex, follow | El noindex es correcto: Agra no cumple la regla de ciudad indexable (REQ-089/407) |
| /la-primera-pieza | 200 / 200 | «La Primera Pieza» | OK (página muy larga: 114,000 px a 1366) |
| /traslados | 200 / 200 | OK | Error CORS de consola del script del afiliado (EXTERNO) |
| /blog | 404 / 404 | noindex | **0 entradas publicadas (D33)** |
| /en/ | 200 (308 → /en) | «We put your trip together» | OK; /en/destinos/... con «Pieza libre» en EN (D10) |
| 404 | 404 / 404 | noindex; title igual al del home | Con header y pie. Menor: el title de la 404 es el del home |
| /nosotros, /contacto, /asesores | 404 | noindex | Correcto: NOSOTROS_ENABLED, CONTACTO_ENABLED y EXPERTOS_ENABLED están en `false` |

Veredicto de la revisión visual: **No publicar** nada nuevo sin los PR #242 (pie) y #243 (EN), cada uno con su humo y el OK visual del PO.

## 5. Causa raíz (5 porqués) de cada NO CUMPLIDO

### D07: sin pie en /tours y en las fichas de tour
1. ¿Por qué no hay pie? `ToursPageClient` y `TourDetailClient` montan `Navbar` y nunca `SiteFooter`.
2. ¿Por qué? Son las pantallas viejas (anteriores al rediseño); el pie del home se agregó página por página.
3. ¿Por qué quedaron fuera? REQ-303/304 se escribieron para reservas, eventos y 404, porque así lo reportó el PO, y no para «todas las páginas» como dice D07.
4. ¿Por qué no lo detectó ningún test? No hay un test que recorra todas las páginas públicas buscando el pie, y la prueba de humo solo revisa 200, excepciones y la pantalla de error.
5. ¿Por qué? El contrato de «header y footer en todas» nunca se tradujo en un criterio verificable por página.
**Corrección:** PR #242 (REQ-1100, REQ-1101). **Propuesta aparte:** que la prueba de humo exija `<footer>` en las páginas de `fixed` (decisión del PO, porque cambia el gate de deploy).

### D10 (EN): «Pieza libre» en inglés
1. ¿Por qué sale «Pieza libre» en /en? `hub-copy.ts` (EN) tiene `freeSection: "Pieza libre (…)"` y `cityFreeIntro: "N in Pieza libre…"`.
2. ¿Por qué? Ola 2 de URL por idioma (#223) tradujo las plantillas copiando el nombre de la categoría tal cual.
3. ¿Por qué no se corrigió con REQ-271? REQ-271 fija el inglés para el pin y el asunto del correo, no para la sección ni la intro de la ciudad.
4. ¿Por qué no lo vio la prueba? `hub-copy.ts` no tenía test en inglés; el humo de /en revisa hreflang y canonical, no el vocabulario.
5. ¿Por qué? El vocabulario firmado (D10) vive en el chat y en el diccionario, pero no hay un test de vocabulario por idioma para los hubs.
**Corrección:** PR #243 (REQ-1102).

### D33: blog sin publicar
1. ¿Por qué /blog da 404? Porque no hay entradas visibles (`diario.json` vacío; la manual es borrador) y la página da 404 si no hay nada que enlazar (REQ-256).
2. ¿Por qué no hay entradas? El workflow «Blog diario» nunca se ha disparado (0 corridas).
3. ¿Por qué? Lo dispara el agente diario (`workflow_dispatch` o push a `blog/entrada-*`), y el agente aún no lo ha corrido. La entrada de hoy está en el ensayo #238 «NO PUBLICAR».
4. ¿Por qué no hay alerta? El issue «Blog diario: no se publicó» solo se abre cuando el workflow corre y falla; si no corre, nadie se entera.
5. ¿Por qué? Falta un vigilante de «no hubo publicación en 26 h», como el del sync blindado.
**Corrección:** no es de código. Pendiente del PO o del coordinador: confirmar la tarea programada del agente diario y decidir la primera publicación. Propuesta (sin hacer): un vigilante de 26 h.

### DOC-12 / DOC-13
Son peticiones de 2024 que nunca se registraron como REQ, así que no hay nada que corregir sin decisión del PO (ver lista).

**INC:** no se abrió ninguno. Ningún NO CUMPLIDO es grave: no hay caída, ni pantalla de error, ni riesgo legal o de datos. Las fallas son de presentación (pie, texto en inglés) y de operación (blog).

## 6. Decisiones y candados del PO (no se tocó nada de esto)
1. **OK visual y merge** de #242 (pie) y #243 (inglés). Merge = publicar.
2. **Blog diario (D33):** confirmar que corre la tarea programada del agente diario y la primera publicación (#238 está en ensayo). ¿Se agrega un vigilante de «sin publicación en 26 h»?
3. **Color del precio «Free tour» (D14):** hoy es amarillo lima #EAF54F; D14 dice «en verde». ¿Se queda o se cambia?
4. **«free tour» en SEO de la ciudad (D10 vs. palabra de búsqueda):** title, meta y FAQ dicen «Free tours en {ciudad}» y «¿Qué es un free tour…?». D10 dice «Pieza libre en TODO» y REQ-271 lo acota a la sección, la intro, el pin y el correo. Cambiarlo afecta SEO y el contenido de FREETOUR (C2).
5. **Humo con `<footer>` obligatorio** en todas las páginas de `fixed` (cambia el gate de deploy).
6. **Taxonomía** (D15, D17–D22): esperar el PR del otro agente; las banderas TAXONOMY_* siguen apagadas.
7. **Banderas apagadas con PR listo:** ARMA_TU_VIAJE (#135), PAID_TOURS (#229 ensayo), TAXONOMY_SYNC (#237), copia exacta (#235, #209).
8. **Stripe:** el cobro de prueba de $10 (D35).
9. **/trenes** da 404 estando en `AFFILIATE_PATHS`: dar de alta el afiliado o quitar la ruta.
10. **Gates 2024 sin firmar** (`comparacion.md` §4): teléfono `tel:`, contacto@ o info@, LinkedIn y X, punto de encuentro en el formulario, pasaporte (candado de datos), búsqueda por continente.
11. **Slug con `y-amp`** (`coyoacan-vibes-tour-y-amp-xochimilco-afterparty`): corregirlo cambia la URL (redirección 301), así que lo decide el PO.
12. **`requisitos.md` desactualizado:** REQ-420, REQ-230, REQ-450, REQ-156 y REQ-157 dicen PENDIENTE o EN CURSO, pero el código y producción ya cumplen lo vigente. Hay que corregir su estado (y REQ-185, REQ-186 y REQ-270, que están en el código sin registro).

## 7. Verificación de cierre (trazabilidad, punto 5)
- REQ de esta auditoría: **REQ-1100 y REQ-1101** EN CURSO (verdes en el PR #242, falta el OK del PO); **REQ-1102** EN CURSO (verde en el PR #243, falta el OK del PO).
- `npx vitest run -t "REQ-"` (main `5e4b691`): 301 archivos y 2117 tests verdes, 0 rojos (salida en §1). Ramas de los PR: suite completa 367/367 archivos (2580 y 2581 tests) verdes después de mezclar main `95148e5`.
- Huérfanos: 53 (lista en §1). Citados sin registro: REQ-18, 185, 186 y 270.
- No cumplido: D07 y D10 (EN) con PR; D33 por operación; DOC-12 y DOC-13 sin REQ.
