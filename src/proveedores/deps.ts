// I/O · arma las dependencias reales (D1, Resend y cPanel) desde el entorno. Solo lo usan las rutas.
import { getPrisma } from "@/lib/prisma";
import { sendEmail } from "@/notifications/resend";
import { createProveedoresRepo, dbDePrisma } from "./repository";
import { subirDocumento } from "./cpanel";
import { COPIAS, REMITENTE, type Correo } from "./lib/correo";
import { createBorradoresRepo } from "./borrador-repo";
import { modoBorradores } from "./lib/borradores"; // REQ-10762
import { dejarBorrador } from "./borradores";
import { createTarifasRepo } from "./tarifa-repo";
import { createContactoRepo } from "./contacto-repo";
import type { DepsTarifa } from "./tarifa";
import type { MarkupRates } from "../trips/lib/markup";
import { priceFrom } from "../trips/lib/pricing";

// REQ-1291: todo detrás de PROVEEDORES_MILA_ON (apagada hasta que el PO apruebe las plantillas).
export const proveedoresEncendido = (env: Record<string, string | undefined>) => env.PROVEEDORES_MILA_ON === "true";

export function proveedoresDeps(env: Record<string, string | undefined>) {
  const db = dbDePrisma(getPrisma() as never);
  const repo = createProveedoresRepo(db);
  const contacto = createContactoRepo(db); // REQ-3430: lista compartida con la revisión cada 6 h
  const enviar = async (c: Correo) => {
    const id = await sendEmail({ apiKey: env.RESEND_API_KEY ?? "", fetch }, { from: c.from, to: c.to[0], subject: c.subject, text: c.text, html: "", cc: c.cc, replyTo: "comercial@travelpuzzle.com.mx", ...(c.inReplyTo && { headers: { "In-Reply-To": c.inReplyTo, References: c.inReplyTo } }) });
    return `<${id}@resend.dev>`;
  };
  const subir = (ruta: string, contenido: Uint8Array, tipo: string) =>
    subirDocumento({ host: env.CPANEL_HOST ?? "", user: env.CPANEL_USER ?? "", token: env.CPANEL_TOKEN ?? "", fetch }, ruta, contenido, tipo);
  // REQ-1568, REQ-1663: el sitio no tiene WhatsApp; le pide a Mila (zoefel-mila) que mande el aviso desde el número de Travel Puzzle.
  const avisar = async (numero: string, texto: string) => {
    const res = await fetch(env.MILA_AVISOS_URL ?? "", { method: "POST", headers: { authorization: `Bearer ${env.MILA_AVISOS_SECRET ?? ""}`, "content-type": "application/json" },
      body: JSON.stringify({ negocio: "travel-puzzle", numero, texto, plantilla: "resumen_proveedores" }) });
    if (!res.ok) throw new Error(`avisos ${res.status}`);
  };
  const destinos = (env.RESUMEN_DESTINOS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  // REQ-10693: nunca directo. El borrador queda en la bandeja del sitio (D1, migración 0034; /admin/borradores) y sale por
  // Resend a su hora desde el cron. Solo con PROVEEDORES_BORRADORES_ON; apagada, la revisión se detiene (nunca envía).
  const po = env.TARIFAS_AVISO_A || destinos[0];
  const avisoCorreo = (env.PROVEEDORES_AVISO_EMAIL ?? "adrianrodvar@travelpuzzle.com.mx").split(",").map((x) => x.trim()).filter((x) => x.includes("@"));
  // Aviso interno al PO: WhatsApp por el puente de Mila si está configurado; si no (o si falla), correo interno a adrianrodvar@ con copia a Claudia.
  const avisarPO = async (asunto: string, texto: string) => {
    if (env.MILA_AVISOS_URL && po) { try { await avisar(po, texto); return; } catch { /* cae al correo */ } }
    await enviar({ from: REMITENTE, to: [avisoCorreo[0] ?? COPIAS[1]], cc: COPIAS.filter((c) => c !== (avisoCorreo[0] ?? COPIAS[1])), subject: asunto, text: texto });
  };
  const borradores = createBorradoresRepo(db);
  const borrador = borradoresEncendido(env)
    ? async (c: Correo, p: { proveedorId: string; proveedor: string; tipo: string; enviarEn: string; zonaHoraria?: string }) =>
        dejarBorrador(c, p, { repo: borradores, enviar, hoy: new Date().toISOString(), siteUrl: env.SITE_URL ?? "https://travelpuzzle.com.mx", avisarPO, log: console.log, modo: modoBorradores(env) /* REQ-10762 */ })
    : undefined;
  return { repo, enviar, subir, avisar, destinos, contacto, borrador, borradores, avisarPO };
}

/** REQ-10693: la bandeja de borradores programados; exige la migración 0034 aplicada. */
export const borradoresEncendido = (env: Record<string, string | undefined>) => env.PROVEEDORES_BORRADORES_ON === "true";

// REQ-1672: márgenes desde el secreto MARKUP_RATES (JSON {"pct":{"programa":…,"tour":…,"privado":…,"traslado":…},"minTourUsd":…}); no viven en el repo (REQ-038).
export function leerRates(raw?: string): MarkupRates | null {
  try {
    const v = JSON.parse(raw ?? "");
    const ok = ["programa", "tour", "privado", "traslado"].every((k) => Number.isFinite(v?.pct?.[k]) && v.pct[k] >= 0) && Number.isFinite(v?.minTourUsd);
    return ok ? v : null;
  } catch { return null; }
}

type OpcionGuardada = { id: string; adult: number | null };

// REQ-1672, REQ-1580: dependencias reales del cambio de tarifa.
export function tarifaDeps(env: Record<string, string | undefined>, hoy = new Date().toISOString()): DepsTarifa & { proveedor: (id: string) => Promise<import("./repository").ProveedorFila | null> } {
  const base = proveedoresDeps(env);
  const prisma = getPrisma();
  // El aviso va al PO (primer número de RESUMEN_DESTINOS o TARIFAS_AVISO_A), solo con el puente de Mila configurado (REQ-1663).
  const po = env.TARIFAS_AVISO_A || base.destinos[0];
  return {
    repo: createTarifasRepo(dbDePrisma(prisma as never)), enviar: base.enviar, hoy, rates: leerRates(env.MARKUP_RATES), nuevoId: () => crypto.randomUUID(), log: console.log,
    avisarPO: env.MILA_AVISOS_URL && po ? (texto: string) => base.avisar(po, texto) : undefined,
    async precioOpcion(tripId, optionId) {
      const t = await prisma.trip.findUnique({ where: { id: tripId }, select: { currency: true, options: true } });
      const o = ((t?.options ?? []) as OpcionGuardada[]).find((x) => x.id === optionId);
      return t && o ? { moneda: t.currency, adult: o.adult } : null;
    },
    async guardarPrecio(tripId, optionId, adult) {
      const t = await prisma.trip.findUnique({ where: { id: tripId }, select: { options: true } });
      const options = ((t?.options ?? []) as OpcionGuardada[]).map((o) => (o.id === optionId ? { ...o, adult } : o));
      await prisma.trip.update({ where: { id: tripId }, data: { options, priceFrom: priceFrom(options) } });
    },
    proveedor: async (id) => (await base.repo.todos()).find((p) => p.id === id) ?? null,
  };
}
