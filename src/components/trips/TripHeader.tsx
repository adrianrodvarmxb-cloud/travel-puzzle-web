import { FichaEnBreve } from '@/components/seo/FichaEnBreve';

/**
 * Encabezado de la ficha de un viaje (movido tal cual desde TripDetailView): tipo · países · duración (REQ-145),
 * H1 = título, ciudades y, debajo, «En breve» con el tipo y las etiquetas (REQ-577 / REQ-581). Presentacional, sin
 * hooks ni Intl: los textos llegan calculados del servidor (INC-001). El test de contrato (REQ-580) lo pinta tal cual.
 */
export function TripHeader({ eyebrow, title, cities, breve, tipo, etiquetas, lang }: { eyebrow: string; title: string; cities: string[]; breve: string | null; tipo?: string | null; etiquetas?: string[]; lang: string }) {
    return (
        <>
            <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#A9B6D6]">{eyebrow}</p>
            <h1 className="font-display mt-2 text-3xl font-bold leading-tight text-white md:text-5xl">{title}</h1>
            {cities.length > 0 && <p className="mt-2 text-[#C9D6F5]">{cities.join(' · ')}</p>}
            <FichaEnBreve text={breve} tipo={tipo} etiquetas={etiquetas} lang={lang} />
        </>
    );
}
