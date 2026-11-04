/**
 * Errores del navegador (INC-001, acción correctiva). Lógica pura: validación del reporte
 * y textos de la pantalla de error. Sin I/O.
 */
import { z } from "zod";

export interface ClientErrorReport {
  message: string;
  stack: string;
  path: string;
  /** window | promise | section:<nombre> | page | global | unknown */
  source: string;
  /** digest de Next (sirve para cruzar con el log del servidor) */
  digest: string;
}

const cut = (n: number) => z.string().transform((s) => s.slice(0, n));

const schema = z.object({
  message: z.string().min(1).transform((s) => s.slice(0, 500)),
  stack: cut(4000).optional().default(""),
  path: z.string().max(500).regex(/^\//).optional().default("/"),
  source: cut(60).optional().default("unknown"),
  digest: cut(100).optional().default(""),
});

// REQ-029
export function parseClientError(input: unknown): ClientErrorReport | null {
  const r = schema.safeParse(input);
  return r.success ? r.data : null;
}

export interface ErrorScreenText { title: string; body: string; retry: string; home: string; help: string }

const TEXT: Record<string, ErrorScreenText> = {
  es: { title: "Algo no cargó bien", body: "Ya nos llegó el aviso y lo estamos revisando. Intenta de nuevo o vuelve al inicio.", retry: "Intentar de nuevo", home: "Ir al inicio", help: "¿Necesitas ayuda? Escríbenos por WhatsApp" },
  en: { title: "Something didn't load", body: "We've been notified and are looking into it. Try again or go back home.", retry: "Try again", home: "Go to home", help: "Need help? Message us on WhatsApp" },
  pt: { title: "Algo não carregou bem", body: "Já fomos avisados e estamos verificando. Tente de novo ou volte ao início.", retry: "Tentar de novo", home: "Ir ao início", help: "Precisa de ajuda? Fale conosco no WhatsApp" },
  fr: { title: "Quelque chose n'a pas chargé", body: "Nous avons été prévenus et nous vérifions. Réessayez ou revenez à l'accueil.", retry: "Réessayer", home: "Accueil", help: "Besoin d'aide ? Écrivez-nous sur WhatsApp" },
  de: { title: "Etwas wurde nicht geladen", body: "Wir wurden benachrichtigt und prüfen es. Versuche es erneut oder gehe zur Startseite.", retry: "Erneut versuchen", home: "Zur Startseite", help: "Brauchst du Hilfe? Schreib uns auf WhatsApp" },
  it: { title: "Qualcosa non si è caricato", body: "Abbiamo ricevuto l'avviso e stiamo verificando. Riprova o torna alla home.", retry: "Riprova", home: "Vai alla home", help: "Serve aiuto? Scrivici su WhatsApp" },
};

// REQ-028
export function errorScreenText(lang: string | undefined): ErrorScreenText {
  return TEXT[lang ?? ""] ?? TEXT.es;
}
