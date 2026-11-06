/**
 * REQ-284: alias curados (data/search-aliases.json) y lista de nombres cortos que chocan. Puro.
 * El archivo se valida con Zod en el test y en el build (src/scripts/search-index.ts); una fila inválida se descarta.
 */
import { z } from "zod";
import { fold } from "./normalize";
import { buildSymspellIndex, deserializeIndex, serializeIndex, type SymspellIndex, type SymspellJson } from "./symspell";
import { MAX_TYPOS } from "./threshold";

export const AliasRowSchema = z.object({
  alias: z.string().min(1),
  to: z.array(z.string().min(1)).min(1),
  note: z.string().min(1),
});
export const AliasFileSchema = z.object({
  version: z.literal(1),
  comment: z.string().optional(),
  aliases: z.array(z.unknown()),
  noCorrect: z.array(z.string().min(1)),
});
export type AliasRow = z.infer<typeof AliasRowSchema>;

export interface CuratedAliases {
  /** alias plegado → destinos plegados en orden de preferencia */
  aliases: Map<string, string[]>;
  /** nombres plegados que nunca se corrigen solos */
  noCorrect: Set<string>;
  /** filas descartadas (para registrarlas) */
  rejected: number;
  /** REQ-282: índice SymSpell de los alias (generado en el build) para alias con errata («Cuzko» → Cusco) */
  index?: SymspellIndex;
}

/** REQ-282: lo que genera el build (src/search/data/search-index.generated.json). Determinista. */
export interface CuratedArtifact { v: 1; aliases: [string, string[]][]; noCorrect: string[]; rejected: number; index: SymspellJson }

// REQ-282
export function buildCuratedArtifact(raw: unknown): CuratedArtifact {
  const c = parseAliases(raw);
  const aliases = [...c.aliases.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return { v: 1, aliases, noCorrect: [...c.noCorrect].sort(), rejected: c.rejected, index: serializeIndex(buildSymspellIndex(c.aliases.keys(), MAX_TYPOS)) };
}

// REQ-282
export function curatedFromArtifact(a: CuratedArtifact): CuratedAliases {
  return { aliases: new Map(a.aliases), noCorrect: new Set(a.noCorrect), rejected: a.rejected, index: deserializeIndex(a.index) };
}

// REQ-284
export function parseAliases(raw: unknown): CuratedAliases {
  const file = AliasFileSchema.safeParse(raw);
  if (!file.success) return { aliases: new Map(), noCorrect: new Set(), rejected: 1 };
  const aliases = new Map<string, string[]>();
  let rejected = 0;
  for (const r of file.data.aliases) {
    const row = AliasRowSchema.safeParse(r);
    const key = row.success ? fold(row.data.alias) : "";
    if (!row.success || !key || aliases.has(key)) { rejected++; continue; }
    aliases.set(key, row.data.to.map(fold).filter(Boolean));
  }
  return { aliases, noCorrect: new Set(file.data.noCorrect.map(fold).filter(Boolean)), rejected };
}

/** Primer destino del alias que existe en el catálogo (null si ninguno: el alias no hace nada). */
// REQ-284
export function aliasTarget(c: CuratedAliases, alias: string, exists: (name: string) => boolean): string | null {
  for (const t of c.aliases.get(fold(alias)) ?? []) if (exists(t)) return t;
  return null;
}
