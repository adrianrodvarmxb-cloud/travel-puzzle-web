import Link from '@/components/i18n/LocalizedLink';

export interface PostCardModel { href: string; pillar: string; title: string; summary: string; date: string; draft: boolean; cover?: { src: string; alt: string } }

/** Tarjeta del índice y de relacionados (imagen 16:9 opcional, pilar, título, resumen, fecha). Sin hooks. */
export function PostCard({ p, featured = false }: { p: PostCardModel; featured?: boolean }) {
  return (
    <Link href={p.href} className={`group block overflow-hidden rounded-2xl border border-[#008DFF]/45 bg-[#0E1A40] transition-colors hover:border-[#EAF54F]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#EAF54F] ${featured ? 'md:grid md:grid-cols-2' : ''}`}>
      {p.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.cover.src} alt={p.cover.alt} className="aspect-video w-full object-cover" />
      ) : (
        <div aria-hidden className="aspect-video w-full bg-[linear-gradient(135deg,#0A1330_0%,#16306B_55%,#008DFF_100%)]" />
      )}
      <div className="p-5 md:p-6">
        <p className="font-data text-[11px] uppercase tracking-[0.25em] text-[#008DFF]">
          {p.pillar}{p.draft && <span className="ml-2 rounded bg-[#C12909] px-1.5 py-0.5 text-[10px] tracking-normal text-white">BORRADOR</span>}
        </p>
        <h3 className={`font-display mt-2 font-bold leading-tight text-white group-hover:text-[#EAF54F] ${featured ? 'text-2xl md:text-3xl' : 'text-xl'}`}>{p.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-[#C9D6F5]">{p.summary}</p>
        <p className="font-data mt-3 text-xs text-[#7F8DB0]">{p.date}</p>
      </div>
    </Link>
  );
}
