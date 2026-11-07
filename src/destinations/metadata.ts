import type { Metadata } from 'next';
import type { PageMeta } from './lib/page-model';
import { ogLocale } from '@/i18n/lib/locales';

/**
 * REQ-089/099/101: title absoluto, canonical propio y noindex (follow) cuando la página no se indexa.
 * REQ-660 REQ-664 (Gate 3): con `hreflang` (LOCALE_URLS_ENABLED y ruta en alcance), alternates por idioma y og:locale
 * del idioma de la URL. Sin él, igual que antes: nunca se anuncian URLs /en/... que con la bandera apagada no existen.
 */
export function toMetadata(m: PageMeta, image?: string | null, o: { hreflang?: boolean } = {}): Metadata {
    const languages = o.hreflang && m.index && m.languages ? m.languages : null;
    return {
        title: { absolute: m.title },
        description: m.description,
        alternates: { canonical: m.canonical, ...(languages ? { languages } : {}) },
        ...(m.index ? {} : { robots: { index: false, follow: true } }),
        openGraph: {
            type: 'website', title: m.title, description: m.description, url: m.canonical,
            ...(o.hreflang && m.lang ? { locale: ogLocale(m.lang) } : {}),
            ...(image?.startsWith('https://') ? { images: [{ url: image }] } : {}),
        },
    };
}
