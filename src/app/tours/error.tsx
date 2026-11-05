'use client';
import { Navbar } from '@/components/layout/Navbar';
/** INC-003 (regla 7): si la lista de tours falla, se avisa y se puede reintentar; nunca pantalla en blanco. */
export default function ToursError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
    {/* REQ-062: header del sitio también en la pantalla de error */}
    <Navbar />
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Estamos cargando muchos tours a la vez</h1>
      <p className="text-slate-600">Danos unos segundos y vuelve a intentarlo. Si sigue, escríbenos por WhatsApp y te ayudamos.</p>
      <div className="flex gap-3">
        <button onClick={() => reset()} className="rounded-xl bg-orange-700 px-5 py-3 font-semibold text-white">Reintentar</button>
        <a href="/" className="rounded-xl border px-5 py-3 font-semibold">Ir al inicio</a>
      </div>
    </main>
    </>
  );
}
