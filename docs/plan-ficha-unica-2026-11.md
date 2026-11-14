# Plan: ficha única para todos los proveedores (do-plan, para firma del PO)

**Folio del plan:** REQ-10579 (PENDIENTE de firma). **Frente:** #549. **Rama:** `plan/ficha-unica` (solo documentos).
**Petición del PO (14 nov 2026):** «tenemos que buscar una vista que se vea lo más homologada posible… proponer una estructura única considerando todas las variables y homologar todo»; después: taxonomía para todos los proveedores, carrito en todas las fichas, transporte por ubicación, mapas, diferencia entre pago y reserva, Mila, proceso obligatorio de alta, do-plan y reglas de JADE SPARK.
**Decisiones:** las 52 decisiones y las confirmaciones finales están firmadas en `docs/gates-ficha-unica-2026-11.md` (REQ-10580 a REQ-10634). Este plan las aplica; no decide nada nuevo.
**Regla de este plan:** no se escribe código de la ficha única hasta que el PO firme REQ-10579.

## 1. Auditoría (lo que hay hoy, verificado el 14 nov)

- Dos plantillas: `TourDetailClient` (tabla `Tour`: FREETOUR y Tangol) y `TripDetailView` (tabla `Trip`: agencias y Big Bus). Lógica en `src/tours/lib/` y `src/trips/lib/`.
- Tangol en producción: 1,215 tours en USD con descripción, fotos, punto de encuentro, incluye, cancelación, idiomas y datos prácticos. Defectos vivos: dos textos de cancelación que se contradicen, trekking clasificado como «Momentos de autor» (274 de Tangol y 76 de FREETOUR), 758 tours sin pin en el mapa, operador en la casilla Proveedor (lo cambia la decisión 38).
- Taxonomía: diccionario en `src/taxonomy/data/dictionary.json`, clasificación en memoria; el recálculo a tablas está detenido (INC-015).
- Carrito «Arma tu viaje»: solo aparece después de apartar un tour de FREETOUR; vive en el navegador.
- Mila solo lee `Trip`; no ve Tangol ni FREETOUR.
- Humo: `tests/smoke/pages.json` no tiene ninguna ficha de Tangol ni un FREETOUR de pago.
- 26 PR abiertos; 9 tocan los mismos archivos de la ficha (#440, #462, #475, #433, #517, #528, #468, #548, #551) y #472 trae las guardas contra choques.
- Rendimiento: REQ-1560, REQ-1562 y REQ-1563 en NO CUMPLIDO.

## 2. Estructura de carpetas: sí cambia

Módulo nuevo de primer nivel `src/ficha/` (OK del PO en la decisión 2, REQ-10581). No se crea ninguna página nueva y ninguna URL cambia (decisión 6).

```
src/ficha/
  lib/model.ts              modelo común: vista pública, vista de Mila, capa interna (sin neto ni comisión)
  lib/blocks.ts             qué bloques salen y en qué orden, por dato
  lib/section.ts            Experiencias o Traslados según el tipo de producto (decisión 1)
  lib/panel-plan.ts         panel de reserva en dos ejes: cómo se reserva y quién cobra
  lib/payment-copy.ts       texto de pago y plazo único de 48 horas hábiles (decisión 33)
  lib/cancellation.ts       una sola política por ficha (decisión 34)
  lib/operator.ts           línea «Opera en destino» (decisión 38)
  lib/rating-visibility.ts  nota del proveedor visible o solo interna (decisión 18)
  lib/guarantees.ts         garantías por experiencia y enlace al apartado del proveedor en T&C (decisión 49)
  lib/faq.ts                preguntas armadas con datos reales y textos de /ayuda
  lib/whatsapp-context.ts   mensaje con código, fecha, personas y opción (decisión 41)
  lib/prefill.ts            lectura de ?fecha&adultos&ninos&opcion
  lib/local-price.ts        precio en la moneda del visitante y moneda del cargo (decisión 32)
  lib/addons.ts             adicionales por proveedor a precio final, sin neto (REQ-10636)
  lib/quality.ts            mínimo de publicación para tours por API (decisión 50)
  lib/agent-view.ts         vista de Mila desde el modelo, sin FREETOUR
  lib/readers/              un lector por superficie: page, mila, email, booking, search (decisión 3)
  adapters/freetour.ts      fila de Tour → modelo (puro)
  adapters/tangol.ts        fila de Tour → modelo (puro)
  adapters/trip.ts          viaje de agencia o Big Bus → modelo (puro)
  schemas/ficha.ts          validación con Zod antes de llegar al cliente
  load.ts                   lectura; recibe base, banderas y reloj por parámetro
src/booking/lib/flow.ts     paso de reserva único para todos los productos (decisión 7)
src/taxonomy/lib/block.ts   bloque único de taxonomía (tipo, temas, atributos)
src/taxonomy/lib/difficulty.ts  equivalencias de dificultad a la escala 1–5 (decisión 12)
src/taxonomy/lib/favorite.ts    «Favorito de los viajeros»: 4.9 y 180 reseñas (decisión 16)
src/taxonomy/data/i18n/     diccionario en cada idioma del sitio
src/geo/lib/near.ts         «cerca» único: ciudad → país → distancia (decisión 29)
src/geo/lib/visitor-country.ts  país del visitante desde la cabecera de Cloudflare
src/map/lib/city-pin.ts     pin por coordenadas de ciudad y «Zona aproximada» (decisiones 27, 28, 30)
src/payments/lib/fx.ts      tipos de cambio para la moneda mostrada
src/cart/lib/add.ts         agregar desde la ficha, incluida la pieza «por cotizar» (decisión 23)
src/cart/lib/server-store.ts    reglas del carrito en servidor (decisión 24)
src/cart/repository.ts      lectura y escritura del carrito; recibe la base por parámetro
src/proveedores/lib/expediente.ts   casillas del alta y definición de hecho (decisión 46)
src/scripts/calidad-proveedor.ts    informe de calidad, solo lectura
src/scripts/paridad-conteos.ts      activos en base contra visibles en mapa, /tours, buscador y filtros
src/components/ficha/FichaView.tsx  la plantilla: solo compone bloques
src/components/ficha/blocks/        un componente por bloque (21)
src/components/ficha/panel/         PricePanel, BookingControl, PaymentNote, AddToTripButton, AdvisorLink
docs/proveedores/alta.md            proceso obligatorio de alta (10 fases)
docs/proveedores/<proveedor>/       expediente por proveedor (lo confidencial, fuera del repo: decisión 47)
tests/fixtures/<proveedor>/         respuestas reales grabadas
migrations/<número apartado>        coordenadas de ciudad; opciones de Tangol; carrito
```

Se modifican: las tres páginas de ficha (eligen plantilla por bandera), `src/agente/catalogo.ts`, `src/tours/lib/booking-cta.ts`, `src/trips/lib/match.ts`, `src/companions/lib/nearby.ts`, `src/map/lib/cities.ts`, los correos de reserva, el buscador, el gestor de viajes, `tests/smoke/pages.json` y `wrangler.jsonc`.
**No se borra nada:** `TourDetailClient` y `TripDetailView` quedan detrás de su bandera en `false`; regresar es apagar la bandera.

## 3. Los 21 bloques de la ficha

Un adaptador por proveedor convierte sus datos al modelo; la plantilla no sabe de proveedores. Si falta el dato, el bloque o la fila se oculta; nunca «N/D».

| # | Bloque | Regla firmada |
|---|---|---|
| 1 | Migas de pan | País y ciudad |
| 2 | Galería | 1 grande + 4; con una foto, foto única |
| 3 | Título, calificación y marca | La marca que vende es Travel Puzzle. La nota de Tangol no se muestra (decisión 18); «Favorito» solo con 4.9 y 180 reseñas |
| 4 | Taxonomía | Tipo + hasta 3 temas + atributos, en cada idioma del sitio. FREETOUR: tipo y dos atributos, como hoy (decisión 10) |
| 5 | Datos clave | Duración, horarios, idioma, temporada, dificultad 1–5, edades; sin casillas vacías |
| 6 | «En breve» | Oculto en FREETOUR (REQ-570); sin nombre del operador |
| 7 | Lo más destacado | Solo si el proveedor lo trae |
| 8 | Descripción | Texto del proveedor saneado; FREETOUR sin reescribir |
| 9 | Itinerario | Por día en circuitos |
| 10 | Incluye / No incluye | Una columna si falta la otra |
| 11 | Punto de encuentro y mapa | Punto exacto con «Cómo llegar», o círculo de «Zona aproximada» sin botón |
| 12 | Opciones, adicionales y precios | Tarjetas por opción (con y sin traslado); oculto con una sola. Adicionales del proveedor (habitación individual, noches extra, extensiones, comidas, opcionales) a precio final, nunca el neto |
| 13 | Antes de ir | Qué llevar, requisitos, accesibilidad |
| 14 | Condiciones | Una sola cancelación, resumida también junto al precio; «Cómo funciona tu reserva» y 48 horas hábiles |
| 15 | Información importante | Notas del proveedor y la línea discreta «Opera en destino: …» (decisión 38), igual para todos |
| 16 | Preguntas frecuentes | Por regla con datos reales. En FREETOUR solo tras la revisión de cumplimiento |
| 17 | Mila | Al cierre de las preguntas y acceso en el panel en computadora. Apagada en FREETOUR (decisión 42) |
| 18 | Reseñas | Filtradas por proveedor; las propias de Travel Puzzle, moderadas |
| 19 | «Completa tu viaje» | Transporte por ubicación en toda ficha; Kiwitaxi nunca en FREETOUR |
| 20 | Otras experiencias en la ciudad | Regla 60/40 y tope por proveedor |
| 21 | Garantías y pie | Las específicas de la experiencia y enlace al apartado del proveedor en T&C (decisión 49) |

Panel de reserva en computadora: precio en la moneda del visitante con la moneda del cargo a la vista, control de reserva, texto de pago, «Agregar a mi viaje» y acceso a Mila o al asesor. En celular la barra fija no cambia; «Agregar» va en el cuerpo (decisión 25). Los traslados usan la misma plantilla con menos bloques.

## 4. Pruebas unitarias (primero, rojo → verde, con el folio en el nombre)

| Pieza | Qué prueba | Comando |
|---|---|---|
| Adaptadores | Cada uno contra un fixture real; dato ausente queda nulo | `npx vitest run src/ficha/adapters/tangol.test.ts` (igual `freetour`, `trip`) |
| Esquema | Un registro malo se descarta y se registra | `npx vitest run src/ficha/schemas/ficha.test.ts` |
| Bloques | Cada bloque sale solo con dato; orden fijo; reglas de FREETOUR | `npx vitest run src/ficha/lib/blocks.test.ts` |
| Sección | Big Bus y todo traslado de cualquier proveedor caen en Traslados | `npx vitest run src/ficha/lib/section.test.ts` |
| Panel | Un caso por combinación; ningún proveedor recibe el texto de otro (INC-020) | `npx vitest run src/ficha/lib/panel-plan.test.ts` |
| Texto de pago | No promete cobro con la bandera apagada; un solo plazo de 48 horas hábiles | `npx vitest run src/ficha/lib/payment-copy.test.ts` |
| Cancelación | Nunca dos políticas en la misma ficha | `npx vitest run src/ficha/lib/cancellation.test.ts` |
| Operador | Casilla y «En breve» sin operador; la línea «Opera en destino» sí lo trae | `npx vitest run src/ficha/lib/operator.test.ts` |
| Nota del proveedor | La de Tangol no llega a ficha ni tarjeta; sí al orden interno | `npx vitest run src/ficha/lib/rating-visibility.test.ts` |
| Preguntas | Solo con datos reales; menos de tres, oculto | `npx vitest run src/ficha/lib/faq.test.ts` |
| WhatsApp | El mensaje lleva código, fecha, personas y opción | `npx vitest run src/ficha/lib/whatsapp-context.test.ts` |
| Prellenado | Rechaza valores inválidos | `npx vitest run src/ficha/lib/prefill.test.ts` |
| Precio local | Moneda del visitante, luego la del proveedor; siempre dice la moneda del cargo; sin dato de cambio no convierte | `npx vitest run src/ficha/lib/local-price.test.ts` |
| Vista de Mila | Igual que la pública; FREETOUR nunca sale; sin neto ni teléfonos | `npx vitest run src/ficha/lib/agent-view.test.ts` |
| Lectores | Página, Mila, correo, reserva y buscador dan el mismo dato para la misma ficha | `npx vitest run src/ficha/lib/readers/parity.test.ts` |
| Adicionales | Cada adicional sale con precio final y su moneda; sin precio confirmado no se muestra; el neto nunca llega al navegador | `npx vitest run src/ficha/lib/addons.test.ts` |
| Filtros | Un producto de cada proveedor con idioma y fecha aparece al filtrar; sin el dato, no se inventa | `npx vitest run src/search/lib/filtros-proveedor.test.ts` |
| Mínimo de calidad | Sin descripción, foto o precio queda oculto y sale en el reporte | `npx vitest run src/ficha/lib/quality.test.ts` |
| Paso de reserva | Un flujo; cada producto llega a su control sin perder datos | `npx vitest run src/booking/lib/flow.test.ts` |
| Taxonomía | Tarjeta, ficha y marcado dan lo mismo; «minitrekking» = Excursión de un día con Aventura y Montaña; «Día completo» desde 6 h | `npx vitest run src/taxonomy/lib/block.test.ts` |
| Dificultad | «Fácil», «Baja» y «<p>Baja</p>» caen igual; lo desconocido va a dudas | `npx vitest run src/taxonomy/lib/difficulty.test.ts` |
| Favorito | Solo con 4.9 y 180 reseñas | `npx vitest run src/taxonomy/lib/favorite.test.ts` |
| Idiomas | Ningún término del diccionario queda sin traducir en un idioma del sitio | `npx vitest run src/taxonomy/lib/i18n.test.ts` |
| «Cerca» | Ciudad → país → distancia; nunca sugiere afiliado en FREETOUR | `npx vitest run src/geo/lib/near.test.ts` |
| Pin | Ciudad sin punto usa sus coordenadas; sin coordenadas, sin pin | `npx vitest run src/map/lib/city-pin.test.ts` |
| Carrito | Agregar desde la ficha; pieza «por cotizar» sin monto; totales por moneda; carrito ajeno no se lee | `npx vitest run src/cart/lib/server-store.test.ts` |
| Expediente | Proveedor en código sin expediente completo hace fallar la prueba | `npx vitest run src/proveedores/lib/expediente.test.ts` |

Ya existen y se extienden: `src/seo/lib/ficha-contract.test.ts` (REQ-580) y las regresiones de INC-001, 017, 019, 020 y 021, que se repiten sobre la plantilla nueva. Antes de cada PR: suite completa, build de producción y humo a 390 y 1366.

## 5. SOLID

- **SRP:** un componente por bloque y un hook por responsabilidad; `FichaView` solo compone; toda decisión vive en `src/ficha/lib/`.
- **OCP:** los bloques se activan por dato, no por proveedor; proveedor nuevo = adaptador nuevo y cero cambios en la plantilla; el panel recibe su control de reserva como `children`.
- **LSP:** los cuatro controles de reserva (calendario, caja de compra, formulario, asesor) cumplen la misma interfaz y son intercambiables.
- **ISP:** cada bloque recibe solo su porción del modelo (el mapa recibe punto y tipo de punto, no la ficha entera).
- **DIP:** el servidor entrega la vista; los componentes no leen la base, las banderas ni el proveedor; carrito y precio local llegan por contexto y hook propio, fuera del HTML en caché.

## 6. Banderas nuevas, todas en `false`

| Bandera | Qué enciende |
|---|---|
| `TAXONOMY_BLOCK_ENABLED` | Bloque único de taxonomía en tarjeta y ficha |
| `CITY_PIN_FALLBACK_ENABLED` | Pin por coordenadas de ciudad en mapa y Destinos |
| `ZONE_MAP_ENABLED` | Círculo de «Zona aproximada» en la ficha |
| `NEARBY_UNIFIED_ENABLED` | «Cerca» único en ficha, carrusel y correos |
| `FICHA_TRANSFER_CARD_ENABLED` | Tarjeta de Kiwitaxi en fichas que no son de FREETOUR |
| `FICHA_UNICA_TANGOL_ENABLED` | Plantilla nueva en Tangol |
| `FICHA_UNICA_FREETOUR_ENABLED` | Plantilla nueva en FREETOUR |
| `FICHA_UNICA_TRIP_ENABLED` | Plantilla nueva en viajes y Big Bus |
| `BOOKING_FLOW_UNICO_ENABLED` | Paso de reserva único |
| `LOCAL_CURRENCY_ENABLED` | Precio en la moneda del visitante |
| `WHATSAPP_CONTEXT_ENABLED` | Mensaje de WhatsApp con contexto |
| `AGENTE_TOUR_ENABLED` | Mila lee tours que no son de FREETOUR |
| `FICHA_MILA_ENABLED` | Bloque de Mila en la ficha |
| `FICHA_MILA_FREETOUR_ENABLED` | Mila en fichas de FREETOUR (solo con permiso escrito) |
| `CART_ADD_ENABLED` | Botón «Agregar a mi viaje» |
| `CART_SERVER_ENABLED` | Carrito guardado en servidor |
| `TANGOL_OPTIONS_ENABLED` | Tarjetas por opción de Tangol |
| `FICHA_ADDONS_ENABLED` | Adicionales del proveedor en la ficha |
| `FICHA_FAQ_ENABLED` | Preguntas frecuentes |
| `FICHA_FAQ_FREETOUR_ENABLED` | Preguntas en fichas de FREETOUR (tras revisión de cumplimiento) |
| `PROVIDER_QUALITY_GATE_ENABLED` | Ocultar tours por API que no cumplen el mínimo |

Cada bandera se enciende sola, en su propio PR, con preview encendido, humo verde y OK del PO.

## 7. Olas en orden de dependencia (un cambio por PR)

| Ola | Contenido (un PR por punto) | Depende de | Regreso | Candados |
|---|---|---|---|---|
| 0 · Orden de la casa | Este plan y sus gates; estados atrasados en `docs/requisitos.md` y `STATUS.md`; firma de G1 escrita en #553; fichas fijas de Tangol, free tour y FREETOUR de pago en el humo; humo del workflow del sync con navegador | — | Revertir el PR | Merge |
| 1 · PR abiertos | #472, #440, #462 (bandera apagada), #475, #528, #548, #551; #433 se absorbe en la ola 5; #517 y #432 siguen en pausa; #468 se rehace en la ola 6 | Ola 0 | El de cada PR | Merge de cada uno |
| 2 · Arreglos sin datos nuevos | Operador discreto (reemplaza REQ-10542); ocultar la nota de Tangol; una sola cancelación; plazo único de 48 horas hábiles; «Favorito» con 4.9 y 180 | Ola 0 | Revertir el PR | Merge |
| 3 · Taxonomía | Bloque único; atributos nuevos; aventura y senderismo (lista de ~350 cambios para firma); tabla de dificultad (para firma); reclasificación de Tangol, de las 7 agencias y de FREETOUR, una por PR, cada una con su lista de cambios y dudas; mapeo de Extime terminado; categoría original guardada; diccionario en cada idioma | Ola 0 | Lista «antes y después» en `tmp/`; apagar bandera o revertir la regla | Merge; reconstruir el índice del buscador |
| 4 · Geografía | Migración de coordenadas de ciudad; llenado desde GeoNames; pin de respaldo; zona aproximada; medición de tours de FREETOUR con mapa en Londres | Ola 0, #472 | Punto de regreso de D1 y copia de `City` en `tmp/` con script de restauración que simula por defecto | Migración; escritura en producción; cada encendido |
| 5 · Cercanía y transporte | «Cerca» único; transporte en toda ficha; tarjeta de Kiwitaxi fuera de FREETOUR | Ola 4 | Apagar la bandera | Variable de rutas de afiliado; cada encendido |
| 6 · Modelo común | Modelo, esquema y adaptadores con fixtures reales, sin pantalla; después un lector por PR: página, Mila (rama #468 rehecha), correos, página de reserva, buscador; prueba de paridad entre lectores | Olas 1 y 3 | Código sin usar tras bandera; revertir | Merge |
| 7 · Plantilla | Bloques y panel; encendido en Tangol; encendido en viajes y Big Bus; encendido en FREETOUR (tras revisión de cumplimiento); sección Traslados; campos nuevos en el gestor | Ola 6 | Apagar la bandera del proveedor devuelve la plantilla actual | Cada encendido |
| 8 · Paso de reserva único | Flujo único tras el botón; carrito, reserva y eventos en inglés **y en cada idioma disponible en la página** (REQ-10635) | Ola 7 | Apagar la bandera | Encendido; toca cobros |
| 9 · Moneda del visitante | País del visitante; tipos de cambio; precio local calculado fuera del HTML en caché; moneda del cargo siempre a la vista | Ola 7 | Apagar la bandera: vuelve la moneda del proveedor | Fuente de tipos de cambio; encendido |
| 10 · Carrito | Migración del carrito; carrito en servidor; botón «Agregar» en toda ficha; pieza «por cotizar»; Mila lo lee | Ola 7; aviso de cookies revisado por el abogado | Punto de regreso de D1; apagar banderas | Migración; encendido |
| 11 · Mila en la ficha y recorrido de Mila | WhatsApp con contexto; Mila lee Tangol; bloque de Mila; regla de derivación a persona; los PR del recorrido en `zoefel-mila` (#203 a #209), uno por uno; chat puente «Escribirle a mi guía» (REQ-3432) con su plan propio; tablero en `docs/seguimiento-mila-2026-11.md` (REQ-10640) | Olas 6 y 7 | Apagar banderas; conversaciones de prueba antes y después | Cada encendido |
| 12 · Opciones, adicionales y filtros | Tabla de opciones de Tangol (migración); vuelta del sync con opciones, temporada, popularidad y categoría; tarjetas por opción; **adicionales de cada proveedor en sus fichas** (REQ-10636), un proveedor por PR; **Tangol, FREETOUR y el resto de los proveedores en los filtros de idioma y fecha** (REQ-10637) | Ola 7 | Punto de regreso de D1; nunca a la par de un deploy | Migración; llamar a Tangol; escritura en producción; encendido |
| 13 · Cobro | Registro automático de reembolsos; después lo que firme el plan de reservas (#553) | Acuerdo firmado y cuenta verificada | Apagar la bandera; prueba real mínima con reembolso | Pagos, secretos, datos reales, uno por uno |
| 14 · Contenido y legal | Preguntas frecuentes; garantías por experiencia; apartado por proveedor en T&C; **preguntas, garantías y términos traducidos a cada idioma disponible en la página**, con la cláusula de que prevalece el español (REQ-10638) | Ola 7; abogado | Apagar la bandera | Cada encendido; abogado |
| 15 · Rendimiento | REQ-1560, REQ-1562 y REQ-1563 corregidos; la plantilla nueva no pesa más que la actual (medición antes y después en cada PR de la ola 7) | En paralelo desde la ola 0 | Revertir el PR | Merge |
| P · Alta de proveedores | Proceso en `docs/proveedores/alta.md` y en `CLAUDE.md`; prueba del expediente; expediente de Tangol y luego de las 7 agencias; informe de calidad con el número de tours que quedarían ocultos; paridad de conteos; mínimo de calidad | En paralelo | Documentos y pruebas; la bandera apagada no oculta nada | Merge; encendido del mínimo |

**Humo:** se agregan a `tests/smoke/pages.json`, en español e inglés, una ficha de Tangol con opciones, una de Tangol sin punto exacto, un free tour, un FREETOUR de pago, un viaje por tipo, Big Bus, `/arma-tu-viaje` y la página de reserva. Corre a 390 y 1366 contra el build de producción, con la bandera encendida en preview, y otra vez contra producción después de publicar.
**Cierre de cada ola:** `STATUS.md` con su matriz en el mismo commit, lista de REQ con estado, salida de `npx vitest run -t "REQ-"` y cruce con `grep -r "REQ-" src tests`.

## 8. Folios y reemplazos

- Decisiones: REQ-10580 a REQ-10629. Confirmaciones: REQ-10630 a REQ-10634. Plan: REQ-10579. Cambios del PO al plan (14 nov, 05:57): REQ-10635 a REQ-10639.
- Los folios de construcción (bloques, banderas, migraciones, tareas del PO) se apartan con `folio.ts apartar` al abrir cada ola, no antes, para no bloquear a las otras sesiones.
- Reemplazos: REQ-10542 → REQ-10615 (operador discreto); REQ-005 → REQ-10607 (transporte en toda ficha); REQ-428 → REQ-10601 (circuitos entran al carrito «por cotizar»); gate G-T5 del 12 nov → REQ-10587 (clasificación en memoria). En producción sigue lo anterior hasta que se publique el PR de cada uno.

## 8 bis. Adicionales por proveedor (REQ-10636)

Fuente: revisión del 12 nov 2026 (REQ-3314), documento `claude/adicionales-por-proveedor-2026-11-12.md` del Proyecto de Claude. Es confidencial porque trae montos netos: no entra al repo; a la ficha solo llega el precio final.

- **Con adicionales y precio:** Tangol (traslado), Exotic Escapes, Fantástica China, Turismo Asiático, Mondial Trails, Jordan Experience, Destino Colombia, Canadian Receptive Tours, Multitravel, Extime Travel y Eurowelcome / Anglovision. Tipos: habitación individual, media pensión y pensión completa, vuelos internos, extensiones, noches extra, opcionales, traslados y recargos de fecha.
- **Sin precio o a cotizar:** Oku Japan, Central Inca World y Big Bus (solo combos). Se muestran como «a cotizar con un asesor» o no se muestran; nunca con un precio inventado.
- **Tangol sí tiene adicionales** (corrección del PO, 14 nov 06:01: «Tangol sí tiene, con transporte y sin transporte»): el traslado es su adicional. Sale de las opciones de la API (con y sin traslado) y se muestra igual que los adicionales de los demás proveedores, con la diferencia de precio a la vista.
- **Sin adicionales:** FREETOUR, Kyoto Tours, Eurorutas, BeMyGuest y Hotelbeds.
- Reglas: precio final con el markup firmado, cada temporada con su fecha («si no está clara, no publicar»), vuelos internos con su cláusula de deslinde, un proveedor por PR y tras la bandera `FICHA_ADDONS_ENABLED`.

## 9. Puntos abiertos que este plan no inventa

1. **Preguntas frecuentes en FREETOUR:** primero la revisión de cumplimiento; salida propuesta: bloque no indexable y fuera del marcado estructurado.
2. **Decisión 45 (ubicada, REQ-10639):** es el chat puente «Escribirle a mi guía» del recorrido de Mila en WhatsApp (`docs/journey-mila-whatsapp.md`, rama `feat/mila-acceso-catalogo`, etapa 8, REQ-3432 y REQ-3412): el cliente escribe por el número de Travel Puzzle, solo durante la ventana del tour, y nunca recibe el teléfono del operador ni del guía; las emergencias van siempre por Travel Puzzle. Del lado de Mila vive en el repo `zoefel-mila` (PR #203 a #209, todos en borrador y con sus banderas apagadas; el puente de avisos es el #207). La ficha y la confirmación solo lo prometen cuando esté encendido en producción.
3. **Quinta confirmación (REQ-10634):** supuesto por validar: abrir ahora accesibilidad, voucher y cancelación con reembolso; cupones, lista de espera y menores después.
4. **Moneda del visitante:** la fuente de tipos de cambio para monedas distintas de USD y EUR se propone y se firma al abrir la ola 9.
5. **Terceros que bloquean olas:** el abogado (cookies, T&C traducidos, cláusulas 1.3 y 7.3 del acuerdo con Tangol), Tangol (detalle de reseñas, descuento por API, moneda, políticas de cancelación), FREETOUR (permisos de Mila, preguntas y taxonomía ampliada), el contador (CFDI) y Claudia (garantías).

## 10. Candados (OK explícito del PO, uno por uno)

Todo merge (merge = publicar); las migraciones de coordenadas, opciones y carrito; el llenado desde GeoNames y cualquier escritura en datos de producción; cada llamada a Tangol; variables y secretos; cada encendido de bandera; todo lo de pagos; el envío de cualquier correo a un proveedor; borrar ramas o archivos.

## 11. Firma del plan

- [ ] **PO:** «Firmo el plan de la ficha única» (REQ-10579). Con la firma arranca la ola 0.
