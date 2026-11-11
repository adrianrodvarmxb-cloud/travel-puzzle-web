// Inventario de Tangol para decidir qué subir (REQ-1558). Lógica pura: recibe las respuestas de la API.

const num = (v) => (Number.isFinite(v) ? v : 0);

// REQ-1558
export function summarizeInventory(countriesRes, destinationsByCountry) {
  let discarded = 0;
  const countries = (countriesRes?.ListCountries ?? [])
    .filter((c) => (typeof c?.IsoCode === "string" && c.IsoCode ? true : (discarded++, false)))
    .map((c) => {
      const cities = (destinationsByCountry?.[c.IsoCode]?.ListDestinations ?? [])
        .filter((d) => (Number.isInteger(d?.Id) && typeof d.Description === "string" ? true : (discarded++, false)))
        .map((d) => ({ id: d.Id, name: d.Description, toursQty: num(d.ToursQty) }))
        .sort((a, b) => b.toursQty - a.toursQty);
      return { isoCode: c.IsoCode, name: c.Description ?? c.IsoCode, toursQty: num(c.ToursQty), cities };
    })
    .sort((a, b) => b.toursQty - a.toursQty);
  const totalTours = countries.reduce((s, c) => s + c.toursQty, 0);
  return { totalTours, countries, discarded };
}

// REQ-1558
export function formatInventory(inv) {
  const lines = [];
  for (const c of inv.countries) {
    lines.push(`${c.name} (${c.isoCode}): ${c.toursQty} tours`);
    for (const city of c.cities) lines.push(`  ${city.name}: ${city.toursQty}`);
  }
  const cities = inv.countries.reduce((s, c) => s + c.cities.length, 0);
  lines.push(`Total: ${inv.totalTours} tours en ${inv.countries.length} países y ${cities} ciudades`);
  if (inv.discarded) lines.push(`Registros inválidos descartados: ${inv.discarded}`);
  return lines.join("\n");
}
