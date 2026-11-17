-- REQ-10734 (ficha única, ola 4 «Geografía»; decisiones 27, 28 y 30 del PO, REQ-10605/10606/10608, 14 nov 2026):
-- coordenadas de la ciudad para el pin de respaldo y la «Zona aproximada» de las experiencias sin punto exacto.
-- Solo agrega tres columnas opcionales a "City"; nadie las lee sin CITY_PIN_FALLBACK_ENABLED / ZONE_MAP_ENABLED.
-- Se llena desde GeoNames (REQ-10740, script que simula por defecto) o a mano; `coordsSource` dice de dónde salió:
-- geonames | manual | mediana (mediana de los puntos de encuentro de sus tours, src/map/lib/cities.ts).
-- Se aplica sola en su deploy, con punto de regreso de D1 y copia de "City" en tmp/ (REQ-10741).
-- Plan de regreso: las columnas pueden quedarse en NULL; con las banderas apagadas el sitio no cambia.

ALTER TABLE "City" ADD COLUMN "lat" REAL;
ALTER TABLE "City" ADD COLUMN "lng" REAL;
ALTER TABLE "City" ADD COLUMN "coordsSource" TEXT;
