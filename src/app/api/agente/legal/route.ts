// REQ-3348: términos, aviso de privacidad y datos de la empresa vigentes, para el agente (solo lectura).
import { NextRequest, NextResponse } from 'next/server';
import { consultaLegal } from '@/agente/lib/legal';
import { TERMINOS } from '@/legal/lib/terminos';
import { PRIVACIDAD_INTEGRAL } from '@/legal/lib/privacidad';
import { puerta, sinCache } from '../respuesta';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const no = puerta(req); if (no) return no;
    const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 300);
    return NextResponse.json(consultaLegal(q, { terminos: TERMINOS, privacidad: PRIVACIDAD_INTEGRAL }, process.env.SITE_URL ?? 'https://travelpuzzle.com.mx'), sinCache);
}
