import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('REQ-1530: fuentes sin bloquear el render', () => {
  it('REQ-1530: globals.css ya no importa Google Fonts (bloqueaba ~900 ms en móvil)', () => {
    expect(readFileSync('src/app/globals.css', 'utf8')).not.toMatch(/fonts\.googleapis\.com/);
  });
  it('REQ-1530: Poppins, Space Grotesk y JetBrains Mono salen de next/font con display swap; solo Poppins se precarga', () => {
    const l = readFileSync('src/app/layout.tsx', 'utf8');
    for (const f of ['Poppins', 'Space_Grotesk', 'JetBrains_Mono']) expect(l).toContain(f);
    expect(l.match(/display: "swap"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(l.match(/preload: true/g)?.length).toBe(1);
  });
  it('REQ-1530: las clases de marca usan las variables de next/font', () => {
    const g = readFileSync('src/app/globals.css', 'utf8');
    expect(g).toMatch(/\.font-display \{ font-family: var\(--font-space-grotesk\)/);
    expect(g).toMatch(/\.font-data \{ font-family: var\(--font-jetbrains-mono\)/);
    expect(readFileSync('src/styles/design-system/typography.css', 'utf8')).toMatch(/--tp-font-primary: var\(--font-poppins-nf\)/);
  });
});

describe('REQ-1530: las variables de fuente se resuelven en :root', () => {
  it('REQ-1530: las clases de next/font van en <html> (si van en <body>, --tp-font-primary queda inválida)', () => {
    const l = readFileSync('src/app/layout.tsx', 'utf8');
    expect(l).toMatch(/<html[^>]*className=\{`[^`]*poppins\.variable/);
  });
});
