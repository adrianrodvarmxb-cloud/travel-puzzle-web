# Gates firmados — Home y prueba social (3 nov 2026)

PO: Adrián Rodvar. Decisiones de producto para el home nuevo y las reseñas.

| Gate | Decisión | Opción firmada |
|---|---|---|
| 1. Idioma | Cada visitante ve el sitio en el idioma de su navegador; si no lo tenemos, español | B |
| 2. Favoritos de los viajeros | 6 tours variados (ciudades y continentes distintos), solo con 4.7 ★ o más y 100 reseñas o más | C + filtro de calidad |
| 3. Carrusel principal | Cada foto lleva a los tours reales de su ciudad; si la ciudad no tiene tours, la foto no sale | A |
| 4. Prueba social | A) resumen de reseñas junto al título + "Ver más reseñas"; B) etiqueta "Favorito de los viajeros"; C) reseñas del inicio con su tour; D) frase destacada en tarjetas | A + B + C + D |
| Extra | Cada tarjeta de continente con carrusel de fotos de sus tours reales | Pedido por el PO |

Reglas que se derivan:
- Nada de cifras inventadas: todo número del home sale del catálogo.
- La etiqueta y las frases se calculan solas con datos reales; si un tour deja de cumplir, las pierde.
- Fuera de alcance por ahora: mapa interactivo, Puzzle Rewards, ofertas especiales, boletín.

## Diseño nuevo y mapa (firmado el 3 nov 2026)

| Gate | Decisión | Opción firmada |
|---|---|---|
| Diseño | Propuesta "tecnológica" del tablero de diseño; **header y footer se quedan como están** | Aprobado |
| M1. Fondo del mapa | OpenFreeMap (gratis, sin cuenta ni llaves) | A |
| M2. Dónde va el mapa | Home + mapa del punto de encuentro en cada tour, con "Cómo llegar" | A + C |
| M3. Al tocar una ciudad | Tarjeta flotante con total de tours y 3 recomendados | A |
| Regla 60/40 | En toda recomendación: favoritos del home (6 = 4 de pago + 2 gratis), tarjeta del mapa (3 = 2 + 1), correos (3 = 2 + 1); si faltan de un tipo se rellena con el otro; con `PAID_TOURS_ENABLED=false`, solo gratis | Aprobado |
