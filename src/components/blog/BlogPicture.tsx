import { imageVariants } from '@/blog/lib/images';

/**
 * REQ-1053: imagen del blog con AVIF/WebP/JPG a 800 y 1600 px (srcset) y texto alternativo obligatorio.
 * `eager` solo para la portada (LCP: sin lazy y con prioridad alta). Sin texto ni marcas encima.
 */
export function BlogPicture({ src, alt, sizes, className, eager = false }: { src: string; alt: string; sizes: string; className?: string; eager?: boolean }) {
  const v = imageVariants(src);
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={v.fallback} alt={alt} className={className} loading={eager ? 'eager' : 'lazy'} decoding={eager ? 'sync' : 'async'} {...(eager ? { fetchPriority: 'high' as const } : {})} {...(v.local ? { srcSet: v.jpg, sizes } : {})} />
  );
  if (!v.local) return img;
  return (
    <picture>
      <source type="image/avif" srcSet={v.avif} sizes={sizes} />
      <source type="image/webp" srcSet={v.webp} sizes={sizes} />
      {img}
    </picture>
  );
}
