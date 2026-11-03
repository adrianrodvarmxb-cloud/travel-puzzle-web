/**
 * Free tour: cómo funciona la propina y cuánto se sugiere según la región del tour. Pura.
 * Montos orientativos (decisión del PO, 3 nov 2026); la propina siempre es voluntaria.
 */
import { continentOf } from "@/home/lib/continents";

/** Etiqueta de los tours sin costo, igual en todos los idiomas. */
export const FREE_TOUR_LABEL = "Free tour";

export type TipRegion = "europa" | "norteamerica" | "latam" | "otros";

export function tipRegion(countryCode: string | null | undefined): TipRegion {
  const code = (countryCode ?? "").trim().toUpperCase();
  if (code === "US" || code === "CA") return "norteamerica";
  const c = continentOf(code);
  if (c === "europa") return "europa";
  if (c === "america-norte" || c === "america-sur") return "latam";
  return "otros";
}

export interface TipGuide {
  title: string;
  intro: string;
  /** Monto sugerido para la región del tour; null si no hay referencia. */
  amount: string | null;
  amountLabel: string;
  tips: string[];
}

const ES = {
  title: "¿Cómo funciona un free tour?",
  intro: "Reservar no cuesta. Al terminar, cada quien le da al guía lo que considere justo según su experiencia: es una propina voluntaria.",
  amountLabel: "Sugerido en este destino",
  amounts: {
    europa: "€10 a €15 por persona (€20 o más si fue excepcional)",
    norteamerica: "$10 a $20 USD por persona",
    latam: "el equivalente a $5 a $10 USD por persona, en moneda local",
    otros: null,
  } as Record<TipRegion, string | null>,
  tips: ["Paga en efectivo al terminar el recorrido.", "Lleva billetes chicos o cambio."],
};

const EN: typeof ES = {
  title: "How does a free tour work?",
  intro: "Booking costs nothing. At the end, each person gives the guide what they think is fair for the experience: it's a voluntary tip.",
  amountLabel: "Suggested in this destination",
  amounts: {
    europa: "€10 to €15 per person (€20+ if it was exceptional)",
    norteamerica: "$10 to $20 USD per person",
    latam: "the equivalent of $5 to $10 USD per person, in local currency",
    otros: null,
  },
  tips: ["Pay in cash at the end of the tour.", "Bring small bills or change."],
};

export function tipGuide(countryCode: string | null | undefined, lang: string): TipGuide {
  const t = lang === "es" ? ES : EN;
  return { title: t.title, intro: t.intro, amount: t.amounts[tipRegion(countryCode)], amountLabel: t.amountLabel, tips: t.tips };
}
