/**
 * Traduce un viaje a un idioma con la IA (Workers AI). Lotes chicos; si un lote falla
 * sigue con los demás. Dependencias por parámetro.
 */
import { sourceStrings, planTranslation, applyTranslations, buildPrompt, parseModelOutput, chunk, protectTerms, restoreTerms, type TargetLang, type Translations } from "./lib/translation";

type Messages = ReturnType<typeof buildPrompt>;
interface Deps {
  load(id: string): Promise<{ trip: Parameters<typeof sourceStrings>[0]; translations: Translations } | null>;
  save(id: string, t: Translations): Promise<void>;
  /** Devuelve el texto de respuesta del modelo. */
  ai(messages: Messages): Promise<string>;
}

export const TRANSLATION_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export async function translateTripLang(id: string, lang: TargetLang, d: Deps, opts: { force?: boolean } = {}): Promise<{ ok: boolean; translated: number; pending: number }> {
  const data = await d.load(id);
  if (!data) return { ok: false, translated: 0, pending: 0 };
  const source = sourceStrings(data.trip);
  // force: vuelve a traducir todo lo que no esté editado a mano.
  const todo = opts.force ? Object.keys(source).filter((k) => !data.translations[lang]?.[k]?.manual) : planTranslation(source, data.translations[lang]).todo;
  if (!todo.length) {
    // Igual se limpian llaves que ya no existen.
    await d.save(id, applyTranslations(data.translations, lang, {}, source));
    return { ok: true, translated: 0, pending: 0 };
  }
  const results: Record<string, string> = {};
  let failed = false;
  // Glosario: "Travel Puzzle" y "Free tour" viajan como marcadores y se reponen tal cual.
  const protectedItems = Object.fromEntries(todo.map((k) => [k, protectTerms(source[k])]));
  for (const batch of chunk(Object.fromEntries(todo.map((k) => [k, protectedItems[k].text])), 15, 5000)) {
    try {
      const raw = parseModelOutput(await d.ai(buildPrompt(lang, batch)), Object.keys(batch));
      for (const [k, v] of Object.entries(raw)) {
        const restored = restoreTerms(v, protectedItems[k].terms);
        if (restored !== null) results[k] = restored;
      }
    } catch (error) {
      failed = true;
      console.error(`[traducción] ${id} ${lang}:`, (error as Error).message);
    }
  }
  await d.save(id, applyTranslations(data.translations, lang, results, source));
  const translated = Object.keys(results).length;
  return { ok: !failed && translated === todo.length, translated, pending: todo.length - translated };
}
