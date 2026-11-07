/**
 * Autores del blog. Solo datos confirmados: el nombre sale del texto vigente de /terminos.
 * Cargo, biografía, foto y perfiles quedan en null hasta que el PO los confirme (plan del blog, §7).
 */
import { agencyFacts } from "@/about/lib/content";

export interface Author { id: "claudia"; name: string; jobTitle: string | null; bio: string | null; photo: string | null; sameAs: string[] }

export const AUTHORS: Record<Author["id"], Author> = {
  claudia: {
    id: "claudia",
    name: agencyFacts().holder ?? "Claudia Leticia Rodríguez Laveaga",
    jobTitle: null, // [PO: cargo que se publica]
    bio: null, // [PO: biografía de 60 a 100 palabras]
    photo: null, // [PO: foto con permiso]
    sameAs: [], // [PO: LinkedIn u otros perfiles, si se publican]
  },
};
