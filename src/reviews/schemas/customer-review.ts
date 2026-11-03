import { z } from "zod";

/** Lo que manda el formulario de reseña (/reserva/[token]/resena). */
export const reviewInputSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
  rate: z.number().int().min(1).max(5),
  content: z.string().trim().max(2000).optional().default(""),
  consent: z.boolean().optional().default(false),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

/** Publicar u ocultar una reseña desde un enlace firmado. */
export const moderateInputSchema = z.object({
  id: z.string().min(1).max(64),
  action: z.enum(["publish", "hide"]),
  exp: z.number().int(),
  sig: z.string().min(10).max(200),
});
