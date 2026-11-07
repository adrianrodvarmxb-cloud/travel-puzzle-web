# Auditoría de cumplimiento FREETOUR — 6 nov 2026

Pedido del PO (6 nov 2026, 21:33): «Revisa que todo lo que esté relacionado al proveedor FREETOUR cumpla con /cumplimiento-freetour. Si hay que marcar diferencia en la aplicación de SEO con este proveedor, aplica los cambios retroactivos y asegura que en el futuro siempre se cumpla.»

Base: `main` en `de74e8c` más los PR abiertos #202 (copia cruda en R2) y #204 (marcado SEO de fichas). Reglas A–I de la skill `cumplimiento-freetour` (instantánea del 5 nov 2026) y decisiones del PO vigentes (C2, Gate 2, copy, D4, venta cruzada).

## Paso 1 — Releer las fuentes 3 a 9: NO VERIFICADO

Esta sesión no puede abrir `admin.freetour.com` ni `www.freetour.com` (WebFetch los rechaza por la lista de dominios permitidos y la búsqueda web no devuelve esas páginas). No se rodeó el bloqueo. La auditoría usa la instantánea de la skill del 5 nov 2026 (un día antes). **Pendiente:** releer las 7 fuentes desde un navegador y comparar, sobre todo affiliate-terms §4.3 (cambios con 4 días de aviso) y §7.2.

## Veredictos

| Veredicto | Filas |
|---|---|
| PERMITIDO | 42 |
| PROHIBIDO | 11 |
| AMBIGUO-PEDIR POR ESCRITO | 8 |
| OBLIGATORIO FALTANTE | 6 |
| **Total** | **67** |

De los 11 PROHIBIDO, 8 se corrigen en este PR (filas 10, 21, 26, 27, 30, 42, 62 y 63: REQ-611 a REQ-615, REQ-621 y REQ-622) y 3 ya estaban bloqueados por bandera o guarda (filas 33, 36 y 37). De los 6 OBLIGATORIO FALTANTE, 2 se corrigen aquí (filas 29 y 64: REQ-610 y REQ-621), 3 son candados del PO (filas 43, 44 y 45) y 1 es para el PR #62 (fila 59, candado de pagos). La fila 55 (AMBIGUO) queda en la lectura conservadora (REQ-620) hasta que api@freetour.com confirme.

## Tabla

| # | Elemento | Regla | Veredicto | Ajuste |
|---|---|---|---|---|
| 1 | Sync diario de tours y eventos en segundo plano (`updatedSince`, `utcDate`) | E1, E3, C1 | PERMITIDO | Sin cambio (REQ-071…075). |
| 2 | Reintentos 429, login sin bucle, error 63 ≥ 10 min | E4, D5 | PERMITIDO | Sin cambio (REQ-077). |
| 3 | Evento en vivo (`GET /events/{id}`) antes de reservar; precio y lugares nunca de la caché | E2 | PERMITIDO | Sin cambio (REQ-076; `placeBooking` lee el evento). |
| 4 | Reservar, editar y cancelar solo por la pasarela con la IP registrada | E5 | PERMITIDO | Sin cambio. Si cambia la IP, avisar antes a FREETOUR. |
| 5 | Copia cruda del catálogo en R2 privado (PR #202) | C1, G2, E7 | PERMITIDO | Solo `GET /tours` (sin datos de clientes), bucket privado, sin llaves en el repo (REQ-547/548 de #202). Choque de numeración: #202 y #203 usan los dos REQ-540…548. |
| 6 | H1 = título real del tour y nombre del proveedor | C4, A2 | PERMITIDO | Sin cambio (REQ-094). |
| 7 | «Operado por un guía local · {proveedor}» en la ficha y la tarjeta | C3, C6 | PERMITIDO | Solo texto, sin logo y sin nombrar a FREETOUR (más estricto que C3). Ajuste: el filtro del nombre del operador no detectaba «free tour .com»; ahora usa el mismo detector que las reseñas (REQ-616). |
| 8 | Copy visible (páginas, componentes, traducciones, correos al cliente) | C3, PO | PERMITIDO | Escaneo: 0 menciones de «FREETOUR» o «freetour.com». Garantía REQ-616. |
| 9 | Logos o marcas de FREETOUR en `public/` | C3 | PERMITIDO | No hay. Garantía REQ-616. |
| 10 | JSON-LD de la ficha en `main`: AggregateRating con la calificación y las reseñas de FREETOUR | Gate 2, C7 | PROHIBIDO | Corregido: `productJsonLd` sin AggregateRating ni review (REQ-615). PR #204 lo reemplaza por `fichaJsonLd` (REQ-574). Los dos se pueden fusionar en cualquier orden. |
| 11 | PR #204: enriquecimiento indexable apagado para freetour («En breve», descripción, tipo, keywords) | C2 | PERMITIDO | Cumple C2 (`indexableEnrichment('freetour') = false`, contrato REQ-580 en la prueba de humo). |
| 12 | PR #204: `additionalProperty` (duración, idiomas) y `tripOrigin` (punto de encuentro) en fichas de FREETOUR | C2 | AMBIGUO-PEDIR POR ESCRITO | Son hechos que la página ya muestra, sin texto nuevo, pero los estructura para buscadores (pregunta 5). Propuesta para #204: con `enrichment = false`, omitirlos hasta tener respuesta, o que el PO los acepte por escrito. |
| 13 | PR #204: «Idioma del guía» nuevo en la tira de datos de la ficha de FREETOUR (HTML del servidor) | C2 | AMBIGUO-PEDIR POR ESCRITO | El dato ya se ve en el selector de idioma del calendario; lo nuevo es el texto indexable. Mismo trato que la fila 12. |
| 14 | PR #204: `brand` y `provider` = operador real, nunca FREETOUR | C3, C6 | PERMITIDO | `cardProvider`; el contrato de #204 lo revisa. |
| 15 | Meta description de la ficha («Free tour en {ciudad} con un guía local…») | C2 | PERMITIDO | Plantilla propia que ya existía; no usa texto de FREETOUR. |
| 16 | Títulos, descripciones y fotos de FREETOUR en páginas indexables (fichas, hubs, inicio) | C1, C2 | AMBIGUO-PEDIR POR ESCRITO | Mostrarlos para vender está cubierto (C1). Que Google los indexe es la pregunta 5. No se agrega contenido nuevo; si el PO quiere cero riesgo mientras llega la respuesta, la opción es `noindex` en fichas de FREETOUR (decisión del PO). |
| 17 | Resumen de FREETOUR o frase de reseña en las tarjetas del inicio y de /tours | C1, C2, C7 | AMBIGUO-PEDIR POR ESCRITO | Texto original de FREETOUR (no reescrito) y la frase va entre comillas en la tarjeta de su propio tour. Pregunta 5. |
| 18 | «★ Favorito de los viajeros» y categoría encima de la foto de la tarjeta | C5 | AMBIGUO-PEDIR POR ESCRITO | El PO lo firmó en REQ-526 (6 nov, 14:24) como compatible con C5. Riesgo: «Favorito» puede leerse como texto promocional sobre la foto del proveedor (§2.2.16). Sin cambio; lo decide el PO. |
| 19 | Insignia de la colección, aviso y «Operado por…» fuera de la foto en la ficha | C5 | PERMITIDO | Sin cambio (REQ-095, REQ-098). |
| 20 | Insignia de propina en la ficha, recalculada con el evento elegido | D1, D2 | PERMITIDO | `primeraPiezaBadge` por evento (REQ-095). |
| 21 | Insignia de propina en `DestinationTourCard` (componente sin uso) solo con `isFreeTour` | D2 | PROHIBIDO | Corregido: pasa por `primeraPiezaBadge`, y un escaneo impide usar el texto de la insignia sin esa función (REQ-614). |
| 22 | Aviso por evento: umbral calculado, EUR con MXN aproximado | D2, D4 | PERMITIDO | Sin cambio (REQ-096, REQ-170). |
| 23 | Tours de pago (`paymentUrl` de Stripe, expiración, error 63, pago a la llegada) | D3, D5, D6, D7 | PERMITIDO | Apagado (`PAID_TOURS_ENABLED=false`, PR #62). Candado de pagos. |
| 24 | Cancelación gratis en free tours y hasta 24 h en tours de pago | D3 | PERMITIDO | Sin cambio (REQ-097). |
| 25 | Reseñas de FREETOUR en la ficha | C7 | PERMITIDO | Como reseñas del tour; sin las que nombran la plataforma (REQ-171). |
| 26 | Reseñas del inicio cuando su tour no se encuentra | C7 | PROHIBIDO | Quedaban como reseña suelta del sitio. Corregido: solo salen ligadas a su tour (REQ-613). |
| 27 | «CALIFICACIÓN PROMEDIO» del inicio (promedio de las calificaciones de FREETOUR) | C7 | PROHIBIDO | Se leía como calificación de Travel Puzzle. Corregido: «Calificación promedio de las experiencias» / «Average experience rating» (REQ-173: «experiencias», no «tours») (REQ-613). |
| 28 | Reseñas en el correo de confirmación | C7 | PERMITIDO | «Lo que dicen otros viajeros de este tour», filtradas (REQ-171). |
| 29 | Correo de confirmación y recordatorios con los 9 campos de A2 | A2 | OBLIGATORIO FALTANTE | Si el resumen del tour fallaba, proveedor, fecha, duración, idioma o punto de encuentro desaparecían del correo. Corregido: la fila sale «Por confirmar» (REQ-610). |
| 30 | Nombre del proveedor en los correos | A2, C3 | PROHIBIDO | Si el nombre del operador mencionaba FREETOUR, llegaba tal cual al cliente. Corregido: `cardProvider` y, si no hay nombre utilizable, «Un guía local» (REQ-611). |
| 31 | Interfaz de cancelación y aviso de rechazo por webhook, confirmado con `GET /booking/{ref}` | A3 | PERMITIDO | Sin cambio (REQ-079). |
| 32 | FREETOUR no manda correos propios a clientes de Modo 2 | A4, H2 | PERMITIDO | Soporte lo confirmó el 4 nov; prueba en cada release (REQ-080). |
| 33 | Correo o WhatsApp post-tour con tours de FREETOUR | B2, B3 | PROHIBIDO | Ya bloqueado: `FREETOUR_POSTTOUR_PROMO_ENABLED=false` (REQ-081). Sin cambio. |
| 34 | Mensajes al proveedor (`/booking/messages`) | A5 | PERMITIDO | Hoy no se envían; el filtro de enlaces y 5000 caracteres está listo (REQ-083). Garantía REQ-617. |
| 35 | Venta cruzada en correos | B3 | PERMITIDO | Sin FREETOUR, falla cerrada (REQ-263); apagada (`EMAIL_CROSS_SELL_ENABLED=false`). |
| 36 | Chatbot (agente o Mila) que venda o reserve tours de FREETOUR | B2 | PROHIBIDO | Ya bloqueado: el catálogo del agente marca FREETOUR como bloqueado y `FREETOUR_CHATBOT_ENABLED=false` (REQ-081). |
| 37 | Puzzle Rewards (banner y desafíos «Completa tu primera experiencia…») | B4, H2 | PROHIBIDO | Contarían reservas de FREETOUR. Ya bloqueado: no se monta (`ACCOUNTS_ENABLED=false`) y `rewards-guard` (REQ-082). Garantía REQ-618. |
| 38 | «Arma tu viaje»: experiencias cercanas y carrusel | B3, I | PERMITIDO | Nunca FREETOUR (REQ-320, REQ-321); competidores y otras categorías permitidos (I). |
| 39 | Menú y colección «La Primera Pieza» | C4 | PERMITIDO | Solo como nombre de colección (REQ-093, REQ-094). |
| 40 | robots.txt y llms.txt | C2 | PERMITIDO | llms.txt sin textos de FREETOUR (REQ-103). Garantía REQ-616. |
| 41 | Indexar una ciudad con ≥ 3 tours de FREETOUR y sin guía propia | C2 | AMBIGUO-PEDIR POR ESCRITO | La skill pide que el texto que hace indexable una ciudad sea propio; la regla firmada (REQ-089) indexa con ≥ 3 tours. El hub lleva H1, meta y FAQ propios, pero el contenido principal es de FREETOUR. Pregunta 5. |
| 42 | Datos que se envían a FREETOUR al reservar | G2 | PROHIBIDO | El teléfono se mandaba aunque el evento no lo pidiera. Corregido: payload explícito con email, nombre, apellido y teléfono solo con `isPhoneRequired` (REQ-612). El teléfono se queda en el registro de Travel Puzzle. |
| 43 | Contacto de la reserva mayor de edad | G3 | OBLIGATORIO FALTANTE | La casilla existe (REQ-083) pero `ADULT_CONTACT_CHECK_ENABLED=false`. Candado de banderas: encenderla con preview, prueba de humo y OK del PO. |
| 44 | API key solo en variables de entorno; rotar la de 2024 | E7 | OBLIGATORIO FALTANTE | Sin llaves en el repo (escaneo de esta auditoría). La rotación sigue pendiente: candado de secretos, la hace el PO. |
| 45 | Aviso de privacidad (transferencia fuera de la UE) y política de cookies propia | G4, G5 | OBLIGATORIO FALTANTE | El aviso no menciona la transferencia; la política de cookies es un borrador tras bandera. Candado legal: texto de PO y abogado (REQ-084, PENDIENTE). |
| 46 | Fotos de FREETOUR en los correos (portada y galería) | C1, C5 | PERMITIDO | Sin texto ni logo encima. |
| 47 | Reservas de prueba en producción: cancelarlas y avisar a soporte | B6 | PERMITIDO | Procedimiento en `release-email-check` (REQ-080). |
| 48 | Aprobación para promover free tours (§7.1) | B1 | AMBIGUO-PEDIR POR ESCRITO | Pregunta 7. |
| 49 | Comisión, retiro y conciliación | F1–F4 | PERMITIDO | Sin código; conciliación en admin.freetour.com. Mínimo de retiro: vale el contrato (30 €) hasta la pregunta 9. |
| 50 | Competidores (Civitatis, Viator, Big Bus, agencias) en el mismo sitio, carrito y carrusel | I | PERMITIDO | Sin cambio. |
| 51 | Ley aplicable y tribunales en Suiza | G6 | PERMITIDO | Informativo. |

## Tours de pago de FREETOUR, de punta a punta (pedido del PO, 6 nov 2026, 22:00)

**Estado:** en `main` los tours de pago se ven (tarjeta, ficha y selector) pero **no se pueden reservar**: `placeBooking` responde `paid_not_available` a todo evento con precio > 0, con o sin `PAID_TOURS_ENABLED` (apagada). El cobro completo (checkout, verificación, cron, páginas de éxito y cancelación) vive en el **PR #62**, que va 64 commits atrás de `main` y necesita la migración 0009 (candado). Revisé el código de los dos; no hubo prueba en preview ni producción porque el flujo no está publicado.

| # | Elemento | Regla | Veredicto | Ajuste |
|---|---|---|---|---|
| 52 | Tarjeta de un tour de pago: «Desde aprox. MXN $X · EUR €Y», sin insignia de propina | D4, D1 | PERMITIDO | Sin cambio (REQ-170, REQ-525; `primeraPiezaBadge` da null si no es free, REQ-095/097). |
| 53 | Ficha de pago: aviso por evento, política de 24 h y pago a la llegada | D2, D3, D7 | PERMITIDO | `paidPolicy` (REQ-097): «arrival» cuando `payableNow` = 0, depósito con `isPartiallyPaid`. Solo con `PAID_TOURS_ENABLED`. |
| 54 | Selector de personas: precio con `fullPricePerGroup[adultos]` y `payableNowPricePerGroup` | D2 | PERMITIDO | Respeta `minAdultsPerBooking` y plazas; el precio se recalcula por evento. |
| 55 | Servidor: precio con `fullPricePerGroup[adultos + niños]`, distinto del formulario y de REQ-010 del PR #62 (por adultos) | D2, E9 | AMBIGUO-PEDIR POR ESCRITO | Corregido a lo conservador: se toma la lectura más cara de las dos, así nunca se reserva gratis un grupo que una lectura marca de pago (REQ-620). Confirmar la clave con api@freetour.com y unificar. |
| 56 | Evento en vivo antes de reservar, con plazas, `minAdultsPerBooking` e `isPhoneRequired` | E2, D2 | PERMITIDO | `placeBooking` → `getEvent` → `checkEvent` (REQ-076, REQ-620). |
| 57 | Reservar un tour de pago en `main` | D5 | PERMITIDO | Bloqueado (`paid_not_available`): no hay cobro sin el PR #62. |
| 58 | PR #62: `POST /payment` con `successUrl` y `cancelUrl` https; verificación con `GET /payment/{id}`; error 63 = pendiente, reintento ≥ 10 min | D5 | PERMITIDO | `payment.ts`, `payment-state.ts`, `payment-urls.ts`, cron `/api/cron/payments` (REQ-011, REQ-012 del PR #62). |
| 59 | PR #62: sesión de pago vencida | D5, B6 | OBLIGATORIO FALTANTE | Hoy solo se marca `expired`: no se regenera el `paymentUrl` ni se cancela la reserva en FREETOUR, que queda ocupando lugar sin pagar, y el cliente no recibe aviso. Ajuste para el PR #62 (candado de pagos): ofrecer «pagar de nuevo» con otra sesión mientras el evento siga disponible, y si no, cancelar por API y avisar por correo. |
| 60 | Cobro de FREETOUR separado del resto del carrito | D6 | PERMITIDO | `split.ts` (REQ-107): cada proveedor cobra por su lado y el `paymentUrl` vencido se renueva en el carrito. |
| 61 | Confirmación de un tour de pago con los 9 campos | A2 | PERMITIDO | El PR #62 la manda una sola vez al confirmar el pago; usa el mismo constructor (REQ-079, REQ-610). |
| 62 | Confirmación de un tour de pago, o de un free tour que pasó a tarifa fija: consejo de propina y sin política de 24 h | D1, D3 | PROHIBIDO | `isFree` salía del resumen del tour y no del precio cobrado. Corregido: con precio > 0 no hay propina y van las dos líneas de 24 h (REQ-622). |
| 63 | Rechazo de un tour de pago: «No se te cobró nada» | D3, A3 | PROHIBIDO | Falso si ya pagó. Corregido: «el reembolso de lo que pagaste es automático» (REQ-621). |
| 64 | Cancelación de un tour de pago: qué pasa con lo pagado | D3, A3 | OBLIGATORIO FALTANTE | El correo no lo decía. Corregido: con 24 h o más, reembolso automático; con menos, sin reembolso; sin fecha UTC no se afirma nada (REQ-621). Falta en el PR #62: mostrar la regla de 24 h en la pantalla de cancelar antes de confirmar. |
| 65 | Webhook de rechazo confirmado con `GET /booking/{ref}` en tours de pago | A3 | PERMITIDO | El mismo de los free tours (REQ-079); el correo sale con el texto de REQ-621. |
| 66 | Reseñas en la ficha y en los correos de un tour de pago | C7 | PERMITIDO | Como reseñas del tour (REQ-171). |
| 67 | Tours de pago en recomendaciones y correos post-tour | B3, PO | PERMITIDO | Solo con `PAID_TOURS_ENABLED` y nunca tours de FREETOUR en post-tour (REQ-081, REQ-263). |

## Lo que queda para el PO

- **Pedir por escrito (correo borrador en `docs/freetour/correo-permisos-borrador.md`):** filas 12, 13, 16, 17, 41 (pregunta 5), 18 (C5 y REQ-526) y 48 (pregunta 7).
- **Candados:** encender `ADULT_CONTACT_CHECK_ENABLED` (fila 43), rotar la API key (fila 44) y el texto legal de privacidad y cookies (fila 45).
- **Para el PR #62 (tours de pago, candado de pagos):** filas 59 y 64 (sesión vencida y regla de 24 h en la pantalla de cancelar), y rebasarlo sobre `main` para heredar REQ-610, REQ-612, REQ-620, REQ-621 y REQ-622.
- **Pregunta técnica a api@freetour.com (fila 55):** ¿`fullPricePerGroup` y `payableNowPricePerGroup` van por número de adultos o por adultos + niños?
- **Para el agente del PR #204:** filas 12 y 13. Con `indexableEnrichment = false`, no marcar `additionalProperty` de idiomas ni `tripOrigin` y no agregar «Idioma del guía» al HTML del servidor, salvo que el PO lo acepte por escrito.

## Garantía futura

`src/freetour/lib/cumplimiento.test.ts` falla en CI si:
- aparece «FREETOUR» o «freetour.com» en el copy visible al cliente (REQ-616), salvo una mención permitida registrada en `ALLOWED_MENTIONS`;
- el marcado de una ficha de FREETOUR lleva AggregateRating, review, descripción o keywords (REQ-615; el contrato REQ-580 de #204 lo repite sobre el HTML real en la prueba de humo);
- algún código llama a `/booking/messages` sin el filtro de enlaces (REQ-617);
- se pinta la insignia de propina sin `primeraPiezaBadge` (REQ-614; REQ-095 prueba que se oculta con `fullPricePerGroup > 0`);
- se monta Puzzle Rewards u otorga premios sin `rewards-guard`, o la venta cruzada deja de excluir FREETOUR (REQ-618);
- se borra o se salta alguno de los tests que ya cubren estas reglas: REQ-079 y REQ-610 (9 campos de A2), REQ-095, REQ-083, REQ-082, REQ-081, REQ-263, REQ-320, REQ-321, REQ-171, REQ-612 y REQ-615 (REQ-618);
- esta tabla pierde su formato o un PROHIBIDO u OBLIGATORIO FALTANTE no cita su REQ, PR o candado (REQ-619).
