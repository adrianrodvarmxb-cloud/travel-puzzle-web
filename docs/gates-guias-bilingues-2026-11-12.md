# Gates: guías de ciudad y blog bilingües (12 nov 2026)

Frente #418 · REQ-3333 a REQ-3342. Firmados por el PO uno por uno en el chat del 12 nov 2026.

## Contexto
- Las guías de ciudad (`src/destinations/content/guias.json`, 5 por día desde el 7 nov) solo se veían dentro de cada ciudad, y el pie llamaba «Guías» a las categorías del blog: el blog salía duplicado y las guías no tenían índice.
- Referentes revisados: Civitatis separa «Guías de viajes» (`/guias/`, agrupadas por zona) del blog (Magazine); GetYourGuide separa su contenido editorial (The Explorer) de las páginas de destino.
- Regla del PO: todo se construye también en inglés.

## Gate A — columna «Guías» del pie: **A3**
«Todas las guías» → `/guias`, y hasta 8 países con guía → `/guias#{país}`, de más a menos guías. Blog queda arriba y en «Empresa».

## Gate B — guías en inglés: **B2**, y aplica también al blog
Los agentes diarios escriben cada guía y cada entrada en español y en inglés; el validador revisa los dos idiomas.

## Gate C — lo ya publicado: **C1**
Las versiones en inglés de las 25 guías y de las entradas publicadas las hace el agente en este frente, validadas y en PR para revisión.
