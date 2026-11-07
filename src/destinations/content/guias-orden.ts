/**
 * REQ-1229: orden de las guías de ciudad. Primero las 37 ciudades con viaje propio publicado (no transporte), de más a
 * menos viajes; datos de los sitemaps de producción del 7 nov 2026 (fichas con sufijo de agencia: fch, iwp, ext, dco, exe).
 * Después de estas, el agente sigue por número de experiencias de la ciudad (lo calcula src/scripts/guias-tema.ts).
 */
export const ORDEN_GUIAS: string[] = [
  "fr/paris", "cn/pekin", "cn/shanghai", "pe/cusco", "cn/guilin", "in/jaipur",
  "in/delhi", "in/agra", "cn/hangzhou", "co/bogota", "cn/chengdu", "pe/lima",
  "pe/arequipa", "in/benares", "co/medellin", "pe/ica", "in/udaipur", "in/jodhpur",
  "be/brujas", "pe/machu-picchu", "co/santa-marta", "cn/lhasa", "cn/chongqing", "co/barranquilla",
  "cn/luoyang", "np/katmandu", "np/bhaktapur", "lk/sigiriya", "lk/polonnaruwa", "lk/nuwara-eliya",
  "lk/kandy", "lk/galle", "lk/ella", "lk/colombo", "in/bombay", "in/amritsar",
  "cn/kunming",
];
