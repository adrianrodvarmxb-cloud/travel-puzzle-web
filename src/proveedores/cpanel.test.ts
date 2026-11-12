// REQ-1562: subirDocumento arma el Blob con los bytes exactos y sin error de tipos (el build revisa tipos).
import { describe, it, expect } from "vitest";
import { subirDocumento } from "./cpanel";

describe("REQ-1562: subida a cPanel con bytes de cualquier origen", () => {
  it("REQ-1562: manda los mismos bytes aunque el Uint8Array venga de un buffer compartido", async () => {
    const llamadas: { url: string; body?: unknown }[] = [];
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      llamadas.push({ url, body: init?.body });
      return new Response(JSON.stringify({ status: 1 }), { status: 200 });
    }) as unknown as typeof fetch;
    const buf = new Uint8Array(new ArrayBuffer(8), 2, 3);
    buf.set([7, 8, 9]);
    await subirDocumento({ host: "h", user: "u", token: "t", fetch: fakeFetch }, "proveedores-docs/acme/a.pdf", buf, "application/pdf");
    const subida = llamadas.find((l) => l.url.includes("upload_files"));
    const archivo = (subida?.body as FormData).get("file-1") as Blob;
    expect(Array.from(new Uint8Array(await archivo.arrayBuffer()))).toEqual([7, 8, 9]);
  });
});
