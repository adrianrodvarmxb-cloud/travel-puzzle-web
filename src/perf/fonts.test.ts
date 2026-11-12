import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('REQ-1560: fuentes sin bloquear el render', () => {
  it('REQ-1560: globals.css ya no importa Google Fonts (bloqueaba ~900 ms en móvil)', () => {
    expect(readFileSync('src/app/globals.css', 'utf8')).not.toMatch(/fonts\.googleapis\.com/);
  });
  it('REQ-1560: Poppins, Space Grotesk y JetBrains Mono salen de next/font (local desde REQ-1616) con display swap; solo Poppins se precarga', () => {
    const l = readFileSync('src/app/layout.tsx', 'utf8');
    for (const f of ['poppins/', 'space-grotesk/', 'jetbrains-mono/']) expect(l).toContain(f); // REQ-1616: ahora locales
    expect(l.match(/display: "swap"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(l.match(/preload: true/g)?.length).toBe(1);
  });
  it('REQ-1560: las clases de marca usan las variables de next/font', () => {
    const g = readFileSync('src/app/globals.css', 'utf8');
    expect(g).toMatch(/\.font-display \{ font-family: var\(--font-space-grotesk\)/);
    expect(g).toMatch(/\.font-data \{ font-family: var\(--font-jetbrains-mono\)/);
    expect(readFileSync('src/styles/design-system/typography.css', 'utf8')).toMatch(/--tp-font-primary: var\(--font-poppins-nf\)/);
  });
});

describe('REQ-1560: las variables de fuente se resuelven en :root', () => {
  it('REQ-1560: las clases de next/font van en <html> (si van en <body>, --tp-font-primary queda inválida)', () => {
    const l = readFileSync('src/app/layout.tsx', 'utf8');
    expect(l).toMatch(/<html[^>]*className=\{`[^`]*poppins\.variable/);
  });
});

describe('REQ-1616: el build no descarga fuentes de Google (INC-012)', () => {
  const l = readFileSync('src/app/layout.tsx', 'utf8');
  it('REQ-1616: layout.tsx usa next/font/local y ya no next/font/google', () => {
    expect(l).toContain('next/font/local');
    expect(l).not.toContain('next/font/google');
  });
  it('REQ-1616: cada archivo de fuente que cita layout.tsx existe en el repo y su licencia OFL va junto', () => {
    const paths = [...l.matchAll(/path: "(\.\/fonts\/[^"]+\.woff2)"/g)].map((m) => m[1]);
    expect(paths.length).toBeGreaterThanOrEqual(12);
    for (const p of paths) expect(existsSync(join('src/app', p)), p).toBe(true);
    for (const f of ['poppins', 'space-grotesk', 'jetbrains-mono', 'geist-sans', 'geist-mono']) expect(existsSync(`src/app/fonts/${f}/LICENSE`), f).toBe(true);
  });
});
