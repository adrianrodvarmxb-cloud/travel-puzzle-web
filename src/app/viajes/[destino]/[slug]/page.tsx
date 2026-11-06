import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { loadTripBySlug } from '@/trips/public-load';
import { tripPath } from '@/trips/lib/public';
import { TripDetailView, tripMetadata } from '@/components/trips/TripDetailView';
import { leerPrellenado } from '@/agente/lib/catalogo';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ destino: string; slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const data = await loadTripBySlug(slug);
    if (!data) return {};
    return tripMetadata(data, tripPath(data.trip));
}

/**
 * Ficha pública de un viaje propio o de agencia (punto 17, ola 2). El contenido vive en TripDetailView.
 * Con PRIMERA_PIEZA_ENABLED y la ciudad con slug, el middleware manda esta URL con 301 a /destinos (gate 4).
 */
export default async function TripPage({ params, searchParams }: Props) {
    const { destino, slug } = await params;
    const data = await loadTripBySlug(slug);
    if (!data) notFound();
    const path = tripPath(data.trip);
    if (path !== `/viajes/${destino}/${slug}`) permanentRedirect(path);
    // REQ-150: la liga del agente de WhatsApp llega con fecha y personas; solo se usan valores válidos.
    const prellenado = leerPrellenado((await searchParams) ?? {});
    return <TripDetailView data={data} path={path} prellenado={prellenado} />;
}
