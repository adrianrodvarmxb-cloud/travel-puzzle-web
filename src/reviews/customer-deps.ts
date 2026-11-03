import { getPrisma } from '@/lib/prisma';
import { createBookingRepo } from '@/booking/repository';
import { getTourSummary } from '@/booking/tour-summary';
import { sendEmail } from '@/notifications/resend';
import type { CustomerReviewDeps, StoredReview } from './customer';

/** Dependencias reales (D1 + Resend) de las reseñas de clientes. Solo servidor. */
export function customerReviewDeps(now = new Date()): CustomerReviewDeps {
  const prisma = getPrisma();
  const bookings = createBookingRepo(prisma);
  const env = process.env as Record<string, string | undefined>;
  return {
    now,
    secret: env.CRON_SECRET ?? '',
    siteUrl: env.SITE_URL ?? '',
    findBooking: (token) => bookings.findByToken(token),
    findReviewByRef: (refNumber) => prisma.customerReview.findUnique({ where: { refNumber } }) as Promise<StoredReview | null>,
    findReviewById: (id) => prisma.customerReview.findUnique({ where: { id } }) as Promise<StoredReview | null>,
    saveReview: (data) =>
      prisma.customerReview.upsert({
        where: { refNumber: data.refNumber },
        create: { ...data, status: 'pending' },
        update: { ...data, status: 'pending', moderatedAt: null },
      }) as Promise<StoredReview>,
    setStatus: async (id, status) => {
      await prisma.customerReview.update({ where: { id }, data: { status, moderatedAt: new Date() } });
    },
    tourTitle: async (id) => (id ? (await getTourSummary(prisma, id, 'es').catch(() => null))?.title ?? null : null),
    notify: async (email) => {
      if (!env.RESEND_API_KEY || !env.EMAIL_REPLY_TO) return;
      await sendEmail({ apiKey: env.RESEND_API_KEY, fetch }, { ...email, from: env.EMAIL_FROM ?? '', to: env.EMAIL_REPLY_TO });
    },
  };
}

/** Reseñas publicadas de un tour (más recientes primero). */
export async function listPublishedReviews(tourExternalId: number, limit = 30) {
  return getPrisma().customerReview.findMany({
    where: { tourExternalId, status: 'published', consent: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/** Lista para el panel. */
export async function listReviewsForAdmin(status: string | null) {
  return getPrisma().customerReview.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}
