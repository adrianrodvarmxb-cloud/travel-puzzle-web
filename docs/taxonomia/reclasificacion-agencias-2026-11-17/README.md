# Reclasificación por agencia: lista antes/después para firma del PO (REQ-10748)

Decisión 13 (REQ-10592, firmada el 14-11-2026): «Antes de aplicar cada una se le muestra la lista de cambios y de dudas». **Antes** = cómo clasifica hoy el sitio un viaje de agencia (mapeo `propios` por `kind`). **Después** = con el mapeo firmado de la agencia (`src/taxonomy/data/mapping/<agencia>.json`) desde su denominación original (`originalOf`). Sin denominación original o con categoría `por-revisar`, el viaje se queda como hoy y se anota como duda. Generado con `npx tsx src/scripts/lista-reclasificacion-agencias.ts` el 2026-11-17; **no está aplicado**.

## Resumen

| Agencia | Viajes | Cambian de formato | Igual | Dudas (se quedan como hoy) | Movimientos |
|---|---|---|---|---|---|
| Big Bus Tours (`bigbus`) | 29 | 0 | 29 | 1 | — |
| Destino Colombia (`destinocolombia`) | 10 | 0 | 10 | 0 | — |
| Exotic Escapes (`exoticescapes`) | 15 | 0 | 15 | 15 | — |
| Extime Travel (`extime`) | 179 | 42 | 137 | 0 | visita-guiada → excursion-dia: 17; tour → entradas: 4; experiencia-unica → tour: 10; experiencia-unica → visita-guiada: 3; caminata → visita-guiada: 1; transporte → excursion-dia: 4; tour → excursion-dia: 2; autoguiado → entradas: 1 |
| Fantástica China (`fantasticachina`) | 51 | 1 | 50 | 0 | excursion-dia → circuito: 1 |
| Inca World Peru (`incaworld`) | 76 | 6 | 70 | 0 | experiencia-unica → visita-guiada: 1; a-la-medida → circuito: 2; visita-guiada → circuito: 1; a-la-medida → tour: 2 |
| Turismo Asiático (`turismoasiatico`) | 11 | 0 | 11 | 11 | — |

## Big Bus Tours (`bigbus`)

Firma del PO: _pendiente_ (A = aplicar · B = no aplicar · C = aplicar salvo las filas que indique).

### Cambian: ninguno (el mapeo firmado coincide con la clasificación de hoy)

### Dudas: se quedan como hoy (1)

| Clave | Viaje | Hoy | Motivo |
|---|---|---|---|
| BOS | Bus turístico hop-on hop-off en Boston | transporte | sin denominación original del proveedor: se queda como hoy |


## Destino Colombia (`destinocolombia`)

Firma del PO: _pendiente_ (A = aplicar · B = no aplicar · C = aplicar salvo las filas que indique).

### Cambian: ninguno (el mapeo firmado coincide con la clasificación de hoy)


## Exotic Escapes (`exoticescapes`)

Firma del PO: _pendiente_ (A = aplicar · B = no aplicar · C = aplicar salvo las filas que indique).

### Cambian: ninguno (el mapeo firmado coincide con la clasificación de hoy)

### Dudas: se quedan como hoy (15)

| Clave | Viaje | Hoy | Motivo |
|---|---|---|---|
| TO7 | Triángulo de Oro: Delhi, Jaipur y Agra | circuito | sin denominación original del proveedor: se queda como hoy |
| TOB9 | Triángulo de Oro y Benarés | circuito | sin denominación original del proveedor: se queda como hoy |
| TOK10 | Triángulo de Oro y Kathmandú | circuito | sin denominación original del proveedor: se queda como hoy |
| NOR9 | Norte de la India: Triángulo de Oro, Khajuraho y Benarés | circuito | sin denominación original del proveedor: se queda como hoy |
| RAJ10 | Rajasthan: Delhi, Udaipur, Jodhpur, Jaipur y Agra | circuito | sin denominación original del proveedor: se queda como hoy |
| RJB12 | Rajasthan y Benarés | circuito | sin denominación original del proveedor: se queda como hoy |
| RKB12 | Rajasthan, Khajuraho y Benarés | circuito | sin denominación original del proveedor: se queda como hoy |
| RCE12 | Rajasthan con encanto: palacios, desierto y lagos | circuito | sin denominación original del proveedor: se queda como hoy |
| SRI8 | Sri Lanka: Sigiriya, Kandy, té de Ceilán y Galle | circuito | sin denominación original del proveedor: se queda como hoy |
| MUJ8 | La India entre mujeres | circuito | sin denominación original del proveedor: se queda como hoy |
| INS8 | La India más instagrameable | circuito | sin denominación original del proveedor: se queda como hoy |
| HOLI27 | Happy Holi 2027: el festival de los colores en Jaipur | circuito | sin denominación original del proveedor: se queda como hoy |
| DIW26 | Diwali 2026: el festival de las luces en Jaipur | circuito | sin denominación original del proveedor: se queda como hoy |
| AMR3 | Extensión Amritsar: Templo Dorado y frontera de Wagah | circuito | sin denominación original del proveedor: se queda como hoy |
| MUM3 | Extensión Mumbai: Puerta de la India y cuevas de Elefanta | circuito | sin denominación original del proveedor: se queda como hoy |


## Extime Travel (`extime`)

Firma del PO: _pendiente_ (A = aplicar · B = no aplicar · C = aplicar salvo las filas que indique).

### Cambian (42)

| Clave | Viaje | Denominación original | Antes | Después | Temas después |
|---|---|---|---|---|---|
| VT | Versalles completo: palacio, jardines y Aldea de la Reina | VERSAILLES | visita-guiada | **excursion-dia** | cultural |
| VAC | Visita guiada al Palacio de Versalles (sin transporte) | VERSAILLES | visita-guiada | **excursion-dia** | cultural |
| GJO | Día impresionista en Giverny: Monet y museo | GIVERNY | visita-guiada | **excursion-dia** | naturaleza, cultural |
| MSF | Mont-Saint-Michel guiado con recogida en tu hotel | MONT SAINT MICHEL | visita-guiada | **excursion-dia** | cultural, religioso |
| CHL | Castillos del Loira guiados con recogida en hotel | LOIRE | visita-guiada | **excursion-dia** | cultural |
| BBP | Crucero por el Sena con Bateaux Parisiens | TICKETING | tour | **entradas** | playa-mar, cultural |
| ED1 | Disneyland París con transporte, 1 parque | DISNEYLAND | visita-guiada | **excursion-dia** | parques-ocio |
| MFP | París en rickshaw privado con recogida (1-2 pers.) | CITY TOUR | experiencia-unica | **tour** | urbano |
| TRT | Lo mejor de París en bicitaxi eléctrico privado | CITY TOUR | experiencia-unica | **tour** | urbano |
| TRTM | Montmartre en bicitaxi eléctrico privado | CITY TOUR | experiencia-unica | **tour** | urbano |
| TRTS | Saint-Germain-des-Prés en bicitaxi eléctrico privado | CITY TOUR | experiencia-unica | **tour** | urbano |
| TRTE | Barrio de la Torre Eiffel en bicitaxi privado | CITY TOUR | experiencia-unica | **tour** | urbano |
| TEADJ | Torre Eiffel 2.º piso con comida en Madame Brasserie | TOUR EIFFEL | experiencia-unica | **visita-guiada** | gastronomia, cultural, urbano |
| TEA3DJ | Cima de la Torre Eiffel con comida en Madame Brasserie | TOUR EIFFEL | experiencia-unica | **visita-guiada** | gastronomia, cultural, urbano |
| CDT | Cena en crucero por el Sena y Torre Eiffel | TOUR EIFFEL | experiencia-unica | **tour** | playa-mar, cultural, urbano |
| CDTM | Crucero con cena, Torre Eiffel y Moulin Rouge | TOUR EIFFEL | experiencia-unica | **tour** | playa-mar, cultural, urbano |
| CDTMC | Crucero con cena, Torre Eiffel y Moulin Rouge (½ botella) | TOUR EIFFEL | experiencia-unica | **tour** | playa-mar, cultural, urbano |
| DJTEHB | Almuerzo en Madame Brasserie sin bebidas | TOUR EIFFEL | experiencia-unica | **visita-guiada** | cultural, urbano |
| NDML | Louvre, Île de la Cité y Notre-Dame | LOUVRE | caminata | **visita-guiada** | cultural |
| VGPM | Versalles guiado en grupo pequeño por la tarde | VERSAILLES | visita-guiada | **excursion-dia** | cultural |
| VGAP8 | Versalles privado medio día con recogida (1-7) | VERSAILLES | visita-guiada | **excursion-dia** | cultural |
| NAVV | Transporte París–Versalles ida y vuelta, medio día | VERSAILLES | transporte | **excursion-dia** | cultural |
| NAVVJ | Transporte París–Versalles ida y vuelta, día completo | VERSAILLES | transporte | **excursion-dia** | cultural |
| ND | Transporte a Disneyland París ida y vuelta | DISNEYLAND | transporte | **excursion-dia** | parques-ocio |
| DAG2 | Disneyland París 2 parques y crucero por el Sena | DISNEYLAND | tour | **excursion-dia** | playa-mar, parques-ocio |
| ASN | Transporte al Parque Astérix ida y vuelta | ASTÉRIX | transporte | **excursion-dia** | parques-ocio |
| CLP8 | Castillos del Loira privado (1 a 7 personas) | LOIRE | visita-guiada | **excursion-dia** | cultural |
| NP1L | Playas del Desembarco de Normandía con almuerzo | NORMANDIE | visita-guiada | **excursion-dia** | cultural |
| NPM | Desembarco de Normandía en grupo pequeño con almuerzo | NORMANDIE | visita-guiada | **excursion-dia** | cultural |
| NPP8 | Desembarco de Normandía privado con almuerzo (1-7) | NORMANDIE | visita-guiada | **excursion-dia** | cultural |
| NPF | Desembarco de Normandía con recogida en hotel | NORMANDIE | visita-guiada | **excursion-dia** | cultural |
| BRF | Brujas guiado con recogida en hotel | BRUGES | tour | **excursion-dia** | cultural |
| ORC | Museo de Orsay y crucero por el Sena | TICKETING | tour | **entradas** | playa-mar, cultural |
| BBM | Crucero por el Sena con Bateaux Mouches | TICKETING | tour | **entradas** | playa-mar, cultural |
| BVPN | Crucero por el Sena con Vedettes du Pont Neuf | TICKETING | tour | **entradas** | playa-mar, cultural |
| DJT | Almuerzo en crucero y Torre Eiffel 2.º piso | SEAMLESS | experiencia-unica | **tour** | gastronomia, playa-mar, cultural |
| MLTRT | París en bicitaxi privado y Louvre | SEAMLESS | experiencia-unica | **tour** | gastronomia, cultural |
| GVA | Giverny y Versalles guiados con almuerzo | GIVERNY | visita-guiada | **excursion-dia** | naturaleza, cultural |
| GYP8 | Giverny privado medio día con recogida (1-7) | GIVERNY | visita-guiada | **excursion-dia** | naturaleza, cultural |
| GV | Giverny y Versalles en grupo pequeño con almuerzo | GIVERNY | visita-guiada | **excursion-dia** | naturaleza, cultural |
| GVP8 | Giverny y Versalles privado con almuerzo (1-7) | GIVERNY | visita-guiada | **excursion-dia** | naturaleza, cultural |
| CAA | Catacumbas con audioguía y crucero por el Sena | TICKETING | autoguiado | **entradas** | playa-mar, cultural |


## Fantástica China (`fantasticachina`)

Firma del PO: _pendiente_ (A = aplicar · B = no aplicar · C = aplicar salvo las filas que indique).

### Cambian (1)

| Clave | Viaje | Denominación original | Antes | Después | Temas después |
|---|---|---|---|---|---|
| FCH-R23 | Excursión de un día a Macao | TOUR REGULAR | excursion-dia | **circuito** |  |


## Inca World Peru (`incaworld`)

Firma del PO: _pendiente_ (A = aplicar · B = no aplicar · C = aplicar salvo las filas que indique).

### Cambian (6)

| Clave | Viaje | Denominación original | Antes | Después | Temas después |
|---|---|---|---|---|---|
| LIM-07 | Espectáculo del Caballo Peruano de Paso | SERVICIO | experiencia-unica | **visita-guiada** | noche-espectaculos |
| PROG-TRK-05 | Lares Trek y Machu Picchu 5 días | PROGRAMA | a-la-medida | **circuito** | montana-senderismo |
| PROG-PUN-01 | Uros y Taquile en Puno, 1 día | PROGRAMA | visita-guiada | **circuito** | naturaleza |
| MP-04 | Machu Picchu Overnight 3 días a cotizar | SERVICIO | a-la-medida | **circuito** |  |
| MP-05 | Machu Picchu y tren panorámico a cotizar | SERVICIO | a-la-medida | **tour** |  |
| MP-06 | Machu Picchu Premium o Luxury a cotizar | SERVICIO | a-la-medida | **tour** |  |


## Turismo Asiático (`turismoasiatico`)

Firma del PO: _pendiente_ (A = aplicar · B = no aplicar · C = aplicar salvo las filas que indique).

### Cambian: ninguno (el mapeo firmado coincide con la clasificación de hoy)

### Dudas: se quedan como hoy (11)

| Clave | Viaje | Hoy | Motivo |
|---|---|---|---|
| MYS-01 | Malasia Esencial: Kuala Lumpur, Penang y selva de Belum | circuito | sin denominación original del proveedor: se queda como hoy |
| BOR-01 | Lo mejor de Borneo: orangutanes y río Kinabatangan | circuito | sin denominación original del proveedor: se queda como hoy |
| SGP-PRE | Singapur y Melaka: preextensión de 4 días | circuito | sin denominación original del proveedor: se queda como hoy |
| SIN-01 | Singapur: city tour compartido en inglés | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| SIN-02 | Singapur esencial: tour privado en español | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| SIN-03 | Singapur y Gardens by the Bay: privado en español | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| SIN-04 | Gardens by the Bay y Katong: privado en español | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| SIN-05 | Singapur peranakan: tour cultural privado en español | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| KUL-01 | Kuala Lumpur: medio día privado en español | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| KUL-02 | Kuala Lumpur y Batu Caves: día completo privado | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| KUL-03 | Melaka desde Kuala Lumpur: día completo privado | excursion-dia | sin denominación original del proveedor: se queda como hoy |

