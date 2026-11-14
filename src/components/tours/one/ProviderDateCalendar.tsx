'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/assets/svg';
import type { CalendarViewModel } from '@/tours/lib/calendar-view';

/**
 * Calendario de fechas y precios de un tour de proveedor (REQ-3469).
 *
 * Una sola responsabilidad: pintar el mes que trae el servidor y cambiar de mes. Todo lo que depende del
 * idioma (nombres de mes, días de la semana, textos) y el precio ya vienen formateados en `view`, así que
 * aquí no hay `Intl`, ni `toLocale*`, ni reloj: el html del servidor y el del cliente son idénticos (INC-001).
 *
 * Los días informan, no se eligen: mientras la reserva en línea de proveedor no exista, un día que parezca
 * un botón sería una fachada. Apartar sigue siendo el camino que ya tiene la ficha.
 */
// REQ-3469, REQ-3471
export function ProviderDateCalendar({ view }: { view: CalendarViewModel }) {
    const [i, setI] = useState(Math.min(Math.max(view.start, 0), view.months.length - 1));
    const mes = view.months[i];
    if (!mes) return null;

    return (
        <div className="space-y-3">
            <p className="font-display text-lg font-bold">{view.copy.title}</p>

            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setI((n) => Math.max(0, n - 1))}
                    disabled={i === 0}
                    aria-label={view.copy.prev}
                    className="rounded-full p-2 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <span className="rounded-full bg-muted px-4 py-1.5 text-sm font-medium capitalize">{mes.label}</span>
                <button
                    type="button"
                    onClick={() => setI((n) => Math.min(view.months.length - 1, n + 1))}
                    disabled={i === view.months.length - 1}
                    aria-label={view.copy.next}
                    className="rounded-full p-2 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <ChevronRightIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1" aria-hidden="true">
                {view.weekdays.map((d) => (
                    <div key={d} className="py-1 text-center text-[11px] font-medium text-muted-foreground">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {mes.cells.map((c, k) =>
                    c === null ? (
                        <div key={`v${k}`} className="min-h-12" />
                    ) : (
                        <div
                            key={c.date}
                            data-ofrecido={c.bookable ? 'true' : 'false'}
                            title={c.bookable ? (c.price ?? undefined) : view.copy.closed}
                            className={`flex min-h-12 flex-col items-center justify-center rounded-lg px-0.5 py-1 text-center ${
                                c.bookable
                                    ? 'bg-muted text-foreground border-b-2 border-tp-blue-primary'
                                    : 'text-muted-foreground/30 line-through'
                            }`}
                        >
                            <span className="text-sm font-medium leading-none">{c.day}</span>
                            {c.price && <span className="mt-1 block text-[10px] leading-none text-muted-foreground">{c.price}</span>}
                        </div>
                    ),
                )}
            </div>

            <p className="text-xs text-muted-foreground">{view.copy.note}</p>
        </div>
    );
}
