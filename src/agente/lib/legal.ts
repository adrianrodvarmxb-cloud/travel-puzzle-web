// Puro · REQ-3348: términos, aviso de privacidad y datos de la empresa para el agente (Mila), del texto vigente del sitio.
import { normalize } from "@/help/lib/faq";
import { slug } from "@/legal/lib/blocks";

export interface SeccionLegal { documento: "terminos" | "privacidad"; titulo: string; texto: string; enlace: string }

// REQ-3348: razón social, nombre comercial, domicilio, RNT y contrato PROFECO (primer párrafo de los términos).
export const datosEmpresa = (terminos: string): string => terminos.split("\n")[0].trim();

function secciones(texto: string, documento: SeccionLegal["documento"], base: string): SeccionLegal[] {
  return texto.split("\n## ").slice(1).map((b) => {
    const [titulo, ...resto] = b.split("\n");
    return { documento, titulo: titulo.trim(), texto: resto.join("\n").trim().slice(0, 1500), enlace: `${base.replace(/\/$/, "")}/${documento}#${slug(titulo.trim())}` };
  });
}

const VACIAS = new Set("que como cual donde cuando para por con sin los las del una mis puedo hacen tienen quiero saber".split(" "));
const raiz = (w: string) => (w.length > 5 ? w.slice(0, 5) : w);

// REQ-3348: las secciones que mejor responden (máximo 3), más los datos de la empresa.
export function consultaLegal(q: string, docs: { terminos: string; privacidad: string }, base: string): { empresa: string; secciones: SeccionLegal[] } {
  const w = normalize(q).split(/[^a-z0-9]+/).filter((x) => x.length >= 4 && !VACIAS.has(x)).map(raiz);
  const todas = [...secciones(docs.terminos, "terminos", base), ...secciones(docs.privacidad, "privacidad", base)];
  const conPuntos = todas.map((s) => {
    const t = normalize(s.titulo), c = normalize(s.texto);
    return { s, p: w.reduce((n, x) => n + (t.includes(x) ? 3 : 0) + (c.includes(x) ? 1 : 0), 0) };
  });
  return { empresa: datosEmpresa(docs.terminos), secciones: conPuntos.filter((x) => x.p > 0).sort((a, b) => b.p - a.p).slice(0, 3).map((x) => x.s) };
}
