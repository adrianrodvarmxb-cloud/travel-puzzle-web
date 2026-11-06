# Gates — Buscador multilingüe y tolerante (S2–S7) · 6 nov 2026

Firmados por el PO (Adri) el 6 nov 2026 a las 07:04 (CDMX): aprobó todas las olas en autopiloto y tomó como gates firmados las recomendaciones del informe «Un destino, todos sus nombres, cero erratas» (plan S1–S7). Cada ola va en su propio PR, con su bandera en `"false"`; encender cualquiera sigue siendo un cambio aparte con preview, prueba de humo y OK del PO.

1. **Umbrales de erratas:** 0 por debajo de 4 letras, 1 de 4 a 7, 2 desde 8. Un error en la primera letra cuenta doble.
2. **Nombres cortos que chocan** (Bali/Bari, Lima/Lyon, Cuba/Cebu, Niza/Ibiza y los pares cortos reales del catálogo): nunca se corrigen solos; solo pueden salir como «¿Quisiste decir…?».
3. **Sin Google ni buscadores de pago** (Places, Knowledge Graph, Algolia, Typesense, Meilisearch en la nube, LLM de intención).
4. **Ya firmados antes** (5 nov 2026, `docs/gates-busqueda-2026-11.md`): el destino dentro del texto filtra; la palabra exacta va primero; los alias vienen primero de las traducciones existentes y después de GeoNames (S5).

Reglas que se derivan del informe y se aplican igual:
- Solo se filtra a un destino corregido si hay un candidato único con margen sobre el segundo (menos erratas). Si no, 2–3 sugerencias.
- La fonética española (con seseo S = Z) y la popularidad solo ordenan: nunca descartan ni deciden el filtro.
- Normalización con `normalize('NFKD')` + `toLowerCase()`; nunca `toLocale*` ni `Intl` (INC-001).

| Ola | Bandera | PR | Migración |
|---|---|---|---|
| S2 lógica pura + alias curados | `SEARCH_FUZZY_ENABLED` | este | no |
| S3 autocompletado y cero resultados | `SEARCH_SUGGEST_ENABLED` | aparte | no |
| S4 analítica anónima | `SEARCH_LOG_ENABLED` | aparte | propuesta, sin aplicar |
| S5 GeoNames + Wikidata → `destino_alias` | reutiliza `SEARCH_FUZZY_ENABLED` | aparte | propuesta, sin aplicar |
| S6 `stem` y sinónimos en `TourSearch` | `SEARCH_V2_ENABLED` | aparte | propuesta, sin aplicar |
| S7 semántica (opcional) | `SEARCH_SEMANTIC_ENABLED` | solo plan | no |

Nombres de banderas: el informe dice `SEARCH_FUZZY`, `SEARCH_SUGGEST`, `SEARCH_LOG` y `SEARCH_SEMANTIC`; en `wrangler.jsonc` llevan el sufijo `_ENABLED` como todas las del repo (`SEARCH_V2_ENABLED`).
