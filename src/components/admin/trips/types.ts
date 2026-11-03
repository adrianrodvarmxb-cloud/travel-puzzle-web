import type { TripInput } from '@/trips/schemas/trip';

/** Estado del formulario: igual que TripInput (los números pueden venir vacíos). */
export type TripFormState = TripInput;
export type Patch = (p: Partial<TripFormState>) => void;
export interface AgencyOption { id: string; name: string }

export const emptyTrip: TripFormState = {
    agencyId: null, code: '', kind: 'circuito', purchaseMode: 'quote', titleEs: '', titleEn: '', summaryEs: '', summaryEn: '',
    descriptionEs: '', descriptionEn: '', countries: [], cities: [], durationDays: null, priceFrom: null, currency: 'USD', priceNote: '',
    dates: [], meetingPoints: [], hotelPickup: false, itinerary: [], includes: [], excludes: [], visaInfo: '', images: [],
};

/** "China, Japón" ⇄ ["China", "Japón"] */
export const splitList = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
/** Una entrada por línea (pueden llevar comas). */
export const splitLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
export const toNumber = (s: string) => (s.trim() === '' ? null : Number(s));
