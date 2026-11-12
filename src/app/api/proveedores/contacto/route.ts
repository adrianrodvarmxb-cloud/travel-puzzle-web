import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { dbDePrisma } from '@/proveedores/repository';
import { createContactoRepo } from '@/proveedores/contacto-repo';
import { atenderContacto, type PeticionContacto } from '@/proveedores/contacto';
import { proveedoresEncendido } from '@/proveedores/deps';

export const dynamic = 'force-dynamic';

// REQ-3430: la revisión cada 6 h consulta (GET) y aparta o libera (POST) antes de escribirle a un proveedor.
// Secreto PROVEEDORES_CONTACTO_TOKEN (lo carga el PO en Cloudflare); apagado tras PROVEEDORES_MILA_ON.
async function atender(request: Request, metodo: PeticionContacto['metodo']) {
    const env = process.env as Record<string, string | undefined>;
    const url = new URL(request.url);
    const cuerpo = metodo === 'POST' ? await request.json().catch(() => null) : undefined;
    const r = await atenderContacto(
        { autorizacion: request.headers.get('authorization'), metodo, proveedor: url.searchParams.get('proveedor'), cuerpo },
        { repo: createContactoRepo(dbDePrisma(getPrisma() as never)), ahora: new Date().toISOString(), secreto: env.PROVEEDORES_CONTACTO_TOKEN ?? '', encendido: proveedoresEncendido(env) },
    );
    return NextResponse.json(r.cuerpo, { status: r.status });
}

export const GET = (request: Request) => atender(request, 'GET');
export const POST = (request: Request) => atender(request, 'POST');
