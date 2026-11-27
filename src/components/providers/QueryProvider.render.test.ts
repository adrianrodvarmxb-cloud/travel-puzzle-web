// @vitest-environment happy-dom
// REQ-10946 (ola 15, REQ-1562): el QueryClient se crea una sola vez. Antes, `isReady` (idioma detectado)
// estaba en las dependencias del `useMemo`: al terminar la detección se creaba un cliente nuevo, se perdía la
// caché y cada consulta volvía a pedir sus datos (doble fetch de /tours y repintado de todo el árbol).
import { afterEach, describe, expect, it } from "vitest";
import { createElement as h, useState, act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/components/providers/QueryProvider";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mount(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(node));
}

let setReady: (v: boolean) => void = () => {};
function Harness({ children }: { children: ReactNode }) {
  const [ready, set] = useState(false);
  setReady = set;
  return h(QueryProvider, { isReady: ready, children });
}

describe("REQ-10946: QueryProvider con un solo QueryClient", () => {
  it("REQ-10946: el cliente conserva su identidad cuando `isReady` pasa a true", async () => {
    const clients: QueryClient[] = [];
    function Probe() {
      clients.push(useQueryClient());
      return null;
    }
    mount(h(Harness, null, h(Probe)));
    await act(async () => setReady(true));
    // Con main, el cambio de cliente repinta a Probe y deja 2 clientes distintos.
    expect(new Set(clients).size).toBe(1);
  });

  it("REQ-10946: lo que se monta después de la detección usa la misma caché (no vuelve a pedir los datos)", async () => {
    let fetches = 0;
    function Probe({ id }: { id: string }) {
      const { data } = useQuery({
        queryKey: ["req-10946"],
        queryFn: async () => {
          fetches += 1;
          return "ok";
        },
        enabled: true,
      });
      return h("span", { id }, data ?? "…");
    }
    let showSecond: (v: boolean) => void = () => {};
    function Tree() {
      const [second, set] = useState(false);
      showSecond = set;
      return h("div", null, h(Probe, { id: "a" }), second ? h(Probe, { id: "b" }) : null);
    }
    mount(h(Harness, null, h(Tree)));
    await act(async () => sleep(20));
    expect(document.getElementById("a")?.textContent).toBe("ok");
    await act(async () => setReady(true));
    await act(async () => showSecond(true));
    await act(async () => sleep(20));
    expect(document.getElementById("b")?.textContent).toBe("ok");
    expect(fetches).toBe(1);
  });

  it("REQ-10946: una invalidación desde useQueryClient() llega a las consultas ya montadas", async () => {
    let fetches = 0;
    let client: QueryClient | null = null;
    function Probe() {
      client = useQueryClient();
      const { data } = useQuery({
        queryKey: ["req-10946-inv"],
        queryFn: async () => {
          fetches += 1;
          return `v${fetches}`;
        },
        enabled: true,
      });
      return h("span", { id: "inv" }, data ?? "…");
    }
    mount(h(Harness, null, h(Probe)));
    await act(async () => sleep(20));
    await act(async () => setReady(true));
    await act(async () => {
      await client!.invalidateQueries({ queryKey: ["req-10946-inv"] });
      await sleep(20);
    });
    expect(document.getElementById("inv")?.textContent).toBe("v2");
  });

  it("REQ-10946: las opciones por defecto de siempre (staleTime 1 min, sin refetch al enfocar, 1 reintento)", async () => {
    let client: QueryClient | null = null;
    function Probe() {
      client = useQueryClient();
      return null;
    }
    mount(h(QueryProvider, { children: h(Probe) }));
    const q = client!.getDefaultOptions().queries!;
    expect(q.staleTime).toBe(60 * 1000);
    expect(q.gcTime).toBe(5 * 60 * 1000);
    expect(q.refetchOnWindowFocus).toBe(false);
    expect(q.retry).toBe(1);
  });
});
