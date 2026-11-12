import { z } from "zod";
import { parseEach } from "./schemas";
import { scrubProviderDescription, scrubProviderName } from "./text";

/**
 * `TourDetails` del listado (`includeDetails=true`) y de `GetTourDetailsList`. La ola 1 lo guarda tal
 * cual (`infoTourSchema.details: unknown`); aquí se valida lo único que necesita `Tour`:
 *
 *   Description      → TourTranslation.description  (sin el nombre del proveedor, REQ-3372)
 *   ShortDescription → TourTranslation.brief
 *   ListPictures     → Tour.images
 *
 * Los nombres de estos campos NO están verificados contra una respuesta real de Tangol (REQ-1546 sigue
 * abierto). Si la forma no coincide, el detalle se descarta, se cuenta y se registra: el tour queda con
 * la imagen de portada (`UrlHomePic`, sí verificada en la ola 1) y sin descripción, nunca con un error
 * (regla 8 del blindaje). Pura.
 */

const httpUrl = z
  .string()
  .regex(/^\s*https?:\/\//i)
  .transform((s) => s.trim());

/** Una imagen viene como URL suelta o dentro de un objeto; cualquier otra forma se descarta y se cuenta. */
const pictureSchema = z.union([
  httpUrl,
  z.object({ UrlPic: httpUrl }).transform((p) => p.UrlPic),
  z.object({ Url: httpUrl }).transform((p) => p.Url),
]);

const detailsSchema = z
  .object({
    Description: z.string().nullish(),
    ShortDescription: z.string().nullish(),
    ListPictures: z.unknown().optional(),
  })
  .transform((d) => ({ description: d.Description ?? null, brief: d.ShortDescription ?? null, pictures: d.ListPictures }));

export interface TangolDetails {
  description: string | null;
  brief: string | null;
  images: string[];
  /** Registros malos del detalle (el bloque completo o cada imagen suelta). */
  discarded: number;
}

const EMPTY: TangolDetails = { description: null, brief: null, images: [], discarded: 0 };

// REQ-3370, REQ-3371
export function parseTourDetails(raw: unknown): TangolDetails {
  if (raw === null || raw === undefined) return { ...EMPTY };
  const parsed = detailsSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[tangol] detalle del tour descartado: la forma no coincide con TourDetails");
    return { ...EMPTY, discarded: 1 };
  }
  const pics = parseEach(pictureSchema, parsed.data.pictures);
  const images: string[] = [];
  for (const url of pics.items) if (!images.includes(url)) images.push(url);
  return {
    description: scrubProviderDescription(parsed.data.description),
    brief: scrubProviderName(parsed.data.brief) || null,
    images,
    discarded: pics.discarded,
  };
}
