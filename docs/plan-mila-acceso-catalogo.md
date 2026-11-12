# Plan do-plan · Mila con acceso a todo el catálogo y contenido (REQ-3346 a REQ-3353)

Petición del PO (12 nov 2026 04:26): «hoy en día Mila no tiene toda la información a la mano y prácticamente te lleva a la página para todo; necesito que tenga acceso a la base de datos completa (apagando FREETOUR) con todos los detalles, blogs, guías, términos y condiciones, aviso de privacidad, datos legales de la empresa, todo, fotografías, que pueda hacer consultas en línea».

## Auditoría (solo lectura)
- Hoy Mila (agente del cliente Travel Puzzle en zoefel-mila, `src/catalogo/`) solo llama `GET /api/agente/buscar` (título, resumen de 280 caracteres, lugares, precio «desde», duración, 5 fechas, liga) y `GET /api/agente/viaje` (revisa fecha y da la liga). Por eso manda a la página para todo lo demás.
- La tabla `Trip` ya tiene todo el detalle: descripción, itinerario, incluye/no incluye, opciones con precio final, extras, cancelación, puntos de encuentro, idiomas, dificultad, información importante, qué llevar, visa, fotos (`images`) y video.
- Blog: `src/blog/load.ts` (posts visibles). Guías de destino: `src/destinations/lib/guia.ts`. Ayuda: `src/help/lib/faq.ts`. Legal: `src/legal/lib/terminos.ts` (incluye razón social, RNT, contrato PROFECO, domicilio y horario) y `privacidad.ts`.
- FREETOUR vive en la tabla `Tour`, que esta API no lee. El agente no lo promueve ni reserva (cumplimiento FREETOUR B3).

## Estructura
Nuevos en travel-puzzle-web:
- `src/agente/lib/detalle.ts`: ficha completa del viaje para el agente (pura).
- `src/agente/lib/contenido.ts`: búsqueda en blog, guías y ayuda (pura).
- `src/agente/lib/legal.ts`: términos, privacidad y datos de la empresa (pura).
- `src/app/api/agente/detalle/route.ts`, `src/app/api/agente/contenido/route.ts`, `src/app/api/agente/legal/route.ts`, con la misma llave `AGENTE_TOKEN` y la bandera `AGENTE_API_ENABLED`.
Nuevos o modificados en zoefel-mila:
- `src/catalogo/lib/consulta.js` y `src/catalogo/agente.js`: según G1, el contexto ampliado o las herramientas de consulta.
- `src/catalogo/lib/fotos.js`: token `[FOTO_VIAJE:slug|n]` que el sistema cambia por la imagen (G2).

## Unit tests
- Nuevos: `src/agente/lib/detalle.test.ts`, `contenido.test.ts`, `legal.test.ts` (REQ-3346 a REQ-3348): nunca sale neto, margen ni datos de clientes; FREETOUR nunca sale.
- Existentes que se reusan: los de `src/agente/lib/catalogo.ts`.
- zoefel-mila: `tests/catalogo/*.test.js` con REQ-030 y REQ-031.
- `npx vitest run <archivo>` por pieza y la suite completa al final.

## SOLID
- SRP: una función pura por tipo de consulta; las rutas solo autentican y llaman.
- OCP: un tipo de contenido nuevo se agrega como fuente, sin tocar las demás.
- LSP: `/api/agente/buscar` y `/viaje` no cambian.
- ISP: cada ruta devuelve solo lo que el agente usa.
- DIP: datos por parámetro (`catalogoDeps`).

## Lo que nunca se expone
Tarifas netas, márgenes, anexo de proveedores, datos de clientes, reservas, pagos ni nada de FREETOUR.

## Gates (uno por uno)
- G1 (REQ-3351): cómo consulta Mila.
- G2 (REQ-3352): fotos por WhatsApp.
- G3 (REQ-3353): firma del plan.
