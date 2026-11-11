// REQ-1532: espera a que el navegador quede libre antes de arrancar trabajo pesado (p. ej. maplibre),
// para no competir con la primera interacción. Recibe la ventana por parámetro (DIP) para probarlo en Node.
type IdleWin = {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => unknown;
  setTimeout?: (cb: () => void, ms?: number) => unknown;
};

export function whenIdle(win: IdleWin | undefined = typeof window === 'undefined' ? undefined : (window as unknown as IdleWin)): Promise<void> {
  return new Promise((resolve) => {
    if (!win) return resolve();
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(() => resolve(), { timeout: 2000 });
      return;
    }
    if (typeof win.setTimeout === 'function') {
      win.setTimeout(() => resolve(), 200);
      return;
    }
    resolve();
  });
}
