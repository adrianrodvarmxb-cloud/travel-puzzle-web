import Link from '@/components/i18n/LocalizedLink';
import { parseInline } from '@/blog/lib/inline';

/** REQ-255: pinta el mini-formato como nodos (sin HTML crudo). Sin hooks. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((n, i) =>
        n.t === 'bold' ? <strong key={i} className="font-semibold text-white">{n.v}</strong>
          : n.t === 'link' ? (n.href.startsWith('/')
            ? <Link key={i} href={n.href} className="font-medium text-[#EAF54F] underline decoration-[#EAF54F]/40 underline-offset-4 hover:decoration-[#EAF54F]">{n.v}</Link>
            : <a key={i} href={n.href} target="_blank" rel="noopener noreferrer" className="font-medium text-[#EAF54F] underline decoration-[#EAF54F]/40 underline-offset-4 hover:decoration-[#EAF54F]">{n.v}</a>)
          : <span key={i}>{n.v}</span>,
      )}
    </>
  );
}
