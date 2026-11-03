import type { Metadata } from 'next';
import Link from 'next/link';
import { ModerateButtons } from '@/components/reviews/ModerateButtons';
import { AdminReviewCard } from '@/components/reviews/AdminReviewCard';
import { customerReviewDeps, listReviewsForAdmin } from '@/reviews/customer-deps';
import { adminLinkValid } from '@/reviews/customer';
import { REVIEW_STATUSES } from '@/reviews/lib/customer-review';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reseñas de clientes', robots: { index: false, follow: false } };

const TABS: { key: string | null; label: string }[] = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'published', label: 'Publicadas' },
  { key: 'hidden', label: 'Ocultas' },
  { key: null, label: 'Todas' },
];

/** Panel de reseñas. Se entra con el enlace firmado de los avisos (vence en 7 días); no requiere cuenta. */
export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const exp = Number(q.exp);
  const sig = q.sig ?? '';
  const deps = customerReviewDeps();
  const ok = await adminLinkValid({ exp, sig }, deps);
  const estado = (REVIEW_STATUSES as readonly string[]).includes(q.estado ?? '') ? q.estado! : q.estado === 'todas' ? null : 'pending';
  const reviews = ok ? await listReviewsForAdmin(estado) : [];
  const titles = new Map<number, string | null>();
  for (const r of reviews) if (r.tourExternalId && !titles.has(r.tourExternalId)) titles.set(r.tourExternalId, await deps.tourTitle(r.tourExternalId));

  return (
    <main className="tp-dark min-h-screen">
      <section className="mx-auto w-full max-w-3xl px-4 py-16">
        <p className="font-data mb-2.5 text-xs uppercase tracking-[0.3em] text-[#008DFF]">TRAVEL PUZZLE · INTERNO</p>
        <h1 className="font-display text-4xl font-bold text-white">Reseñas de clientes</h1>
        {!ok ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-[#D5DCEE]">El enlace venció o no es válido. Ábrelo desde un aviso de reseña más reciente.</p>
        ) : (
          <>
            <nav className="mt-6 flex flex-wrap gap-2">
              {TABS.map((t) => {
                const on = (t.key ?? null) === estado;
                return (
                  <Link key={t.label} href={`/admin/resenas?exp=${exp}&sig=${sig}&estado=${t.key ?? 'todas'}`} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${on ? 'border-[#EAF54F] bg-[#EAF54F] text-[#0A1330]' : 'border-white/20 text-white hover:border-white/50'}`}>
                    {t.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-8 space-y-4">
              {reviews.length === 0 && <p className="text-[#A9B6D6]">No hay reseñas en esta vista.</p>}
              {reviews.map((r) => (
                <AdminReviewCard key={r.id} review={r} tourTitle={r.tourExternalId ? titles.get(r.tourExternalId) : null}>
                  <ModerateButtons id={r.id} exp={exp} sig={sig} actions={r.status === 'published' ? ['hide'] : r.status === 'hidden' ? ['publish'] : ['publish', 'hide']} canPublish={r.consent} />
                </AdminReviewCard>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
