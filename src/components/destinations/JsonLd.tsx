import { serializeJsonLd } from '@/seo/lib/jsonld';

/** REQ-100: datos estructurados en el HTML servido. */
export function JsonLd({ data }: { data: unknown[] }) {
    return (
        <>
            {data.map((d, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(d) }} />
            ))}
        </>
    );
}
