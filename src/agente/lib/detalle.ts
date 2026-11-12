// Puro · REQ-3354: ficha completa de un viaje publicado para el agente (Mila). Solo datos públicos de la ficha:
// precios finales, nunca neto, margen, ids internos ni datos de clientes. FREETOUR no vive en Trip.
import type { StoredTrip } from "@/trips/manage";
import { imageUrl } from "@/trips/lib/image";
import type { CancellationPolicy } from "@/trips/lib/cancel-policy";

type Opcion = { name: string; adult: number | null; child: number | null; infant: number | null; childAgeMin: number; childAgeMax: number };

export interface FichaAgente {
  slug: string; titulo: string; tipo: string; resumen: string; descripcion: string; destacados: string[];
  paises: string[]; ciudades: string[]; duracionDias: number | null; idiomas: string[]; minPersonas: number | null; maxPersonas: number | null;
  dificultad: string | null; vuelosIncluidos: boolean; moneda: string; precioDesde: number | null; notaPrecio: string;
  opciones: { nombre: string; adulto: number | null; nino: number | null; infante: number | null; edadNino: string }[];
  extras: { nombre: string; precio: number; porPersona: boolean }[];
  fechas: string[]; avisoMinimoHoras: number; itinerario: { titulo: string; texto: string }[];
  incluye: string[]; noIncluye: string[]; infoImportante: string; queLlevar: string; accesibilidad: string; visa: string;
  puntoEncuentro: { nombre: string; direccion: string }[]; recogeEnHotel: boolean; termina: string;
  cancelacion: string; fotos: { url: string; alt: string }[]; video: string | null; enlace: string;
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// REQ-3354: la política de cancelación en palabras, con los escalones reales del viaje.
export function textoCancelacion(p: CancellationPolicy | null | undefined): string {
  if (!p || p.type === "none") return "No admite cancelación con reembolso.";
  if (p.type === "standard") return "Cancelación sin costo hasta 24 horas antes; después, sin reembolso.";
  const tiers = [...arr<{ daysBefore: number; refundPct: number }>(p.tiers)].filter((t) => t.refundPct > 0).sort((a, b) => b.daysBefore - a.daysBefore);
  if (!tiers.length) return "No admite cancelación con reembolso.";
  return `${tiers.map((t, i) => `${i === 0 ? "Reembolso del " : ""}${t.refundPct} % hasta ${t.daysBefore} días antes`).join("; ")}; después, sin reembolso.`;
}

// REQ-3354
export function fichaParaAgente(t: StoredTrip, base: string, path: string): FichaAgente {
  const abs = (u: string) => `${base.replace(/\/$/, "")}${u}`;
  const x = t as StoredTrip & Record<string, unknown>;
  return {
    slug: t.slug, titulo: String(x.titleEs ?? ""), tipo: t.kind, resumen: String(x.summaryEs ?? ""), descripcion: String(x.descriptionEs ?? ""),
    destacados: arr<string>(x.highlights), paises: arr<string>(x.countries), ciudades: arr<string>(x.cities),
    duracionDias: (x.durationDays as number | null) ?? null, idiomas: arr<string>(x.languages),
    minPersonas: (x.minPax as number | null) ?? null, maxPersonas: (x.maxPax as number | null) ?? null,
    dificultad: (x.difficulty as string | null) ?? null, vuelosIncluidos: !!x.flightsIncluded,
    moneda: String(x.currency ?? "MXN"), precioDesde: t.priceFrom ?? null, notaPrecio: String(x.priceNote ?? ""),
    opciones: arr<Opcion>(x.options).map((o) => ({ nombre: o.name, adulto: o.adult, nino: o.child, infante: o.infant, edadNino: `${o.childAgeMin} a ${o.childAgeMax}` })),
    extras: arr<{ name: string; price: number; perPerson: boolean }>(x.extras).map((e) => ({ nombre: e.name, precio: e.price, porPersona: e.perPerson })),
    fechas: arr<{ date: string }>(x.dates).map((d) => d.date), avisoMinimoHoras: Number(x.minNoticeHours ?? 24),
    itinerario: arr<{ title: string; text: string }>(x.itinerary).map((d) => ({ titulo: d.title, texto: d.text })),
    incluye: arr<string>(x.includes), noIncluye: arr<string>(x.excludes),
    infoImportante: String(x.importantInfo ?? ""), queLlevar: String(x.whatToBring ?? ""), accesibilidad: String(x.accessibility ?? ""), visa: String(x.visaInfo ?? ""),
    puntoEncuentro: arr<{ name: string; address: string }>(x.meetingPoints).map((m) => ({ nombre: m.name, direccion: m.address })),
    recogeEnHotel: !!x.hotelPickup, termina: String(x.endPoint ?? ""),
    cancelacion: textoCancelacion(x.cancellation as CancellationPolicy),
    fotos: arr<{ key: string; alt: string }>(x.images).map((i) => ({ url: abs(imageUrl(i.key)), alt: i.alt ?? "" })),
    video: x.videoUrl ? String(x.videoUrl) : null,
    enlace: abs(path),
  };
}
