import { NextRequest } from 'next/server';
import { parseClientError } from '@/ops/lib/clientError';

/**
 * POST /api/client-error — REQ-029: registra errores del navegador con ruta y stack.
 * Se ven en Cloudflare → Workers → travel-puzzle-web → Logs (buscar "client-error").
 */
export async function POST(request: NextRequest) {
  const raw = await request.text().catch(() => '');
  if (raw.length > 16_000) return new Response(null, { status: 413 });
  let json: unknown = null;
  try { json = JSON.parse(raw); } catch { /* inválido */ }
  const report = parseClientError(json);
  if (!report) return new Response(null, { status: 400 });
  console.error(JSON.stringify({ type: 'client-error', ...report, ua: request.headers.get('user-agent')?.slice(0, 200) ?? '' }));
  return new Response(null, { status: 204 });
}
