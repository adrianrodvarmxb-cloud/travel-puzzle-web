/** REQ-586: clave de IndexNow (keyLocation). Solo con INDEXNOW_ENABLED="true" y INDEXNOW_KEY; si no, 404. */
import { keyFileResponse } from '@/seo/indexnow-run';

export const dynamic = 'force-dynamic';

export function GET() {
    return keyFileResponse(process.env as Record<string, string | undefined>);
}
