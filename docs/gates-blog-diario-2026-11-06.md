# Gate firmado — Blog diario «Publica solo cada día» · 6 nov 2026

**Firmado por el PO (Adri) el 6 nov 2026, 23:0x (CDMX), en la sesión del agente del blog.**
Pedido literal (22:36): «Crea un agente con las habilidades blog-metodo-referentes y growthos-capacidades que genere publicaciones diarias con temas trending topic del sector cuando haya, o de los destinos y experiencias que vendemos; 80 % pago, 20 % free tour; todo de la mano con SEO, mapa de sitio y agentes IA; estrategia-topic-cluster, deep-research».
Decisión literal: **«Publica solo cada día»**.

## Qué autoriza
| # | Decisión | Alcance | Firma |
|---|---|---|---|
| G1 | El blog diario se publica **sin revisión diaria del PO** | Solo entradas con `origen: "agente-diario"` que entran por el workflow `blog-diario.yml` y pasan el validador (`src/blog/lib/diario.ts`), la suite, `tsc`, el build y la prueba de humo con `BLOG_ENABLED` encendida en el preview | [x] PO, 6 nov 2026 |
| G2 | El merge squash que hace el workflow **es la publicación** y está autorizado por este gate | Solo PR creados por el workflow cuyo único archivo cambiado es `src/blog/content/diario.json` | [x] PO, 6 nov 2026 |
| G3 | **Reemplaza, solo para este agente**, la regla de las skills `blog-metodo-referentes` y `estrategia-topic-cluster` «publicar o escribir en la base del blog requiere OK explícito de Adri y aprobación del cliente» | Los artículos escritos a mano (`src/blog/content/posts/`) siguen con la regla original: OK de Adri y de Claudia | [x] PO, 6 nov 2026 |

| G4 | Imágenes premium en todas las entradas (portada + 2 a 4 fotos de bancos con licencia comercial, optimizadas y servidas desde el sitio). El PR de cada entrada puede cambiar también `public/blog/img/{slug}/` (solo los 6 archivos de cada foto de esa entrada) | Pedido del PO (7 nov 2026, 04:28): «está muy bien, pero agrega imágenes que se vea premium». REQ-1050…1059 | [x] PO, 7 nov 2026, 06:09: a «¿autorizas que cada entrada suba su texto y sus fotos con licencia, nada más?» respondió «Sí, autorizo» |

## Condición estricta (si no se cumple, NO PUBLICA)
1. **Solo datos de fuentes públicas citadas y enlazadas, y de nuestro catálogo.** Cada cifra o afirmación fáctica lleva su enlace en la misma frase o párrafo; los datos de la tabla llevan su fuente.
2. **Cero casos, citas, cifras o testimonios inventados.**
3. **Sin bloques E-E-A-T que requieran material del cliente: se OMITEN, no se rellenan.** En una entrada del agente no existen el minicaso (bloque 6) ni las citas (bloque 7); el validador las rechaza si vienen.
4. Autor: **«Equipo editorial de Travel Puzzle»** (Organization), sin persona inventada. Fecha real del día de la corrida (CDMX) y tiempo de lectura calculado en el servidor.
5. Reglas FREETOUR (skill `cumplimiento-freetour`): texto propio (C2), nunca «FREETOUR» al cliente (C3), enlaces a fichas y ciudades del sitio, sin prometer lo que no existe (C6, línea de comunicación).

## Lo que NO cambia
- Encender `BLOG_ENABLED` sigue siendo un candado: PR aparte con preview y prueba de humo, y OK del PO (REQ-982).
- Ninguna otra bandera, migración, secreto, DNS o pago se toca desde este flujo.
- Las entradas de **free tour** (20 %) siguen bloqueadas por la regla B1 de FREETOUR (§7.1, pregunta 7 de `docs/freetour/autorizaciones.md`) y por el Gate B1 del blog (`docs/gates-paginas-2026-11.md`): el validador las rechaza mientras `FREE_TOUR_POSTS_B1` sea `false`. Esos días no se publica nada (REQ-983).

## Regreso
Para detener la publicación automática: desactivar el workflow «Blog diario» en Actions o borrar la tarea programada. Para retirar una entrada publicada: PR que la pase a `draft: true` en `diario.json` (no se borra).

## G5 — Guías propias de ciudad (7 nov 2026)
| # | Decisión | Alcance | Firma |
|---|---|---|---|
| G5 | Guías propias de ciudad (300 palabras o más, fuentes públicas enlazadas, sin texto de FREETOUR), 2 por día, publicadas sin revisión diaria con las mismas reglas de fuentes del blog. Viven en el repo (`src/destinations/content/guias.json`); el PR de cada día solo cambia ese archivo y **no se escribe en D1** | Pedido del PO (7 nov 2026, 06:17, opción c), comunicado por el coordinador: «el PO ya autorizó la publicación diaria sin revisión, con las mismas reglas de fuentes». Workflow `guias-ciudad.yml`. REQ-1220…1235 | [x] PO, 7 nov 2026, 06:17 (vía coordinador) |
