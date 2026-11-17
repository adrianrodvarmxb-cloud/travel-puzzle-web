# Reclasificación por agencia: lista antes/después para firma del PO (REQ-10748)

Decisión 13 (REQ-10592, firmada el 14-11-2026): «Antes de aplicar cada una se le muestra la lista de cambios y de dudas». **Antes** = cómo clasifica hoy el sitio un viaje de agencia (mapeo `propios` por `kind`). **Después** = con el mapeo firmado de la agencia (`src/taxonomy/data/mapping/<agencia>.json`) desde su denominación original (`originalOf`). Sin denominación original o con categoría `por-revisar`, el viaje se queda como hoy y se anota como duda. Generado con `npx tsx src/scripts/lista-reclasificacion-agencias.ts` el 2026-11-17; **no está aplicado**.

## Resumen

| Agencia | Viajes | Cambian de formato | Igual | Dudas (se quedan como hoy) | Movimientos |
|---|---|---|---|---|---|
| Big Bus Tours (`bigbus`) | 29 | 0 | 29 | 1 | — |
| Destino Colombia (`destinocolombia`) | 10 | 0 | 10 | 0 | — |
| Exotic Escapes (`exoticescapes`) | 15 | 0 | 15 | 15 | — |
| Extime Travel (`extime`) | 179 | 0 | 179 | 179 | — |
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

### Cambian: ninguno (el mapeo firmado coincide con la clasificación de hoy)

### Dudas: se quedan como hoy (179)

| Clave | Viaje | Hoy | Motivo |
|---|---|---|---|
| VAM | Versalles esencial: medio día guiado desde París | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| VT | Versalles completo: palacio, jardines y Aldea de la Reina | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| VO | Versalles con audioguía en español: medio día desde París | autoguiado | sin denominación original del proveedor: se queda como hoy |
| JVO | Versalles día completo con audioguía desde París | autoguiado | sin denominación original del proveedor: se queda como hoy |
| VAC | Visita guiada al Palacio de Versalles (sin transporte) | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| P1V | Versalles y Museo de Orsay en un día | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| GO | Giverny: casa y jardines de Monet, medio día con audioguía | autoguiado | sin denominación original del proveedor: se queda como hoy |
| GOVO | Giverny y Versalles en un día con almuerzo | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| GJO | Día impresionista en Giverny: Monet y museo | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| MS1 | Mont-Saint-Michel guiado en español desde París | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| MSL | Mont-Saint-Michel con audioguía desde París | autoguiado | sin denominación original del proveedor: se queda como hoy |
| MSF | Mont-Saint-Michel guiado con recogida en tu hotel | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| CL1 | Castillos del Loira guiados en español desde París | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| CLL | Castillos del Loira con audioguía desde París | autoguiado | sin denominación original del proveedor: se queda como hoy |
| CHL | Castillos del Loira guiados con recogida en hotel | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| ML2 | Mont-Saint-Michel y castillos del Loira, 2 días | circuito | sin denominación original del proveedor: se queda como hoy |
| NBC3 | Normandía, Mont-Saint-Michel y Loira, 3 días | circuito | sin denominación original del proveedor: se queda como hoy |
| BBP | Crucero por el Sena con Bateaux Parisiens | tour | sin denominación original del proveedor: se queda como hoy |
| DCD18 | Cena en crucero por el Sena, menú Découverte | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DC18R | Cena romántica en crucero por el Sena | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DC21HB | Cena en crucero por el Sena, menú Saveurs | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| TEA | Torre Eiffel 2.º piso con acceso reservado y audioguía | autoguiado | sin denominación original del proveedor: se queda como hoy |
| TEA3 | Torre Eiffel hasta la cima con audioguía | autoguiado | sin denominación original del proveedor: se queda como hoy |
| PS | Torre Eiffel, crucero por el Sena y city tour | tour | sin denominación original del proveedor: se queda como hoy |
| CIT | París iluminado y Torre Eiffel de noche | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| DEC | Cena en la Torre Eiffel y crucero por el Sena | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| GL | Louvre con guía en español y acceso reservado | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| ML | Louvre: obras maestras con entrada reservada | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| ML1ST | Louvre a primera hora: obras maestras | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| P1L | París en un día: Louvre, Notre-Dame y Sainte-Chapelle | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| NDG | Notre-Dame: Île de la Cité guiada y crucero | tour | sin denominación original del proveedor: se queda como hoy |
| PC | City tour en bus panorámico y crucero por el Sena | tour | sin denominación original del proveedor: se queda como hoy |
| I | París iluminado en bus panorámico | tour | sin denominación original del proveedor: se queda como hoy |
| IM | París iluminado y show del Moulin Rouge | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| ED1 | Disneyland París con transporte, 1 parque | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| EDH | Disneyland París con transporte, 2 parques | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| C | City tour por París en bus panorámico | tour | sin denominación original del proveedor: se queda como hoy |
| MFP | París en rickshaw privado con recogida (1-2 pers.) | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| PBT | París en bicicleta con guía | tour | sin denominación original del proveedor: se queda como hoy |
| PBT10 | París en bicicleta, tour privado (hasta 10 pers.) | tour | sin denominación original del proveedor: se queda como hoy |
| P1LDJ | París en un día con almuerzo en crucero | tour | sin denominación original del proveedor: se queda como hoy |
| P1VDJ | Versalles y Orsay en un día con almuerzo | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| P2LV | París en 2 días: Louvre, Notre-Dame, Versalles y Orsay | circuito | sin denominación original del proveedor: se queda como hoy |
| P2LVDJ | París en 2 días con almuerzos incluidos | circuito | sin denominación original del proveedor: se queda como hoy |
| OGFRAG | Ópera Garnier guiada y taller de perfume Fragonard | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| TRT | Lo mejor de París en bicitaxi eléctrico privado | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| TRTM | Montmartre en bicitaxi eléctrico privado | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| TRTS | Saint-Germain-des-Prés en bicitaxi eléctrico privado | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| TRTE | Barrio de la Torre Eiffel en bicitaxi privado | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| CIT3 | París iluminado y cima de la Torre Eiffel de noche | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| PS3 | Cima de la Torre Eiffel, crucero y city tour | tour | sin denominación original del proveedor: se queda como hoy |
| PG | Torre Eiffel 2.º piso y city tour | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| PG3 | Cima de la Torre Eiffel y city tour | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| TEAC | Torre Eiffel 2.º piso y crucero por el Sena | tour | sin denominación original del proveedor: se queda como hoy |
| TEA3C | Cima de la Torre Eiffel y crucero por el Sena | tour | sin denominación original del proveedor: se queda como hoy |
| TEADJ | Torre Eiffel 2.º piso con comida en Madame Brasserie | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| TEA3DJ | Cima de la Torre Eiffel con comida en Madame Brasserie | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| CDT | Cena en crucero por el Sena y Torre Eiffel | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| CDTM | Crucero con cena, Torre Eiffel y Moulin Rouge | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| CDTMC | Crucero con cena, Torre Eiffel y Moulin Rouge (½ botella) | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| TEG | Torre Eiffel hasta la cima con guía privado (1-6) | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| PF | Almuerzo en la Torre Eiffel, city tour y crucero | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DECM | Cena en la Torre Eiffel, crucero y Moulin Rouge | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DECMC | Cena en Torre Eiffel, crucero y Moulin Rouge (½ botella) | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DJTE | Almuerzo en Madame Brasserie, Torre Eiffel | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DJTEHB | Almuerzo en Madame Brasserie sin bebidas | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DTE | Cena en Madame Brasserie, Torre Eiffel | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| NDGO | Notre-Dame: Île de la Cité guiada y audioguía | autoguiado | sin denominación original del proveedor: se queda como hoy |
| CRM | Show del Moulin Rouge y crucero por el Sena | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| CRMC | Moulin Rouge con ½ botella de champaña y crucero | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| IMC | París iluminado y Moulin Rouge (½ botella) | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DM | Cena y show en el Moulin Rouge, menú Toulouse-Lautrec | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DMCC | Cena y show en el Moulin Rouge más city tour | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DMX | Cena y show en el Moulin Rouge, menú Belle Époque | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| SM2SC | Moulin Rouge 23:00 y city tour otro día | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| SM1SC | Moulin Rouge 21:00 y city tour otro día | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| SM1 | Moulin Rouge 1.ª función con transporte de regreso | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| CRIM | París iluminado, Moulin Rouge 2.ª función y crucero | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| CRIMC | París iluminado, Moulin Rouge y crucero (½ botella) | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| SM2 | Moulin Rouge 2.ª función con transporte de regreso | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| TIM | Torre Eiffel, París iluminado y Moulin Rouge | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| TIMC | Torre Eiffel, París iluminado y Moulin Rouge (½ botella) | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| T3IM | Cima de la Torre Eiffel, París iluminado y Moulin Rouge | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| T3IMC | Cima Torre Eiffel, París iluminado y Moulin Rouge (½ bot.) | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| GLP6 | Louvre con guía privado (1 a 6 personas) | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| MLC | Louvre: obras maestras y crucero por el Sena | tour | sin denominación original del proveedor: se queda como hoy |
| MLJ | Louvre, Torre Eiffel y crucero por el Sena | tour | sin denominación original del proveedor: se queda como hoy |
| MLPOT | Louvre: obras maestras y bus turístico 1 día | transporte | sin denominación original del proveedor: se queda como hoy |
| GLOR | Louvre guiado y entrada al Museo de Orsay | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| GLPOT | Louvre guiado y bus turístico Tootbus 1 día | transporte | sin denominación original del proveedor: se queda como hoy |
| GLC | Louvre guiado y crucero por el Sena | tour | sin denominación original del proveedor: se queda como hoy |
| GLPG | Louvre guiado en grupo pequeño (máx. 6) | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| MLOR | Louvre: obras maestras y entrada a Orsay | entradas | sin denominación original del proveedor: se queda como hoy |
| NDML | Louvre, Île de la Cité y Notre-Dame | caminata | sin denominación original del proveedor: se queda como hoy |
| VAP | Versalles esencial guiado por la tarde | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| VOA | Entrada completa a Versalles: palacio, jardines y Trianon | entradas | sin denominación original del proveedor: se queda como hoy |
| VOC | Versalles con audioguía y crucero por el Sena | autoguiado | sin denominación original del proveedor: se queda como hoy |
| VOP | Versalles con audioguía por la tarde desde París | autoguiado | sin denominación original del proveedor: se queda como hoy |
| VGAM | Versalles guiado en grupo pequeño (máx. 15) | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| VGPM | Versalles guiado en grupo pequeño por la tarde | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| VGAP8 | Versalles privado medio día con recogida (1-7) | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| NAVV | Transporte París–Versalles ida y vuelta, medio día | transporte | sin denominación original del proveedor: se queda como hoy |
| NAVVJ | Transporte París–Versalles ida y vuelta, día completo | transporte | sin denominación original del proveedor: se queda como hoy |
| VTP8 | Versalles privado día completo con almuerzo (1-7) | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| ND | Transporte a Disneyland París ida y vuelta | transporte | sin denominación original del proveedor: se queda como hoy |
| DAG2 | Disneyland París 2 parques y crucero por el Sena | tour | sin denominación original del proveedor: se queda como hoy |
| AS | Parque Astérix con transporte desde París | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| ASN | Transporte al Parque Astérix ida y vuelta | transporte | sin denominación original del proveedor: se queda como hoy |
| LVS | Transporte a La Vallée Village, medio día | transporte | sin denominación original del proveedor: se queda como hoy |
| LVSJ | Transporte a La Vallée Village, día completo | transporte | sin denominación original del proveedor: se queda como hoy |
| CLP8 | Castillos del Loira privado (1 a 7 personas) | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| CLD | Castillos del Loira por tu cuenta desde París | autoguiado | sin denominación original del proveedor: se queda como hoy |
| MSD | Mont-Saint-Michel por tu cuenta desde París | autoguiado | sin denominación original del proveedor: se queda como hoy |
| NP1 | Playas del Desembarco de Normandía desde París | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| NP1L | Playas del Desembarco de Normandía con almuerzo | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| NPM | Desembarco de Normandía en grupo pequeño con almuerzo | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| NPP8 | Desembarco de Normandía privado con almuerzo (1-7) | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| NPF | Desembarco de Normandía con recogida en hotel | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| BR | Brujas (Bélgica) guiado desde París | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| BRL | Brujas (Bélgica) con audioguía desde París | autoguiado | sin denominación original del proveedor: se queda como hoy |
| BRP8 | Brujas privado desde París (1 a 7 personas) | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| BRD | Brujas (Bélgica) por tu cuenta desde París | autoguiado | sin denominación original del proveedor: se queda como hoy |
| BRF | Brujas guiado con recogida en hotel | tour | sin denominación original del proveedor: se queda como hoy |
| EL | Londres por tu cuenta en Eurostar desde París | autoguiado | sin denominación original del proveedor: se queda como hoy |
| DC13HB | Almuerzo en crucero por el Sena, menú Orsay | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DC21 | Cena de Año Nuevo en crucero por el Sena | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DC13 | Almuerzo romántico en crucero por el Sena | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DC13D | Almuerzo de Navidad en crucero por el Sena | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DCD18D | Cena de Nochebuena y Navidad en crucero, 18:45 | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DC21R | Cena romántica con música en crucero, 21:00 | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DC21D | Cena en crucero por el Sena en fechas especiales | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| RNA18 | Cena temprana de Año Nuevo en crucero por el Sena | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DCM18 | Cena en crucero Maxim's, 18:00 | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DCM21 | Cena en crucero Maxim's, 20:00 | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DC19S | Cena festiva con jazz en crucero, menú Découverte | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| DC21S | Cena festiva con música en crucero, menú Saveurs | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| BB1 | Big Bus París, boleto de 1 día | transporte | sin denominación original del proveedor: se queda como hoy |
| BB2 | Big Bus París, boleto de 2 días | transporte | sin denominación original del proveedor: se queda como hoy |
| POT | Tootbus París, pase de 1 día | transporte | sin denominación original del proveedor: se queda como hoy |
| POT2 | Tootbus París, pase de 2 días | transporte | sin denominación original del proveedor: se queda como hoy |
| ORC | Museo de Orsay y crucero por el Sena | tour | sin denominación original del proveedor: se queda como hoy |
| BBM | Crucero por el Sena con Bateaux Mouches | tour | sin denominación original del proveedor: se queda como hoy |
| BVPN | Crucero por el Sena con Vedettes du Pont Neuf | tour | sin denominación original del proveedor: se queda como hoy |
| P9 | Paris Museum Pass 2 días | entradas | sin denominación original del proveedor: se queda como hoy |
| P10 | Paris Museum Pass 4 días | entradas | sin denominación original del proveedor: se queda como hoy |
| P11 | Paris Museum Pass 6 días | entradas | sin denominación original del proveedor: se queda como hoy |
| P9B | Paris Museum Pass 2 días y crucero por el Sena | entradas | sin denominación original del proveedor: se queda como hoy |
| P10B | Paris Museum Pass 4 días y crucero por el Sena | entradas | sin denominación original del proveedor: se queda como hoy |
| P11B | Paris Museum Pass 6 días y crucero por el Sena | entradas | sin denominación original del proveedor: se queda como hoy |
| 5D | París y alrededores en 5 días sin hotel | circuito | sin denominación original del proveedor: se queda como hoy |
| 5D4N | París y alrededores en 5 días con 4 noches de hotel 4* | circuito | sin denominación original del proveedor: se queda como hoy |
| 6D | París y alrededores en 6 días sin hotel | circuito | sin denominación original del proveedor: se queda como hoy |
| 6D5N | París y alrededores en 6 días con 5 noches de hotel 4* | circuito | sin denominación original del proveedor: se queda como hoy |
| 7D | París y alrededores en 7 días sin hotel | circuito | sin denominación original del proveedor: se queda como hoy |
| 7D6N | París y alrededores en 7 días con 6 noches de hotel 4* | circuito | sin denominación original del proveedor: se queda como hoy |
| 8D | París y alrededores en 8 días sin hotel | circuito | sin denominación original del proveedor: se queda como hoy |
| 8D7N | París y alrededores en 8 días con 7 noches de hotel 4* | circuito | sin denominación original del proveedor: se queda como hoy |
| 9D | París y alrededores en 9 días sin hotel | circuito | sin denominación original del proveedor: se queda como hoy |
| 9D8N | París y alrededores en 9 días con 8 noches de hotel 4* | circuito | sin denominación original del proveedor: se queda como hoy |
| ML2F | Mont-Saint-Michel y Loira, 2 días con recogida | circuito | sin denominación original del proveedor: se queda como hoy |
| PM2 | Normandía, Saint-Malo y Mont-Saint-Michel, 2 días | circuito | sin denominación original del proveedor: se queda como hoy |
| PM2F | Normandía, Saint-Malo y Mont-Saint-Michel con recogida | circuito | sin denominación original del proveedor: se queda como hoy |
| NBC3F | Normandía, Mont-Saint-Michel y Loira, 3 días con recogida | circuito | sin denominación original del proveedor: se queda como hoy |
| DJT | Almuerzo en crucero y Torre Eiffel 2.º piso | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| GLDT | Torre Eiffel, Louvre guiado y cena en crucero | tour | sin denominación original del proveedor: se queda como hoy |
| GLDJ | Almuerzo en crucero y Louvre guiado | tour | sin denominación original del proveedor: se queda como hoy |
| GLDI | Louvre guiado y cena en crucero por el Sena | tour | sin denominación original del proveedor: se queda como hoy |
| MLTRT | París en bicitaxi privado y Louvre | experiencia-unica | sin denominación original del proveedor: se queda como hoy |
| MVG | Montmartre a pie con degustaciones | caminata | sin denominación original del proveedor: se queda como hoy |
| MVGOR | Montmartre gastronómico y Museo de Orsay guiado | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| FVN | Vaux-le-Vicomte y Fontainebleau con audioguía | autoguiado | sin denominación original del proveedor: se queda como hoy |
| ORP6 | Museo de Orsay con guía privado (1 a 6 personas) | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| GVA | Giverny y Versalles guiados con almuerzo | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| GI | Giverny guiado medio día desde París | excursion-dia | sin denominación original del proveedor: se queda como hoy |
| GID | Giverny por tu cuenta medio día desde París | autoguiado | sin denominación original del proveedor: se queda como hoy |
| GYP8 | Giverny privado medio día con recogida (1-7) | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| GV | Giverny y Versalles en grupo pequeño con almuerzo | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| GVP8 | Giverny y Versalles privado con almuerzo (1-7) | visita-guiada | sin denominación original del proveedor: se queda como hoy |
| CAA | Catacumbas con audioguía y crucero por el Sena | autoguiado | sin denominación original del proveedor: se queda como hoy |


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

