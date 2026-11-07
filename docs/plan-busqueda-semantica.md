# Plan S7 (opcional): búsqueda semántica como respaldo — `SEARCH_SEMANTIC_ENABLED="false"`

> **Solo plan, sin código** (instrucción del PO, 6 nov 2026: «S7 opcional: solo el plan en docs, sin código, salvo que S2–S6 estén listos»). S2–S6 están en PR (#159, #170 y siguientes) y no en producción, así que aquí no hay código.
> Gates firmados que aplican: sin Google ni buscadores de pago; el destino dentro del texto filtra; la palabra exacta va primero.

## Para qué sirve, y para qué no
- **Sirve** para consultas de **tema** que no están en los títulos: «romántico», «con niños», «para lluvia», «comida callejera». Ahí el texto exacto, la raíz (S6) y los sinónimos no alcanzan.
- **No sirve** para decidir el destino. El filtro de destino lo deciden siempre alias + exacto + corrección (S2/S5). La semántica solo **ordena o completa** resultados **dentro** del destino ya filtrado y **nunca** encuentra un destino que el texto no nombra.
- Se usa **solo como respaldo**, cuando la búsqueda léxica (FTS5 con raíz y sinónimos) trae menos de N resultados (propuesta: N = 3).

## Antes de gastar: probar etiquetas por tema
La taxonomía (T1, PR #156) ya define 13 temas (gastronomía, naturaleza, aventura, religioso, noche-espectáculos…) y un clasificador puro. **Paso 0 recomendado:** mapear palabras de tema a esos temas con los sinónimos de S6 (`data/search-synonyms.json` + `TAXONOMY_TERMS`) y filtrar por tema. Es gratis, determinista y explicable. Solo si la analítica de S4 muestra que muchas búsquedas de tema siguen en cero resultados, se pasa a lo semántico.

## Diseño propuesto (si se aprueba)
| Pieza | Propuesta | Nota |
|---|---|---|
| Embeddings | Workers AI `@cf/baai/bge-m3` (multilingüe, 1024 dims) | Costo según el informe: USD 0.012 por millón de tokens |
| Índice | Cloudflare Vectorize, un vector por tour e idioma (título + resumen), metadata `{tourId, cityId, language}` | Binding nuevo (`VECTORIZE`) = **candado del PO** |
| Llenado | Al cerrar el sync, solo tours nuevos o con `contentHash` distinto (REQ-073), en lotes | Nunca en el camino de la página |
| Consulta | Embedding de la consulta → `query(topK=50, filter: {cityId})` cuando hay destino | Sin destino: solo si la consulta no tiene destino y FTS trae < 3 |
| Mezcla | Reciprocal Rank Fusion (k = 60) de FTS y Vectorize; FTS siempre primero en empates | Determinista con los mismos datos |
| Caché | Embedding de la consulta y resultado en la caché compartida (5 min), llave con la versión del modelo | Evita llamar a Workers AI en cada visita |
| Bandera | `SEARCH_SEMANTIC_ENABLED="false"` | Apagada = S6 tal cual |

## Riesgos y lo que falta verificar (NO VERIFICADO)
- **Latencia:** el embedding agrega una llamada a Workers AI. Se mide en preview: p50 y p95 de `/api/tours` con y sin la bandera.
- **Costo real:** depende del volumen. Con la analítica de S4 se estima: búsquedas de tema/día × tokens promedio.
- **Calidad en español** de bge-m3 para frases cortas («con niños»): se mide con un set de 50 consultas reales de S4 y su relevancia juzgada a mano.
- **Términos de FREETOUR:** mandar títulos y resúmenes a Workers AI es procesarlos en Cloudflare, igual que hoy. Hay que confirmarlo con la skill cumplimiento-freetour antes de encender.

## Requisitos propuestos (se dan de alta al implementar)
- **REQ-370:** dado `SEARCH_SEMANTIC_ENABLED="true"` y una consulta sin resultados suficientes en FTS, cuando se busca, entonces se completan los resultados con Vectorize dentro del destino ya filtrado; nunca cambia el filtro de destino; con la bandera apagada, nada cambia.
- **REQ-371:** el índice vectorial se llena fuera del camino de la página, solo con tours nuevos o cambiados, y se puede reconstruir.
- **REQ-372:** latencia p95 de `/api/tours` con la bandera encendida ≤ 1.2 × la de S6, medida en preview.

## Candados del PO
Binding de Vectorize y de Workers AI (posible cargo por uso), encender la bandera, y confirmar el cumplimiento con FREETOUR. Un cambio a la vez, con preview y humo.

## Orden sugerido
1. S4 en producción ≥ 4 semanas para tener datos.
2. Paso 0 (temas por sinónimos y taxonomía) en su PR.
3. Solo si sigue habiendo cero resultados de tema: spike en preview (latencia, costo, calidad) y decisión del PO.
