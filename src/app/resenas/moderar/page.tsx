import type { Metadata } from 'next';
import { ModerateButtons } from '@/components/reviews/ModerateButtons';
import { AdminReviewCard } from '@/components/reviews/AdminReviewCard';
import { customerReviewDeps } from '@/reviews/customer-deps';
import { verifyLink } from '@/reviews/lib/customer-review';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Moderar reseña', robots: { index: false, follow: false } };

/** Confirmación de Publicar/Ocultar desde el correo. Abrir el enlace no cambia nada: hay que tocar el botón. */
export default async function ModeratePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const action = q.a === 'publish' || q.a === 'hide' ? q.a : null;
  const exp = Number(q.exp);
  const deps = customerReviewDeps();
  const valid = !!(q.id && action && q.sig) && (await verifyLink(deps.secret, `${action}:${q.id}`, exp, q.sig!, deps.now));
  const review = valid ? await deps.findReviewById(q.id!) : null;
  const title = review ? await deps.tourTitle(review.tourExternalId) : null;

  return (
    <main className="tp-dark min-h-screen">
      <section className="mx-auto w-full max-w-2xl px-4 py-16">
        <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">TRAVEL PUZZLE · INTERNO</p>
        <h1 className="font-display text-3xl font-bold text-white">{action === 'hide' ? '¿Ocultar esta reseña?' : '¿Publicar esta reseña?'}</h1>
        <div className="mt-8">
          {!review ? (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-[#D5DCEE]">El enlace venció o no es válido. Abre el panel desde un aviso más reciente.</p>
          ) : (
            <AdminReviewCard review={review} tourTitle={title}>
              <ModerateButtons id={review.id} exp={exp} sig={q.sig!} actions={[action!]} canPublish={review.consent} />
            </AdminReviewCard>
          )}
        </div>
      </section>
    </main>
  );
}
