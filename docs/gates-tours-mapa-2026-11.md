# Gates — Mapa y duración en /tours · 3 nov 2026

Firmados por el PO (Adri) en el chat, uno por uno.

1. **Mapa:** lista y mapa a la vez. Escritorio (xl): filtros · lista · mapa fijo. Celular y tablet: botón flotante Mapa/Lista. Un pin con el precio por tour de la página actual (punto de encuentro); al tocarlo, tarjeta con foto, título, precio y "Ver tour". Al pasar el mouse por una tarjeta se resalta su pin.
2. **Duración:** ordenar ("Más cortos primero") y filtrar (hasta 2 h, 2 a 4 h, más de 4 h) con `?duracion=short|mid|long`.
3. **Datos:** columna nueva `durationMinutes` (migración `0004`, aditiva) calculada de `duration` ("H:MM"); la sincronización diaria la mantiene. Aplicar la migración es candado: OK aparte del PO.

Orden de publicación: aplicar 0004 antes (o junto) con el código; el código nuevo consulta la columna.
