import { applySupplierDecision } from '@/trips/direct-buy';
import { buyDeps } from '@/trips/direct-buy-deps';
import { verifySupplierLink } from '@/trips/lib/direct-buy';
import { esc } from '@/notifications/lib/email-layout';

export const dynamic = 'force-dynamic';

const page = (title: string, body: string) =>
    new Response(
        `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · Travel Puzzle</title>
<style>body{font-family:system-ui,sans-serif;background:#0A1330;color:#fff;margin:0;padding:24px}main{max-width:520px;margin:0 auto;background:#121D45;border-radius:16px;padding:24px}h1{font-size:22px;margin:0 0 12px}p,li{color:#D5DCEE;line-height:1.5}form{display:inline}button{border:0;border-radius:999px;padding:12px 20px;font-weight:700;font-size:15px;margin:12px 8px 0 0;cursor:pointer}.ok{background:#22C55E;color:#0A1330}.no{background:#FF8A73;color:#0A1330}</style></head>
<body><main><h1>${esc(title)}</h1>${body}</main></body></html>`,
        { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }
    );

const MSG: Record<string, [string, string]> = {
    confirmed: ['¡Gracias! Reserva confirmada', 'Le avisamos al cliente que su lugar está confirmado.'],
    refunded: ['Reserva cancelada', 'Le avisamos al cliente y le devolvimos su pago.'],
    refund_failed: ['Reserva cancelada', 'Registramos tu respuesta; el equipo de Travel Puzzle termina el reembolso.'],
    already: ['Esta reserva ya tiene respuesta', 'No hace falta hacer nada más.'],
    invalid: ['Enlace no válido', 'Revisa que hayas abierto el enlace completo del correo o escríbenos.'],
};

/**
 * REQ-3534: el correo del proveedor abre esta página; la decisión se toma con un botón (POST), nunca al abrir
 * el enlace, para que los revisores automáticos de correo no confirmen ni cancelen por error.
 */
export async function GET(request: Request) {
    const u = new URL(request.url);
    const id = u.searchParams.get('id') ?? '';
    const sig = u.searchParams.get('sig') ?? '';
    const d = buyDeps();
    if (!(await verifySupplierLink(d.secret, id, sig))) return page(...MSG.invalid);
    const b = await d.findBuy(id);
    if (!b || b.kind !== 'compra') return page(...MSG.invalid);
    if (b.status !== 'awaiting_supplier') return page(...MSG.already);
    const pax = [`${b.adults} adulto(s)`, b.children ? `${b.children} niño(s)` : '', b.infants ? `${b.infants} infante(s)` : ''].filter(Boolean).join(', ');
    const action = `/api/viajes/confirmar?id=${encodeURIComponent(id)}&sig=${encodeURIComponent(sig)}`;
    return page(
        `Reserva ${b.ref}`,
        `<ul><li><b>Viaje:</b> ${esc(b.tripTitle)} (${esc(b.tripCode)})</li><li><b>Fecha:</b> ${esc(b.time ? `${b.date} · ${b.time}` : b.date)}</li>${b.optionName ? `<li><b>Opción:</b> ${esc(b.optionName)}</li>` : ''}<li><b>Personas:</b> ${esc(pax)}</li><li><b>Titular:</b> ${esc(`${b.firstName} ${b.lastName}`)}</li></ul>
<p>¿Hay lugar para esta reserva?</p>
<form method="post" action="${esc(action)}"><input type="hidden" name="accion" value="confirm"><button class="ok" type="submit">Sí, confirmo</button></form>
<form method="post" action="${esc(action)}"><input type="hidden" name="accion" value="decline"><button class="no" type="submit">No hay lugar</button></form>`
    );
}

export async function POST(request: Request) {
    const u = new URL(request.url);
    const form = await request.formData().catch(() => null);
    const accion = form?.get('accion');
    if (accion !== 'confirm' && accion !== 'decline') return page(...MSG.invalid);
    const r = await applySupplierDecision(u.searchParams.get('id') ?? '', accion, buyDeps(), u.searchParams.get('sig') ?? '');
    return page(...MSG[r]);
}
