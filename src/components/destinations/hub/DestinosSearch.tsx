import { destinosHubCopy, continentAnchor } from '@/destinations/lib/destinos-hub-copy';
import type { HubContinent } from '@/destinations/lib/destinos-hub';

/** REQ-3475: buscador de destino (lleva a /tours con el texto, como el inicio) y chips para saltar a cada continente. */
export function DestinosSearch({ lang, continents }: { lang: string; continents: HubContinent[] }) {
    const c = destinosHubCopy(lang);
    return (
        <div className="mt-6">
            <form action="/tours" method="get" role="search" className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-[#0E1A40] p-2 sm:flex-row">
                <label htmlFor="destinos-search" className="sr-only">{c.searchLabel}</label>
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-white px-4">
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#304A9F" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                    <input id="destinos-search" name="search" placeholder={c.searchPlaceholder} autoComplete="off" className="min-w-0 flex-1 bg-transparent py-3.5 text-base text-[#0A1330] outline-none placeholder:text-gray-500" />
                </div>
                <button type="submit" className="rounded-xl bg-[#C12909] px-7 py-3.5 font-semibold text-white hover:opacity-90">{c.searchCta} →</button>
            </form>
            <nav aria-label={c.contTitle} className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
                {continents.map((k) => (
                    <a key={k} href={`#${continentAnchor(k)}`} className="shrink-0 whitespace-nowrap rounded-full border border-white/20 px-3.5 py-2 text-sm text-[#DCE4F5] transition-colors hover:border-[#008DFF] hover:text-white">
                        {c.continents[k]}
                    </a>
                ))}
            </nav>
        </div>
    );
}
