'use client';
import { MAX_TITLE } from '@/trips/lib/publish';
import { DIFFICULTIES } from '@/trips/schemas/trip';
import { Section, Field, Input, TextArea, Select, smallBtn } from './fields';
import { splitLines, type TripFormState, type Patch } from './types';

const DIFF_LABEL: Record<(typeof DIFFICULTIES)[number], string> = { facil: 'Fácil', moderada: 'Moderada', exigente: 'Exigente' };

/** Textos que venden (estándar GYG): título corto, resumen, destacados, descripción e información útil. */
export function InfoSection({ v, patch }: { v: TripFormState; patch: Patch }) {
    const n = v.titleEs.trim().length;
    const setHl = (i: number, t: string) => patch({ highlights: v.highlights.map((h, j) => (j === i ? t : h)) });
    return (
        <Section n={2} title="Contenido (en español; el sitio traduce)">
            <Field label={`Título (${n}/${MAX_TITLE})`} hint="Lugar + tipo + lo más atractivo. Ej.: Oaxaca: clase de cocina con visita al mercado">
                <Input value={v.titleEs} onChange={(e) => patch({ titleEs: e.target.value })} maxLength={140} />
                {n > MAX_TITLE && <span className="mt-1 block text-xs text-[#FF8A73]">Recórtalo a {MAX_TITLE} caracteres para poder publicar.</span>}
            </Field>
            <Field label="Resumen" hint="2 o 3 frases."><TextArea rows={2} value={v.summaryEs} onChange={(e) => patch({ summaryEs: e.target.value })} maxLength={400} /></Field>
            <Field label={`Puntos destacados (${v.highlights.length}/5)`} hint="De 3 a 5; empieza cada uno con un verbo (Recorre, Prueba, Descubre…).">
                <div className="space-y-2">
                    {v.highlights.map((h, i) => (
                        <div key={i} className="flex gap-2">
                            <Input value={h} onChange={(e) => setHl(i, e.target.value)} maxLength={160} />
                            <button type="button" className={smallBtn} onClick={() => patch({ highlights: v.highlights.filter((_, j) => j !== i) })}>×</button>
                        </div>
                    ))}
                    <button type="button" className={smallBtn} disabled={v.highlights.length >= 5} onClick={() => patch({ highlights: [...v.highlights, ''] })}>+ Destacado</button>
                </div>
            </Field>
            <Field label="Descripción"><TextArea rows={6} value={v.descriptionEs} onChange={(e) => patch({ descriptionEs: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Incluye" hint="Uno por línea."><TextArea rows={5} defaultValue={v.includes.join('\n')} onBlur={(e) => patch({ includes: splitLines(e.target.value) })} /></Field>
                <Field label="No incluye" hint="Uno por línea."><TextArea rows={5} defaultValue={v.excludes.join('\n')} onBlur={(e) => patch({ excludes: splitLines(e.target.value) })} /></Field>
            </div>
            <Field label="Información importante"><TextArea rows={3} value={v.importantInfo} onChange={(e) => patch({ importantInfo: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Qué llevar"><TextArea rows={3} value={v.whatToBring} onChange={(e) => patch({ whatToBring: e.target.value })} /></Field>
                <Field label="Accesibilidad" hint="Silla de ruedas, carriolas, apto para niños…"><TextArea rows={3} value={v.accessibility} onChange={(e) => patch({ accessibility: e.target.value })} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Dificultad">
                    <Select value={v.difficulty ?? ''} onChange={(e) => patch({ difficulty: (e.target.value || null) as TripFormState['difficulty'] })}>
                        <option value="">Sin indicar</option>
                        {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
                    </Select>
                </Field>
                <Field label="Visa y requisitos"><TextArea rows={2} value={v.visaInfo} onChange={(e) => patch({ visaInfo: e.target.value })} /></Field>
            </div>
        </Section>
    );
}
