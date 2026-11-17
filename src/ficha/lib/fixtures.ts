/** REQ-10776: ficha de ejemplo completa para pruebas (valores públicos inventados; sin proveedor real). */
import type { FichaModel } from "./model";

export function fichaEjemplo(): FichaModel {
  return {
    id: "tour-ejemplo", provider: "ejemplo", externalRef: "1", code: null, slug: "tour-ejemplo", lang: "es", section: "experiencias",
    country: { code: "AR", name: "Argentina" }, city: { slug: "el-calafate", name: "El Calafate" },
    gallery: [{ url: "https://img.example.com/1.jpg", alt: null }],
    title: "Tour de ejemplo", rating: { value: 4.5, count: 45, favorite: false },
    taxonomy: { tipo: { slug: "excursion-de-un-dia", label: "Excursión de un día" }, temas: [], atributos: [] },
    facts: { durationMinutes: 480, schedule: "09:00", languages: ["es", "en"], season: null, difficulty: 1, ages: { childFrom: 3, childTo: 9 } },
    brief: "Un día en el glaciar.", highlights: [], descriptionHtml: "<p>Descripción.</p>", itinerary: [],
    includes: ["Transporte"], excludes: ["Almuerzo"],
    meeting: { kind: "none", title: "Hoteles céntricos" },
    price: { amount: 98, currency: "USD", per: "person" }, options: [],
    whatToBring: ["Ropa de abrigo"], requirements: [], cancellation: { hours: 48, text: null }, notes: [], operator: "Operador de ejemplo",
    booking: { mode: "request", chargedBy: "travelpuzzle", leadHours: 24 },
  };
}
