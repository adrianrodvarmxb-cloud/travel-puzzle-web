# Gates de la taxonomía (6 nov 2026)

Fuente: avisos del coordinador con el PO en autopiloto (6-11, 07:04 y posterior). Las constantes viven en
`src/taxonomy/lib/gates.ts`; cambiar una opción es un PR con OK del PO. Plan: `docs/plan-taxonomia.md` §7.1 bis.

## Gates del plan (firmados por recomendación, PO 6-11 07:04)

G2 Caminata = A · Lista de temas = A (13) · G-T1 = A (≥4.7 y ≥50) · G-T2 = A (México como bloque) · G-T3 = metas propuestas ·
G-T4 = A (franja tras bandera) · G-T5 = A (tablas 0017) · G-T7 = A (≥360 min con palabra de salida) · G-T8 = A (2/3/4) ·
G-T9 = A (title «– Excursión desde {Ciudad}», T5) · G-T10 = A (por-revisar no se publica) · G-T11 = A (autoguiado → tour) ·
«Signature moments» y pt/de/fr/it de §7.3.

## Decisiones del PR #156 (T1)

| # | Decisión | Resultado |
|---|---|---|
| 1 | Apoyo de «Momentos de autor» | **Firmado por el PO**: se quita «operadas por expertos locales» («no es cierto»); el apoyo es la definición de §7.3: «Algo para hacer, no solo para ver: talleres, clases, espectáculos, aventura o vida nocturna.» |
| 2 | Términos mexicanos «Boletos y entradas» y «Renta» | Firmado por recomendación |
| 3 | ~~«Free tour» como etiqueta pública de `pieza-libre`~~; «La Primera Pieza» solo como colección | **Anulada por el PO (6-11 10:43)**: la etiqueta pública es **«Pieza libre»** (término ES del diccionario, chips de /tours y de la ciudad, etiqueta junto a la insignia). «Free tour», «free tour» y «tour gratis» quedan como sinónimos de búsqueda. La colección sigue llamándose «La Primera Pieza». REQ-269. |
| 3-EN | Término en inglés de `pieza-libre` | **Por firmar.** Por ahora «Free tour»; propuesta: «Free piece». |
| 4 | Renta en la sección Traslados | Firmado por recomendación |
| 5 | «Salud» (2024) como sinónimo de búsqueda de Bienestar | Firmado por recomendación |
| 6 | D-T1: reglas por palabra antes de Free tour (hoy cambia 0 tours) | Firmado por recomendación |

## Hallazgo para T5

635 tours dicen «autoguiado», «self-guided» o «audio guide» en el título (solo 29 en la categoría 17). Decisión: en T5,
«con un guía local» sale solo si el título no dice autoguiado ni self-guided (atributo `autoguiado` del clasificador).
