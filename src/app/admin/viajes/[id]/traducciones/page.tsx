import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TARGET_LANGS, LANG_LABEL_ES, sourceStrings, translationStatus, type TargetLang } from '@/trips/lib/translation';
import { translationDeps } from '@/trips/deps';
import { TranslationEditor } from '@/components/admin/trips/TranslationEditor';

/** Revisar y corregir las traducciones automáticas de un viaje. */
export default async function TripTranslationsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
    const id = (await params).id;
    const q = await searchParams;
    const lang = (TARGET_LANGS as readonly string[]).includes(q.lang ?? '') ? (q.lang as TargetLang) : 'en';
    const data = await (await translationDeps()).load(id);
    if (!data) notFound();
    const source = sourceStrings(data.trip);
    const status = translationStatus(source, data.translations);
    return (
        <>
            <Link href={`/admin/viajes/${id}`} className="text-sm text-[#9AAEE0] underline">← {data.trip.titleEs}</Link>
            <h1 className="font-display mt-2 text-4xl font-bold text-white">Traducciones</h1>
            <p className="mt-2 text-sm text-[#A9B6D6]">Se traducen solas al guardar. Si corriges una, queda con candado 🔒 y ya no se cambia sola.</p>
            <nav className="mt-6 flex flex-wrap gap-2">
                {TARGET_LANGS.map((l) => (
                    <Link key={l} href={`?lang=${l}`} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${l === lang ? 'border-[#EAF54F] bg-[#EAF54F] text-[#0A1330]' : 'border-white/20 text-white'}`}>
                        {LANG_LABEL_ES[l]} {status[l].pending || status[l].outdatedManual ? `· ${status[l].pending + status[l].outdatedManual} pendientes` : '✓'}
                    </Link>
                ))}
            </nav>
            <TranslationEditor id={id} lang={lang} source={source} entries={data.translations[lang] ?? {}} />
        </>
    );
}
