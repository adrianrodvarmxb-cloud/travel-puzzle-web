# Ficha única: gates firmados por el PO (14 nov 2026)

Decisiones que Adri firmó una por una, en conversación, sobre la propuesta `claude/ficha-unica-con-mila-v3-2026-11-14.md` (Proyecto de Claude) (52 decisiones). Este documento se actualiza conforme firma. Cada decisión tiene su folio REQ en `docs/requisitos.md`. El plan que las aplica es `docs/plan-ficha-unica-2026-11.md` (REQ-10579).

## Bloque 1: alcance y modelo

| # | Folio | Decisión | Firma del PO | Nota |
|---|---|---|---|---|
| 1 | REQ-10580 | Alcance de la plantilla | **Una sola ficha para todos los proveedores, en dos secciones del menú: Experiencias y Traslados.** | Regla literal del PO: «Big Bus está dentro de Traslados, y ahí mismo en Traslados se va todo lo que encaje en esta categoría de Freetour, Tangol y agencias (otros proveedores)». La sección la decide el tipo de producto, no el proveedor. Los traslados usan la misma plantilla con menos bloques. |
| 2 | REQ-10581 | Dónde vive el modelo común | **A: módulo nuevo `src/ficha/`.** | Es el OK del PO para crear un módulo de primer nivel. |
| 3 | REQ-10582 | Quién lee el modelo común en la primera entrega | **B: todo a la vez** (página, Mila, correos, página de reserva y buscador). | Difiere de la recomendación (A). Implica partir la entrega en más PR chicos, un lector por PR, tras bandera. |
| 4 | REQ-10583 | PR abiertos que tocan los mismos archivos | **A: ordenarlos primero**, uno por uno, con OK del PO en cada merge. |  |
| 5 | REQ-10584 | Cobro en viajes: retención o compra directa (PR #517) | **A: solo retención.** PR #517 en pausa. | Ratifica lo firmado el 13 nov. |
| 6 | REQ-10585 | Dirección vieja `/tours/…` | **A: misma ficha, sin mover nada.** | La de `/destinos` sigue siendo la canónica. |
| 7 | REQ-10586 | Paso de reserva tras el botón | **B: se unifica también el paso de reserva** (un solo flujo para todos los productos). | Difiere de la recomendación (A). Agranda la entrega y toca cobros (candado del PO). |

## Bloque 2: taxonomía

| # | Folio | Decisión | Firma del PO | Nota |
|---|---|---|---|---|
| 8 | REQ-10587 | Dónde vive la clasificación | **A: en memoria, formalizado.** Las tablas quedan para historial y correcciones a mano. | Reemplaza el gate G-T5 del 12 nov (tablas). Necesita su REQ de reemplazo. |
| 9 | REQ-10588 | Aventura y senderismo con guía (caso Minitrekking; ~274 tours de Tangol y ~76 de FREETOUR como «Momentos de autor») | **A: tipo «Excursión de un día» con los temas Aventura y Montaña y senderismo.** | Se le muestra al PO la lista de cambios antes de aplicarla. Cambia el título SEO por formato de esas fichas. |
| 10 | REQ-10589 | Taxonomía visible en fichas de FREETOUR | **B: tipo y dos atributos, como hoy.** | La taxonomía completa sí se usa en filtros y buscador. Ampliar exige permiso escrito de FREETOUR. |
| 11 | REQ-10590 | Atributos nuevos | **A: los tres**: «Con traslado», «Día completo» ampliado a toda actividad de 6 h o más y «Cancelación gratuita», siempre por dato real del producto, en es y en. |  |
| 12 | REQ-10591 | Dificultad de Tangol a la escala 1–5 | **A: tabla de equivalencias** firmada por el PO, con lista de dudas. | La tabla se le pasa para firma antes de aplicarla. |
| 13 | REQ-10592 | Firma de mapeos de proveedor a la taxonomía | **El PO aprueba la reclasificación de Tangol, de las 7 agencias y también la de FREETOUR.** Frase literal: «la reclasificación de taxonomía de las agencias estaba pendiente de OK, la apruebo, y también la de Freetour». | Más amplio que la recomendación (A). El mapeo de Extime está incompleto (solo «por revisar») y hay que terminarlo. Antes de aplicar cada una se le muestra la lista de cambios y de dudas. |
| 14 | REQ-10593 | Categoría original del proveedor (regla del 6 nov) | **A: guardarla completa, sin mostrarla.** | FREETOUR, Tangol (tipo y subtipo) y agencias. |
| 15 | — | Nombre en inglés de «Pieza libre» | **«Free Puzzle»** (ya decidido el 7 nov; no se preguntó). | Falta cerrar REQ-1103 con su prueba. |
| 16 | REQ-10594 | Regla de «Favorito de los viajeros» | **A: una sola regla, 4.9 y 180 reseñas.** | Reemplaza los otros dos umbrales (4.7/100 y 4.7/50). |

## Bloque 3: datos de Tangol

| # | Folio | Decisión | Firma del PO | Nota |
|---|---|---|---|---|
| 17 | REQ-10595 | Opciones con y sin traslado | **A: tabla propia, una columna por dato**, mostradas como tarjetas. | Requiere migración y otra vuelta del sync (candados). |
| 18 | REQ-10596 | Reseñas en fichas de Tangol | **C: no mostrar nada, y solicitar el detalle a Tangol para poder mostrarlo.** Frase literal: «C, se solicita el detalle a Tangol para poder mostrarlo». | Difiere de la recomendación. Lectura comunicada al PO: la nota y el conteo de Tangol dejan de mostrarse en ficha y tarjetas; el dato se sigue guardando y se usa por dentro para ordenar. La petición va en el correo a Hernán. |
| 19 | REQ-10597 | Precio tachado y descuento | **A: no mostrarlo y preguntar a Tangol** cómo obtenerlo por la API. |  |
| 20 | REQ-10598 | Temporada, popularidad y nombre de categoría | **A: guardarlos en la misma vuelta que las opciones.** | Una migración y una vuelta del sync. |
| 21 | REQ-10599 | Entradas a partidos (PR #432) | **A: después de la ficha única**, como boleto con fecha fija y solo con permiso de marcas. PR #432 en pausa. |  |
| 22 | REQ-10600 | Filtros de idioma y fecha | **A: Tangol entra a los dos filtros.** | Cumple REQ-1605. |

## Bloque 4: carrito

| # | Folio | Decisión | Firma del PO | Nota |
|---|---|---|---|---|
| 23 | REQ-10601 | Alcance del botón «Agregar a mi viaje» | **A: en toda ficha**; circuitos y viajes a la medida entran como pieza «por cotizar». | Reemplaza REQ-428. |
| 24 | REQ-10602 | Dónde se guarda el carrito | **A: en el servidor desde el inicio.** | Difiere de la recomendación (B). Requiere migración (candado) y revisión del abogado del aviso de cookies antes de encender. El carrito se carga aparte de la ficha para respetar la caché de 5 minutos. Mila puede leerlo. |
| 25 | REQ-10603 | Botón en celular | **A: en el cuerpo de la ficha**; la barra fija no cambia. |  |
| 26 | REQ-10604 | Páginas del recorrido de compra con versión en inglés | **A: las tres** (carrito, página de reserva y página de eventos). | Coherente con la decisión 7. |

## Bloque 5: transporte y mapas

| # | Folio | Decisión | Firma del PO | Nota |
|---|---|---|---|---|
| 27 | REQ-10605 | Mapa de experiencias sin coordenadas | **A: coordenadas de la ciudad desde GeoNames.** | Requiere migración (candado). Resuelve pin en /tours, mapa de zona en la ficha y distancia para transporte. |
| 28 | REQ-10606 | Ficha sin punto exacto | **A: círculo de «Zona aproximada»** sin botón «Cómo llegar». |  |
| 29 | REQ-10607 | Regla de transporte por ubicación | **A: ciudad → país → distancia, en toda ficha**, también en viajes de agencia. | Reemplaza REQ-005 y absorbe el PR #433. |
| 30 | REQ-10608 | Tours de FREETOUR cuyo mapa pinta Londres (coordenadas vacías) | **A: usar el centro de su ciudad** como «Zona aproximada». | Primero se mide cuántos son. |
| 31 | REQ-10609 | Tarjeta de Kiwitaxi (afiliado) en fichas | **A: en todas menos las de FREETOUR.** | Respeta REQ-1539. |

## Bloque 6: cobro y reserva

| # | Folio | Decisión | Firma del PO | Nota |
|---|---|---|---|---|
| 32 | REQ-10610 | Moneda mostrada | **Primero la moneda local del visitante según su país; después la del proveedor.** Frase literal: «La moneda local según ubicación geográfica, luego la del proveedor»; aclaró: la ubicación del visitante. | Distinto de las tres opciones propuestas. Implica detectar el país del visitante, una fuente de tipos de cambio para más monedas, calcular el precio local fuera de la página en caché, y decir siempre en qué moneda se hace el cargo real (MXN donde cobra Travel Puzzle; EUR donde cobra FREETOUR). |
| 33 | REQ-10611 | Plazo de confirmación | **B: un solo texto de 48 horas hábiles** para todos; lo leen igual la ficha y Mila. | Difiere de la recomendación (A). |
| 34 | REQ-10612 | Política de cancelación | **A: una sola, a la vista, por producto**, en Condiciones y resumida junto al precio. |  |
| 35 | REQ-10613 | Reembolsos y liberaciones de retención | **A: registro automático** (aviso de Stripe), construido antes de encender cobros nuevos. |  |
| 36 | REQ-10614 | Factura al cliente (CFDI) | **A: abrir requisito y definirlo con el contador**; la ficha no promete nada mientras tanto. | Tarea del PO con el contador. |
| 37 | — | Reseñas propias frente a nota del proveedor | No se preguntó: resuelta por la decisión 18 (la nota de Tangol no se muestra) y por la decisión del 3 nov (las reseñas de clientes de Travel Puzzle se ven igual y suman como una más). |  |
| 38 | REQ-10615 | Marca, operador y acuerdo con Tangol | **La marca que vende es Travel Puzzle; el operador sí se muestra en la ficha, pero en un lugar no tan visible.** Además se notifica a Hernán y se ajustan las cláusulas. Frases literales: «legalmente es necesario que se informe al cliente quién opera en sitio… sí podría decir Travel Puzzle pero en alguna parte tendría que decir que lo opera Tangol, como lo hace Freetour con su operador final»; «2 y también se notifica a Hernán y ajuste cláusulas»; «Cambio: que sí se muestre en ficha pero en un lugar no tan visible». | Lectura comunicada al PO: la casilla «Proveedor» y «En breve» dicen Travel Puzzle; el operador va en una línea «Opera en destino: …» dentro de «Información importante» (formato de los circuitos de Exotic Escapes), más confirmación y términos; misma regla para todos los proveedores. Reemplaza REQ-10542 (operador en la casilla Proveedor); va en su propio PR. Borrador del acuerdo: ajustar cláusulas 1.3 y 7.3 y marcarlo para el abogado; aviso a Hernán en borrador de Gmail, sin enviar. Investigación del 14 nov: Civitatis se define intermediaria e incluye la identificación del operador en «Detalles»; NOM-010-TUR-2001 pide nombres del prestador y del turista en el contrato (leído de un resumen, no del texto oficial; no es asesoría legal). |

## Bloque 7: Mila

| # | Folio | Decisión | Firma del PO | Nota |
|---|---|---|---|---|
| 39 | REQ-10616 | Rama de acceso de Mila al catálogo | **A: rehacerla sobre el modelo común** antes de fusionarla. |  |
| 40 | REQ-10617 | Mila y Tangol | **A: Mila ve e informa sobre los tours de Tangol desde ya**; para reservar manda a la ficha o a un asesor. |  |
| 41 | REQ-10618 | Mensaje de WhatsApp desde la ficha | **A: código, fecha, personas y opción.** |  |
| 42 | REQ-10619 | Rótulo del botón de ayuda | **«Mila» en todas las fichas; en las de FREETOUR, apagada porque no está autorizada.** Frase literal: «3, pero en las fichas de Freetour que esté apagada porque no está autorizada». | Con bandera para encenderla cuando FREETOUR autorice por escrito; esas fichas conservan el botón de asesor por WhatsApp. Se escribe la regla de derivación a persona. |
| 43 | REQ-10620 | Lugar de Mila en la ficha | **«Como lo hacen los referentes»** = bloque al cierre de las preguntas frecuentes y acceso en el panel de reserva en computadora. |  |
| 44 | REQ-10621 | Mila y el carrito | **B: Mila lee el carrito del servidor** (solo lectura). | Posible por la decisión 24. |
| 45 | REQ-10622 | Emergencias durante el viaje | **Ya está definido: por la API de WhatsApp Business, el cliente se comunica con el proveedor por medio de Mila.** Frase literal: «ya se definió una funcionalidad por medio de API WhatsApp Business que permite que el cliente se comunique con proveedor por medio de Mila». | La auditoría no encontró esa funcionalidad en `travel-puzzle-web` (el repo `zoefel-mila` no fue accesible); hay que ubicar su requisito y que la ficha y la confirmación lo digan así. |

## Bloque 8: alta de proveedores

| # | Folio | Decisión | Firma del PO | Nota |
|---|---|---|---|---|
| 46 | REQ-10623 | Carácter del proceso de alta | **A: obligatorio**, en las reglas del repo y con prueba automática que impide publicar un proveedor sin expediente completo. |  |
| 47 | REQ-10624 | Dónde vive el expediente | **A: en el repo; lo confidencial (acuerdos, netos, cuentas de pago) en el Proyecto de Claude y en el almacenamiento privado.** |  |
| 48 | REQ-10625 | Frontera legal | **A: dos niveles.** Para mostrarse: respuesta escrita del proveedor y permiso de contenido. Para reservar y cobrar: acuerdo firmado, revisado por el abogado, y cuenta de pago verificada. |  |
| 49 | REQ-10626 | Garantías | **Cada experiencia muestra garantías específicas si las tiene y siempre dirige a términos y condiciones, donde cada proveedor tiene su apartado con sus especificaciones.** (frase literal del PO) | Aplica igual a tours y a viajes. Enlaza con el anexo por proveedor en T&C (REQ-3345). |
| 50 | REQ-10627 | Mínimo de calidad en tours por API | **A: lo que no cumple el mínimo queda oculto** y sale en un reporte. | Antes de encender se le informa al PO cuántos tours quedarían ocultos. |
| 51 | REQ-10628 | Datos que Mila necesita | **A: bloquean la publicación** de proveedores nuevos. |  |
| 52 | REQ-10629 | Retroactivo | **A: expediente para Tangol primero y luego las 7 agencias**, sin ocultar nada mientras tanto. |  |

## Confirmaciones finales (SEO, idiomas, calidad)

| Tema | Firma del PO | Nota |
|---|---|---|
| Preguntas frecuentes por regla (REQ-10630) | **Sí, y también en las fichas de FREETOUR.** Se arman con datos reales de la ficha y con los mismos textos que la página de Ayuda. | Cambia la propuesta (que las excluía de FREETOUR). Tensión con la regla de no agregar contenido indexable en fichas de FREETOUR sin permiso escrito (REQ-570, decisión 10): requiere la revisión de cumplimiento de FREETOUR antes de construir; salida propuesta: bloque no indexable (`data-nosnippet`) y fuera del marcado estructurado. |
| Idiomas de la taxonomía (REQ-10631) | **No solo es/en: debe salir en cada idioma disponible en la página.** | Cambia la propuesta. Hay que traducir el diccionario (formatos, temas, atributos) a todos los idiomas del sitio. |
| Términos y condiciones en otros idiomas (REQ-10632) | **Traducirlos a cada idioma disponible en la página, con la cláusula de que la única versión con validez legal es la que está en español**, como los referentes. | Referentes consultados el 14 nov: Booking.com, sección A2 punto 4 («En caso de discrepancia entre las Condiciones en inglés y la versión en cualquier otro idioma, prevalecerá la versión en inglés…, a menos que la legislación local exija lo contrario»); GuruWalk («Cualquier discrepancia entre ambas versiones serán regidas por la versión original en español»). La cláusula y las traducciones pasan por el abogado (REQ-1323) antes de publicarse. |
| Rendimiento (REQ-10633) | **La ficha nueva no pesa más que la actual, y los tres requisitos de rendimiento en NO CUMPLIDO (REQ-1560, 1562, 1563) se corrigen de una vez**, no en un frente aparte. | Cambia la propuesta. |
| Requisitos sin folio (REQ-10634) | **«Los seis ahora»** (PO, 14 nov 2026 06:09): accesibilidad, voucher, cancelación con reembolso, cupones, lista de espera y menores. | Abiertos como REQ-10641 a REQ-10646. Cupones choca con la regla del recorrido de Mila (sin descuentos ni urgencia falsa): falta que el PO diga cuál manda. |

## Ya firmado antes (no se vuelve a preguntar)
- Toda ficha dice quién opera; Tangol = «Tangol Tours» (REQ-10542).
- Reservas de Tangol, G1: cobra Travel Puzzle con retención en Stripe y paga el neto a Tangol por quincena (firmado en conversación el 14 nov; falta escribirlo en el PR #553).

## Estado
Las 52 decisiones y las confirmaciones finales quedaron firmadas el 14 nov 2026 (una confirmación con supuesto por validar, REQ-10634). El plan quedó firmado por el PO el 14 nov 2026 a las 06:07 (REQ-10579).

## Puntos que el plan debe resolver antes de construir
1. Decisión 38 reemplaza REQ-10542: quitar «Tangol Tours» de la casilla Proveedor y de «En breve», y moverlo a la línea «Opera en destino» (PR propio; requiere otra vuelta del sync o resolverlo al pintar).
2. Decisión 18: ocultar nota y conteo de reseñas de Tangol en ficha y tarjetas.
3. Preguntas frecuentes en fichas de FREETOUR: revisión de cumplimiento antes de construir.
4. Decisión 45: ubicar el requisito de la comunicación cliente–proveedor por medio de Mila (WhatsApp Business) antes de escribir el texto de emergencias.
5. Decisión 13: terminar el mapeo de Extime y mostrar al PO la lista de cambios de cada reclasificación antes de aplicarla.
6. Decisiones 3 y 7 agrandan la entrega (todos los lectores a la vez; paso de reserva unificado): repartir en PR chicos tras bandera.
7. Decisión 24: migración del carrito y revisión del abogado del aviso de cookies.
8. Decisión 32: país del visitante, fuente de tipos de cambio y compatibilidad con la caché de 5 minutos.

## Cambios del PO al plan (14 nov 2026, 05:57)

| Folio | Cambio (frase literal del PO) | Dónde entra |
|---|---|---|
| REQ-10635 | «Un solo paso de reserva para todos, también en inglés y en cada idioma disponible en la página» | Ola 8 |
| REQ-10636 | «buscar conversación en este proyecto donde se ubicaron los adicionales de cada proveedor para agregarlos a sus fichas» | Ola 12 y sección 8 bis del plan. Precisión del PO (06:01): «Tangol sí tiene, con transporte y sin transporte»; FREETOUR no tiene |
| REQ-10637 | «Tangol, Freetour y resto de proveedores en filtros de idioma y fecha» | Ola 12. Amplía la decisión 22 (REQ-10600) |
| REQ-10638 | «Preguntas frecuentes, garantías y términos traducidos en cada idioma con la cláusula del español» | Ola 14 |
| REQ-10639 | «agregar a este proyecto el repo de ZoeFel IA, ahí vienen detalles de cómo funcionará Mila en Travel Puzzle, incluyendo la funcionalidad de comunicarse con proveedor por medio de Mila» | Repo `zoefel-mila` agregado a la sesión; la funcionalidad es el chat puente «Escribirle a mi guía» (REQ-3432, REQ-3412). Resuelve el punto abierto de la decisión 45 |

