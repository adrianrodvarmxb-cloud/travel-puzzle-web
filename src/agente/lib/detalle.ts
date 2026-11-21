/**
 * REQ-10837 · Ficha completa para la ventana del agente (Mila), armada desde el lector de Mila del modelo común
 * (`readers/mila.ts`, REQ-10826; `agent-view.ts`, REQ-10825). Rehace la ruta `detalle` de #468 sobre el modelo
 * (decisión 39, REQ-10616). Reglas que nunca se rompen (frente 2): nunca neto ni margen (el modelo no los trae),
 * nunca teléfono ni correo del operador o del guía, FREETOUR nunca llega (el lector da null, decisión 42).
 * Las fotos sí van (REQ-031 de zoefel-mila: todas las disponibles, Mila arma el carrusel). Puro.
 */
import type { FichaModel } from "@/ficha/lib/model";
import type { MilaRead } from "@/ficha/lib/readers/mila";
import { enlacePrellenado } from "./catalogo";

export interface DetalleAgente {
  slug: string | null;
  codigo: string;
  titulo: string;
  proveedor: string;
  lugar: string;
  resumen: string | null;
  duracion: string | null;
  idiomas: string[];
  precio: { monto: number; moneda: string; por: "person" | "group" | "total" } | null;
  precioTexto: string | null;
  cancelacion: string | null;
  puntoEncuentro: string | null;
  incluye: string[];
  noIncluye: string[];
  queLlevar: string[];
  requisitos: string[];
  itinerario: { dia: number; titulo: string | null; texto: string }[];
  opciones: { id: string; nombre: string; precio: { monto: number; moneda: string; por: string } | null }[];
  operador: string | null;
  reserva: { modo: string; enlace: string };
  fotos: { url: string; alt: string | null }[];
  enlace: string;
  /** Texto corto para el prompt (mismo dato que la ficha pública). */
  texto: string;
}

/** `proveedores=` de la ventana: `propios` o `agencia:<id>` (REQ-148). */
// REQ-10837
export const proveedorDeViaje = (agencyId: string | null): string => (agencyId ? `agencia:${agencyId}` : "propios");

// REQ-10837
export function detalleAgente(f: FichaModel, read: MilaRead, o: { base: string; agencyId: string | null; /** REQ-10845: id del proveedor de un tour (`tangol`); sin él, el de viajes. */ proveedor?: string }): DetalleAgente {
  const v = read.view;
  const enlace = enlacePrellenado(o.base, v.booking.path, {});
  const precio = (p: FichaModel["price"]) => (p ? { monto: p.amount, moneda: p.currency, por: p.per } : null);
  return {
    slug: f.slug,
    codigo: v.reference,
    titulo: v.title,
    proveedor: o.proveedor ?? proveedorDeViaje(o.agencyId), // REQ-10845
    lugar: v.place,
    resumen: v.summary,
    duracion: v.duration,
    idiomas: v.languages,
    precio: precio(v.price),
    precioTexto: read.common.priceText,
    cancelacion: v.cancellation,
    puntoEncuentro: v.meeting,
    incluye: v.includes,
    noIncluye: v.excludes,
    queLlevar: v.whatToBring,
    requisitos: f.requirements,
    itinerario: f.itinerary.map((d) => ({ dia: d.day, titulo: d.title, texto: d.text })),
    opciones: v.options.map((op) => ({ id: op.id, nombre: op.name, precio: precio(op.price) })),
    operador: v.operator,
    reserva: { modo: v.booking.mode, enlace },
    fotos: f.gallery.filter((g) => /^https:\/\//.test(g.url)).map((g) => ({ url: g.url, alt: g.alt })),
    enlace,
    texto: read.text,
  };
}
