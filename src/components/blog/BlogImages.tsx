import type { BlogImage, Post } from '@/blog/lib/schema';
import { BlogPicture } from './BlogPicture';

type Block = NonNullable<Post['imagenes']>[number];

/** REQ-1053: crédito y licencia visibles bajo cada foto. */
function Credit({ img }: { img: BlogImage }) {
  return (
    <span>
      {img.credit}
      {img.license && <> · <a href={img.license.url} target="_blank" rel="noopener noreferrer license" className="underline">{img.license.name}</a></>}
    </span>
  );
}

/**
 * REQ-1053: portada editorial a todo el ancho con velo de marca (degradado al fondo de la página), sin lazy.
 * Nada encima de la foto más allá del velo.
 */
export function BlogHero({ img }: { img: BlogImage }) {
  return (
    <figure className="mt-8">
      <div className="relative w-full overflow-hidden">
        <BlogPicture src={img.src} alt={img.alt} eager sizes="100vw" className="aspect-[4/3] w-full object-cover md:aspect-[21/9]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A1330] via-[#0A1330]/25 to-[#0A1330]/10" />
      </div>
      <figcaption className="mx-auto mt-2 max-w-5xl px-4 text-xs text-[#7F8DB0]"><Credit img={img} /></figcaption>
    </figure>
  );
}

const GRID: Record<Block['formato'], string> = {
  banner: '',
  ancho: '',
  columna: '',
  dos: 'grid grid-cols-2 gap-3',
  collage: 'grid grid-cols-2 gap-3 md:grid-cols-3',
  galeria: 'grid grid-cols-2 gap-3 md:grid-cols-3',
};
const ASPECT: Record<Block['formato'], string> = {
  banner: 'aspect-[21/9]', ancho: 'aspect-video', columna: 'aspect-[3/2]', dos: 'aspect-[4/5]', collage: 'aspect-[4/3]', galeria: 'aspect-[4/3]',
};
const WIDE = new Set<Block['formato']>(['banner', 'ancho']);

/** REQ-1053: un bloque de imágenes del cuerpo en su formato (banner, ancho, columna, dos, collage o galería). */
export function BlogImageBlock({ b }: { b: Block }) {
  const wide = WIDE.has(b.formato);
  const single = b.fotos.length === 1;
  return (
    <figure className={wide ? 'relative left-1/2 mt-10 w-screen max-w-[1100px] -translate-x-1/2 px-4' : 'mt-10'}>
      <div className={GRID[b.formato]}>
        {b.fotos.map((f, i) => (
          <div key={f.src} className={b.formato === 'collage' && i === 0 ? 'col-span-2 md:col-span-1' : ''}>
            <BlogPicture src={f.src} alt={f.alt} sizes={wide ? '(min-width: 1100px) 1100px, 100vw' : single ? '(min-width: 768px) 720px, 100vw' : '(min-width: 768px) 360px, 50vw'} className={`${ASPECT[b.formato]} w-full rounded-2xl object-cover`} />
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-sm text-[#A9B6D6]">
        {b.pie && <span className="block text-[#C9D6F5]">{b.pie}</span>}
        <span className="text-xs text-[#7F8DB0]">{b.fotos.map((f, i) => <span key={f.src}>{i > 0 && ' · '}<Credit img={f} /></span>)}</span>
      </figcaption>
    </figure>
  );
}
