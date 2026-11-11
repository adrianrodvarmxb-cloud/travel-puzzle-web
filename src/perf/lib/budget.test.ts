import { describe, it, expect } from 'vitest';
import { extractMetrics, evaluateBudget, BUDGET } from './budget';

function lhr(o: { lcp?: number; cls?: number; tbt?: number; bytes?: number; offscreen?: number }) {
  return {
    finalDisplayedUrl: 'https://travelpuzzle.com.mx/',
    configSettings: { formFactor: 'mobile' },
    audits: {
      'largest-contentful-paint': { numericValue: o.lcp ?? 1000 },
      'cumulative-layout-shift': { numericValue: o.cls ?? 0 },
      'total-blocking-time': { numericValue: o.tbt ?? 50 },
      'total-byte-weight': { numericValue: o.bytes ?? 500_000 },
      'server-response-time': { numericValue: 200 },
      'offscreen-images': { details: { items: Array.from({ length: o.offscreen ?? 0 }, () => ({})) } },
      'network-requests': { details: { items: [{}, {}] } },
    },
  };
}

describe('presupuesto de rendimiento (lógica pura)', () => {
  it('REQ-1560: LCP < 2.5 s en móvil; 2.5 s exactos o más es NO CUMPLIDO', () => {
    expect(evaluateBudget(extractMetrics(lhr({ lcp: 2499 }))).find((r) => r.req === 'REQ-1560')?.ok).toBe(true);
    expect(evaluateBudget(extractMetrics(lhr({ lcp: 2500 }))).find((r) => r.req === 'REQ-1560')?.ok).toBe(false);
  });

  it('REQ-1561: CLS < 0.1', () => {
    expect(evaluateBudget(extractMetrics(lhr({ cls: 0.099 }))).find((r) => r.req === 'REQ-1561')?.ok).toBe(true);
    expect(evaluateBudget(extractMetrics(lhr({ cls: 0.1 }))).find((r) => r.req === 'REQ-1561')?.ok).toBe(false);
  });

  it('REQ-1562: TBT de laboratorio < 200 ms (proxy de INP)', () => {
    expect(evaluateBudget(extractMetrics(lhr({ tbt: 199 }))).find((r) => r.req === 'REQ-1562')?.ok).toBe(true);
    expect(evaluateBudget(extractMetrics(lhr({ tbt: 200 }))).find((r) => r.req === 'REQ-1562')?.ok).toBe(false);
  });

  it('REQ-1563: peso de la carga inicial < 1.5 MB', () => {
    expect(BUDGET.bytes).toBe(1.5 * 1024 * 1024);
    expect(evaluateBudget(extractMetrics(lhr({ bytes: BUDGET.bytes - 1 }))).find((r) => r.req === 'REQ-1563')?.ok).toBe(true);
    expect(evaluateBudget(extractMetrics(lhr({ bytes: BUDGET.bytes }))).find((r) => r.req === 'REQ-1563')?.ok).toBe(false);
  });

  it('REQ-1564: ninguna imagen fuera del viewport en la carga inicial', () => {
    expect(evaluateBudget(extractMetrics(lhr({ offscreen: 0 }))).find((r) => r.req === 'REQ-1564')?.ok).toBe(true);
    expect(evaluateBudget(extractMetrics(lhr({ offscreen: 1 }))).find((r) => r.req === 'REQ-1564')?.ok).toBe(false);
  });

  it('un reporte con error de Lighthouse no cuenta como medición verde', () => {
    expect(() => extractMetrics({ ...lhr({}), runtimeError: { code: 'NO_FCP', message: 'x' } })).toThrow(/NO_FCP/);
  });
});
