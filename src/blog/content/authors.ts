/**
 * Autores del blog. Solo datos confirmados: el nombre de Claudia sale del texto vigente de /terminos.
 * Cargo, biografía, foto y perfiles quedan en null hasta que el PO los confirme (plan del blog, §7).
 * REQ-971, REQ-979: el agente diario firma como «Equipo editorial de Travel Puzzle» (Organization), sin persona inventada.
 */
import { agencyFacts } from "@/about/lib/content";

export interface Author {
  id: "claudia" | "editorial";
  kind: "Person" | "Organization";
  name: string;
  jobTitle: string | null;
  bio: string | null;
  photo: string | null;
  sameAs: string[];
}

export const AUTHORS: Record<Author["id"], Author> = {
  claudia: {
    id: "claudia",
    kind: "Person",
    name: agencyFacts().holder ?? "Claudia Leticia Rodríguez Laveaga",
    jobTitle: null, // [PO: cargo que se publica]
    bio: null, // [PO: biografía de 60 a 100 palabras]
    photo: null, // [PO: foto con permiso]
    sameAs: [], // [PO: LinkedIn u otros perfiles, si se publican]
  },
  editorial: {
    id: "editorial",
    kind: "Organization",
    name: "Equipo editorial de Travel Puzzle",
    jobTitle: null,
    bio: null,
    photo: null,
    sameAs: [],
  },
};
