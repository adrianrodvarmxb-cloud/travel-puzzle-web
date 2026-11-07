# Plan (do-plan) — Agente del blog diario · 6 nov 2026

Pedido del PO (6 nov 2026, 22:36 y 23:0x) y gate firmado: `docs/gates-blog-diario-2026-11-06.md`. Requisitos: REQ-960 a REQ-984 en `docs/requisitos.md`.
Skills aplicadas: `blog-metodo-referentes`, `estrategia-topic-cluster`, `growthos-capacidades` (modo a la medida), `deep-research` (versión ligera), `sitelinks-google`, `cumplimiento-freetour` (B3, C2).

## 1. Auditoría de lo que hay (main, 634711f)
| Pieza | Estado | Hallazgo |
|---|---|---|
| Almacenamiento | **Archivos en el repo**: `src/blog/content/posts/*.ts` registrados en `src/blog/content/index.ts`, validados con Zod (`src/blog/lib/schema.ts`) | Sin base ni migración (Gate B2). El agente escribirá en **un solo archivo de datos**, `src/blog/content/diario.json`, para que el workflow pueda agregar una entrada sin tocar código |
| Plantilla | 14 bloques en `schema.ts`; borrador de ejemplo CN-01 con huecos `[PO: …]` | Autor fijo `claudia`; no hay autor de organización ni campos de mezcla o tema |
| Enlaces | `registry.linkProblems` exige pilar, hermano y página comercial | **Bug:** los pilares China, Perú y Colombia enlazan a `/destinos/china`, `/destinos/peru` y `/destinos/colombia`, que dan **404** con `PRIMERA_PIEZA_ENABLED="true"` (lo real es `/destinos/cn`, `/pe`, `/co`). No verifica que una ruta exista |
| Marcado | BlogPosting + Person + BreadcrumbList (REQ-274) | Falta Organization como autor |
| Sitemap | `sitemap-paginas.xml` con `lastmod` = fecha de publicación o actualización (REQ-275/276) | Ya es real; entra al índice solo con publicados |
| llms.txt | Solo enlaza «Blog» | No lista artículos |
| IndexNow | Cron diario con el `lastmod` de los sitemaps (REQ-586), apagado | Ya incluye sitemap-paginas; se suma un aviso justo después de publicar |
| Humo | `tests/smoke/pages.json`, el blog solo con `BLOG_ENABLED+BLOG_SHOW_DRAFTS` | Con el blog encendido no prueba los artículos publicados |
| Protección de `main` | Sin revisiones obligatorias **y sin checks obligatorios** | CLAUDE.md dice que el humo es obligatorio en la protección de rama: no lo es (se reporta; cambiarlo es del PO) |
| Actions | Un PR o un push hechos con `GITHUB_TOKEN` **no disparan** otros workflows | El workflow del blog corre su propia prueba de humo y lanza el deploy con `workflow_dispatch` |

## 2. Pilares y clústeres (del catálogo real)
Catálogo publicado el 6 nov 2026: 7,699 URL en los sitemaps; páginas de ciudad con «N en Pieza libre y M tours con guías locales».
- Ciudades con más experiencias: París 251, Londres 127, Sevilla 114, Praga 113, Pekín 113, Lisboa 109, Barcelona 106, Madrid 104, Atenas 98, Bogotá 94, Zanzíbar 93, El Cairo 91, Budapest 88, Estambul 83, Marrakech 79, Ciudad de México 77.
- Tipos de pago en las 45 ciudades principales: Caminata 546, Visita guiada 422, Excursión de un día 335, Autoguiado 143, Momentos de autor 96, Experiencia 48.
- Viajes propios con ficha: China (44 en vivo), Perú y Colombia.

| Pilar | Estado | Término del pilar | Clústeres (IDs del calendario) |
|---|---|---|---|
| Europa, primer viaje | activo | viajar a europa desde mexico | EU-01…EU-19, FT-EU-01…07 |
| China desde México | activo | viajar a china desde mexico | CN-02…CN-10, FT-CN-01 |
| Colombia desde México | activo | viajar a colombia desde mexico | CO-01…CO-07, FT-CO-01 |
| Perú y Machu Picchu | activo | viajar a peru desde mexico | PE-01…PE-07, FT-PE-01 |
| **Ciudad de México (nuevo)** | activo | que hacer en la ciudad de mexico | MX-01…MX-06, FT-MX-01…02 |
| Free tours | **bloqueado** (Gate B1 del blog) | que es un free tour | — |

Fuera por ahora (se reporta para decisión del PO): Estambul, El Cairo, Marrakech y Zanzíbar tienen inventario alto pero no hay pilar; Asia sigue fuera (Gate B1).
Un término objetivo por artículo; el validador rechaza términos iguales o casi iguales (Jaccard ≥ 0.75 sobre palabras sin acentos ni artículos) contra artículos, pilares y otros IDs del calendario. Calendario completo: `docs/blog/calendario.md`.

## 3. Mezcla 80/20
- De cada 10 entradas, 8 de experiencias de pago y 2 de free tour (Pieza libre). Cada entrada declara `mix: "pago" | "free"`.
- **Ventana móvil de 10 días** que termina el día de la entrada: máximo 8 de pago y 2 de free, y una entrada por día. Se mide en días y no en entradas para que un día sin publicar no rompa la cuenta.
- Con B1 bloqueado (hoy), los días de free tour no se publica nada: quedan 8 entradas cada 10 días.

## 4. Regla FREETOUR en el blog
- Texto propio. No se copian descripciones de las fichas (C2): el validador compara la entrada con el texto de las fichas que enlaza y rechaza 12 palabras seguidas iguales (los títulos entre «» se permiten, C4).
- Se enlaza a fichas (`/destinos/{pais}/{ciudad}/{tour}`) y ciudades; nunca a freetour.com.
- No se menciona «FREETOUR» (vocabulario prohibido), ni proveedores, ni logos.
- No se promete lo que no existe: nada de pago en línea de tours de pago (`PAID_TOURS_ENABLED="false"`), reseñas como de Travel Puzzle (C7) ni operador propio (C6). Precios solo «desde aprox.» con EUR, como la ficha (D4).

## 5. Tema del día
1. **Trending** del sector o del destino (noticias de turismo, eventos, temporadas, aperturas, cambios de visa o requisitos) con **2 o más fuentes de dominios distintos publicadas en los últimos 14 días**; debe tocar un pilar activo y el tipo del día.
2. Si no hay trending, el **siguiente clúster pendiente** del calendario del tipo que toca (`npx tsx src/scripts/blog-tema.ts` lo calcula).

## 6. Infraestructura (PR 2)
Estructura nueva (solo archivos nuevos; nada se borra):
```
src/blog/lib/diario.ts            validador puro de la entrada diaria
src/blog/lib/diario.test.ts
src/blog/lib/mix.ts               mezcla 80/20 y plan del día (puros)
src/blog/lib/mix.test.ts
src/blog/lib/terms.ts             canibalización de términos (puro)
src/blog/lib/terms.test.ts
src/blog/lib/calendario.test.ts   calendario = docs/blog/calendario.md
src/blog/content/calendario.ts    calendario v1 (datos)
src/blog/content/diario.json      entradas del agente (las agrega el workflow)
src/blog/diario-run.ts            raíz con I/O inyectado (sitemaps, fichas, reloj)
src/scripts/blog-diario.ts        CLI del workflow: validar y agregar
src/scripts/blog-tema.ts          CLI del agente: tema del día
src/scripts/blog-indexnow.ts      aviso a IndexNow tras publicar
.github/workflows/blog-diario.yml
```
Cambios en archivos existentes: `schema.ts` (autor `editorial`, `origen`, `mix`, `tema`, fuente de la tabla), `authors.ts`, `pillars.ts` (rutas corregidas y pilar México), `seo.ts` (Organization), `content/index.ts`, `robots.ts` y `site/server.ts` (llms.txt), `ArticleView.tsx` (fuente de la tabla), `scripts/smoke.ts` (artículos publicados).

Validador (rechaza si…): falta un bloque obligatorio de la plantilla «agente» (H1, firma, En breve 40–80, entrada, 4–8 H2 con respuesta, dato con fuente, Cómo lo sabemos, tabla, CTA; minicaso y citas **prohibidos**); una unidad de texto con cifra o afirmación fáctica no trae enlace; vocabulario prohibido (sitio + «FREETOUR», «expertos», huecos `[PO:`, experiencia propia como «nuestros clientes»); un enlace interno no resuelve (rutas de los sitemaps de producción + blog); rompe la mezcla; repite el término; fecha distinta de hoy (CDMX); tema trending sin 2 fuentes recientes; texto copiado de una ficha.

Workflow `blog-diario.yml` (`workflow_dispatch` con la entrada en JSON, o push a `blog/entrada-*`): valida → rama `blog/diario-AAAA-MM-DD` y PR que solo cambia `diario.json` → suite, `tsc`, build con `BLOG_ENABLED="true"` **solo en el preview** → humo con navegador a 390 y 1366 → merge squash (gate G2) → lanza «Publicar en Cloudflare» (con su humo y regreso automático) → aviso a IndexNow si la clave está publicada. Si algo falla, no publica y comenta en un issue fijo «Blog diario: no se publicó» con el motivo.

## 7. Unit tests (rojo → verde, `npx vitest run <archivo>`)
`diario.test.ts`, `mix.test.ts`, `terms.test.ts`, `calendario.test.ts`, más casos nuevos en `seo.test.ts`, `registry.test.ts`, `robots.test.ts` e `indexnow.test.ts`. Cada `it` lleva su `REQ-9xx`.

## 8. SOLID (React)
Un solo cambio de UI: `ArticleView` pinta la fuente de la tabla (prop ya calculada en el modelo; sin «fat props»). El autor llega como `{ name, jobTitle, href }` igual que hoy (LSP).

## 9. Prompt del agente (PR 3)
`docs/blog/agente-diario.md`, autocontenido: método de las skills, deep-research ligero (2 o 3 búsquedas, fuentes primarias), plantilla del agente, reglas FREETOUR, validación local y envío al workflow. Primera entrada de prueba en `docs/blog/ejemplos/` validada por test, sin publicar.

## 10. Gates
- **A — Pilares y calendario** (este PR): 5 pilares activos (México nuevo), free tours bloqueado, calendario de 60. [ ] PO
- **B — Infraestructura y merge automático** (PR 2): autorizado por G1–G3 del gate firmado. [x] PO, 6 nov 2026
- **C — Encendido de `BLOG_ENABLED`** (PR 4): OK explícito del PO. [ ] PO

## 11. Capacidades (growthos-capacidades, modo a la medida)
Agente «Blog diario de Travel Puzzle»: C03 blogs SEO, C04 tendencias, C05 calendario editorial, C06 voz de marca (vocabulario), O03 dato separado de inferencia con fuente y fecha, O06 búsqueda web con fuentes, N12 prueba antes de publicar (validador + humo), S08 aprobación humana para lo irreversible → **reemplazada por el gate G1** solo para este agente. Descartadas: C07 aprobación antes de publicar (la reemplaza el gate), C01/C02 redes (no se pidió), V10 prueba social (sin casos autorizados de Travel Puzzle).
