import { describe, it, expect } from 'vitest';
import { offscreenLoaded } from './offscreen';

const img = (top: number, height: number, loaded: boolean, src = 'x.jpg', lazy = false) => ({ src, top, height, loaded, lazy });

describe('REQ-1564: imágenes descargadas fuera de la pantalla inicial (lógica pura)', () => {
  it('REQ-1564: una imagen descargada que empieza bajo el pliegue se reporta', () => {
    expect(offscreenLoaded([img(900, 200, true, 'abajo.jpg')], 844).map((i) => i.src)).toEqual(['abajo.jpg']);
  });
  it('REQ-1564: las visibles o que tocan la pantalla no se reportan, aunque estén descargadas', () => {
    expect(offscreenLoaded([img(0, 300, true), img(800, 200, true)], 844)).toEqual([]);
  });
  it('REQ-1564: una imagen bajo el pliegue que NO se descargó (lazy) no se reporta', () => {
    expect(offscreenLoaded([img(2000, 200, false)], 844)).toEqual([]);
  });
  it('REQ-1564: imágenes ocultas (alto 0) no cuentan', () => {
    expect(offscreenLoaded([img(1200, 0, true)], 844)).toEqual([]);
  });
  it('REQ-1564: una imagen lazy que el navegador adelantó por estar cerca del pliegue no es falla nuestra', () => {
    expect(offscreenLoaded([img(1100, 200, true, 'cerca.jpg', true)], 844)).toEqual([]);
  });
});
