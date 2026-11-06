// REQ-126: puerta común de la ventana del agente (bandera + llave). Sin bandera responde 404, como si no existiera.
import { NextRequest, NextResponse } from 'next/server';
import { autorizado } from '@/agente/lib/catalogo';
import { agenteHabilitado } from '@/agente/catalogo';

export function puerta(req: NextRequest): NextResponse | null {
    const env = process.env as Record<string, string | undefined>;
    if (!agenteHabilitado(env)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (!autorizado(req.headers.get('authorization'), env.AGENTE_TOKEN)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    return null;
}
export const sinCache = { headers: { 'cache-control': 'no-store' } };
