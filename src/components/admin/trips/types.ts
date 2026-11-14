import type { TripInput } from '@/trips/schemas/trip';

/** Estado del formulario: TripInput (el código y el "Desde" los calcula el servidor). */
export type TripFormState = TripInput;
export type Patch = (p: Partial<TripFormState>) => void;
export interface AgencyOption { id: string; name: string; initials: string | null }

export const newOptionId = () => Math.random().toString(36).slice(2, 10);

export const emptyTrip: TripFormState = {
    agencyId: null, kind: 'tour', purchaseMode: 'quote', category: null,
    titleEs: '', titleEn: '', summaryEs: '', summaryEn: '', highlights: [], descriptionEs: '', descriptionEn: '',
    importantInfo: '', whatToBring: '', accessibility: '', difficulty: null,
    countries: [], cities: [], durationDays: null, flightsIncluded: false, languages: ['es'], minPax: null, maxPax: null,
    currency: 'MXN', priceNote: '',
    options: [{ id: 'grupo', name: 'En grupo', mode: 'group', adult: null, child: null, infant: null, childAgeMin: 3, childAgeMax: 11 }],
    extras: [], availability: { weekdays: [], slots: [], closedDates: [], seasons: [], validFrom: null, validTo: null, weekdayRules: [], surcharges: [], quoteRanges: [] }, minNoticeHours: 24,
    cancellation: { type: 'standard', tiers: [] }, dates: [], meetingPoints: [], hotelPickup: false, endPoint: '',
    itinerary: [], includes: [], excludes: [], visaInfo: '', images: [], videoUrl: '', videoCaption: '',
};

/** "China, Japón" ⇄ ["China", "Japón"] */
export const splitList = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
/** Una entrada por línea (pueden llevar comas). */
export const splitLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
export const toNumber = (s: string) => (s.trim() === '' ? null : Number(s));
