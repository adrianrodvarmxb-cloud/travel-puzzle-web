# Contrato diccionario ↔ código (REQ-1348)

Resumen: OK: 74 · TRAS BANDERA: 46 · FALTA: 15 · NO APLICA: 10

Fuente: `docs/taxonomia-diccionario.csv` (145 filas). Se genera de `src/taxonomy/data/contrato-diccionario.json`, el mismo archivo que valida `src/taxonomy/lib/contrato-diccionario.test.ts`: si una evidencia deja de cumplirse, el test falla y nombra la fila.

Estados: **OK** (implementado) · **TRAS BANDERA** (listo y apagado) · **FALTA** (con folio) · **NO APLICA** (reemplazado, propuesta sin firma o proveedor sin integrar).

| # | Tabla | Slug | Estado en el CSV | Cumplimiento | Evidencia | Nota |
|---|---|---|---|---|---|---|
| 1 | termino | pieza-libre | activo | OK | término formato:pieza-libre (activo); etiqueta/chip pieza-libre | chip y filtro «Tipo de experiencia» en /tours |
| 2 | termino | caminata | activo | OK | término formato:caminata (activo); etiqueta/chip caminata | chip y filtro «Tipo de experiencia» en /tours |
| 3 | termino | tour | activo | OK | término formato:tour (activo); etiqueta/chip tour | chip y filtro «Tipo de experiencia» en /tours |
| 4 | termino | visita-guiada | activo | OK | término formato:visita-guiada (activo); etiqueta/chip visita-guiada | chip y filtro «Tipo de experiencia» en /tours |
| 5 | termino | excursion-dia | activo | OK | término formato:excursion-dia (activo); etiqueta/chip excursion-dia | chip y filtro «Tipo de experiencia» en /tours |
| 6 | termino | circuito | activo | OK | término formato:circuito (activo); etiqueta/chip circuito | chip y filtro «Tipo de experiencia» en /tours |
| 7 | termino | experiencia-unica | activo (nombre firmado por el PO el 6-11, 06:22; slug interno sin cambio) | OK | término formato:experiencia-unica (activo); etiqueta/chip experiencia-unica | chip y filtro «Tipo de experiencia» en /tours |
| 8 | termino | entradas | activo | OK | término formato:entradas (activo); etiqueta/chip entradas | chip y filtro «Tipo de experiencia» en /tours |
| 9 | termino | autoguiado | activo (copy sin «con un guía local») | OK | término formato:autoguiado (activo); etiqueta/chip autoguiado | chip y filtro «Tipo de experiencia» en /tours |
| 10 | termino | transporte | tras TRANSPORT_ENABLED=false | OK | término formato:transporte (activo); `TRANSPORT_ENABLED`=true; `src/trips/lib/public.ts` | cambio firmado después del CSV: REQ-172, el transporte vive en /traslados con TRANSPORT_ENABLED encendida |
| 11 | termino | traslado | activo (/traslados) | OK | término formato:traslado (activo); `src/app/traslados/page.tsx` | sección /traslados |
| 12 | termino | a-la-medida | activo (a cotizar) | OK | término formato:a-la-medida (activo); etiqueta/chip a-la-medida | a cotizar |
| 13 | termino | alquiler | tras bandera (0) | TRAS BANDERA | término formato:alquiler (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 14 | termino | crucero | tras bandera (0) | TRAS BANDERA | término formato:crucero (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 15 | termino | fuera | oculto (gate G6) | OK | término formato:fuera (oculto); `src/taxonomy/lib/publish.ts` | oculto. Cambios firmados después del CSV: la cat. 8 va por su tipo real (REQ-1262) y la 31 a «esenciales-viaje» (REQ-1263) |
| 16 | termino | cultural | activo (muestra ≥90 %) | FALTA (REQ-1317) | término tema:cultural (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 17 | termino | urbano | activo como base, no como filtro (marca 70 %) | OK | término tema:urbano (muestra); `src/taxonomy/lib/themes.ts` | activo como base, no como filtro: la regla vive en src/taxonomy/lib/themes.ts |
| 18 | termino | gastronomia | activo (muestra ≥90 %) | FALTA (REQ-1317) | término tema:gastronomia (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 19 | termino | naturaleza | activo (muestra ≥90 %) | FALTA (REQ-1317) | término tema:naturaleza (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 20 | termino | montana-senderismo | activo (muestra ≥90 %) | FALTA (REQ-1317) | término tema:montana-senderismo (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 21 | termino | aventura | activo (muestra ≥90 %; revisar falsos positivos) | FALTA (REQ-1317) | término tema:aventura (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 22 | termino | playa-mar | activo (muestra ≥90 %) | FALTA (REQ-1317) | término tema:playa-mar (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 23 | termino | noche-espectaculos | activo (muestra ≥90 %) | FALTA (REQ-1317) | término tema:noche-espectaculos (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 24 | termino | religioso | activo (muestra ≥90 %) | FALTA (REQ-1317) | término tema:religioso (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 25 | termino | bienestar | activo (muestra ≥90 %) | FALTA (REQ-1317) | término tema:bienestar (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 26 | termino | talleres-aprendizaje | activo (muestra ≥90 %) | FALTA (REQ-1317) | término tema:talleres-aprendizaje (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 27 | termino | deportivo | activo (muestra ≥90 %) | FALTA (REQ-1317) | término tema:deportivo (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 28 | termino | parques-ocio | activo (muestra ≥90 %; revisar «game») | FALTA (REQ-1317) | término tema:parques-ocio (muestra); `src/taxonomy/lib/themes.ts` | la regla existe (themes.ts), pero no hay chip ni filtro de tema: espera la revisión manual |
| 29 | taxonomia2-original | ecoturismo-cultural | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Ecoturismo-Cultural» → «Naturaleza»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 30 | taxonomia2-original | trekks | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Trekks» → «Montaña y senderismo»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 31 | taxonomia2-original | trekking | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Trekking» → «Montaña y senderismo»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 32 | taxonomia2-original | hikes | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Hikes» → «Montaña y senderismo»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 33 | taxonomia2-original | senderismo | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Senderismo» → «Montaña y senderismo»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 34 | taxonomia2-original | escalada | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Escalada» → «Aventura»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 35 | taxonomia2-original | espeleismo | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Espeleísmo» → «Aventura»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 36 | taxonomia2-original | relax | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Relax» → «Bienestar»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 37 | taxonomia2-original | salud | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Salud» → «Bienestar»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 38 | taxonomia2-original | tematica | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Temática» → «Parques y ocio»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 39 | taxonomia2-original | educativo | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Educativo» → «Talleres y aprendizaje»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 40 | taxonomia2-original | buceo | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Buceo» → «Playa y mar»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 41 | taxonomia2-original | avistamiento-aves | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Avistamiento de Aves» → «Naturaleza»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 42 | taxonomia2-original | montana | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Montaña» → «Montaña y senderismo»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 43 | taxonomia2-original | playa | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Playa» → «Playa y mar»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 44 | taxonomia2-original | ecoturismo | sobra/fusionado | TRAS BANDERA (REQ-1357) | «Ecoturismo» → «Naturaleza»; `SEARCH_TAXONOMY_SYNONYMS_ENABLED`=false | sinónimo listo en el buscador tras la bandera (REQ-1357, apagada; además requiere SEARCH_STEM_ENABLED) |
| 45 | taxonomia2-original | experiencias-gastronomicas | se mantiene | OK | término tema:gastronomia (muestra); «Experiencias Gastronómicas» → «Gastronomía» | se conserva como el tema «gastronomia» (su visibilidad es la de las filas 16–28) |
| 46 | taxonomia2-original | parques-tematicos | se mantiene | OK | término tema:parques-ocio (muestra); «Parques Temáticos» → «Parques y ocio» | se conserva como el tema «parques-ocio» (su visibilidad es la de las filas 16–28) |
| 47 | taxonomia2-original | urbano | se mantiene | OK | término tema:urbano (muestra); «Urbano» → «Ciudad y barrios» | se conserva como el tema «urbano» (su visibilidad es la de las filas 16–28) |
| 48 | taxonomia2-original | aventura | se mantiene | OK | término tema:aventura (muestra) | se conserva como el tema «aventura» (su visibilidad es la de las filas 16–28) |
| 49 | taxonomia2-original | cultural | se mantiene | OK | término tema:cultural (muestra); «Cultural» → «Cultural e historia» | se conserva como el tema «cultural» (su visibilidad es la de las filas 16–28) |
| 50 | taxonomia2-original | naturaleza | se mantiene | OK | término tema:naturaleza (muestra) | se conserva como el tema «naturaleza» (su visibilidad es la de las filas 16–28) |
| 51 | taxonomia2-original | deportivo | se mantiene | OK | término tema:deportivo (muestra); «Deportivo» → «Deportes» | se conserva como el tema «deportivo» (su visibilidad es la de las filas 16–28) |
| 52 | taxonomia2-original | religioso | se mantiene | OK | término tema:religioso (muestra); «Religioso» → «Religioso y espiritual» | se conserva como el tema «religioso» (su visibilidad es la de las filas 16–28) |
| 53 | taxonomia2-original | bienestar | se mantiene | OK | término tema:bienestar (muestra) | se conserva como el tema «bienestar» (su visibilidad es la de las filas 16–28) |
| 54 | faceta | dur-horas | activa | OK | término faceta:dur-horas (activo); `src/components/tours/filters/MoreFilters.tsx` | filtro de duración en /tours |
| 55 | faceta | dur-dias | activa en circuitos (reemplaza 1-5 / 6-14 / 15+) | TRAS BANDERA (REQ-1303) | término faceta-circuito:dur-dias (activo); `TAXONOMY_CIRCUITS_ENABLED`=false; `src/taxonomy/lib/circuit-facts.ts` | lista en código, tras TAXONOMY_CIRCUITS_ENABLED (apagada) |
| 56 | faceta | precio | activa | OK | término faceta:precio (activo); `src/components/tours/filters/MoreFilters.tsx` | deslizador de precio en /tours |
| 57 | faceta | medio | activa | FALTA (REQ-1351) | término atributo:medio (activo); `src/taxonomy/lib/attributes.ts` | el atributo se calcula, pero /tours no tiene el filtro «Cómo te mueves» |
| 58 | faceta | privado | activa | OK | término atributo:privado (activo); `src/components/tours/filters/MoreFilters.tsx` | filtro «Privado» en /tours |
| 59 | faceta | nocturno | activa | FALTA (REQ-1351) | término atributo:nocturno (activo); `src/taxonomy/lib/attributes.ts` | el atributo se calcula, pero /tours no tiene el filtro «Nocturno» |
| 60 | faceta | presupuesto | reemplazado | NO APLICA | término faceta:presupuesto (descartado) | reemplazado por circuito-confort (fila 131) |
| 61 | faceta | modalidad | reemplazado | NO APLICA | término faceta:modalidad (descartado) | reemplazado por tipo de grupo, tipo de guía y perfil (filas 132–134) |
| 62 | faceta | temporada | tras bandera | TRAS BANDERA | término faceta:temporada (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 63 | faceta | accesibilidad | tras bandera | TRAS BANDERA | término atributo:accesible (tras_bandera) | en el código es el atributo «accesible»; estado tras_bandera (sin variable propia) |
| 64 | faceta | eventos | tras bandera | TRAS BANDERA | término faceta:eventos (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 65 | faceta | etiquetas-especiales | reemplazado | NO APLICA | `src/taxonomy/lib/attributes.ts` | reemplazado: pasa al eje Atributos (filas 113–130) |
| 66 | mapeo-freetour | freetour:3 | mapeado | OK | freetour:3 → tour | un solo formato base |
| 67 | mapeo-freetour | freetour:4 | mapeado | OK | freetour:4 → excursion-dia | un solo formato base |
| 68 | mapeo-freetour | freetour:5 | mapeado | OK | freetour:5 → tour | un solo formato base |
| 69 | mapeo-freetour | freetour:7 | mapeado | OK | freetour:7 → experiencia-unica | un solo formato base |
| 70 | mapeo-freetour | freetour:8 | mapeado | OK | freetour:8 → tour | cambio firmado (REQ-1262): base tour, y cada tour cae en un solo tipo real (en-linea, entradas, traslado…) |
| 71 | mapeo-freetour | freetour:10 | mapeado | OK | freetour:10 → caminata | un solo formato base |
| 72 | mapeo-freetour | freetour:12 | mapeado | OK | freetour:12 → caminata | un solo formato base |
| 73 | mapeo-freetour | freetour:13 | mapeado | OK | freetour:13 → tour | un solo formato base |
| 74 | mapeo-freetour | freetour:14 | mapeado | OK | freetour:14 → tour | un solo formato base |
| 75 | mapeo-freetour | freetour:16 | mapeado | OK | freetour:16 → experiencia-unica | un solo formato base |
| 76 | mapeo-freetour | freetour:17 | mapeado | OK | freetour:17 → autoguiado | un solo formato base |
| 77 | mapeo-freetour | freetour:18 | mapeado | OK | freetour:18 → experiencia-unica | un solo formato base |
| 78 | mapeo-freetour | freetour:19 | mapeado | OK | freetour:19 → tour | un solo formato base |
| 79 | mapeo-freetour | freetour:20 | mapeado | OK | freetour:20 → entradas | un solo formato base |
| 80 | mapeo-freetour | freetour:21 | mapeado | OK | freetour:21 → experiencia-unica | un solo formato base |
| 81 | mapeo-freetour | freetour:22 | mapeado | OK | freetour:22 → visita-guiada | un solo formato base |
| 82 | mapeo-freetour | freetour:23 | mapeado | OK | freetour:23 → experiencia-unica | un solo formato base |
| 83 | mapeo-freetour | freetour:24 | mapeado | OK | freetour:24 → entradas | un solo formato base |
| 84 | mapeo-freetour | freetour:25 | mapeado | OK | freetour:25 → tour | un solo formato base |
| 85 | mapeo-freetour | freetour:26 | mapeado | OK | freetour:26 → alquiler | un solo formato base |
| 86 | mapeo-freetour | freetour:27 | mapeado | OK | freetour:27 → experiencia-unica | un solo formato base |
| 87 | mapeo-freetour | freetour:28 | mapeado | OK | freetour:28 → entradas | un solo formato base |
| 88 | mapeo-freetour | freetour:29 | mapeado | OK | freetour:29 → traslado | un solo formato base |
| 89 | mapeo-freetour | freetour:30 | mapeado | OK | freetour:30 → transporte | un solo formato base |
| 90 | mapeo-freetour | freetour:31 | mapeado | OK | freetour:31 → esenciales-viaje | cambio firmado (REQ-1263): «esenciales-viaje», tras bandera |
| 91 | mapeo-freetour | freetour:32 | mapeado | OK | freetour:32 → experiencia-unica | un solo formato base |
| 92 | mapeo-freetour | freetour:33 | mapeado | OK | freetour:33 → experiencia-unica | un solo formato base |
| 93 | mapeo-freetour | freetour:34 | mapeado | OK | freetour:34 → experiencia-unica | un solo formato base |
| 94 | mapeo-freetour | freetour:35 | mapeado | OK | freetour:35 → entradas | un solo formato base |
| 95 | identidad | Experiencia (Tour) | propuesta (gate G7) | NO APLICA | — | propuesta del gate G7, sin firma |
| 96 | identidad | Viaje propio (Trip) | propuesta (gate G7) | NO APLICA | — | propuesta del gate G7, sin firma |
| 97 | identidad | Ciudad | propuesta (gate G7) | NO APLICA | — | propuesta del gate G7, sin firma |
| 98 | identidad | País | propuesta (gate G7) | NO APLICA | — | propuesta del gate G7, sin firma |
| 99 | identidad | Categoría | propuesta (gate G7) | NO APLICA | — | propuesta del gate G7, sin firma |
| 100 | mapeo-freetour | freetour:1 | gone (histórico) | OK | freetour:1 histórico | histórico: si reaparece, cae en por-revisar y no se publica |
| 101 | mapeo-freetour | freetour:2 | gone (histórico) | OK | freetour:2 histórico | histórico: si reaparece, cae en por-revisar y no se publica |
| 102 | mapeo-freetour | freetour:6 | gone (histórico) | OK | freetour:6 histórico | histórico: si reaparece, cae en por-revisar y no se publica |
| 103 | mapeo-freetour | freetour:9 | gone (histórico) | OK | freetour:9 histórico | histórico: si reaparece, cae en por-revisar y no se publica |
| 104 | baseline-proveedor | FREETOUR | mapeo: categoryId + precio + duración + palabras clave (§6.1) | OK | mapping/freetour.json | mapeo del proveedor en src/taxonomy/data/mapping/ |
| 105 | baseline-proveedor | Inca World Peru (IWP) | mapeo: kind + category | OK | mapping/incaworld.json | mapeo del proveedor en src/taxonomy/data/mapping/ |
| 106 | baseline-proveedor | Fantástica China (FCH) | mapeo: circuito · cultural; Gran Lujo → presupuesto (tras bandera) | OK | mapping/fantasticachina.json | mapeo del proveedor en src/taxonomy/data/mapping/ |
| 107 | baseline-proveedor | Destino Colombia (DCO) | mapeo: circuito · cultural / playa-mar | OK | mapping/destinocolombia.json | mapeo del proveedor en src/taxonomy/data/mapping/ |
| 108 | baseline-proveedor | Turismo Asiático (TAS) | mapeo: circuito / tour · cultural, urbano, naturaleza | OK | mapping/turismoasiatico.json | mapeo del proveedor en src/taxonomy/data/mapping/ |
| 109 | baseline-proveedor | Big Bus Tours (BBT) | mapeo: transporte · urbano | OK | mapping/bigbus.json | mapeo del proveedor en src/taxonomy/data/mapping/ |
| 110 | baseline-proveedor | Travelpayouts/Kiwitaxi | mapeo: traslado | OK | `src/companions/lib/registry.ts` | traslados por deeplink de Travelpayouts (complementos) |
| 111 | baseline-proveedor | BeMyGuest | mapeo: typeName → formato; categories → tema | NO APLICA | — | proveedor sin integrar: el plan de BeMyGuest espera firma (REQ-1337) |
| 112 | termino | por-revisar | oculto | OK | término formato:por-revisar (oculto); `src/taxonomy/lib/gates.ts` | oculto: no se publica (G-T10 = A) |
| 113 | atributo | privado | activo | OK | término atributo:privado (activo); `src/taxonomy/lib/attributes.ts` | regla en src/taxonomy/lib/attributes.ts |
| 114 | atributo | nocturno | activo | OK | término atributo:nocturno (activo); `src/taxonomy/lib/attributes.ts` | regla en src/taxonomy/lib/attributes.ts |
| 115 | atributo | medio | activo | OK | término atributo:medio (activo); `src/taxonomy/lib/attributes.ts` | regla en src/taxonomy/lib/attributes.ts |
| 116 | atributo | idioma-es | activo donde haya dato | OK | término atributo:idioma-es (activo); `src/taxonomy/lib/attributes.ts` | regla en src/taxonomy/lib/attributes.ts |
| 117 | atributo | calificacion | activo (FREETOUR) | OK | término atributo:calificacion (activo); `src/taxonomy/lib/attributes.ts` | regla en src/taxonomy/lib/attributes.ts |
| 118 | atributo | favorito | gate PO | OK | término atributo:favorito (tras_bandera); `src/tours/lib/favorite.ts` | gate firmado (≥4.9 y ≥180 reseñas): insignia en tarjetas y ficha; en el diccionario sigue como tras_bandera |
| 119 | atributo | vuelo-incluido | activo | OK | término atributo:vuelo-incluido (activo); `src/taxonomy/lib/attributes.ts` | regla en src/taxonomy/lib/attributes.ts |
| 120 | atributo | franja-horaria | tras bandera | TRAS BANDERA | término atributo:franja-horaria (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 121 | atributo | grupo-pequeno | tras bandera | TRAS BANDERA | término atributo:grupo-pequeno (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 122 | atributo | familias | tras bandera | TRAS BANDERA | término atributo:familias (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 123 | atributo | solo-adultos | tras bandera | TRAS BANDERA | término atributo:solo-adultos (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 124 | atributo | parejas | tras bandera | TRAS BANDERA | término atributo:parejas (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 125 | atributo | sin-filas | tras bandera | TRAS BANDERA | término atributo:sin-filas (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 126 | atributo | apto-lluvia | tras bandera | TRAS BANDERA | término atributo:apto-lluvia (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 127 | atributo | cancelacion-gratis | tras bandera | TRAS BANDERA | término atributo:cancelacion-gratis (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 128 | atributo | confirmacion-inmediata | tras bandera | TRAS BANDERA | término atributo:confirmacion-inmediata (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 129 | atributo | sostenible | tras bandera | TRAS BANDERA | término atributo:sostenible (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 130 | atributo | vip | tras bandera | TRAS BANDERA | término atributo:vip (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 131 | faceta-circuito | circuito-confort | tras bandera | TRAS BANDERA (REQ-1303) | término faceta-circuito:circuito-confort (tras_bandera); `TAXONOMY_CIRCUIT_EXTRA_ENABLED`=false | tras TAXONOMY_CIRCUIT_EXTRA_ENABLED |
| 132 | faceta-circuito | circuito-grupo | activo | TRAS BANDERA (REQ-1303) | término faceta-circuito:circuito-grupo (activo); `TAXONOMY_CIRCUITS_ENABLED`=false; `src/taxonomy/lib/circuit-facts.ts` | lista en código, tras TAXONOMY_CIRCUITS_ENABLED (apagada) |
| 133 | faceta-circuito | circuito-guia | tras bandera | TRAS BANDERA (REQ-1303) | término faceta-circuito:circuito-guia (tras_bandera); `TAXONOMY_CIRCUIT_EXTRA_ENABLED`=false | tras TAXONOMY_CIRCUIT_EXTRA_ENABLED |
| 134 | faceta-circuito | circuito-perfil | tras bandera | TRAS BANDERA (REQ-1303) | término faceta-circuito:circuito-perfil (tras_bandera); `TAXONOMY_CIRCUIT_EXTRA_ENABLED`=false | tras TAXONOMY_CIRCUIT_EXTRA_ENABLED |
| 135 | faceta-circuito | circuito-dificultad | activo donde haya dato (escala por firmar) | TRAS BANDERA (REQ-1303) | término faceta-circuito:circuito-dificultad (activo); `TAXONOMY_CIRCUITS_ENABLED`=false; `src/taxonomy/lib/circuits.ts` | lista en código, tras TAXONOMY_CIRCUITS_ENABLED; la escala espera firma (G-T8) |
| 136 | faceta-circuito | circuito-altitud | tras bandera | TRAS BANDERA (REQ-1303) | término faceta-circuito:circuito-altitud (tras_bandera); `TAXONOMY_CIRCUIT_EXTRA_ENABLED`=false | tras TAXONOMY_CIRCUIT_EXTRA_ENABLED |
| 137 | entorno | playa-islas | tras bandera (sinónimo) | TRAS BANDERA | término entorno:playa-islas (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 138 | entorno | montana | tras bandera (sinónimo) | TRAS BANDERA | término entorno:montana (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 139 | entorno | grutas | tras bandera (sinónimo) | TRAS BANDERA | término entorno:grutas (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 140 | entorno | pueblos-magicos | tras bandera | TRAS BANDERA | término entorno:pueblos-magicos (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 141 | geografia | region | tras bandera | TRAS BANDERA | término entorno:region (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 142 | geografia | atraccion-icono | tras bandera | TRAS BANDERA | término entorno:atraccion-icono (tras_bandera) | estado tras_bandera del diccionario (sin variable propia) |
| 143 | taxonomia2-original | idiomatico | tras bandera | FALTA (REQ-1348) | — | no existe término ni bandera para «Idiomático» (en el legado no tiene destino); hay que decidir si es tema, atributo o se descarta |
| 144 | taxonomia2-original | de-temporada | tras bandera | TRAS BANDERA | término faceta:temporada (tras_bandera) | «De temporada» queda cubierto por la faceta «temporada» (fila 62) |
| 145 | taxonomia2-original | estetico | descartado | NO APLICA | legado «Estético» sin destino | descartado sin término destino: no hay a qué buscarlo |
