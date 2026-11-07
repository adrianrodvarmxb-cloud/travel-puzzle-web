/**
 * REQ-039: carga masiva de viajes de un operador (Inca World, nov 2026) a D1 como SQL. Puro.
 * Reutiliza las mismas reglas del gestor: código (gate H), slug, "Desde" y lista de publicación.
 * Idempotente: el id y el código salen del orden y la referencia del operador, así que volver a correrlo actualiza.
 */
import { tripCode } from "./code";
import { slugify } from "./trip";
import { priceFrom } from "./pricing";
import { publishChecklist } from "./publish";
import type { TripInput } from "../schemas/trip";
import { tripFormatDecision } from "@/tours/lib/card-format";
import { DEFAULT_DICTIONARY } from "@/taxonomy/data";
import { DUDA } from "@/taxonomy/lib/format";

/** REQ-1348: formatos del diccionario con los que un viaje se puede publicar (activos; nunca por-revisar ni fuera). */
const FORMATOS_PUBLICABLES = new Set(DEFAULT_DICTIONARY.terminos.filter((t) => t.eje === "formato" && t.estado === "activo" && !["por-revisar", "fuera"].includes(t.slug)).map((t) => t.slug));

export interface ImportRow {
  ref: string; // referencia del operador, p. ej. "LIM-01"
  status: "draft" | "published";
  trip: TripInput; // ya validado con tripInputSchema
}
export interface ImportAgency { id: string; name: string; initials: string; contactName?: string; email?: string; phone?: string; notes?: string }
export interface ImportResult {
  sql: string[];
  /** REQ-1348: formato del diccionario y si va a la lista de dudas del PO (sin formato, o decidido sin señal). */
  report: { ref: string; code: string; slug: string; status: string; missing: string[]; formato: string; duda: boolean }[];
}

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return `'${s.replace(/'/g, "''")}'`;
};

/** Escribe la fecha con el mismo formato que ya usa la base (Prisma + D1), tomando una fila existente como muestra. */
export function formatLike(sample: unknown, d: Date): string | number {
  if (typeof sample === "number") return d.getTime();
  const s = typeof sample === "string" ? sample : "";
  const iso = d.toISOString();
  if (/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(s)) return iso.slice(0, 19).replace("T", " ");
  if (s.endsWith("+00:00")) return iso.replace("Z", "+00:00");
  return iso;
}

export function idFor(initials: string, ref: string): string {
  return `${initials}-${ref}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** seqStart: primer consecutivo de esta tanda (cada archivo de carga usa su propio rango para no chocar códigos). */
export function buildImportSql(rows: ImportRow[], agency: ImportAgency, now: string | number, seqStart = 1): ImportResult {
  const sql: string[] = [];
  const report: ImportResult["report"] = [];
  sql.push(
    `INSERT INTO "Agency" ("id","name","initials","contactName","email","phone","notes","isActive","createdAt","updatedAt") VALUES (` +
      [agency.id, agency.name, agency.initials, agency.contactName ?? "", agency.email ?? "", agency.phone ?? "", agency.notes ?? "", true, now, now].map(q).join(",") +
      `) ON CONFLICT("name") DO UPDATE SET "contactName"=excluded."contactName","email"=excluded."email","phone"=excluded."phone","notes"=excluded."notes","updatedAt"=excluded."updatedAt";`,
  );
  const agencyRef = `(SELECT "id" FROM "Agency" WHERE "name"=${q(agency.name)})`;

  rows.forEach((row, i) => {
    const t = row.trip;
    const seq = seqStart + i;
    const code = tripCode({ initials: agency.initials, countries: t.countries, kind: t.kind, durationDays: t.durationDays, seq });
    const slug = slugify(t.titleEs, code);
    const missing = row.status === "published" ? publishChecklist(t) : [];
    // REQ-1348: sin formato del diccionario no se publica; queda en borrador y va a dudas.
    const f = tripFormatDecision({ kind: t.kind, priceFrom: priceFrom(t.options), durationDays: t.durationDays, titles: [t.titleEs, t.titleEn], resumen: t.summaryEs });
    const sinFormato = !FORMATOS_PUBLICABLES.has(f.valor);
    if (sinFormato && row.status === "published") missing.push(`formato del diccionario (${f.valor}: ${f.regla})`);
    const status = missing.length ? "draft" : row.status;
    report.push({ ref: row.ref, code, slug, status, missing, formato: f.valor, duda: sinFormato || f.regla.startsWith(DUDA) });

    const cols: Record<string, unknown> = {
      id: idFor(agency.initials, row.ref), slug, code, kind: t.kind, purchaseMode: t.purchaseMode, status,
      titleEs: t.titleEs, titleEn: t.titleEn, summaryEs: t.summaryEs, summaryEn: t.summaryEn,
      descriptionEs: t.descriptionEs, descriptionEn: t.descriptionEn, countries: t.countries, cities: t.cities,
      durationDays: t.durationDays, priceFrom: priceFrom(t.options), currency: t.currency, priceNote: t.priceNote,
      dates: t.dates, meetingPoints: t.meetingPoints, hotelPickup: t.hotelPickup, itinerary: t.itinerary,
      includes: t.includes, excludes: t.excludes, visaInfo: t.visaInfo, images: t.images,
      seq, codeLocked: status === "published", category: t.category, highlights: t.highlights,
      importantInfo: t.importantInfo, whatToBring: t.whatToBring, accessibility: t.accessibility, difficulty: t.difficulty,
      flightsIncluded: t.flightsIncluded, languages: t.languages, minPax: t.minPax, maxPax: t.maxPax,
      options: t.options, extras: t.extras, availability: t.availability, minNoticeHours: t.minNoticeHours,
      cancellation: t.cancellation, endPoint: t.endPoint, videoUrl: t.videoUrl, videoCaption: t.videoCaption,
      createdAt: now, updatedAt: now,
    };
    const names = Object.keys(cols);
    const keep = new Set(["id", "code", "createdAt"]); // no se pisan al actualizar; translations tampoco
    const update = names.filter((n) => !keep.has(n)).map((n) => `"${n}"=excluded."${n}"`).join(",");
    sql.push(
      `INSERT INTO "Trip" (${names.map((n) => `"${n}"`).join(",")},"agencyId","translations") VALUES (` +
        `${names.map((n) => q(cols[n])).join(",")},${agencyRef},'{}') ON CONFLICT("code") DO UPDATE SET ${update},"agencyId"=excluded."agencyId";`,
    );
  });
  return { sql, report };
}
