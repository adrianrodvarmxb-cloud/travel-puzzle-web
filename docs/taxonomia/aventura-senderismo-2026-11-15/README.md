# Aventura y senderismo con guía (decisión 9): lista de cambios para la firma del PO (15 nov 2026)

**Folios:** REQ-10660 (código: veredicto por título y lista, `src/taxonomy/lib/aventura-senderismo.ts`) y REQ-10661 (gate: firma de esta lista). **Decisión firmada:** 9 (REQ-10588, 14 nov): «A: tipo Excursión de un día con los temas Aventura y Montaña y senderismo. Se le muestra al PO la lista de cambios antes de aplicarla.» **Frente:** #549, ficha única, ola 3.
**Regla del plan:** nada se reclasifica en producción hasta que el PO firme esta lista. Cuando firme, la regla entra al clasificador en memoria (decisión 8) en su propio PR, con la lista «antes y después» en `tmp/` y el índice del buscador reconstruido.

## Qué hay hoy

Los 274 tours de «Excursiones de aventura» de Tangol (categoría 9000003) y los 76 de «Tours de aventura» de FREETOUR (categoría 16) salen como «Momentos de autor» con tema Aventura. Entre ellos está el Minitrekking del Perito Moreno, que motivó la decisión. Lectura de solo lectura de D1 el 15 nov 2026 (título en español, ciudad y duración; `isActive = 1`): 350 tours.

## Cómo se decide cada tour (REQ-10660)

1. Un juego de exploración de FREETOUR se queda (no es senderismo con guía, aunque diga «autoguiado»).
2. Más de un día, o «autoguiado», «alquiler», «transfer», «crucero», «expedición», «… días»: **duda**, lo decide el PO.
3. Caminata con guía en el título (trekking, trek, minitrekking, senderismo, caminata, hike, hiking, ascenso, escalada, montañismo): **cambia** a Excursión de un día · Aventura · Montaña y senderismo. «Kayak y trekking» cambia: hay caminata.
4. Otra actividad de aventura (kayak, rafting, 4x4, bici, cabalgata, buceo, buggy, canopy, parapente, pesca, safari…): **se queda** como Momentos de autor · Aventura.
5. Lugar de montaña sin otra actividad (cerro, volcán, glaciar, laguna, nevado, páramo, cordillera, montaña, sierra): **cambia** (12 tours; ver G-A2).
6. Lo demás se queda.

## Gates para el PO (REQ-10661)

| Gate | Pregunta | A (recomendada) | B |
|---|---|---|---|
| G-A1 | Alcance del cambio | **Solo la caminata con guía** (77 tours de Tangol, 0 de FREETOUR) pasa a Excursión de un día; el resto de la aventura (rafting, kayak, 4x4, bici, buceo…) sigue como Momentos de autor · Aventura | Los 350 tours de las dos categorías pasan a Excursión de un día (también rafting, buceo y los juegos de exploración) |
| G-A2 | Los 12 «lugar de montaña sin otra actividad» (Big Ice, Cerro Champaquí, Laguna Esmeralda a la noche, Lagunas altiplánicas…) | **Cambian** con Aventura y Montaña y senderismo, como los de caminata | Solo cambia el tipo a Excursión de un día; los temas quedan Aventura y Naturaleza |
| G-A3 | Las 13 dudas (cruceros de Galápagos, circuitos W y O autoguiados, alquiler de bici, transfer escénico, «expedición 4x4») | **No cambian en este PR**; cruceros y circuitos de varios días los revisa la regla de circuitos y el alquiler y el transfer su propia categoría | Se deciden aquí uno por uno |
| G-A4 | FREETOUR | **Ningún cambio**: los 76 son juegos de exploración, quads, rafting o bici; ninguno es senderismo con guía | Revisar a mano los 76 |

Con «A» en todo: 77 cambian, 260 se quedan, 13 dudas. Cambia también el título SEO por formato de las 77 fichas (G-T9 A: «{título} – Excursión desde {Ciudad}»).

## Resultado con la regla propuesta

Tours revisados: 350 · cambian: 77 · se quedan: 260 · dudas: 13

| Proveedor | Cambian | Se quedan | Dudas |
|---|---|---|---|
| freetour | 0 | 75 | 1 |
| tangol | 77 | 185 | 12 |

### Cambia a Excursión de un día · Aventura · Montaña y senderismo (77)

| Proveedor | Ciudad | Duración | Título | Regla |
|---|---|---|---|---|
| tangol | bariloche | 7 h | Kayak Y Trekking En Lago Mascardi En Privado | caminata con guía («trekking») |
| tangol | bariloche | 10 h | Montañas Y Glaciares Del Tronador | lugar de montaña sin otra actividad («montana») |
| tangol | bariloche | 7 h | Trekking Privado En Cerro Bella Vista | caminata con guía («trekking») |
| tangol | bariloche | 3 h | Trekking Privado En El Cerro Llao Llao | caminata con guía («trekking») |
| tangol | bucaramanga | 11 h | Explora El Páramo De Santurbán | lugar de montaña sin otra actividad («paramo») |
| tangol | cordoba | 12 h | Trekking Quebrada Del Condorito | caminata con guía («trekking») |
| tangol | coyhaique | 9 h | Trekking Laguna Verde - Parque Nacional Cerro Castillo | caminata con guía («trekking») |
| tangol | coyhaique | 9 h | Trekking Miradores Glaciar Exploradores | caminata con guía («trekking») |
| tangol | el-bolson | 9 h | Tour De Trekking Al Cajon Del Azul | caminata con guía («trekking») |
| tangol | el-calafate | 12 h | Big Ice Glaciar Perito Moreno | lugar de montaña sin otra actividad («glaciar») |
| tangol | el-calafate | 5 h | Cañadón Experience - Trekking Y Estancia | caminata con guía («trekking») |
| tangol | el-calafate | 9 h | Kayak Y Trekking Rio La Leona | caminata con guía («trekking») |
| tangol | el-calafate | 10 h | Mayo Spirit Trek | caminata con guía («trek») |
| tangol | el-calafate | 10 h | Minitrekking Glaciar Perito Moreno | caminata con guía («minitrekking») |
| tangol | el-calafate | 12 h | Senderismo En Cristina Ranch, En Fossil Canyon. | caminata con guía («senderismo») |
| tangol | el-calafate | 9 h | Trekking A La Cima Del Cerro Frias | caminata con guía («trekking») |
| tangol | el-calafate | 5 h | Trekking En El Cerro Frias | caminata con guía («trekking») |
| tangol | el-calafate | 7 h | Trekking En El Chalten Desde El Calafate | caminata con guía («trekking») |
| tangol | el-calafate | 11 h | Trekking Y Navegacion A Los Glaciares Australes | caminata con guía («trekking») |
| tangol | huaraz | 12 h | Escalada Nevado Mateo | caminata con guía («escalada») |
| tangol | huaraz | 9 h | Nevado Pastoruri Y Puya Raimondi | lugar de montaña sin otra actividad («nevado») |
| tangol | huaraz | 14 h | Trekking A La Laguna 69 - Cordillera Blanca | caminata con guía («trekking») |
| tangol | huaraz | 11 h | Trekking A La Laguna Paron | caminata con guía («trekking») |
| tangol | huaraz | 9 h | Trekking Laguna Churup En El Parque Nacional Huascaran | caminata con guía («trekking») |
| tangol | la-cumbrecita | 14 h | Cerro Champaqui | lugar de montaña sin otra actividad («cerro») |
| tangol | la-cumbrecita | 10 h | Trekking Al Paso De Garay | caminata con guía («trekking») |
| tangol | la-cumbrecita | 6 h | Trekking Arroyo La Puente | caminata con guía («trekking») |
| tangol | la-cumbrecita | 9 h | Trekking Cerro Corona | caminata con guía («trekking») |
| tangol | la-cumbrecita | 8 h | Trekking Cruce A Villa Alpina | caminata con guía («trekking») |
| tangol | la-cumbrecita | 8 h | Trekking Por La Quebrada Del Socavon | caminata con guía («trekking») |
| tangol | la-serena | 10 h | Trekking Parque Nacional Fray Jorge Maravilla Natural Y Cultural | caminata con guía («trekking») |
| tangol | manaus | 9 h | Caminata En Archipielago De Anavilhanas | caminata con guía («caminata») |
| tangol | mendoza | 3 h | Trekking En Cerro Bayo | caminata con guía («trekking») |
| tangol | mendoza | 3 h | Trekking Y Rappel En Potrerillos | caminata con guía («trekking») |
| tangol | paraty | 3 h | Caminata Por Caminho Do Ouro Desde Paraty Cunha | caminata con guía («caminata») |
| tangol | pereira | 4 h | Senderismo En La Reserva Barbas Bremen | caminata con guía («senderismo») |
| tangol | pucon | 8 h | Trekking Ascenso Volcán Villarrica | caminata con guía («trekking») |
| tangol | pucon | 8 h | Trekking Parque Nacional Huerquehue | caminata con guía («trekking») |
| tangol | puerto-natales | 11 h | Trekking A Valle Frances Desde Puerto Natales | caminata con guía («trekking») |
| tangol | puerto-natales | 9 h | Trekking Base Las Torres Del Paine | caminata con guía («trekking») |
| tangol | puerto-varas | 8 h | Ruta Alerce Ancestral Y Laguna Chaiquenes: Trek Al Pn Alerce Andino | caminata con guía («trek») |
| tangol | punta-arenas | 3 h | Trekking A Reserva Nacional Magallanes En Punta Arenas | caminata con guía («trekking») |
| tangol | purmamarca | 9 h | Tour De Dia Completo A Laguna De Los Pozuelos | lugar de montaña sin otra actividad («laguna») |
| tangol | rio-de-janeiro | 8 h | Pedra Da Gavea Trekking | caminata con guía («trekking») |
| tangol | salta | 9 h | Laguna Del Toro Con Avistaje De Flamencos | lugar de montaña sin otra actividad («laguna») |
| tangol | san-martin-de-los-andes | 8 h | Trekking En El Volcán Colorado | caminata con guía («trekking») |
| tangol | san-pedro-de-atacama | 11 h | Full Day Piedras Rojas + Lagunas Altiplánicas Miscanti Y Miñiques + Laguna Chaxa + Salar De Atacama | lugar de montaña sin otra actividad («laguna») |
| tangol | san-pedro-de-atacama | 5 h | Laguna Baltinache O Lagunas Escondidas | lugar de montaña sin otra actividad («laguna») |
| tangol | san-pedro-de-atacama | 4 h | Trekking Cascada Escondida | caminata con guía («trekking») |
| tangol | san-pedro-de-atacama | 4 h | Trekking Río Salado | caminata con guía («trekking») |
| tangol | santiago-de-chile | 13 h | Trekking Al Ventisquero Colgante Glaciar El Morado | caminata con guía («trekking») |
| tangol | santiago-de-chile | 11 h | Trekking Al Volcán San José Con Termas Baños De Colina | caminata con guía («trekking») |
| tangol | santiago-de-chile | 5 h | Trekking Cerro Manquehuito En Santiago | caminata con guía («trekking») |
| tangol | santiago-de-chile | 12 h | Trekking Parque Nacional La Campana | caminata con guía («trekking») |
| tangol | torres-del-paine | 5 h | Ice Trekking Al Glaciar Grey | caminata con guía («trekking») |
| tangol | ushuaia | 5 h | Caminata Nocturna En Monte Susana | caminata con guía («caminata») |
| tangol | ushuaia | 7 h | Cruzando La Cordillera | lugar de montaña sin otra actividad («cordillera») |
| tangol | ushuaia | 8 h | Excursión Privada Parque Nacional Con Trekking Y Canoas | caminata con guía («trekking») |
| tangol | ushuaia | 8 h | Ice Trekking Por El Glaciar Vinciguerra | caminata con guía («trekking») |
| tangol | ushuaia | 7 h | Laguna Esmeralda A La Noche | lugar de montaña sin otra actividad («laguna») |
| tangol | ushuaia | 8 h | Laguna Esmeralda Con Almuerzo En Domo De Montaña | lugar de montaña sin otra actividad («laguna») |
| tangol | ushuaia | 8 h | Parque Nacional Con Trekking Y Canoas | caminata con guía («trekking») |
| tangol | ushuaia | 4 h | Trekking A Estancia Tunel | caminata con guía («trekking») |
| tangol | ushuaia | 6 h | Trekking A Laguna Esmeralda | caminata con guía («trekking») |
| tangol | ushuaia | 6 h | Trekking A Laguna Esmeralda Y Castoreras | caminata con guía («trekking») |
| tangol | ushuaia | 5 h | Trekking Al Monte Susana | caminata con guía («trekking») |
| tangol | ushuaia | 6 h | Trekking Al Monte Susana | caminata con guía («trekking») |
| tangol | ushuaia | 7 h | Trekking Andino | caminata con guía («trekking») |
| tangol | ushuaia | 7 h | Trekking Cerro Pelado | caminata con guía («trekking») |
| tangol | ushuaia | 5 h | Trekking Glaciar Martial | caminata con guía («trekking») |
| tangol | ushuaia | 8 h | Trekking Glaciar Ojo Del Albino Y Laguna Esmeralda | caminata con guía («trekking») |
| tangol | ushuaia | 8 h | Trekking Glaciar Vinciguerra | caminata con guía («trekking») |
| tangol | ushuaia | 7 h | Trekking Laguna Turquesa Y Cerro Carbajal | caminata con guía («trekking») |
| tangol | ushuaia | 5 h | Trekking Lagunas Gemelas | caminata con guía («trekking») |
| tangol | ushuaia | 5 h | Trekking Y Travesía En Utv 4X4 | caminata con guía («trekking») |
| tangol | valdivia | 7 h | Trek Parque Nacional Alerce Costero Bosques Ancestrales | caminata con guía («trek») |
| tangol | villa-union | 3 h | Trekking En El Vallecito Encantado | caminata con guía («trekking») |

### Duda: lo decide el PO (13)

| Proveedor | Ciudad | Duración | Título | Regla |
|---|---|---|---|---|
| freetour | quito | 10 h | Excursión de tres días a Quito: Los vientos del páramo andino | palabra «dias»: lo decide el PO |
| tangol | colonia | 6 h | Alquiler De Bicicleta | palabra «alquiler»: lo decide el PO |
| tangol | islas-galapagos | 5 d | Crucero Clásico Galápagos Salvaje 5D/4N | más de un día: circuito, fuera de la regla |
| tangol | islas-galapagos | 6 d | Crucero De Lujo Galápagos 6 Días – Bartolomé Y Genovesa | más de un día: circuito, fuera de la regla |
| tangol | islas-galapagos | 4 d | Galápagos Esencial En Crucero: Fauna Y Naturaleza En 4 Días | más de un día: circuito, fuera de la regla |
| tangol | islas-galapagos | 5 d | Galápagos Inolvidable: Expedición Premium En Crucero - 5 Días | más de un día: circuito, fuera de la regla |
| tangol | islas-galapagos | 8 d | Gran Expedición Galápagos: 8 Días De Fauna Y Naturaleza | más de un día: circuito, fuera de la regla |
| tangol | las-grutas | 8 h | Expedición 4X4 & Snorkeling En El Fuerte Argentino | palabra «expedicion»: lo decide el PO |
| tangol | paraty | 4 h | Alquiler De Bicicleta | palabra «alquiler»: lo decide el PO |
| tangol | puerto-natales | 8 d | Circuito O Clásica - Aventura Macizo Paine Autoguiado 8 Dias | más de un día: circuito, fuera de la regla |
| tangol | puerto-natales | 4 d | Circuito W Express Autoguiado 4 Dias - En Camping O Refugio | más de un día: circuito, fuera de la regla |
| tangol | puerto-varas | 1 d | Descubre Reloncavi, Kayak En El Primer Fiordo De Chile | más de un día: circuito, fuera de la regla |
| tangol | san-martin-de-los-andes | 1 h | Transfer Escénico Hacia Quila Quina | palabra «transfer»: lo decide el PO |

### Se queda como Momentos de autor · Aventura (260)

| Proveedor | Ciudad | Duración | Título | Regla |
|---|---|---|---|---|
| freetour | aarhus | 1.8 h | Desaparecido en Aarhus: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | aarhus | 4 h | La Naturaleza Secreta de Aarhus: Bosques, Ciervos & Costa | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | agra | 5.5 h | Excursión de día completo en Agra: conservación de elefantes y rescate de osos | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | alicante | 0.5 h | Excursiones privadas en tuk-tuk por Alicante: personaliza tu aventura | otra actividad de aventura («tuk»): Momentos de autor con tema Aventura |
| freetour | amsterdam | 2 h | El oro perdido de Ámsterdam: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | atenas | 2.5 h | Juego urbano «Escape Athens: El viaje a través del tiempo» | juego de exploración: Momentos de autor con tema Aventura |
| freetour | azores | 3 h | São Miguel: Barranquismo de nivel tres en Lombadas, Azores | otra actividad de aventura («barranquismo»): Momentos de autor con tema Aventura |
| freetour | barcelona | 1 h | Fantasmas de Barcelona: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | bath | 1.3 h | Escándalos y pretendientes en Bath: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | batumi | 3 h | Experiencia en Batumi con buggies, quads y todoterreno | otra actividad de aventura («buggies»): Momentos de autor con tema Aventura |
| freetour | brasov | 1.5 h | Brasov romántico: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | brasov | 2 h | El oro perdido de Brașov: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | bratislava | 1 h | Bratislava bajo el hechizo de la magia negra: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | brighton | 2 h | El monstruo mítico de Brighton: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | brujas | 1.3 h | Brujas romántica: juego de exploración por tu cuenta | juego de exploración: Momentos de autor con tema Aventura |
| freetour | bruselas | 1.8 h | El casco antiguo de Bruselas, la capital de la cerveza: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | bujara | 3.3 h | Lo mejor de Bujará al atardecer: visita guiada gratuita para quienes visitan la ciudad por primera vez, a cargo de un guía local | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | bujara | 5 h | Visita a los talleres artesanales y a los pueblos de Bujará | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | cartagena-co | 1.8 h | City Tour Tuk - Cha: Tuk Tuk & Chambaculeras | otra actividad de aventura («city tour»): Momentos de autor con tema Aventura |
| freetour | ciudad-de-luxemburgo | 0.8 h | Luxemburgo histórico: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | cluj-napoca | 2 h | El oro perdido de Cluj-Napoca: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | colonia | 2 h | El oro perdido de Colonia: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | constanza | 1.3 h | De Tomis a Constanza: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | copenhague | 0.8 h | Christiania, la «ciudad libre» hippie de Copenhague: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | copenhague | 1 h | Copenhague mágica: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | el-cairo | 7 h | Excursión privada de un día a Ain Sokhna, en el Mar Rojo, desde El Cairo: playa y baño | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | el-cairo | 7 h | Excursión privada de un día a El Fayoum desde El Cairo con safari en jeep | otra actividad de aventura («safari»): Momentos de autor con tema Aventura |
| freetour | el-cairo | 4 h | Visita guiada gratuita a la Ciudad del Futuro: Descubre la nueva capital administrativa de Egipto | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | estambul | 1 h | Lo más destacado de Estambul: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | florencia | 1.5 h | Recorrido por Florencia en bicicletas de época | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| freetour | florencia | 0.8 h | Secretos embrujados de Florencia: juego de exploración autoguiado y recorrido fantasmal | juego de exploración: Momentos de autor con tema Aventura |
| freetour | friburgo | 1.8 h | El dragón volador de Friburgo: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | giza | 1 h | Giza Tour: Explora Las Pirámides en Quad | otra actividad de aventura («quad»): Momentos de autor con tema Aventura |
| freetour | glasgow | 1.3 h | El West End de Glasgow: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | glasgow | 1.8 h | Glasgow histórico: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | glasgow | 1.3 h | Lo más destacado de Glasgow: juego de exploración autoguiada | juego de exploración: Momentos de autor con tema Aventura |
| freetour | heraklion | 2.3 h | La clave de Heraclión: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | ho-chi-minh | 3 h | Visita guiada gratuita por Ciudad Ho Chi Minh | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | houston | 1.3 h | Houston, tenemos un rompecabezas: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | hurghada | 8 h | Excursión de un día desde Hurghada a Abu Dabab para hacer snorkel con tortugas, con almuerzo incluido | otra actividad de aventura («snorkel»): Momentos de autor con tema Aventura |
| freetour | kitulgala | 2.5 h | Aventura de rafting y barranquismo en Kitulgala | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| freetour | kitulgala | 1.5 h | Rafting en aguas bravas en Kitulgala | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| freetour | la-paz-bo | 1.8 h | Espectáculo de lucha libre de las cholitas y visita a la galería de arte | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | liverpool | 1 h | Lo más destacado de Liverpool: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | manchester | 1.5 h | Asesinato en Mánchester: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | manchester | 1 h | The Manchester Pusher: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | marsala | 1.5 h | Marsala: historia, vino y revoluciones Visita gratuita | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | medellin | 10 h | De Medellín a Guatapé: Alto del Chocho, Rock y Zócalos | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | medellin | 3 h | Excursión extrema en quad por la cordillera de los Andes desde Medellín | otra actividad de aventura («quad»): Momentos de autor con tema Aventura |
| freetour | medulin | 1.5 h | Medulin Adventure Challenge: Juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | munich | 1.3 h | Los fantasmas de Múnich: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | murcia | 1.3 h | Los secretos ocultos de Murcia: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | newport | 1.3 h | «El rencor dorado» en Newport: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | norwich | 1 h | Recorrido cronológico por Norwich: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | novigrad-podravski | 6 h | En bicicleta por el Amazonas de Europa: recorrido gratuito en bicicleta por el río Drava | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| freetour | osaka | 10 h | Universal Studios Japan: excursión de un día | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | parma | 2 h | El misterio de Parma Garibaldi: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | pula | 1.3 h | El templo secreto de Pula: juego de exploración autoguiada | juego de exploración: Momentos de autor con tema Aventura |
| freetour | riga | 1.8 h | Riga medieval: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | samarcanda | 3.5 h | Visita guiada gratuita «De la seda al papel»: el patrimonio artesanal de Samarcanda | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | saranda | 7 h | Excursión de rafting por el último río salvaje de Europa (Permet) | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| freetour | sibiu | 2.3 h | Sibiu medieval: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | siem-reap | 4 h | Excursión en bicicleta por los alrededores y los pueblos de Siem Reap | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| freetour | sighisoara | 1.5 h | Sighisoara medieval: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| freetour | tarifa | 1 h | Descubre Tarifa: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | torremolinos | 0.8 h | Descubre Torremolinos: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | toulouse | 1.5 h | Toulouse romántica: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | trapani | 1.5 h | Trapani Free Walking Tour: Historia, Barroco y Misterios | otra actividad de aventura («walking tour»): Momentos de autor con tema Aventura |
| freetour | valencia | 4 h | Bike Tour Valencia: de Venecia Valenciana a Murallas Fantasma | otra actividad de aventura («bike»): Momentos de autor con tema Aventura |
| freetour | villajoyosa | 1 h | Excursión guiada en quad: mar y montaña | otra actividad de aventura («quad»): Momentos de autor con tema Aventura |
| freetour | villajoyosa | 1.3 h | Ruta panorámica por Villajoyosa en bicicleta eléctrica de montaña | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| freetour | winchester | 1 h | Arthur de Winchester: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | york | 1 h | Los fantasmas de York: juego de exploración autoguiado | juego de exploración: Momentos de autor con tema Aventura |
| freetour | zanzibar | 4 h | Excursión para ver delfines en Mnemba, Zanzíbar | sin palabra de caminata: Momentos de autor con tema Aventura |
| freetour | zurich | 1 h | Zúrich bajo el hechizo de la magia negra: juego de exploración autoguiado y recorrido a pie | juego de exploración: Momentos de autor con tema Aventura |
| tangol | banos | 2 h | Cabalgata Bajo El Tungurahua: Aventura En Nahuazo | otra actividad de aventura («cabalgata»): Momentos de autor con tema Aventura |
| tangol | banos | 2 h | Canopy En Puntzan: Circuitos De Aventura En Baños | otra actividad de aventura («canopy»): Momentos de autor con tema Aventura |
| tangol | banos | 5 h | Rafting En Baños De Agua Santa: Río Pastaza Nivel 3 Y 4 | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | banos | 5 h | Ruta De Las Cascadas En Bicicleta: Aventura Hasta Pailón Del Diablo | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| tangol | barichara | 10 h | Travesía Por El Cañón Del Chicamocha | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | bariloche | 4 h | Canopy | otra actividad de aventura («canopy»): Momentos de autor con tema Aventura |
| tangol | bariloche | 8 h | Circuito Chico En Mountain Bike | otra actividad de aventura («mountain bike»): Momentos de autor con tema Aventura |
| tangol | bariloche | 7 h | Día Completo En Kayak Por El Brazo Tristeza | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | bariloche | 9 h | Dia De Pesca En El Lago Fonck | otra actividad de aventura («pesca»): Momentos de autor con tema Aventura |
| tangol | bariloche | 9 h | Dia De Pesca En El Río Manso, Lago Hess O Lago Los Moscos | otra actividad de aventura («pesca»): Momentos de autor con tema Aventura |
| tangol | bariloche | 9 h | Dia De Pesca En Los Lagos Nahuel Huapi, Moreno O Gutiérrez | otra actividad de aventura («pesca»): Momentos de autor con tema Aventura |
| tangol | bariloche | 8 h | Dia De Pesca Fly Fishing O Spinning En El Rio Limay | otra actividad de aventura («pesca»): Momentos de autor con tema Aventura |
| tangol | bariloche | 4 h | Excursión Kayak Lago Moreno O Gutierrez- Medio Día | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | bariloche | 6 h | Experiencia 4X4 En La Estepa | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | bariloche | 6 h | Kayak En La Isla Huemul | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | bariloche | 8 h | Kayak En Lago Mascardi - Dia Entero | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | bariloche | 9 h | Kayak Rio Limay Valle Encantado | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | bariloche | 4 h | Medio Dia De Pesca En Los Lagos Nahuel Huapi, Moreno O Gutiérrez | otra actividad de aventura («pesca»): Momentos de autor con tema Aventura |
| tangol | bariloche | 5 h | Medio Día De Pesca Fly Fishing O Spinning En El Río Limay | otra actividad de aventura («pesca»): Momentos de autor con tema Aventura |
| tangol | bariloche | 6 h | Medio Dia En El Campo Con Cabalgata Y Asado | otra actividad de aventura («cabalgata»): Momentos de autor con tema Aventura |
| tangol | bariloche | 4 h | Mountain Bike Privado Por Pasarelas Del Rio Manso | otra actividad de aventura («mountain bike»): Momentos de autor con tema Aventura |
| tangol | bariloche | 3 h | Navegación A Velero En El Lago Nahuel Huapi | otra actividad de aventura («navegacion»): Momentos de autor con tema Aventura |
| tangol | bariloche | 10 h | Rafting Rio Manso A La Frontera | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | bariloche | 8 h | Ríos Y Lagos Del Limay En Privado | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | bariloche | 7 h | Tour Privado A Los Lagos Y Cascadas Del Río Manso | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | bariloche | 6 h | Valle Encantado | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | bellavista | 11 h | Explora El Bosque Nublado De Bellavista Full Day | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | bonito | 4 h | Arborismo En Cabanas | otra actividad de aventura («arborismo»): Momentos de autor con tema Aventura |
| tangol | bonito | 4 h | Boia Cross - Parque Ecologico Rio Formoso | otra actividad de aventura («boia cross»): Momentos de autor con tema Aventura |
| tangol | bonito | 4 h | Buraco Das Araras Ecotour | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | bonito | 3 h | Cabalgata Recanto Do Peao | otra actividad de aventura («cabalgata»): Momentos de autor con tema Aventura |
| tangol | bonito | 8 h | Cascada Boca Da Onca Ecotour | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | bonito | 8 h | Cascada Ceita Core | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | bonito | 8 h | Dia En Balneario Do Sol | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | bonito | 4 h | Gruta De San Miguel | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | bonito | 4 h | Gruta Del Lago Azul | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | bonito | 4 h | Snorkeling En El Rio Sucuri | otra actividad de aventura («snorkel»): Momentos de autor con tema Aventura |
| tangol | bonito | 7 h | Snorkeling En Rio Da Prata | otra actividad de aventura («snorkel»): Momentos de autor con tema Aventura |
| tangol | buzios | 3 h | Buceo Bautismo En Búzios | otra actividad de aventura («buceo»): Momentos de autor con tema Aventura |
| tangol | buzios | 3 h | Surf En Playa De Buzios | otra actividad de aventura («surf»): Momentos de autor con tema Aventura |
| tangol | castro | 8 h | Ruta Mitologica: Muelle De Las Almas Y El Tepual | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | chiloe | 8 h | Parque Aventura Chaiguen | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | coyhaique | 6 h | Observación De Cóndores - Coyhaique Alto. | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | coyhaique | 3 h | Rafting Rio Baker Puerto Bertrand | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | coyhaique | 6 h | Reserva Nacional Rio Simpson & Puerto Aysén. | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | cuenca | 6 h | Excursión A Parque Nacional Cajas | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | el-bolson | 6 h | Rafting Familiar Por El Rio Manso | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | el-bolson | 4 h | Tour Circuito Del Rio Azul | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | el-calafate | 8 h | Bosque Petrificado La Leona | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | el-calafate | 5 h | Cabalgata En El Cerro Frías | otra actividad de aventura («cabalgata»): Momentos de autor con tema Aventura |
| tangol | el-calafate | 3 h | Cerro Huyliche En 4X4 | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | el-calafate | 12 h | Chalten Soft Con Almuerzo | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | el-calafate | 5 h | Circuito 4X4 En El Cerro Frias | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | el-calafate | 5 h | Darwin Experience - Kayaks Y Aventura | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | el-calafate | 10 h | Día De Campo Estancia Nibepo Aike Con Cabalgata | otra actividad de aventura («cabalgata»): Momentos de autor con tema Aventura |
| tangol | el-calafate | 4 h | Experiencia De Kayak En Perito Moreno | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | el-calafate | 2.5 h | Kayak En El Lago Argentino | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | el-calafate | 1 h | Moreno Spirit | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | el-calafate | 3 h | Nativo Experience - Lagos & Cavernas | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | el-calafate | 10 h | Ruta De Estancias Con Almuerzo Y Navegacion En El Glaciar | otra actividad de aventura («navegacion»): Momentos de autor con tema Aventura |
| tangol | el-calafate | 9 h | Safari Azul | otra actividad de aventura («safari»): Momentos de autor con tema Aventura |
| tangol | el-calafate | 5 h | Safari Bike Experience - Fauna Y Estepa | otra actividad de aventura («safari»): Momentos de autor con tema Aventura |
| tangol | el-calafate | 5 h | Tirolesa En El Cerro Frias | otra actividad de aventura («tirolesa»): Momentos de autor con tema Aventura |
| tangol | el-chalten | 2 h | Pack Rafting En El Río De Las Vueltas | otra actividad de aventura («pack rafting»): Momentos de autor con tema Aventura |
| tangol | el-penon | 5 h | Campo De Piedra Pomez En 4X4 | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | el-penon | 8 h | Recorrido 4X4 Al Cañon De Real Grande Y Volcan Galan | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | el-penon | 10 h | Salar De Antofalla En 4X4 | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | el-penon | 10 h | Salar Del Hombre Muerto | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | el-penon | 7 h | Volcan Galan En 4X4 | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | fernando-de-noronha | 3 h | Paseo En Barco | otra actividad de aventura («barco»): Momentos de autor con tema Aventura |
| tangol | fernando-de-noronha | 4 h | Paseo En Barco Al Atardecer | otra actividad de aventura («barco»): Momentos de autor con tema Aventura |
| tangol | fernando-de-noronha | 2 h | Paseo En Canoa Hawaiana | otra actividad de aventura («canoa»): Momentos de autor con tema Aventura |
| tangol | fernando-de-noronha | 8 h | Tour Por La Isla | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | foz-de-iguazu | 8 h | Cataratas Brasileiras Con Macuco Safari | otra actividad de aventura («safari»): Momentos de autor con tema Aventura |
| tangol | futaleufu | 3 h | Duckies En El Río Futaleufú: Aventura Acuática En La Patagonia | otra actividad de aventura («duckies»): Momentos de autor con tema Aventura |
| tangol | futaleufu | 5 h | Rafting En El Río Futaleufú: Ruta Puente A Puente | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | iguazu | 4 h | Aventura Jungle Fly En Grupos Reducidos | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | iguazu | 4 h | Mountain Bike Por El Parque Nacional Iguazu | otra actividad de aventura («mountain bike»): Momentos de autor con tema Aventura |
| tangol | iguazu | 2 h | Navegacion Por Rio Iguazu | otra actividad de aventura («navegacion»): Momentos de autor con tema Aventura |
| tangol | isla-de-pascua | 2 h | Aventura De Buceo En La Costa Exterior De Hanga Roa | otra actividad de aventura («buceo»): Momentos de autor con tema Aventura |
| tangol | isla-de-pascua | 2 h | Buceo De Bautismo En Hanga Roa | otra actividad de aventura («buceo»): Momentos de autor con tema Aventura |
| tangol | isla-de-pascua | 2 h | Buceo En La Bahia De Hanga Roa | otra actividad de aventura («buceo»): Momentos de autor con tema Aventura |
| tangol | isla-de-pascua | 2 h | Buceo En Los Motus | otra actividad de aventura («buceo»): Momentos de autor con tema Aventura |
| tangol | isla-de-pascua | 3 h | Cabalgata En Isla De Pascua | otra actividad de aventura («cabalgata»): Momentos de autor con tema Aventura |
| tangol | jericoacoara | 6 h | Buggy Tour A Tatajuba Y Ilha Do Amor | otra actividad de aventura («buggy»): Momentos de autor con tema Aventura |
| tangol | la-cumbrecita | 6 h | Cascada Abanico | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | la-cumbrecita | 5 h | Cascada El Chorrillo | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | la-cumbrecita | 13 h | La Lagunita | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | la-cumbrecita | 7 h | Rio Subterraneo Wildbach Y Cascada Escondida | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | la-cumbrecita | 6 h | Vuelta Del Wildermann | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | la-rioja | 3 h | Aventura En 4X4 Al Cerro De La Cruz | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | la-rioja | 14 h | Avistaje De Cóndores En Quebrada De Los Cóndores | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | la-serena | 10 h | Avistamiento De Ballenas En La Reserva Marina Isla Chañaral | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | las-grutas | 9 h | Madryn & Península Valdés | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | las-grutas | 9 h | Pingüinos & Península Valdés | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | las-grutas | 4 h | Safari 4X4 & Sandboard Camino De Los Pulperos | otra actividad de aventura («safari»): Momentos de autor con tema Aventura |
| tangol | las-grutas | 6 h | Salinas Del Gualicho | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | las-grutas | 8 h | Valcheta Y Bosque Petrificado | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | manaus | 4 h | Avistaje De Caimanes Y Pesca De Pirañas | otra actividad de aventura («pesca»): Momentos de autor con tema Aventura |
| tangol | manaus | 6 h | Encuentro De Las Aguas + Nado Con Delfines + Visita Aldea Aborigen | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | manaus | 4 h | Sobreviviendo En La Selva | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | mendoza | 6 h | Canopy Adrenalina | otra actividad de aventura («canopy»): Momentos de autor con tema Aventura |
| tangol | mendoza | 6 h | Canopy Base En Mendoza | otra actividad de aventura («canopy»): Momentos de autor con tema Aventura |
| tangol | mendoza | 10 h | Canopy Y Rafting En Mendoza | otra actividad de aventura («canopy»): Momentos de autor con tema Aventura |
| tangol | mendoza | 6 h | Rafting Río Mendoza | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | mendoza | 5 h | Ruta En Bici Por Bodegas | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| tangol | montanita | 2 h | Clases De Surf | otra actividad de aventura («surf»): Momentos de autor con tema Aventura |
| tangol | montanita | 2 h | Parapente | otra actividad de aventura («parapente»): Momentos de autor con tema Aventura |
| tangol | montevideo | 3 h | Recorrido En Bicicleta Por Montevideo | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| tangol | natal | 6 h | Buggy Tour A Genipabu | otra actividad de aventura («buggy»): Momentos de autor con tema Aventura |
| tangol | natal | 6 h | Buggy Tour A Playa De Pipa | otra actividad de aventura («buggy»): Momentos de autor con tema Aventura |
| tangol | natal | 9 h | Litoral Sur Vip - Off Road 4X4 | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | natal | 9 h | Recorrido Por Las Playas Litoral Sul Y Lagoa De Arituba En Natal | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | natal | 10 h | Recorrido Por Playa Barra Do Cunhaú | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | paraty | 6 h | Ensenada Trindade | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | paraty | 6 h | Sierra Da Bocaina - Jeep Tour | otra actividad de aventura («jeep»): Momentos de autor con tema Aventura |
| tangol | pereira | 11 h | Recorrido De Un Día Al Santuario De La Flora Y Fauna Otún Quimbaya | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | porto-de-galinhas | 3 h | Buggy Tour Por Porto De Galinhas | otra actividad de aventura («buggy»): Momentos de autor con tema Aventura |
| tangol | porto-de-galinhas | 8 h | Día De Playa En Maragogi Desde Porto De Galinhas | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | pucon | 4 h | Cabalgata Mapuche Pucon Antilco O El Claro | otra actividad de aventura («cabalgata»): Momentos de autor con tema Aventura |
| tangol | pucon | 3 h | Rafting Río Trancura Alto Y Bajo | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | puerto-lopez | 2 h | Surf En Puerto Lopez | otra actividad de aventura («surf»): Momentos de autor con tema Aventura |
| tangol | puerto-madryn | 3 h | Avistaje De Estrellas En Puerto Madryn | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | puerto-madryn | 2 h | Buceo - Bautismo Submarino | otra actividad de aventura («buceo»): Momentos de autor con tema Aventura |
| tangol | puerto-madryn | 4 h | Excursión Al Atardecer En 4X4 En Puerto Madryn | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | puerto-madryn | 3 h | Excursión En 4X4 En Puerto Madryn | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | puerto-madryn | 9 h | Punta Tombo Y Bahía Vera | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | puerto-natales | 8 h | Safari Fotografico En Torres Del Paine | otra actividad de aventura («safari»): Momentos de autor con tema Aventura |
| tangol | puerto-natales | 12 h | Tras La Huella Del Puma | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | puerto-piramides | 6 h | Kayak Y Avistaje De Ballenas En El Golfo San Jose | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | punta-arenas | 7 h | Avistamiento De Delfines Y Cabalgata | otra actividad de aventura («cabalgata»): Momentos de autor con tema Aventura |
| tangol | punta-arenas | 7 h | Kayak En El Estrecho De Magallanes | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | quito | 12 h | Rafting En Rio Toachi Y Blanco | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | quito | 12 h | Rafting Rio Quijos | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | quito | 7 h | Volcán Cotopaxi Tour En Bicicleta | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| tangol | recife | 8 h | Día De Playa En Maragogi Desde Recife | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | rio-de-janeiro | 3 h | City Tour Y Playas En Bicicleta | otra actividad de aventura («city tour»): Momentos de autor con tema Aventura |
| tangol | rio-de-janeiro | 4 h | Tour En Bicicleta: Copacabana, Centro Y Guanabara | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| tangol | rio-de-janeiro | 3 h | Vuelo En Ala Delta Por Rio | otra actividad de aventura («ala delta»): Momentos de autor con tema Aventura |
| tangol | salta | 6 h | Circuito Completo De Mountain Bike - Quebrada Del Toro | otra actividad de aventura («mountain bike»): Momentos de autor con tema Aventura |
| tangol | salta | 10 h | Circuito Cuesta Del Obispo En Bicicleta | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| tangol | salta | 13 h | La Poma | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | salta | 4 h | Pack Adrenalina Salta | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | salta | 4 h | Pack Aventura Salta | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | salta | 7 h | Rafting En Salta | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | salta | 14 h | Safari A Las Nubes | otra actividad de aventura («safari»): Momentos de autor con tema Aventura |
| tangol | san-gil | 0.3 h | Parapente Chicamocha | otra actividad de aventura («parapente»): Momentos de autor con tema Aventura |
| tangol | san-gil | 8 h | Paseo Ecologico A Cascadas Juan Curí | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | san-gil | 9 h | Rafting Río Chicamocha | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | san-gil | 6 h | Rafting Río Fonce | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | san-gil | 5 h | Rafting Río Suarez | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | san-gil | 5 h | Santander Extremo: Circuito De Aventura En San Gil | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | san-martin-de-los-andes | 2 h | Cabalgata Por Comunidad Mapuche | otra actividad de aventura («cabalgata»): Momentos de autor con tema Aventura |
| tangol | san-martin-de-los-andes | 7 h | Excursion A Hua Hum | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | san-martin-de-los-andes | 5 h | Experiencia De Kayak En El Lago Lacar Y Pichi Machonico | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | san-martin-de-los-andes | 4 h | Mountain Bike | otra actividad de aventura («mountain bike»): Momentos de autor con tema Aventura |
| tangol | san-martin-de-los-andes | 6 h | Rafting Por El Río Chimehuin | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | san-pedro-de-atacama | 3 h | Astronomy Safari: Exploración Nocturna En El Cielo Del Desierto De Atacama | otra actividad de aventura («safari»): Momentos de autor con tema Aventura |
| tangol | san-pedro-de-atacama | 3 h | Buggy Safari Guiado: Aventura Off-Road Entre Dunas Y Paisajes Naturales | otra actividad de aventura («buggy»): Momentos de autor con tema Aventura |
| tangol | san-pedro-de-atacama | 4 h | Garganta Del Diablo Y Valle De Catarpe Bike Tour | otra actividad de aventura («bike»): Momentos de autor con tema Aventura |
| tangol | san-pedro-de-atacama | 5 h | Vuelo En Globo Aerostático En San Pedro De Atacama: Vive El Desierto Desde El Aire | otra actividad de aventura («globo»): Momentos de autor con tema Aventura |
| tangol | santiago-de-chile | 13 h | Cabalgata Al Ventisquero Colgante Glaciar El Morado | otra actividad de aventura («cabalgata»): Momentos de autor con tema Aventura |
| tangol | santiago-de-chile | 3 h | Contrastes De Santiago: Centro Histórico & Cerro Santa Lucía Walking Tour | otra actividad de aventura («walking tour»): Momentos de autor con tema Aventura |
| tangol | santiago-de-chile | 4 h | Rafting En Rio Maipo | otra actividad de aventura («rafting»): Momentos de autor con tema Aventura |
| tangol | tigre | 3 h | Paseo En Canoa Por El Delta Del Tigre | otra actividad de aventura («canoa»): Momentos de autor con tema Aventura |
| tangol | tilcara | 12 h | Visita A Salinas Grandes Y Paseo Los Colorados | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | torres-del-paine | 3 h | Ice Kayak Glaciar Grey | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 4 h | Cabalgata Por Lago Escondido | otra actividad de aventura («cabalgata»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 10 h | Canotaje En El Canal Gable | otra actividad de aventura («canotaje»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 9 h | Cruce De Los Andes Fueguinos | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | ushuaia | 8 h | Excursion Privada En Isla Gable Y Pinguinera | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | ushuaia | 6 h | Excursion Privada: Parque Nacional | sin palabra de caminata: Momentos de autor con tema Aventura |
| tangol | ushuaia | 3 h | Experiencia En Kayak De 3 Hs Con Snack En Ushuaia | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 1 h | Experiencia En Kayak En Ushuaia | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 6 h | Experiencia Husky | otra actividad de aventura («husky»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 5 h | Lagos 4X4 En Llanos Del Castor | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 8 h | Lagos Escondido Y Fagnano En 4X4 | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 5 h | Pack Rafting En Río Olivia | otra actividad de aventura («pack rafting»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 3 h | Paseo En Bicicleta Eléctrica | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 4 h | Paseo En Bicicleta Electrica Mirador Del Beagle | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 7 h | Paseo En Kayak En El Canal De Beagle | otra actividad de aventura («kayak»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 6 h | Tour En Bici Eléctrica Cascada Beban | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| tangol | ushuaia | 5 h | Tour En Bicicleta Elétrica Estancia Túnel | otra actividad de aventura («bici»): Momentos de autor con tema Aventura |
| tangol | valdivia | 3 h | Circuito Navegacion A Isla Tejas En Valdivia | otra actividad de aventura («navegacion»): Momentos de autor con tema Aventura |
| tangol | villa-union | 11 h | Tour En 4X4 A Laguna Brava | otra actividad de aventura («4x4»): Momentos de autor con tema Aventura |

## Qué no hace este PR

No cambia la clasificación en producción, no escribe en D1 y no toca la ficha ni el buscador: solo deja el veredicto por título con sus pruebas, el script de solo lectura y esta lista. La aplicación (regla por palabra en el mapeo de Tangol 9000003 y, si el PO lo pide, en FREETOUR 16) va en el siguiente PR de la ola 3, con la firma de REQ-10661.

## Reproducir

```
npx vitest run src/taxonomy/lib/aventura-senderismo.test.ts
npx tsx src/scripts/aventura-senderismo.ts <tours.tsv>   # tours.tsv sale del SELECT de arriba; no se guarda en el repo
```
