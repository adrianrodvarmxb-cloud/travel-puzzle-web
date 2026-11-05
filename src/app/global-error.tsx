'use client';
/* eslint-disable @next/next/no-img-element */
/** INC-003 (regla 7): último respaldo de toda la app; nunca pantalla en blanco. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#0b1630', color: '#fff', margin: 0 }}>
        {/* REQ-062: sin proveedores aquí no cabe el Navbar; al menos el logo animado del home */}
        <header style={{ background: '#2563eb', padding: '8px 16px' }}>
          <a href="/"><img src="/logo-travel.gif" alt="Travel Puzzle" width={64} height={64} style={{ borderRadius: 9999, background: '#fff' }} /></a>
        </header>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24 }}>Algo no cargó bien</h1>
          <p style={{ opacity: 0.8 }}>Vuelve a intentarlo en unos segundos.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => reset()} style={{ padding: '12px 20px', borderRadius: 12, border: 0, background: '#c2410c', color: '#fff', fontWeight: 600 }}>Reintentar</button>
            <a href="/" style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid #fff', color: '#fff', textDecoration: 'none' }}>Ir al inicio</a>
          </div>
        </main>
      </body>
    </html>
  );
}
