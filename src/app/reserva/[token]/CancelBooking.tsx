'use client';

import { useState } from 'react';

/** Botón de cancelar con confirmación (Freetour solo pide que el cliente confirme su intención). */
export function CancelBooking({ token }: { token: string }) {
    const [step, setStep] = useState<'idle' | 'confirm' | 'sending' | 'done' | 'error'>('idle');

    async function cancel() {
        setStep('sending');
        const res = await fetch(`/api/reserva/${encodeURIComponent(token)}/cancelar`, { method: 'POST' }).catch(() => null);
        setStep(res?.ok ? 'done' : 'error');
        if (res?.ok) setTimeout(() => window.location.reload(), 1500);
    }

    if (step === 'done') {
        return <p role="status" className="rounded-xl border border-[#E6EBF5] bg-[#F4F7FD] p-4 text-sm font-semibold text-[#0A1330]">Listo, tu reserva quedó cancelada.</p>;
    }

    return (
        <div className="space-y-3">
            {step === 'idle' && (
                <button onClick={() => setStep('confirm')} className="w-full rounded-xl border border-[#C12909] px-5 py-3.5 font-semibold text-[#C12909] hover:bg-[#C12909] hover:text-white">
                    Cancelar mi reserva
                </button>
            )}
            {(step === 'confirm' || step === 'sending') && (
                <div className="rounded-xl border border-[#E6EBF5] border-l-4 border-l-[#C12909] bg-white p-4">
                    <p className="text-sm text-[#0A1330]">¿Seguro que quieres cancelar? Tu lugar se libera para otro viajero y no se puede deshacer.</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button onClick={cancel} disabled={step === 'sending'} className="flex-1 rounded-xl bg-[#C12909] px-4 py-3.5 font-bold text-white disabled:opacity-60">
                            {step === 'sending' ? 'Cancelando…' : 'Sí, cancelar →'}
                        </button>
                        <button onClick={() => setStep('idle')} disabled={step === 'sending'} className="flex-1 rounded-xl border border-[#E6EBF5] px-4 py-3.5 font-semibold text-[#0A1330]">
                            No, conservarla
                        </button>
                    </div>
                </div>
            )}
            {step === 'error' && (
                <p role="alert" className="text-sm text-[#C12909]">No pudimos cancelar en este momento. Intenta de nuevo o escríbenos por WhatsApp.</p>
            )}
        </div>
    );
}
