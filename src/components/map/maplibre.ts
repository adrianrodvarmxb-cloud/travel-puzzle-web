/**
 * Carga MapLibre con su worker servido desde /public (el empaquetador no resuelve bien el worker).
 * Al subir la versión de maplibre-gl, copia el worker nuevo: lo vigila maplibre.test.ts.
 */
export const MAPLIBRE_VERSION = '6.13.0';
export const MAPLIBRE_WORKER_URL = `/maplibre/maplibre-gl-worker-${MAPLIBRE_VERSION}.mjs`;

export async function loadMaplibre() {
  const maplibregl = await import('maplibre-gl');
  maplibregl.setWorkerUrl(MAPLIBRE_WORKER_URL);
  return maplibregl;
}
