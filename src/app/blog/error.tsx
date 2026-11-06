'use client';

import Link from 'next/link';

/** Si algo del blog falla, mensaje útil y salida (nunca pantalla en blanco). */
export default function BlogError() {
  return (
    <main className="tp-dark mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-white">No pudimos abrir este artículo.</h1>
      <p className="text-[#C9D6F5]">Intenta de nuevo en un momento o vuelve al inicio.</p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-[#008DFF] px-5 text-sm font-semibold text-white">Ir al inicio</Link>
    </main>
  );
}
