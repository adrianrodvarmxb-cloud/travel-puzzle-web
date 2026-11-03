import type { Metadata } from 'next';
import { Navbar } from '@/components/layout';
import { SiteFooter } from '@/components/home/v2';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { contactFromEnv } from '@/booking/tour-summary';
import { whatsappUrl } from '@/notifications/lib/email-layout';
import { reviewPageState } from '@/reviews/customer';
import { customerReviewDeps } from '@/reviews/customer-deps';
import { parseRate, reviewerDisplayName } from '@/reviews/lib/customer-review';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tu reseña', robots: { index: false, follow: false } };

/** Reseña de una reserva (enlace del correo post-tour). Las estrellas del correo llegan en ?rate=1..5. */
export default async function ReviewPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ rate?: string }> }) {
  const { token } = await params;
  const { rate } = await searchParams;
  const deps = customerReviewDeps();
  const state = await reviewPageState(token, deps);
  const env = process.env as Record<string, string | undefined>;
  const contact = contactFromEnv(env);
  const footer = { whatsapp: contact.whatsapp, email: env.EMAIL_REPLY_TO, socials: contact.socials };
  const title = state.kind === 'ready' || state.kind === 'too_early' ? await deps.tourTitle(state.record.tourExternalId) : null;
  const wa = state.kind === 'ready' ? whatsappUrl(contact.whatsapp, `Hola Travel Puzzle, quiero comentarles algo de mi tour (reserva ${state.record.refNumber}).`) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="tp-dark">
        <section className="mx-auto w-full max-w-2xl px-4 py-16 md:py-24">
          <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">TRAVEL PUZZLE · TU RESEÑA</p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] text-white md:text-5xl">¿Qué tal estuvo tu tour?</h1>
          {title && <p className="mt-3 text-lg text-[#A9B6D6]">{title}</p>}
          <div className="mt-10">
            {state.kind === 'ready' && (
              <ReviewForm
                token={token}
                initialRate={parseRate(rate) ?? state.existing?.rate ?? null}
                initialContent={state.existing?.content ?? ''}
                displayName={reviewerDisplayName(state.record.firstName, state.record.lastName)}
                whatsappUrl={wa}
              />
            )}
            {state.kind === 'too_early' && <Notice text="Podrás dejar tu reseña después de tu tour. ¡Que lo disfrutes!" />}
            {state.kind === 'not_allowed' && <Notice text="Esta reserva fue cancelada, así que no tiene reseña." />}
            {state.kind === 'not_found' && <Notice text="No encontramos esta reserva. Revisa el enlace de tu correo o escríbenos por WhatsApp." />}
          </div>
        </section>
      </main>
      <SiteFooter contact={footer} />
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-[#D5DCEE]">{text}</p>;
}
