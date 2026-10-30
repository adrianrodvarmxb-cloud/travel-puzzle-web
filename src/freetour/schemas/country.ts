import { z } from "zod";

const translated = z.object({
  en: z.string(),
  es: z.string(),
  pt: z.string(),
  de: z.string(),
  fr: z.string(),
  it: z.string(),
});

/** País tal como lo usa el sitio (data/countries.json). Campos extra se descartan. */
export const zCountry = z.object({
  id: z.number().int(),
  title: translated,
  shortTitle: z.string(),
  URLs: translated,
  image: z.string(),
  continent: translated,
});
export type Country = z.infer<typeof zCountry>;

/** Respuesta de GET /countries */
export const zCountriesResponse = z.object({
  data: z.array(zCountry),
  status: z.number(),
});
