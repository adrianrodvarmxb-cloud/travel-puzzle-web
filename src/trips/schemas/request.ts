import { z } from "zod";

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const base = {
  tripId: z.string().min(1).max(40),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().min(7).max(30).regex(/^[+\d\s()-]+$/),
  adults: z.number().int().min(1).max(99),
  children: z.number().int().min(0).max(99).default(0),
  infants: z.number().int().min(0).max(20).default(0),
  childAges: z.array(z.number().int().min(0).max(17)).max(99).default([]),
  hotel: z.string().trim().max(160).default(""),
  comments: z.string().trim().max(2000).default(""),
  consent: z.literal(true),
  language: z.string().max(5).default("es"),
  /** Campo trampa contra bots: debe llegar vacío. */
  website: z.string().max(0).default(""),
};

/** Formulario de la ficha: reserva (tour/circuito/experiencia) o viaje personalizado. */
export const requestInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("reserva"), date: z.string().regex(DATE), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).or(z.literal("")), optionId: z.string().max(40).default(""), ...base }),
  z.object({ kind: z.literal("personalizado"), startDate: z.string().regex(DATE), endDate: z.string().regex(DATE), serviceType: z.enum(["group", "private"]), ...base }),
]).refine((r) => r.childAges.length === r.children, { message: "Indica la edad de cada niño", path: ["childAges"] })
  .refine((r) => r.kind !== "personalizado" || r.startDate <= r.endDate, { message: "La fecha de fin es antes del inicio", path: ["endDate"] });

export type RequestInput = z.infer<typeof requestInputSchema>;
