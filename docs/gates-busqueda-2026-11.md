# Gates — Buscador SEARCH_V2 por destino · 5 nov 2026

Firmados por el PO (Adri) en el chat, uno por uno. Contexto: con `SEARCH_V2_ENABLED="true"` (REQ-048), «Roma tour» y «free tour Roma» traían Roma, Bucarest y León, y «tours en Roma» no encontraba nada (reproducido con node:sqlite y la migración 0011 real). Se cumple en REQ-122.

1. **Gate 1 = A (destino dentro del texto):** si alguna palabra o par de palabras del texto es una ciudad o un país (en cualquier idioma ya disponible), se filtra solo a ese destino y el resto del texto se busca dentro de él, como GetYourGuide/Civitatis.
2. **Gate 2 = A (palabra exacta primero):** palabra exacta primero; prefijo solo en la última palabra o como respaldo si lo exacto no trae nada (coherente con REQ-057). Singular/plural simple ("tours" → "tour") si es seguro.
3. **Gate 3 = A (nombres de destino):** solo las traducciones de ciudad y país que ya existen; alias de GeoNames después de la Ola 3. Sin migraciones nuevas.

Candados que siguen: aplicar la migración 0011, preview con la bandera encendida y prueba de humo, y OK del PO para encender `SEARCH_V2_ENABLED` en su propio PR (`docs/runbook-busqueda.md`).
