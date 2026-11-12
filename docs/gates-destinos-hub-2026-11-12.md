# Gates: rediseño de /destinos (PO, 12 nov 2026)

Petición literal: «la página destinos es horrible, revisa como lo hacen los referentes y haz un mix con lo mejor».

## Referentes revisados (12 nov 2026)
- **Civitatis** `/es/destinos/` (visto en navegador real): mapa del mundo con pines agrupados y su número, «Top destinos» y tabla de países con destinos y actividades.
- **GetYourGuide, Viator y Klook**: bloquean la lectura automática (403). Lo que sigue sale de lo conocido de ellos, NO VERIFICADO hoy: tarjetas grandes con foto de los destinos más buscados, pestañas por continente y listas A–Z al final.

## Gates firmados (AskUserQuestion, 12 nov 2026)
- **A. Orden:** buscador → «Más buscados» → mapa → continentes en pestañas → A–Z.
- **B. Más buscados:** las mismas 8 ciudades que «Destinos populares» del inicio (mismo criterio, `pickDestinations`).
- **C. Foto de cada país:** la de su ciudad con más tours que tenga foto; si no hay, la siguiente.

## Folios
- REQ-3475: orden de las secciones, buscador y «Más buscados» (gates A y B).
- REQ-3476: continentes en pestañas con foto por país (gate C); países sin continente en «Otros».
- REQ-3477: A–Z por continente en columnas, en acordeón en celular. Conserva todos los enlaces; la lista vieja queda oculta, no borrada.
