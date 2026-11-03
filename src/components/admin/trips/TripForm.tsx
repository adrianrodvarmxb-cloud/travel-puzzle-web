'use client';
import { useState } from 'react';
import { useTripForm } from './useTripForm';
import { IdentitySection } from './IdentitySection';
import { InfoSection } from './InfoSection';
import { DestinationSection } from './DestinationSection';
import { MeetingPointsSection } from './MeetingPointsSection';
import { OptionsSection } from './OptionsSection';
import { AvailabilitySection } from './AvailabilitySection';
import { PolicySection } from './PolicySection';
import { PhotosSection } from './PhotosSection';
import type { TripFormState, AgencyOption } from './types';

/** Formulario del gestor de viajes v2 (gates G-J). Las secciones v1 (BasicsSection, DatesSection, MeetingSection, ContentSection) quedan sin usar. */
export function TripForm({ initial, id, agencies: initialAgencies, savedCode = null, codeLocked = false }: {
    initial: TripFormState; id: string | null; agencies: AgencyOption[]; savedCode?: string | null; codeLocked?: boolean;
}) {
    const { v, patch, save, saving, message } = useTripForm(initial, id);
    const [agencies, setAgencies] = useState(initialAgencies);
    return (
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <IdentitySection v={v} patch={patch} agencies={agencies} savedCode={savedCode} codeLocked={codeLocked} onAgencyCreated={(a) => setAgencies((cur) => [...cur, a].sort((x, y) => x.name.localeCompare(y.name)))} />
            <InfoSection v={v} patch={patch} />
            <DestinationSection v={v} patch={patch} />
            <MeetingPointsSection v={v} patch={patch} />
            <OptionsSection v={v} patch={patch} />
            <AvailabilitySection v={v} patch={patch} />
            <PolicySection v={v} patch={patch} />
            <PhotosSection v={v} patch={patch} />
            <div className="sticky bottom-4 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-[#121D45] p-4 shadow-2xl">
                <button type="submit" disabled={saving || !v.titleEs} className="rounded-full bg-[#008DFF] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40">
                    {saving ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear borrador'}
                </button>
                {message && <span className={`text-sm ${message.ok ? 'text-[#7CE3A1]' : 'text-[#FF8A73]'}`}>{message.text}</span>}
            </div>
        </form>
    );
}
