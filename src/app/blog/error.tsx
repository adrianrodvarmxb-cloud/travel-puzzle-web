'use client';

import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';

/** Si algo del blog falla: header del sitio (REQ-062), mensaje útil, reintentar y salida; nunca pantalla en blanco. */
export default function BlogError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <Navbar />
      <main className="tp-dark mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-4 px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-white">No pudimos abrir esta página del blog.</h1>
        <p className="text-[#C9D6F5]">Danos unos segundos y vuelve a intentarlo. Si sigue, escríbenos por WhatsApp y te ayudamos.</p>
        <div className="flex gap-3">
          <button onClick={() => reset()} className="inline-flex min-h-11 items-center rounded-full bg-[#008DFF] px-5 text-sm font-semibold text-white">Reintentar</button>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white">Ir al inicio</Link>
        </div>
      </main>
    </>
  );
}
