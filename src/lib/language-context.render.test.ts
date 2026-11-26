// @vitest-environment happy-dom
// REQ-10884 (ola 15, REQ-1562): el valor del idioma no cambia de identidad cuando termina la detección
// (isInitialized) ni cuando el padre se vuelve a pintar; así los ~62 consumidores de useLanguage()
// no se repintan después de hidratar. Cambiar de idioma sí los repinta.
import { afterEach, describe, expect, it } from "vitest";
import { createElement as h, StrictMode, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { LanguageProvider, useLanguage, useLanguageReady } from "@/lib/language-context";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  localStorage.clear();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mount(node: ReactNode) {
  // happy-dom trae el navegador en inglés: se fija español para medir solo la detección.
  if (!localStorage.getItem("preferredLanguage")) localStorage.setItem("preferredLanguage", "es");
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(node));
}

describe("REQ-10884: LanguageProvider sin repintar a sus consumidores", () => {
  it("REQ-10884: terminar la detección (isInitialized) no repinta a un consumidor", async () => {
    const renders: string[] = [];
    function Probe() {
      const { language, t } = useLanguage();
      renders.push(language);
      return h("span", { id: "probe" }, t("nav.home"));
    }
    const probe = h(Probe);
    mount(h(LanguageProvider, null, probe));
    expect(renders).toHaveLength(1);
    await act(async () => {
      await sleep(250);
    });
    expect(renders).toHaveLength(1);
    expect(document.getElementById("probe")?.textContent).toBe("Inicio");
  });

  it("REQ-10884: si el padre se vuelve a pintar con los mismos hijos, el consumidor no se repinta", async () => {
    let renders = 0;
    function Probe() {
      useLanguage();
      renders += 1;
      return null;
    }
    let bump: () => void = () => {};
    const probe = h(Probe);
    function Parent() {
      const [n, setN] = useState(0);
      bump = () => setN(n + 1);
      return h(LanguageProvider, null, probe);
    }
    mount(h(Parent));
    await act(async () => {
      await sleep(250);
    });
    const before = renders;
    act(() => bump());
    expect(renders).toBe(before);
  });

  it("REQ-10884: useLanguageReady pasa a true al terminar la detección", async () => {
    const seen: boolean[] = [];
    function Ready() {
      seen.push(useLanguageReady());
      return null;
    }
    mount(h(LanguageProvider, null, h(Ready)));
    expect(seen[0]).toBe(false);
    await act(async () => {
      await sleep(250);
    });
    expect(seen.at(-1)).toBe(true);
  });

  it("REQ-10884: cambiar de idioma sí repinta y traduce (mismo resultado de t())", async () => {
    let api: ReturnType<typeof useLanguage> | null = null;
    function Probe() {
      api = useLanguage();
      return h("span", { id: "probe" }, api.t("nav.home"));
    }
    mount(h(StrictMode, null, h(LanguageProvider, null, h(Probe))));
    await act(async () => {
      await sleep(250);
    });
    const setLanguage = api!.setLanguage;
    await act(async () => {
      api!.setLanguage("en");
      await sleep(50);
    });
    expect(api!.language).toBe("en");
    expect(document.getElementById("probe")?.textContent).toBe("Home");
    // setLanguage es estable entre pintadas (no cambia la identidad del valor por sí sola)
    expect(api!.setLanguage).toBe(setLanguage);
  });
});
