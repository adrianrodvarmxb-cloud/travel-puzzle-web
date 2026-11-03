# Gates — auditoría de diseño UX/UI (3 nov 2026)

Firmados por Adri (PO).

## Errores corregidos (sin gate)
- Ficha del tour sin margen lateral en celular (`.container` del sitio no trae padding).
- Etiqueta "Favorito de los viajeros" repetida en la ficha.
- Duración, destino y proveedor repetidos en la caja de precio (ocultos con `SHOW_DETAILS=false`).
- Carrusel de la portada: punto de enfoque por foto (`focus` en `src/home/lib/hero.ts`) y ciudades rápidas en una sola fila deslizable en celular.

## Decisiones
1. **Header:** se queda exactamente como está (círculo con el logo). Footer igual.
2. **Inicio en celular (A):** Favoritos, Continentes y Reseñas como carrusel horizontal (`MobileRail`); en escritorio no cambia. El inicio pasa de ~11,400 px a ~6,700 px de alto.
3. **Barra fija en la ficha (A):** precio, calificación y "Apartar con un asesor" (WhatsApp) en celular; con reservas encendidas dice "Reservar" y lleva al calendario.
4. **Caja de precio con reservas apagadas (A):** "Apártalo con un asesor" + botón a WhatsApp en lugar del calendario y "No hay disponibilidad".
