// REQ-3318: aplica la regla del borde a la respuesta del middleware (I/O: lee método y cookies).
import { edgeCacheHeader, EDGE_CACHE_HEADER } from './lib/edge-cache';

type Req = { method: string; cookies: { getAll(): { name: string }[] } };
type Res = { headers: Headers };

export function withEdgeCache<R extends Res>(request: Req, pathname: string, response: R): R {
  const value = edgeCacheHeader({ method: request.method, pathname, cookieNames: request.cookies.getAll().map((c) => c.name) });
  if (value) response.headers.set(EDGE_CACHE_HEADER, value);
  return response;
}
