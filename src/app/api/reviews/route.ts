import { NextRequest, NextResponse } from 'next/server';
import { reviewInputSchema } from '@/reviews/schemas/customer-review';
import { submitReview } from '@/reviews/customer';
import { customerReviewDeps } from '@/reviews/customer-deps';

/** POST /api/reviews — guarda la reseña de la reserva (token privado del correo). */
export async function POST(request: NextRequest) {
  const parsed = reviewInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'datos inválidos' }, { status: 400 });
  const result = await submitReview(parsed.data, customerReviewDeps());
  if (result === 'not_found') return NextResponse.json({ error: 'reserva no encontrada' }, { status: 404 });
  if (result === 'not_allowed') return NextResponse.json({ error: 'todavía no se puede reseñar' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
