import type { Metadata } from 'next';
import type { PageMeta } from './lib/page-model';

/** REQ-089/099/101: title absoluto, canonical propio y noindex (follow) cuando la página no se indexa. */
export function toMetadata(m: PageMeta, image?: string | null): Metadata {
    return {
        title: { absolute: m.title },
        description: m.description,
        alternates: { canonical: m.canonical },
        ...(m.index ? {} : { robots: { index: false, follow: true } }),
        openGraph: { type: 'website', title: m.title, description: m.description, url: m.canonical, ...(image?.startsWith('https://') ? { images: [{ url: image }] } : {}) },
    };
}
