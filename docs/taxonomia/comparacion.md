# Documentos de producto 2024 contra el sitio de hoy (auditoría de solo lectura)

> **Nota del repo (6 nov 2026, PR de plan; manda sobre este documento).** Versión homologada del PO (06:09), copiada tal cual salvo esta nota. Lo que cambió después y prevalece:
> 1. **Menú — gate G1 FIRMADO por el PO (06:12, opción A, ratifica lo de las 05:57):** «Experiencias» es el concepto base (paraguas del eje Formato) y **reemplaza a «Tours» en el menú**: Inicio · La Primera Pieza · Destinos · Experiencias · Traslados · Cómo Funciona. Dentro van Tours, Circuitos, Caminatas, etc.; Circuitos no es pestaña. `/tours` se mantiene como listado. Donde este documento dice «se queda Tours en el menú» o «no hay pestaña Experiencias», **ya no aplica**. REQ-093 queda REEMPLAZADO por REQ-185.
> 2. **Transporte:** `TRANSPORT_ENABLED` está en `true` desde el 6-11 (#127) y el transporte vive en su sección de /traslados, fuera de /tours (#136, REQ-172). Donde dice «tras bandera (`TRANSPORT_ENABLED=false`)», ya no aplica.
> 3. **Diferencias con el pedido literal del PO del 6-11** (el pedido manda; quedan como gates de confirmación en `docs/plan-taxonomia.md` §7): ids 1, 2, 6 y 9 → `por-revisar` **no se publican en ningún lado** (aquí: «visible en /tours»); Autoguiado → `CartItem.tipo = tour` (aquí: `tickets`).
> 4. **Nombre del formato `experiencia-unica` — gate G-T6 FIRMADO por el PO (6-11, 06:22):** se llama **«Momentos de autor»** (antes «Experiencia única»; el slug interno no cambia). En inglés se propone «Signature moments» (por firmar). Donde abajo dice «Experiencia única» como nombre visible, ya no aplica (REQ-219).

> **Versión homologada (6 nov 2026).** Los estados no cambian, porque son una foto del sitio. Lo que sí se alineó: las notas y las propuestas, con la taxonomía de dos ejes + atributos + facetas de circuitos (`taxonomia.md` homologada, `taxonomia-diccionario.csv`) y con la decisión del PO del 5-11-2026. Si hay choque, prevalece esa decisión.

Fecha: 6 nov 2026. Lo que revisé: origin/main `15e7cfd` (worktree aparte, sin cambios), `wrangler.jsonc` de main y https://travelpuzzle.com.mx en vivo (curl a /, /tours, /viajes/..., /destinos, /nosotros, /blog, /contacto, /trenes, /login y búsquedas reales con `?search=`).
Documentos de Drive (leídos completos): Taxonomia.docx, Pagina Web Travel Puzzle.docx, Coreeciones Pagina Web Travel Puzzle.docx (es el mismo texto con fechas y 3 ajustes), Seguimiento.docx (viene cortado en el punto 40, «Dat…») y travel_puzzle_experiences_template.csv (60 campos y 1 fila de ejemplo).

Antecedente: los gates del punto 17 (`docs/gates-viajes-propios-2026-11.md`) ya tomaron estos documentos como fuente y los repartieron así: formularios, página de gracias y cotización al punto 17; Garantías al 9; APIs de transporte y Booking al 19; SEO al 18 y 20 (`docs/gates-reserva-estilo-2026-11.md:7`). Por eso una buena parte ya está hecha.

## 1. Tabla por punto

Estados: HECHO · PARCIAL · FALTA · APAGADO (tras bandera) · YA NO APLICA.

### A. Taxonomía
| Punto | Estado | Evidencia | Nota |
|---|---|---|---|
| T1 Geográfica: continente → país (pestaña «Destinos») | PARCIAL | Home «Explora por continente» `src/app/page.tsx:55`, `src/home/lib/continents.ts:20`; /destinos da 404 en vivo; `PRIMERA_PIEZA_ENABLED="false"` (`wrangler.jsonc:89`) | Las rutas /destinos/{país}/{ciudad} ya están en el código (REQ-088) pero no hay nivel de continente en la URL. Los continentes de hoy son 6 («Norteamérica y el Caribe», «Asia y Medio Oriente»); el documento trae 10, con duplicados (Irán en dos; Belice y Curaçao en dos) y regiones que no son países (Escandinavia, «USA Costa Este», «Nueva York», «Cruceros Galápagos»). |
| T1 Lista de países (enlaces a centraldereceptivos.com) | YA NO APLICA | Hoy salen de los datos: ISO-2 + GeoNames (REQ-085, REQ-131…143) | Los países aparecen solos según el inventario (skill sitio-destinos §Reglas: «sin código por país»). Los enlaces apuntan a otro sitio. |
| T2 Tipos de viaje (pestaña «Experiencias») | PARCIAL | Filtro `tipo_act` con 10 grupos `src/tours/lib/extra-filters.ts:16-26` (REQ-051); 7 categorías de viajes propios `src/trips/schemas/trip.ts:12`; chip «Experiencias» `?tipo=` (`src/components/tours/ToursPageClient.tsx:99`) | La lista del documento tiene 26 tipos que se enciman. **Homologado:** se depura a 13 temas (eje B) y los duplicados quedan como sinónimos de búsqueda. Van como filtro `?tema=` en /tours, sin pestaña (ver §2.5). |
| T3 Duración (corta / media / larga) | PARCIAL | Filtro `?duracion=` y deslizador `src/app/tours/page.tsx:21,43` (REQ-056); `durationDays` en los viajes | Va por minutos u horas. **Homologado:** los rangos en días para circuitos son 1–5 · 6–9 · 10–14 · 15+. |
| T4 Modalidad (grupo, individual, luna de miel, negocios, mayores de 60, personalizado) | PARCIAL | Grupo/privado `trip.ts:26`, filtro de privado REQ-053, tipo `personalizado` `src/trips/lib/trip.ts:5` | **Homologado:** «Modalidad» se divide en tipo de grupo (activo), tipo de guía y perfil del viajero (luna de miel, negocios, 60+), tras bandera. |
| T5 Presupuesto (económico a élite) | PARCIAL | Rango de precio en /tours (REQ-056) | **Homologado:** «Presupuesto» se funde en la faceta de confort (Básico · Esencial · Confort · Premium, por lo que incluye), tras bandera. El precio queda como deslizador. |
| T7 Eventos especiales en ventana emergente | FALTA | — | No hay modelo de eventos ni ventana emergente. |
| T8 Temporada | PARCIAL | `availability.seasons` con suplemento `trip.ts:45` | Sirve para el precio, no para filtrar ni buscar. |
| T9 Transporte | PARCIAL | /traslados (`TRANSFERS_ENABLED="true"`), transporte de viajes propios `TRANSPORT_ENABLED="false"` (`wrangler.jsonc:60`), `flightsIncluded` `trip.ts:74` | No hay filtro por tren, crucero o coche. /trenes da 404 aunque está en `AFFILIATE_PATHS` (`wrangler.jsonc:90`). |
| T10 Etiquetas (sostenible, local, familiar, extrema, VIP) | PARCIAL | Solo «Favorito de los viajeros» (REQ-098) y «Novedad» (REQ-055) | **Homologado:** pasan al eje C · Atributos (sostenible, familias, VIP…), tras bandera hasta tener dato. |
| Buscador universal (continente, país, ciudad, experiencia, tour, circuito, tipo) | PARCIAL | En vivo, `?search=`: «aurora boreal» 3 resultados, «dinamarca» 46, «méxico» 77, «islandia» 18, «japón» 141; REQ-035, REQ-046, REQ-057; `SEARCH_V2_ENABLED="false"`; PR #122 abierto | Los 3 casos que en 2024 «no funcionaban» hoy sí dan resultados. «europa» trae 105 resultados por texto, no los 4,315 tours del continente: el continente y el tipo de viaje no se buscan como destino. |

### B. Página Web / Correcciones (Next Steps 2024)
| Punto | Estado | Evidencia | Nota |
|---|---|---|---|
| Gestor: fechas y precios, mínimo 4 horarios por día | HECHO | `trip.ts:19,41-46` (hasta 8 horarios con cupo; gate G) | — |
| Gestor: mínimo 4 puntos de encuentro y opción de hotel | HECHO | `trip.ts:20,32-38,88` (hasta 8 puntos y `hotelPickup`) | — |
| Gestor: países a visitar junto al título | HECHO | `src/components/trips/TripDetailView.tsx:86` | Va arriba del H1, no abajo. |
| Correcciones: sección de opcionales | HECHO | `extras` `trip.ts:82`, `TripDetailView.tsx:126-127` | — |
| Correcciones: paquetes de viaje | PARCIAL | 1–4 opciones con niveles `trip.ts:21,23-30` | No hay paquete combinado (tour + hotel + tren). Lo más cercano es «Arma tu viaje» (decisión del 5-11, en construcción). |
| Que todo lo del gestor se vea en la ficha («Información de viaje» no aparecía) | HECHO | `TripDetailView.tsx:95-175` (información importante, qué llevar, accesibilidad, visa, itinerario, video) | — |
| Formulario solo después de elegir día y horario | HECHO | `src/components/trips/TripRequestForm.tsx:94-131` (el botón se activa al elegir fecha y hora) | — |
| Quitar formulario de «View details» | YA NO APLICA | Sitio rehecho | — |
| Botón WhatsApp y burbuja flotante | HECHO | `src/components/home/v2/WhatsAppBubble.tsx`, REQ-045, «Cotizar por WhatsApp» en vivo | — |
| Journey: continente → país → ciudad → experiencia → fechas con 4 horarios | PARCIAL | Continente → país en el home; ciudad en /destinos (apagado); calendario y horarios (REQ-016, gestor) | La URL no tiene nivel de continente y el paso de ciudad está apagado. |
| 3 formularios (circuitos/tours, experiencias únicas, personalizados) | HECHO, sin datos sensibles | `src/trips/schemas/request.ts:5-25` (2 variantes: reserva y personalizado) | No piden pasaporte, caducidad, fecha de nacimiento ni nacionalidad, por decisión del gate D (`docs/gates-viajes-propios-2026-11.md:10`): se piden después, con enlace privado. Ese enlace (Ola 3) FALTA. |
| Formulario: elegir punto de encuentro | PARCIAL | El formulario solo trae el campo de hotel `TripRequestForm.tsx:122` | El cliente no elige entre los puntos que tiene el gestor. |
| Formulario de experiencias únicas: «A tu aire» Europa (tren 1.ª/2.ª, hotel de 2 o 3 estrellas) y Japón (Lite/Esencial/Plus/Premium) | FALTA | — | No hay producto «A tu aire» ni Genki en el catálogo (`imports/` no los tiene). |
| Confirmación de los datos del formulario | PARCIAL | La página de gracias y el correo traen folio y resumen `src/trips/lib/request-email.ts:13` | No hay paso de «revisa tus datos» antes de enviar. |
| Pasarela de pago (transferencia, débito, crédito, plan de pagos), excepto los viajes de cotización | APAGADO | `CART_PAYMENTS_ENABLED="false"`, `STRIPE_HOLD_ENABLED="false"` (`wrangler.jsonc:71,94`), `purchaseMode` quote/buy `trip.ts:58` | No existe plan de pagos ni transferencia. Es candado de pagos. |
| Página de gracias de cotización («En breve un agente…») | HECHO | `src/trips/lib/copy.ts:20`; /viajes/gracias responde 200 | Mismo texto del documento. |
| Página de gracias y correo de pago («Recibimos su pago por $40.00… 72 horas») | FALTA, en conflicto | — | Ver §2. |
| Correo de cotización «Travel Puzzle / Solicitud de cotización» | HECHO | `request-email.ts:13` | — |
| Acompañamiento por WhatsApp | FALTA | Solo existen correos (`EMAILS_ENABLED="true"`) | Requiere la API de WhatsApp Business (secretos). |
| Menú: Inicio, Nosotros, Destinos, Blog, Contacto, Cuenta | FALTA, en conflicto | Hoy: Inicio · Tours · Traslados · Cómo Funciona (`src/components/layout/Navbar.tsx:42-46`); /nosotros, /blog, /contacto y /login dan 404 | El menú firmado es otro (REQ-093). Ver §2. |
| Menú en línea verde | YA NO APLICA | Diseño nuevo (`docs/gates-diseno-2026-11.md`) | — |
| Home: cambiar la imagen de Japón por carrusel de los 10 destinos más buscados en Google que tengan oferta | PARCIAL | Rotador del hero con 6 destinos del catálogo (Londres, París, Barcelona, Tokio, Ámsterdam, Singapur) | No usa datos de búsqueda de Google. |
| Home: un solo campo de búsqueda | HECHO | «¿A dónde vas? Ciudad, país o tour» en vivo | — |
| Carrusel «Viajes by Travel Puzzle» | HECHO (parcial en inventario) | `src/app/page.tsx:53`; en vivo con Perú y Colombia | Faltan Japón, Argentina, África, Australia, Islandia, Europa y «A tu aire» (no hay inventario). |
| Marca: azul, blanco, botones azules con contorno rojo | PARCIAL | Paleta #008DFF / #EAF54F / #C12909 `src/components/home/v2/SiteFooter.tsx:29` | El diseño firmado en 2026 sustituye al de 2024; no hay contorno rojo. |
| Contenido multimedia responsivo | HECHO | REQ-001 y prueba de humo a 390/1366 | — |
| Footer: un tercio de altura y fijo al hacer scroll | YA NO APLICA | Footer firmado («header y footer sin cambios», STATUS) | — |
| Logo como GIF | HECHO | `/brand/logo-animado-tp-oscuro.gif` (REQ-062) | — |
| Redes FB, IG, LinkedIn + TikTok y X | PARCIAL | IG, FB, TikTok y YouTube (`wrangler.jsonc:105-108`) | Faltan LinkedIn y X. Se necesitan las URL reales. |
| Teléfono con bandera de México y enlace para marcar en celular | FALTA | No hay `tel:` en el home en vivo | Hoy solo aparece WhatsApp. |
| Correo contacto@travelpuzzle.com.mx con enlace para redactar | PARCIAL | Se usa info@ con `mailto:` (`SiteFooter.tsx:41`, `wrangler.jsonc:99`) | Decidir cuál es el correo oficial. |
| Reducir padding | YA NO APLICA | Diseño nuevo | — |
| Casilla de vuelos | HECHO | `flightsIncluded` `trip.ts:74`, «✈️» en la ficha `TripDetailView.tsx:171` | — |
| Botón que cambia entre cotización y compra | APAGADO | `purchaseMode` existe; todas las fichas en vivo dicen «Cotizar por WhatsApp» | Depende de la pasarela. |
| APIs: Eurorutas, Be My Guest, JR Pass, Rail Europe, Booking (marco y banner por destino), Galápagos | FALTA | `src/companions/registry.json` (solo Kiwitaxi y Big Bus); Travelpayouts tras `AFFILIATE_PATHS` | Ver §2. |
| Marca de agua de Travel Puzzle en fotos | FALTA, en conflicto | — | Ver §2 (C5). |
| Video (no había, se trababa) | PARCIAL | `videoUrl` y leyenda `trip.ts:95-96`; la ficha solo muestra un enlace `TripDetailView.tsx:149-151` | No hay reproductor incrustado; la ficha en vivo no tiene video. |
| Descripción breve por foto o video | HECHO | `images[].alt` `trip.ts:94`, `videoCaption` | — |
| Galería con scroll manual | HECHO | REQ-042 (visor con flechas y miniaturas) | — |
| Mapa que se trababa | HECHO | MapLibre/OpenFreeMap; REQ-044 | — |
| Incluye / No incluye / Visa / Itinerario | HECHO | `TripDetailView.tsx:99-147` | La sección de visa solo sale si el viaje tiene el dato. |
| Cuadro «Garantías Travel Puzzle» (guía en español, asesores, itinerarios a la medida, opciones de pago) | HECHO, con riesgo | `src/components/trips/TripGuarantees.tsx:3-6`, `TripDetailView.tsx:175`; en vivo | Sale en todas las fichas aunque el viaje no tenga guía en español. Ver §2. |
| «Nuestros clientes»: fotos 3 veces más grandes | FALTA | No hay sección de fotos de clientes; el home muestra reseñas | Decisión del 3 nov: nada de viajes en grupo hasta tener autorizaciones de los clientes (STATUS:78). |
| «Nosotros» (estaba cerrada; fotos del equipo) | FALTA | /nosotros da 404 | — |

### C. Seguimiento.docx
| Punto | Estado | Evidencia | Nota |
|---|---|---|---|
| Contenido y calendario de redes, blog y newsletter | FALTA (fuera del sitio, salvo blog y newsletter) | /blog da 404; `MARKETING_CONSENT_ENABLED="false"` (REQ-084) | El newsletter necesita consentimiento LFPDPPP separado. |
| Línea de comunicación «Orange» | HECHO (reemplazada) | `docs/linea-comunicacion.md` | — |
| Ventana de bienvenida | FALTA | — | — |
| Descripción al pasar el cursor por los botones | FALTA | — | — |
| Buscador universal | PARCIAL | Ver tabla A | — |
| Contenido del footer | HECHO | `SiteFooter.tsx` | — |
| Pruebas productivas | HECHO | REQ-003 (humo antes y después de cada deploy) | — |
| Acompañamiento y confirmación de compra | PARCIAL | Correos de Freetour y de cotización; no hay confirmación de compra de viajes propios (no hay pago) | — |
| Itinerario descargable | FALTA | — | — |
| Contrato marco + Anexo 1 (paquete + itinerario) + Anexo 2 (forma de pago) | PARCIAL | Contrato registrado en Profeco núm. 6635-2023 (`docs/gates-legal-2026-11.md:3`); la ficha cita «tu contrato» | No se generan anexos por reserva. |
| Pasarela de pago | APAGADO | Ver tabla B | — |
| Visualización de APIs | FALTA | Ver tabla B | — |
| Definiciones comerciales: etiquetas de APIs, categorías, reglas de oferta, landings | PARCIAL | Reglas del carrusel REQ-108/109 (apagado); grupos REQ-051; landings /destinos (apagado) | — |
| Genki Lite / Esencial / Plus / Premium | FALTA | Sin inventario de Japón (Oku Japan en cola, STATUS) | — |
| Autogestión del viaje personalizado | HECHO | `kind: personalizado` `request.ts:25` | — |
| Pruebas back de clientes (crear usuarios) | APAGADO | Gate B: cuentas de clientes apagadas; /login da 404 | — |
| Flujo de respuestas de WhatsApp (Balleys) | FALTA | — | Fuera del repo. |

### D. Plantilla CSV de 60 campos
| Grupo de campos | Estado | Evidencia | Nota |
|---|---|---|---|
| Título, resumen y descripción en 6 idiomas | HECHO | es/en capturados, pt/de/fr/it con Workers AI (gate I) | — |
| URL por idioma (`/en/tour/1001`…) | FALTA | No hay rutas por idioma ni `hreflang` (grep sin resultados) | El idioma se cambia en la misma URL. |
| Precio y moneda, duración | HECHO | `trip.ts:73-81` | — |
| Punto de encuentro (nombre y coordenadas) | HECHO | `trip.ts:32-38` | — |
| Google Place ID del punto | FALTA | — | — |
| País y ciudad | HECHO | `countries` ISO-2 y `cities` | — |
| Incluye e imágenes | HECHO | — | — |
| Video | PARCIAL | Ver tabla B | — |
| POIs | PARCIAL | `Tour.POIs` (Freetour); no está en Trip | — |
| Categoría | HECHO | — | — |
| Rating y Reviews_Number | PARCIAL | Reales en Freetour; viajes propios sin reseñas (`REVIEW_EMAILS_ENABLED="false"`) | No se capturan a mano (ver §2). |
| Status | HECHO | draft / published / hidden | — |
| Available_Dates | HECHO | `availability` | — |
| Min/Max participantes, dificultad, idiomas | HECHO | — | — |
| Tags y Best_Months | FALTA | — | — |
| Weather_Dependent e Indoor | FALTA | — | — |
| Accesibilidad estructurada (silla de ruedas, visual, auditiva) | PARCIAL | `accessibility` es texto libre `trip.ts:69` | Faltan las 3 casillas sí/no. |
| Carga desde CSV | PARCIAL | La carga masiva es JSON (REQ-039, `src/trips/lib/bulk-import.ts`) | El ejemplo usa travelpuzzle.com (sin .mx) y «Travel Puzzle Tours»: no se copia tal cual. |

## 2. Conflictos con reglas firmadas vigentes

1. **Marca de agua en fotos.** Choca con la regla C5 de FREETOUR (§2.2.16: nada encima de las fotos de los tours) y con la skill sitio-destinos §4 («nada sobre las fotos»). Las fotos de Big Bus todavía no tienen permiso de uso (STATUS) y las de agencias son de terceros. Solo se podría en fotos que sean propiedad de Travel Puzzle, y eso lo decide el PO.
2. **Pasaporte, caducidad, fecha de nacimiento y nacionalidad en la cotización.** Contradice el gate D firmado (se piden después, con enlace privado) y el principio de proporcionalidad de la LFPDPPP: son datos de identificación de alto riesgo que no se necesitan para cotizar. Machu Picchu sí los necesita, pero después de confirmar (`docs/gates-incaworld-2026-11.md:8`).
3. **«Recibimos su pago por $40.00… 72 horas».** Los pagos están apagados (`CART_PAYMENTS_ENABLED`, `STRIPE_HOLD_ENABLED`) y la regla dice que el copy solo promete lo que existe. Además el monto está escrito fijo y las 72 h no están validadas con cada proveedor (Inca trabaja «bajo solicitud», 24–48 h).
4. **Menú.** El documento pide Inicio · Nosotros · Destinos · Blog · Contacto · Cuenta. El firmado (REQ-093) es Inicio · La Primera Pieza · Destinos · Tours · Traslados · Cómo Funciona. Nosotros, Blog y Contacto no existen y Cuenta está apagada (gate B). Si se agregan, tendría que ser en el footer o con un cambio de REQ-093 que firme el PO.
5. **«Experiencias» contra «Tours».** El documento pide una pestaña «Experiencias» por tipo de viaje; el menú firmado dice «Tours» y en /tours «Experiencias» ya es un tipo de producto (`?tipo=`). Si además se usa como pestaña, la palabra significa dos cosas distintas. Propuesta: la taxonomía 2 queda como filtro dentro de /tours, sin pestaña nueva. **Homologado:** `taxonomia.md` cambió su recomendación a G1-D, la misma que esta.
6. **APIs Booking, JR Pass, Rail Europe, Eurorutas, Be My Guest y Galápagos.** Ninguna tiene contrato ni llave registrados en el repo; dar de alta llaves es candado de secretos. Booking: el marco «Reserva en Booking (logo) con Travel Puzzle (logo)» usa la marca de un tercero y necesita permiso escrito, igual que la regla C3 de FREETOUR. El alojamiento va al final del carrusel (skill §6). JR Pass y Rail Europe pueden ir como enlace de afiliado (Travelpayouts), que no necesita API. Galápagos y Eurorutas: confirmar si siguen como proveedores.
7. **Garantías fijas en todas las fichas.** «Guía en español» sale aunque el viaje no tenga `es` en idiomas (por ejemplo, audioguías de Big Bus). «Opciones de pago» sale sin pasarela. Las dos chocan con «el copy solo promete lo que hay» y con la línea de comunicación (sin «garantizado»). STATUS:78 dice que las garantías las define Claudia.
8. **Fotos de clientes y del equipo más grandes.** Sigue vigente la decisión del 3 nov: no publicar fotos de clientes sin autorización (LFPDPPP, derecho a la propia imagen).
9. **Rating y Reviews de la plantilla.** Capturarlos a mano choca con REQ-100 («AggregateRating solo con reseñas reales»).

## 3. REQ propuestos (sin número; nada se registró en el repo)

### Alta
- **Garantías condicionadas.** Dado un viaje sin `es` en idiomas o sin pago en línea, cuando se ve la ficha, entonces «Guía en español» u «Opciones de pago» no aparecen; los textos los firma Claudia. Candado: no.
- **Enlace privado de pasaporte (gate D, Ola 3).** Dada una solicitud confirmada, cuando el asesor manda el enlace (token de un solo uso, vence), entonces el cliente captura pasaporte, caducidad, fecha de nacimiento y nacionalidad; se guardan cifrados y se borran al terminar el viaje; el aviso de privacidad lo dice. Candado: datos personales, migración y bandera.
- **Elegir punto de encuentro en el formulario.** Dado un viaje con 2 o más puntos, cuando lleno la solicitud, entonces elijo uno; con `hotelPickup`, también el hotel. Candado: no (va tras `OWN_TOURS_ENABLED`, ya encendida: se publica con preview).
- **Búsqueda de continente y tipo de viaje como destino.** Dado «Europa», «Asia» o «aventura», cuando busco, entonces salen todos los tours de ese continente o tipo, no solo los que tienen la palabra en el texto. Candado: no (ver si lo cubre SEARCH_V2 / PR #122).
- **Página de gracias y correo de pago (solo para cuando haya pasarela).** Dado `CART_PAYMENTS_ENABLED="true"` y un pago aprobado, cuando termina, entonces la página y el correo «Travel Puzzle / Confirmación de pago» dicen el monto real y el plazo del proveedor; con la bandera apagada no existen. Candado: pagos.

### Media
- **Continente en /destinos.** Dado PRIMERA_PIEZA encendida, cuando abro /destinos, entonces veo los países agrupados por los continentes de `continents.ts` (sin URL de continente salvo que el PO la pida). Candado: bandera.
- **Teléfono y redes completas en el footer.** Dado el footer, cuando lo veo, entonces aparece el teléfono con 🇲🇽 +52 y `tel:`, y LinkedIn y X si tienen URL configurada; si no, no se muestran. Candado: variables (las URL las da el PO).
- **Video incrustado.** Dado `videoUrl` de YouTube o Vimeo, cuando abro la ficha, entonces se ve un reproductor con carga diferida que se puede adelantar en celular y escritorio; si es otro dominio, se queda el enlace. Candado: no.
- **Itinerario descargable.** Dado un viaje con itinerario, cuando toco «Descargar itinerario», entonces se genera un PDF con título, días, incluye y no incluye y el folio, sin precios de neto. Candado: no.
- **Anexos del contrato.** Dada una solicitud confirmada, cuando se arma, entonces se generan el Anexo 1 (paquete + itinerario) y el Anexo 2 (forma de pago) sobre el contrato Profeco 6635-2023. Candado: validación del abogado.
- **Paquetes y niveles (Genki, «A tu aire»).** Homologado: Genki es una línea de Japón con niveles de opción; «A tu aire» es un valor de la faceta tipo de guía, no un nivel. Dado un viaje con niveles (Lite/Esencial/Plus/Premium o tren 1.ª/2.ª + hotel de 2 o 3 estrellas), cuando lo cotizo, entonces elijo el nivel como opción y el precio se recalcula. Candado: no; falta inventario y proveedor.
- **Rail Europe y JR Pass como enlace de afiliado en /trenes.** Dado `AFFILIATES_ENABLED` y una ruta /trenes, cuando la abro, entonces veo el buscador de trenes del afiliado con subID; hoy /trenes da 404. Candado: bandera y alta del afiliado.
- **Atributos, facetas de circuitos y temporada en el gestor.** Dado un viaje, cuando lo capturo, entonces puedo marcar los atributos del eje C (familias, sostenible, VIP…), la dificultad 1–5, el confort, el tipo de guía, el perfil, los mejores meses e interior/exterior, todo de listas cerradas del diccionario; /tours filtra solo por los que tienen dato. Candado: migración.
- **Accesibilidad estructurada.** Dado un viaje, cuando lo capturo, entonces marco silla de ruedas, visual y auditiva (sí/no) además del texto libre. Candado: migración.

### Baja
- **Página Nosotros** (equipo con autorización escrita de cada persona; fotos grandes) en el footer. Candado: datos personales (imagen).
- **Blog** (skills blog-metodo-referentes y estrategia-topic-cluster). Candado: no; va tras bandera.
- **Carrusel del hero con los destinos más buscados**, según datos de Search Console o Trends que coincidan con el inventario. Candado: no.
- **Eventos especiales** (festivales, congresos) como aviso en la ciudad, sin ventana emergente intrusiva. Candado: no.
- **Rangos de duración en días** para circuitos (1–5 · 6–9 · 10–14 · 15+). Candado: no.
- **Carga de viajes desde la plantilla CSV** (adaptador CSV → esquema del gestor, que valida y deja en borrador). Candado: escribir datos de producción.
- **URL por idioma con hreflang.** Candado: no, pero cambia SEO; requiere plan.
- **Ventana de bienvenida y descripción al pasar el cursor.** Candado: no (cuidar Core Web Vitals y la accesibilidad).

## 4. Decisiones del PO (gates)

1. **Menú (A).** ¿Se queda el menú firmado (Inicio · La Primera Pieza · Destinos · Tours · Traslados · Cómo Funciona) y Nosotros, Blog y Contacto van al footer? Es lo que recomiendo. ¿O se cambia REQ-093? La primera opción no rompe el SEO ni el test del menú.
2. **«Experiencias» (A).** ¿La lista de tipos de viaje del documento se vuelve filtro dentro de /tours (recomendado, = G1-D de `taxonomia.md`) o una pestaña aparte? La depuración propuesta va de 26 tipos a 13 temas (ver `taxonomia-diccionario.csv`).
3. **Garantías (B).** ¿Qué promete Travel Puzzle de verdad? Mientras Claudia lo define, ¿quitamos «Guía en español» y «Opciones de pago» de las fichas donde no se cumplen?
4. **Pasaporte (B).** Confirmar que el formulario de cotización NO pide pasaporte ni fecha de nacimiento (ya firmado en el gate D) y autorizar el diseño del enlace privado: dónde se guarda, cuánto tiempo y quién lo ve.
5. **Marca de agua (A).** ¿Se descarta? Es lo que recomiendo: está prohibida en fotos de FREETOUR y no tiene sentido en fotos de terceros. Si se quiere, ¿solo en fotos que sean propiedad de Travel Puzzle?
6. **Proveedores de 2024 (C).** ¿Cuáles siguen? Eurorutas, Be My Guest, Galápagos, JR Pass, Rail Europe y Booking. Para los que sigan: contrato o afiliación, llaves (candado de secretos) y permiso de usar su logo.
7. **Pagos (C).** Cuando se encienda la pasarela, ¿qué formas se ofrecen? Transferencia, débito, crédito, plan de pagos. ¿Qué plazo de confirmación se promete por proveedor, en lugar de «72 horas» para todos? Es candado de pagos.
8. **Correo y teléfono oficiales (A).** ¿contacto@ o info@? ¿Se publica un teléfono para llamar además de WhatsApp? Y las URL reales de LinkedIn y X.

## Hallazgo aparte (no viene de los documentos)
- `wrangler.jsonc:69` en main tiene `SYNC_GUARD_ENABLED="true"`, pero STATUS.md:55 dice que está en "false" y que solo se enciende con la migración 0014 y el OK del PO. Se encendió en el PR #119 (`4b9b979`); lo que está desactualizado es STATUS.md, y hay que corregirlo al cerrar el frente.
