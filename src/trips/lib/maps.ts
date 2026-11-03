/** Coordenadas del punto de encuentro a partir de un enlace de Google Maps o "lat, lng". Puro. */
const valid = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

export function parseMapsLink(input: string): { lat: number; lng: number } | null {
  const s = decodeURIComponent(input.trim());
  const patterns = [/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/];
  for (const re of patterns) {
    const m = re.exec(s);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      return valid(lat, lng) ? { lat, lng } : null;
    }
  }
  return null;
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
