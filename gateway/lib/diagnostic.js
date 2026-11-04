// REQ-020 — Diagnóstico de INC-002 (403 al cancelar). Puro: arma las llamadas y resume el resultado.
const seg = (v) => encodeURIComponent(String(v));

/** Mismas llamadas que hace el sitio, con los 4 campos que marca el Swagger. La cancelación va al final. */
export function diagnosticCalls(r) {
  const body = { refNumber: r.refNumber, eventId: r.eventId, adults: r.adults, children: r.children };
  return [
    { label: "Consulta previa (GET /booking)", method: "GET", path: `/booking/${seg(r.refNumber)}` },
    { label: "Evento para editar (GET /event/{id}/{ref})", method: "GET", path: `/event/${seg(r.eventId)}/${seg(r.refNumber)}` },
    { label: "Editar sin cambios (POST /booking/edit)", method: "POST", path: "/booking/edit", body },
    { label: "Cancelar (POST /booking/cancel)", method: "POST", path: "/booking/cancel", body },
  ];
}

/** Conclusión a partir de los códigos HTTP en el mismo orden que diagnosticCalls. */
export function summarize(res) {
  const [get, ev, edit, cancel] = res.map((x) => x?.status);
  if (cancel === 200) return "OK: Freetour aceptó la cancelación";
  if (get !== 200) return "ACCESO: la consulta falla; revisar host, token o IP";
  if (cancel === 403 && edit === 403) return "EXTERNO: Freetour bloquea las operaciones de modo 2 (editar y cancelar) para esta cuenta";
  if (cancel === 403) return "EXTERNO: Freetour bloquea solo la cancelación para esta cuenta";
  return `REVISAR: consulta ${get}, evento ${ev}, editar ${edit}, cancelar ${cancel}`;
}
