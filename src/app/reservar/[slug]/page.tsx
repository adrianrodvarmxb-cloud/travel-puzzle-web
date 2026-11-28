import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getRouteLanguage } from '@/i18n/server';
import { Navbar } from '@/components/layout/Navbar';
import { SiteFooter } from '@/components/home/v2/SiteFooter';
import { siteFooterFromEnv } from '@/layout/lib/site-footer';
import { AdvisorLink } from '@/components/ficha/panel/AdvisorLink';
import { FlowStepper } from '@/components/reserva/FlowStepper';
import { bookingFlow, bookingFlowUnicoOn } from '@/booking/lib/flow';
import { flowPage } from '@/booking/lib/flow-page';
import type { FichaLang } from '@/ficha/lib/model';
import { advisorLinkView } from '@/ficha/lib/panel-view';
import { readBooking } from '@/ficha/lib/readers/booking';
import { pageFlags } from '@/ficha/page';
import { loadTourFicha, tourFichaDeps } from '@/ficha/source-tour';

/**
 * REQ-10958 · Ola 8, paso de reserva único, PR 2: la página `/reservar/<slug>` tras `BOOKING_FLOW_UNICO_ENABLED`
 * ("false" en producción: la ruta no existe, 404; "preview" solo en versiones sin tráfico). Orquesta y no calcula:
 * 1. la bandera y el host deciden si la página existe (`bookingFlowUnicoOn`);
 * 2. el modelo de la ficha sale de `loadTourFicha` (REQ-10844: esquema, mínimo de calidad; otro proveedor o tour
 *    retirado → 404), el lector de la página de reserva (`readBooking`, REQ-10826) y el plan del flujo (`bookingFlow`);
 * 3. `flowPage` arma los pasos, el actual y el resumen; los cuerpos de los pasos llegan registrados por props y hoy
 *    no hay ninguno: todo cae al asesor (el calendario de Tangol es el PR 3 y el cobro con Stripe el PR 4). Nada cobra.
 * Solo tours (`Tour`); los viajes de agencia y Big Bus (`Trip`) entran cuando su cuerpo exista.
 */
export const dynamic = 'force-dynamic';

const BACK: Record<FichaLang, string> = { es: 'Volver a la ficha', en: 'Back to the experience', pt: 'Voltar à ficha', fr: 'Retour à la fiche', de: 'Zurück zur Übersicht', it: 'Torna alla scheda' };
const LANGS: readonly FichaLang[] = ['es', 'en', 'pt', 'fr', 'de', 'it'];

interface Props { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ReservarPage({ params, searchParams }: Props) {
    const env = process.env as Record<string, string | undefined>;
    const h = await headers();
    if (!bookingFlowUnicoOn(env, h.get('host'))) notFound();

    const { slug } = await params;
    const query = (await searchParams) ?? {};
    const language = await getRouteLanguage();
    const lang = (LANGS as readonly string[]).includes(language) ? (language as FichaLang) : 'es';

    const deps = await tourFichaDeps();
    const { load, path } = await loadTourFicha(deps, slug, lang);
    if (!load.ok || !path) notFound();
    const f = load.ficha;

    const flags = pageFlags(env);
    const read = readBooking(f, { path, flags: { bookings: flags.bookings, paidTours: flags.paidTours, directPurchase: flags.directPurchase }, query });
    const flow = bookingFlow({ provider: f.provider, booking: f.booking, price: f.price }, read.panel, { unified: true });
    const page = flowPage({ read, flow, lang, slug, query });
    const advisor = advisorLinkView(f, { whatsapp: env.WHATSAPP_NUMBER?.trim() || null, prefill: read.prefill, milaEnabled: flags.milaEnabled });

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="tp-dark py-8">
                <FlowStepper page={page} lang={lang} bodies={{}} fallback={<AdvisorLink view={advisor} />} backLabel={BACK[lang]} />
            </main>
            <SiteFooter {...siteFooterFromEnv(env)} />
        </div>
    );
}
