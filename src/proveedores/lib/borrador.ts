// Puro · REQ-1297 (P3b): el primer correo lo manda Adri, con copia a Mila; aquí solo se arma el borrador.
import { rellenar } from "./correo";
import { plantilla } from "./plantillas";
import { pedidosDeCobro, pedidosDeIntegracion, numerar, type Cobro, type Integracion } from "./integracion";
import { pedidosDeAlta, type TipoProveedor } from "./checklist";

// REQ-1670: «Re: » una sola vez.
export const asuntoRespuesta = (a: string) => (/^re:/i.test(a.trim()) ? a.trim() : `Re: ${a.trim()}`);

export const COPIA_MILA = "comercial@travelpuzzle.com.mx";
export const COPIA_CLAUDIA = "claulet@travelpuzzle.com.mx";

export interface DatosBorrador {
  nombre: string; contacto?: string; correos: string[]; destinos?: string; idioma: "es" | "en";
  integracion: Integracion; cobro: Cobro; ultimoTema?: string;
  asuntoHilo?: string; // REQ-1670: asunto del hilo que ya existe; la presentación va como respuesta
  tipo?: TipoProveedor; recibidos?: string[]; // REQ-1665
}
export interface Borrador { para: string[]; cc: string[]; asunto: string; cuerpo: string }

// REQ-1297, REQ-1298, REQ-1299
export function borradorPresentacion(d: DatosBorrador): Borrador | null {
  if (!d.correos.length) return null;
  // REQ-1665: con tipo, la lista completa de alta; sin tipo, el comportamiento anterior.
  const pedidos = numerar(d.tipo ? pedidosDeAlta({ tipo: d.tipo, integracion: d.integracion, cobro: d.cobro, idioma: d.idioma, recibidos: d.recibidos ?? [] })
    : [...pedidosDeIntegracion(d.integracion, d.idioma), ...pedidosDeCobro(d.cobro, d.idioma)]);
  const datos = { contacto: d.contacto, proveedor: d.nombre, destinos: d.destinos, ultimo_tema: d.ultimoTema, pedidos };
  const p = plantilla("presentacion", d.idioma, datos);
  const firma = d.idioma === "en" ? "Adrián Rodvar\nTravel Puzzle" : "Adrián Rodvar\nTravel Puzzle";
  return { para: d.correos, cc: [COPIA_MILA, COPIA_CLAUDIA], asunto: d.asuntoHilo ? asuntoRespuesta(d.asuntoHilo) : rellenar(p.asunto, datos), cuerpo: `${rellenar(p.cuerpo, datos)}\n\n${firma}` };
}
