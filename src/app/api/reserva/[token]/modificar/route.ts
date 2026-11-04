import { NextResponse } from 'next/server';
import { z } from 'zod';
import { editByToken, type EditResult } from '@/booking/edit';
import { manageDeps } from '@/booking/manage-deps';
import { sendStatusEmail } from '@/booking/notify';
import { getTourSummary, getMoreTours, contactFromEnv, calendarFromEnv } from '@/booking/tour-summary';
import { sendEmail } from '@/notifications/resend';
import { isBookingsEnabled, paidInRecommendations } from '@/booking/lib/flags';
import { createFreetourApi } from '@/freetour/api';
import { resolveFreetourConfig } from '@/freetour/lib/hosts';
import type { EditEvent } from '@/booking/lib/edit-plan';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const zEdit = z.object({ eventId: z.number().int().positive(), adults: z.number().int().min(1).max(50), children: z.number().int().min(0).max(50) });

const STATUS: Record<EditResult, number> = {
    modified: 200, disabled: 503, not_found: 404, not_allowed: 409, no_change: 400, other_tour: 400,
    no_availability: 409, min_adults: 400, invalid: 400, error: 502,
};

const unwrap = (x: unknown) => ((x as { data?: unknown })?.data ?? x);

/** Modifica la reserva del enlace privado (fecha/horario o personas). Detrás de EDIT_ENABLED. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const parsed = zEdit.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ result: 'invalid' }, { status: 400 });
    const deps = manageDeps();
    const freetour = createFreetourApi({ config: resolveFreetourConfig(process.env), fetch });
    const env = process.env as Record<string, string | undefined>;
    const result = await editByToken(token, parsed.data, {
        ...deps,
        enabled: isBookingsEnabled(env.EDIT_ENABLED),
        tourEvents: async (tourId) => {
            const body = unwrap(await freetour.get(`/tours/${tourId}/events`)) as unknown;
            const list = Array.isArray(body) ? body : ((body as { events?: unknown[] })?.events ?? []);
            return list as { id: number; date: string; utcDate: string; language: string }[];
        },
        getEventForEdit: async (eventId, ref) => unwrap(await deps.getEventForEdit(eventId, ref)) as EditEvent,
        notify: (record) =>
            sendStatusEmail('modified', record, {
                enabled: isBookingsEnabled(env.EMAILS_ENABLED),
                lang: 'es',
                siteUrl: env.SITE_URL ?? '',
                getTour: (id, l) => getTourSummary(getPrisma(), id, l),
                getMoreTours: (id, l, site) => getMoreTours(getPrisma(), id, l, site, { includePaid: paidInRecommendations(env) }),
                contact: contactFromEnv(env),
                calendar: calendarFromEnv(env),
                send: (email) => sendEmail({ apiKey: env.RESEND_API_KEY ?? '', fetch }, { ...email, from: env.EMAIL_FROM ?? '', replyTo: env.EMAIL_REPLY_TO }),
            }),
    });
    console.log(`[reserva] modificar → ${result}`);
    return NextResponse.json({ result }, { status: STATUS[result] });
}
