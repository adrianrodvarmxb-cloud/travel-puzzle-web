import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadManageView } from '@/booking/manage';
import { manageDeps } from '@/booking/manage-deps';
import { getTourSummary, contactFromEnv } from '@/booking/tour-summary';
import { describeBooking, mapsUrlFor, meetingPointText } from '@/notifications/lib/booking-email';
import { whatsappUrl } from '@/notifications/lib/email-layout';
import { getPrisma } from '@/lib/prisma';
import { CancelBooking } from './CancelBooking';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mi reserva · Travel Puzzle', robots: { index: false, follow: false } };

const STATUS: Record<string, { label: string; className: string }> = {
    active: { label: 'Confirmada', className: 'bg-green-100 text-green-800' },
    canceled: { label: 'Cancelada', className: 'bg-yellow-100 text-yellow-900' },
    rejected: { label: 'Rechazada por el organizador', className: 'bg-red-100 text-red-800' },
};

export default async function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const view = await loadManageView(token, manageDeps());
    if (!view) notFound();

    const { record, status, canCancel, offline } = view;
    const tour = record.tourExternalId ? await getTourSummary(getPrisma(), record.tourExternalId, 'es').catch(() => null) : null;
    const { when, people, tourLang } = describeBooking('es', { ...record, tourLanguage: record.language });
    const meeting = meetingPointText(tour?.meetingPoint, 'es');
    const maps = mapsUrlFor(tour?.meetingPoint);
    const contact = contactFromEnv(process.env as Record<string, string | undefined>);
    const wa = whatsappUrl(contact.whatsapp, `Hola Travel Puzzle, tengo la reserva ${record.refNumber} y tengo una duda.`);
    const badge = STATUS[status] ?? { label: status, className: 'bg-gray-100 text-gray-800' };
    const rows: [string, string | null][] = [
        ['Cuándo', when],
        ['Quiénes', people],
        ['Idioma del tour', tourLang],
        ['Duración', tour?.duration ?? null],
        ['Organiza', tour?.provider ?? null],
        ['Punto de encuentro', meeting],
    ];

    return (
        <main className="min-h-screen bg-[#EEF4FF] px-4 py-8">
            <div className="mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-sm">
                {tour?.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tour.imageUrl} alt={tour.title} className="h-56 w-full object-cover" />
                )}
                <div className="bg-gradient-to-br from-[#0A1330] via-[#14214D] to-[#304A9F] p-6 text-white">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                    <h1 className="mt-3 text-2xl font-bold leading-tight">{tour?.title ?? `Free tour ${record.tourExternalId ?? ''}`}</h1>
                    <p className="mt-1 text-sm text-[#C9D6F5]">Reserva a nombre de {record.firstName} {record.lastName}</p>
                    <p className="mt-4 font-mono text-xs uppercase tracking-widest text-[#9AAEE0]">Número de reserva</p>
                    <p className="font-mono text-xl font-bold tracking-wide">{record.refNumber}</p>
                </div>

                <dl className="divide-y px-6">
                    {rows.filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="grid grid-cols-3 gap-3 py-3 text-sm">
                            <dt className="font-mono text-[11px] uppercase tracking-wider text-gray-500">{k}</dt>
                            <dd className="col-span-2 font-semibold text-[#0A1330]">{v}</dd>
                        </div>
                    ))}
                </dl>

                <div className="space-y-3 p-6">
                    {maps && status === 'active' && (
                        <a href={maps} target="_blank" rel="noopener" className="block rounded-xl border px-5 py-3 text-center font-semibold text-[#0A1330] hover:bg-gray-50">
                            Cómo llegar ↗
                        </a>
                    )}
                    {canCancel && <CancelBooking token={token} />}
                    {status === 'active' && !canCancel && !offline && (
                        <p className="text-sm text-gray-600">Esta reserva ya no se puede cancelar en línea. Si no puedes asistir, escríbenos.</p>
                    )}
                    {offline && <p className="text-sm text-gray-600">No pudimos consultar el estado con el organizador. Intenta de nuevo en unos minutos.</p>}
                    {wa && (
                        <a href={wa} className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-[#0A1330] hover:bg-gray-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/brand/social/whatsapp.png" alt="" width={40} height={40} className="h-10 w-10 rounded-full shadow-md" />
                            Escríbenos por WhatsApp
                        </a>
                    )}
                </div>
            </div>
            <p className="mx-auto mt-4 max-w-xl text-center text-xs text-gray-500">Este enlace es privado. No lo compartas.</p>
        </main>
    );
}
