'use client';
import { useState } from 'react';
import { useTripForm } from './useTripForm';
import { BasicsSection } from './BasicsSection';
import { DatesSection } from './DatesSection';
import { MeetingSection } from './MeetingSection';
import { ContentSection } from './ContentSection';
import { PhotosSection } from './PhotosSection';
import type { TripFormState, AgencyOption } from './types';

/** Formulario del gestor de viajes: secciones + barra de guardar. */
export function TripForm({ initial, id, agencies: initialAgencies }: { initial: TripFormState; id: string | null; agencies: AgencyOption[] }) {
    const { v, patch, save, saving, message } = useTripForm(initial, id);
    const [agencies, setAgencies] = useState(initialAgencies);
    return (
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <BasicsSection v={v} patch={patch} agencies={agencies} onAgencyCreated={(a) => setAgencies((cur) => [...cur, a].sort((x, y) => x.name.localeCompare(y.name)))} />
            <DatesSection v={v} patch={patch} />
            <MeetingSection v={v} patch={patch} />
            <ContentSection v={v} patch={patch} />
            <PhotosSection v={v} patch={patch} />
            <div className="sticky bottom-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-[#121D45] p-4 shadow-2xl">
                <button type="submit" disabled={saving || !v.code || !v.titleEs} className="rounded-full bg-[#008DFF] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40">
                    {saving ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear borrador'}
                </button>
                {message && <span className={`text-sm ${message.ok ? 'text-[#7CE3A1]' : 'text-[#FF8A73]'}`}>{message.text}</span>}
            </div>
        </form>
    );
}
