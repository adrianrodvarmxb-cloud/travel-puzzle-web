import type React from 'react';
import type { FichaLang } from '@/ficha/lib/model';
import type { FlowStep } from '@/booking/lib/flow';
import type { FlowPageModel, FlowStepView } from '@/booking/lib/flow-page';

/** REQ-10958 · Interfaz común del cuerpo de cada paso (LSP): recibe el modelo de la página y el idioma. */
export interface FlowStepBodyProps { page: FlowPageModel; lang: FichaLang }
export type FlowStepBodies = Partial<Record<FlowStep, React.ComponentType<FlowStepBodyProps>>>;

/** REQ-10958 · Barra de pasos: estado por paso; los hechos enlazan, el actual se marca, los pendientes no enlazan. */
export function FlowSteps({ steps }: { steps: FlowStepView[] }) {
    return (
        <ol data-pasos={steps.length} className="flex flex-wrap gap-2 text-sm">
            {steps.map((s, k) => (
                <li key={s.id} data-paso={s.id} data-estado={s.state} aria-current={s.state === 'current' ? 'step' : undefined} className="flex items-center gap-2">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${s.state === 'current' ? 'bg-[#C12909] text-white' : s.state === 'done' ? 'bg-white/80 text-[#1A1A1A]' : 'bg-white/20 text-white/70'}`}>{k + 1}</span>
                    {s.state === 'done' ? <a href={s.href} className="text-white underline-offset-2 hover:underline">{s.label}</a> : <span className={s.state === 'current' ? 'font-semibold text-white' : 'text-white/70'}>{s.label}</span>}
                </li>
            ))}
        </ol>
    );
}

/** REQ-10958 · Resumen del producto: lo mismo que dice la ficha (núcleo común); sin dato, la línea no sale. */
export function FlowSummaryCard({ page, backLabel }: { page: FlowPageModel; backLabel: string }) {
    const s = page.summary;
    return (
        <aside data-resumen className="rounded-2xl bg-white/10 p-5 text-white">
            <p className="font-display text-lg font-bold">{s.title}</p>
            <p className="text-white/80">{s.place}</p>
            {s.duration && <p className="mt-2 text-sm text-white/80">{s.duration}</p>}
            {s.priceText && <p className="mt-2 text-sm font-semibold">{s.priceText}</p>}
            {s.cancellation && <p className="mt-2 text-sm text-white/80">{s.cancellation}</p>}
            <a href={s.fichaPath} className="mt-4 inline-block text-sm text-white underline-offset-2 hover:underline">{backLabel}</a>
        </aside>
    );
}

/**
 * REQ-10958 · Monta el cuerpo del paso actual. Los cuerpos llegan registrados por props (OCP, DIP): este componente no
 * conoce calendarios ni cobros. Un paso sin cuerpo registrado (calendario de Tangol = PR 3, cobro con Stripe = PR 4)
 * cae al `fallback` (el asesor), nunca a un cuerpo de otro proveedor ni a un cobro.
 */
export function FlowStepper({ page, lang, bodies, fallback, backLabel }: { page: FlowPageModel; lang: FichaLang; bodies: FlowStepBodies; fallback: React.ReactNode; backLabel: string }) {
    const Body = page.current === 'advisor' ? undefined : bodies[page.current];
    return (
        <section data-flujo={page.unified ? 'unico' : 'hoy'} data-canal={page.channel} data-cobro={page.payment} className="mx-auto grid max-w-5xl gap-6 px-4 md:grid-cols-[1fr_320px]">
            <div>
                <FlowSteps steps={page.steps} />
                <div data-cuerpo={Body ? page.current : 'advisor'} className="mt-6">
                    {Body ? <Body page={page} lang={lang} /> : fallback}
                </div>
            </div>
            <FlowSummaryCard page={page} backLabel={backLabel} />
        </section>
    );
}
