// REQ-1560..REQ-1564: metas de rendimiento y su evaluación sobre un reporte de Lighthouse (lógica pura).

export const BUDGET = {
  lcpMs: 2500, // REQ-1560
  cls: 0.1, // REQ-1561
  tbtMs: 200, // REQ-1562 (proxy de laboratorio de INP)
  bytes: 1.5 * 1024 * 1024, // REQ-1563
  offscreenImages: 0, // REQ-1564
} as const;

export type Metrics = {
  url: string;
  formFactor: string;
  lcpMs: number;
  cls: number;
  tbtMs: number;
  ttfbMs: number;
  bytes: number;
  requests: number;
  offscreenImages: number;
};

type Lhr = {
  finalDisplayedUrl?: string;
  runtimeError?: { code: string; message: string };
  configSettings?: { formFactor?: string };
  audits: Record<string, { numericValue?: number; details?: { items?: unknown[] } }>;
};

/** Saca las métricas de un reporte; falla si Lighthouse reportó error (no es medición válida). */
export function extractMetrics(lhr: Lhr): Metrics {
  if (lhr.runtimeError) throw new Error(`Lighthouse ${lhr.runtimeError.code}: ${lhr.runtimeError.message}`);
  const n = (k: string) => {
    const v = lhr.audits[k]?.numericValue;
    if (typeof v !== 'number') throw new Error(`Falta la auditoría ${k}`);
    return v;
  };
  return {
    url: lhr.finalDisplayedUrl ?? '',
    formFactor: lhr.configSettings?.formFactor ?? 'mobile',
    lcpMs: n('largest-contentful-paint'),
    cls: n('cumulative-layout-shift'),
    tbtMs: n('total-blocking-time'),
    ttfbMs: n('server-response-time'),
    bytes: n('total-byte-weight'),
    requests: lhr.audits['network-requests']?.details?.items?.length ?? 0,
    offscreenImages: lhr.audits['offscreen-images']?.details?.items?.length ?? 0,
  };
}

export type BudgetResult = { req: string; label: string; value: string; ok: boolean };

export function evaluateBudget(m: Metrics): BudgetResult[] {
  return [
    { req: 'REQ-1560', label: 'LCP < 2.5 s', value: `${(m.lcpMs / 1000).toFixed(2)} s`, ok: m.lcpMs < BUDGET.lcpMs },
    { req: 'REQ-1561', label: 'CLS < 0.1', value: m.cls.toFixed(3), ok: m.cls < BUDGET.cls },
    { req: 'REQ-1562', label: 'TBT < 200 ms', value: `${Math.round(m.tbtMs)} ms`, ok: m.tbtMs < BUDGET.tbtMs },
    { req: 'REQ-1563', label: 'Peso < 1.5 MB', value: `${(m.bytes / 1048576).toFixed(2)} MB`, ok: m.bytes < BUDGET.bytes },
    { req: 'REQ-1564', label: '0 imágenes fuera del viewport', value: String(m.offscreenImages), ok: m.offscreenImages <= BUDGET.offscreenImages },
  ];
}
