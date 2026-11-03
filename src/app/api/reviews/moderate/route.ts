import { NextRequest, NextResponse } from 'next/server';
import { moderateInputSchema } from '@/reviews/schemas/customer-review';
import { moderateReview } from '@/reviews/customer';
import { customerReviewDeps } from '@/reviews/customer-deps';

/** POST /api/reviews/moderate — publicar u ocultar con enlace firmado (correo o panel). */
export async function POST(request: NextRequest) {
  const parsed = moderateInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'datos inválidos' }, { status: 400 });
  const result = await moderateReview(parsed.data, customerReviewDeps());
  const status = result === 'invalid' ? 403 : result === 'not_found' ? 404 : result === 'no_consent' ? 409 : 200;
  return NextResponse.json({ result }, { status });
}
