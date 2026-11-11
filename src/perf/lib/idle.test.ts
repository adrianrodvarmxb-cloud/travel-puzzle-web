import { describe, it, expect, vi } from 'vitest';
import { whenIdle } from './idle';

describe('REQ-1562: trabajo pesado (mapas) espera a que el navegador quede libre', () => {
  it('REQ-1562: usa requestIdleCallback con tope de 2 s cuando existe', async () => {
    const ric = vi.fn((cb: () => void, _o?: { timeout: number }) => { cb(); return 1; });
    await whenIdle({ requestIdleCallback: ric });
    expect(ric).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 });
  });
  it('REQ-1562: sin requestIdleCallback (Safari) cae a setTimeout', async () => {
    const st = vi.fn((cb: () => void, _ms?: number) => { cb(); return 1; });
    await whenIdle({ setTimeout: st });
    expect(st).toHaveBeenCalledWith(expect.any(Function), 200);
  });
  it('REQ-1562: en servidor (sin ventana) resuelve de inmediato', async () => {
    await expect(whenIdle(undefined)).resolves.toBeUndefined();
  });
});
