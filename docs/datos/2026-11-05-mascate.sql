-- REQ-130 (decisión del PO, 5 nov 2026): la ciudad 3209 de Omán (FREETOUR cityId 3209, geonameid 287286)
-- llegó de la API con es = «Moscatel» (mala traducción de Muscat). Se corrige a «Mascate».
-- Por qué un UPDATE sí dura: el sync (src/catalog/sync.ts → ensurePlaces) solo escribe ciudades que NO existen;
-- una ciudad existente nunca se vuelve a pedir ni a escribir (test REQ-130 en src/catalog/sync.test.ts).
-- Lo corre SOLO el workflow «Corregir ciudad: Mascate» con escribir=true (candado: datos de producción, OK del PO).
-- No toca el slug («moscatel»): cambiar la URL es otra decisión.

-- 1) Respaldo (el workflow lo guarda en el artefacto antes de escribir)
SELECT "id", "countryId", "translations", "slug", "geonameid" FROM "City" WHERE "id" = 3209;

-- 2) Corrección: una sola fila y solo si sigue diciendo «Moscatel» (correrlo dos veces no cambia nada)
UPDATE "City" SET "translations" = json_set("translations", '$.es', 'Mascate')
WHERE "id" = 3209 AND "countryId" = 116 AND json_extract("translations", '$.es') = 'Moscatel';

-- 3) Regreso (si hiciera falta): mismo WHERE con los valores al revés
-- UPDATE "City" SET "translations" = json_set("translations", '$.es', 'Moscatel')
-- WHERE "id" = 3209 AND "countryId" = 116 AND json_extract("translations", '$.es') = 'Mascate';
