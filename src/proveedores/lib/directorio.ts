// Puro · REQ-1656: carga inicial del directorio aprobado (REQ-1653, «apruebo», 11 nov 2026 13:11), con la
// actualización de los hilos de Gmail (REQ-1668). Fuente: docs/proveedores/borrador-directorio-2026-11-07.md;
// el test cruza cada dominio y correo contra ese documento para que no se desalineen.
// Todos arrancan «por_contactar»: Mila no escribe sola; el hilo lo abre el PO (REQ-1297, REQ-1670).
// Fuera de la carga: las plataformas de hoteles y vuelos (sección 3, aún «¿entran?») y lo de «Fuera del directorio».
import type { Cobro, Integracion } from "./integracion";

export interface ProveedorSemilla {
  id: string;
  nombre: string;
  tipo: "dmc" | "plataforma";
  publicado: boolean;
  bloqueado: boolean;
  canal: "api" | "portal" | "correo" | "whatsapp";
  integracion: Integracion;
  cobro: Cobro; // REQ-1666: DMC → travelpuzzle; plataforma → proveedor
  idioma: "es" | "en";
  correos: string[];
  dominios: string[];
  correosInvalidos: string[];
  zonaHoraria: string; // REQ-1566; sin dato, la de México
  contacto: string;
  notas: string;
}

const MX = "America/Mexico_City";
const dmc = (p: Partial<ProveedorSemilla> & Pick<ProveedorSemilla, "id" | "nombre">): ProveedorSemilla => ({
  tipo: "dmc", publicado: false, bloqueado: false, canal: "correo", integracion: "desconocida", cobro: "travelpuzzle", idioma: "es",
  correos: [], dominios: [], correosInvalidos: [], zonaHoraria: MX, contacto: "", notas: "", ...p,
});
const plataforma = (p: Partial<ProveedorSemilla> & Pick<ProveedorSemilla, "id" | "nombre">): ProveedorSemilla =>
  dmc({ tipo: "plataforma", cobro: "proveedor", ...p });

// REQ-1656
export const DIRECTORIO_APROBADO: ProveedorSemilla[] = [
  // 1. Publicados en el sitio (Mila arranca por aquí)
  plataforma({ id: "big-bus-tours", nombre: "Big Bus Tours", publicado: true, canal: "portal", integracion: "api", idioma: "en",
    correos: ["rositsag@bigbustours.com", "tradesupport@bigbustours.com"], dominios: ["bigbustours.com"], zonaHoraria: "Europe/London",
    notas: "Plataforma: cobra Big Bus (Ventrata OCTO) y paga comisión (REQ-1586)." }),
  dmc({ id: "destino-colombia", nombre: "Destino Colombia", publicado: true,
    correos: ["reservas5@destinocolombia.com", "grupos2@destinocolombia.com", "comercial@destinocolombia.com"], dominios: ["destinocolombia.com"],
    zonaHoraria: "America/Bogota", notas: "reservas5@ 1-20 pax; grupos2@ 21+. También WhatsApp; portal de socios por dar de alta." }),
  dmc({ id: "exotic-escapes", nombre: "Exotic Escapes", publicado: true, correos: ["angela.ballen@exoticescapes.co.in"], dominios: ["exoticescapes.co.in"],
    zonaHoraria: "Asia/Kolkata", contacto: "Angela Ballén", notas: "Acuerdo enviado el 11 nov 2026 (lo sigue la revisión cada 6 h)." }),
  dmc({ id: "extime-travel", nombre: "Extime Travel (Paris City Vision)", publicado: true, canal: "portal", integracion: "portal",
    correos: ["intlsales@extimetravel.com", "a.alves@extimetravel.com"], dominios: ["extimetravel.com", "pariscityvision.com"],
    zonaHoraria: "Europe/Paris", contacto: "Amandine Da Cal Alves", notas: "Portal B2B nuevo pro.extimetravel.com desde el 17 nov 2026." }),
  dmc({ id: "fantastica-china", nombre: "Fantástica China", publicado: true,
    correos: ["beibei@fantasticachina.com", "zhoufan@fantasticachina.com"], dominios: ["fantasticachina.com"], zonaHoraria: "Asia/Shanghai" }),
  dmc({ id: "inca-world-peru", nombre: "Inca World Peru", publicado: true, correos: ["centralincaworldtravel@gmail.com"],
    zonaHoraria: "America/Lima", notas: "También WhatsApp. Correo gratuito: se identifica solo por dirección exacta." }),
  dmc({ id: "turismo-asiatico", nombre: "Turismo Asiático", publicado: true,
    correos: ["reservas@turismoasiatico.com", "sergi@turismoasiatico.com"], dominios: ["turismoasiatico.com"] }),

  // 2. En conversación, sin publicar
  dmc({ id: "bemyguest", nombre: "BeMyGuest", integracion: "api", idioma: "en", dominios: ["bemyguest.com.sg"], zonaHoraria: "Asia/Singapore" }),
  dmc({ id: "eurorutas", nombre: "Eurorutas", correos: ["fernanda@eurorutas.com", "monica@eurorutas.com"], dominios: ["eurorutas.com"],
    zonaHoraria: "Europe/Madrid", contacto: "Fernanda", notas: "Angela ya no está. Solicitud de integración XML/API en la oficina central." }),
  dmc({ id: "eurowelcome", nombre: "Eurowelcome / AngloVision", dominios: ["eurowelcome.co.uk"], zonaHoraria: "Europe/London" }),
  dmc({ id: "tangol", nombre: "Tangol", integracion: "api", dominios: ["tangol.com"], zonaHoraria: "America/Argentina/Buenos_Aires",
    contacto: "Hernán Garriga", notas: "API con swagger; whitelist por la pasarela (REQ-1545). Acuerdo en curso: lo lleva la revisión cada 6 h." }),
  dmc({ id: "oku-japan", nombre: "OKU Japan", idioma: "en", dominios: ["okujapan.com"], zonaHoraria: "Asia/Tokyo" }),
  plataforma({ id: "civitatis", nombre: "Civitatis", dominios: ["civitatis.com"], zonaHoraria: "Europe/Madrid" }),
  dmc({ id: "canadian-receptive-tours", nombre: "Canadian Receptive Tours", dominios: ["canadianreceptivetours.com"] }),
  dmc({ id: "de-la-paz-tur", nombre: "De la Paz Tur", dominios: ["delapaztur.com"] }),
  dmc({ id: "mexico-top-tours", nombre: "Mexico Top Tours", dominios: ["mexicotoptours.com"] }),
  dmc({ id: "marhaba", nombre: "Marhaba (Rusia)", dominios: ["marhabanfi.ru"], zonaHoraria: "Europe/Moscow" }),
  dmc({ id: "kyoto-tours-en-espanol", nombre: "Kyoto Tours en Español", dominios: ["kyototoursenespanol.com"], zonaHoraria: "Asia/Tokyo" }),
  dmc({ id: "tcd-operadora", nombre: "TCD Operadora", dominios: ["tcdoperadora.mx"] }),
  dmc({ id: "buendia-travel", nombre: "Buendía Travel", dominios: ["buendia.travel"] }),
  dmc({ id: "mega-travel", nombre: "Mega Travel", dominios: ["megatravel.com.mx"] }),
  dmc({ id: "altroom", nombre: "Altroom", dominios: ["altroom.com.mx"] }),
  dmc({ id: "turisticos-poblanos", nombre: "Turísticos Poblanos", dominios: ["turisticospoblanos.com"] }),
  dmc({ id: "3htp", nombre: "3HTP", dominios: ["3htp.com"] }),
  dmc({ id: "mydmcplanet", nombre: "myDMCplanet", dominios: ["mydmcplanet.com"] }),
  dmc({ id: "jordan-experience", nombre: "Jordan Experience", correos: ["sales4@jordanexperience.com", "angelac7ballenc7@gmail.com"],
    dominios: ["jordanexperience.com"], zonaHoraria: "Asia/Amman", contacto: "Angela Ballén" }),
  dmc({ id: "mondial-trails", nombre: "Mondial Trails", correos: ["angela@mondialtrails.com"], dominios: ["mondialtrails.com"], contacto: "Angela Ballén" }),
  dmc({ id: "enjoy-travel-egipto", nombre: "Enjoy Travel Egipto", correos: ["mahmoud@enjoytravel-eg.com"], dominios: ["enjoytravel-eg.com"],
    zonaHoraria: "Africa/Cairo", contacto: "Mahmoud", notas: "Angela ya no está desde agosto." }),
  dmc({ id: "multitravel", nombre: "Multitravel", dominios: ["multitraveltours.org"], notas: "Vía Angela, sin hilo nuevo." }),
  dmc({ id: "asian-spirit", nombre: "Asian Spirit", dominios: ["asianspirit.co.th"], correosInvalidos: ["latamasianspirit@gmail.com"],
    zonaHoraria: "Asia/Bangkok", notas: "latamasianspirit@gmail.com rebotó el 6 nov 2026 (REQ-1565)." }),

  // Bloqueado: FREETOUR nunca entra a este flujo (regla B3, REQ-1294). Se carga para que la identificación lo descarte.
  plataforma({ id: "freetour", nombre: "FREETOUR", bloqueado: true, dominios: ["freetour.com"], notas: "Bloqueado: Mila nunca le escribe (B3)." }),
];

const q = (v: string | number | null): string => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);

// REQ-1656: SQL de la carga. Solo INSERT OR IGNORE: si el proveedor ya existe, no se toca.
export function sqlCarga(lista: ProveedorSemilla[], ahora: string): string {
  const cols = ["id", "nombre", "tipo", "publicado", "bloqueado", "etapa", "canal", "integracion", "cobro", "idioma", "contacto",
    "correos", "dominios", "correosInvalidos", "zonaHoraria", "notas", "createdAt", "updatedAt"];
  return lista.map((p) => {
    const vals = [p.id, p.nombre, p.tipo, p.publicado ? 1 : 0, p.bloqueado ? 1 : 0, "por_contactar", p.canal, p.integracion, p.cobro, p.idioma,
      p.contacto, JSON.stringify(p.correos), JSON.stringify(p.dominios), JSON.stringify(p.correosInvalidos), p.zonaHoraria, p.notas, ahora, ahora];
    return `INSERT OR IGNORE INTO "Proveedor" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${vals.map(q).join(",")});`;
  }).join("\n");
}

export function resumenCarga(lista: ProveedorSemilla[]) {
  return {
    total: lista.length,
    publicados: lista.filter((p) => p.publicado).length,
    enConversacion: lista.filter((p) => !p.publicado && !p.bloqueado).length,
    bloqueados: lista.filter((p) => p.bloqueado).length,
  };
}
