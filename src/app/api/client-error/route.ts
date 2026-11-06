import type { NextRequest } from 'next/server';
import { handleClientErrorReport } from '@/ops/lib/clientError';

/**
 * POST /api/client-error — REQ-221: registra errores del navegador con ruta y stack.
 * Se ven en Cloudflare → Workers → travel-puzzle-web → Logs (buscar "client-error").
 */
export async function POST(request: NextRequest) {
  const raw = await request.text().catch(() => '');
  const status = handleClientErrorReport(raw, request.headers.get('user-agent'), (line) => console.error(line));
  return new Response(null, { status });
}
