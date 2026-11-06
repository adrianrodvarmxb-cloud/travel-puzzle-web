import type { Attribution } from '@/geo/lib/attribution';

/** REQ-139: atribución de fuentes geográficas al final de la página legal. Solo presenta; sin líneas no pinta nada. */
export function GeoAttribution({ items }: { items: readonly Attribution[] }) {
  if (!items.length) return null;
  return (
    <section aria-label="Fuentes de datos" className="mx-auto w-full max-w-3xl px-4 pb-16 text-sm text-[#A9B6D6]">
      <h2 className="font-display mb-2 text-lg font-bold text-white">Fuentes de datos</h2>
      <ul className="space-y-1.5">
        {items.map((a) => (
          <li key={a.id}>
            {a.text}{' '}
            {a.links.map((href, i) => (
              <span key={href}>
                {i > 0 && ' · '}
                <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                  {i === 0 ? 'Sitio' : 'Licencia'}
                </a>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
