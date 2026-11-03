import type { ReactNode } from 'react';

const STATUS: Record<string, string> = { pending: 'Pendiente', published: 'Publicada', hidden: 'Oculta' };

/** Una reseña de cliente en las páginas internas (moderar y panel). */
export function AdminReviewCard({ review, tourTitle, children }: {
  review: { rate: number; content: string; displayName: string; consent: boolean; status: string; refNumber: string; tourDate: string | null };
  tourTitle?: string | null;
  children?: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xl tracking-widest text-[#F5B301]">{'★'.repeat(review.rate)}<span className="text-white/20">{'★'.repeat(5 - review.rate)}</span></span>
        <span className={`font-data rounded-full px-3 py-1 text-[11px] uppercase tracking-wider ${review.rate <= 3 && review.status === 'pending' ? 'bg-[#C12909] text-white' : 'bg-white/10 text-[#D5DCEE]'}`}>
          {review.rate <= 3 && review.status === 'pending' ? 'Dar seguimiento' : STATUS[review.status] ?? review.status}
        </span>
      </div>
      {tourTitle && <p className="mt-2 font-semibold text-white">{tourTitle}</p>}
      <p className="mt-2 whitespace-pre-line text-[#D5DCEE]">{review.content || <em className="text-[#7F8DB0]">Solo estrellas, sin texto</em>}</p>
      <p className="font-data mt-3 text-[11px] uppercase tracking-wider text-[#7F8DB0]">
        {review.consent ? review.displayName : 'Sin permiso para publicar'} · Reserva {review.refNumber}{review.tourDate ? ` · ${review.tourDate}` : ''}
      </p>
      {children && <div className="mt-4">{children}</div>}
    </article>
  );
}
