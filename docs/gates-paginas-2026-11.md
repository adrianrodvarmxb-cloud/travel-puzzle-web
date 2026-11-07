# Gates — Páginas institucionales (Nosotros, Contacto, Asesores, Blog) · 6 nov 2026

Estado: **PENDIENTES DE FIRMA DEL PO.** Se construyó con la opción recomendada en cada una, todo tras banderas en `"false"`.
Se firman en el chat, una por una. Si el PO elige otra opción, se ajusta en el mismo PR antes del merge.
Insumos: `paginas-nuevas/nosotros-contacto.md` y `paginas-nuevas/blog-plan.md` (scratchpad del 6 nov 2026).

## Nosotros (PR de /nosotros)

| # | Decisión | Opción aplicada (recomendada) | Alternativa | Firma |
|---|---|---|---|---|
| D2 | Banderas | Una por página: `NOSOTROS_ENABLED`, `CONTACTO_ENABLED`, `BLOG_ENABLED`, `EXPERTOS_ENABLED` (lo pidió el PO; sustituye a la bandera única del plan) | Una sola bandera para Nosotros y Contacto | [ ] |
| D3 | Dónde van los enlaces | En el pie, columna «Contacto», con el nombre igual al H1. El menú principal no cambia | También en el menú principal (pasa de 7 elementos con La Primera Pieza) | [ ] |
| D4 | Domicilio | No se publica en /nosotros, /contacto ni en el JSON-LD. Solo titular, RNT y contrato Profeco (ya públicos en /terminos) | Publicar calle | [ ] |
| D6 | «Garantías» | Fuera: ni «guía en español», ni «sin gastos adicionales», ni «única agencia» | Publicarlas cuando existan en los T&C | [ ] |
| D7 | Idioma | Copy en español e inglés según la cookie de idioma; metadatos solo en español | Solo español | [ ] |
| D8 | Cifras en vivo | Sí: `ProofStrip` con los datos del catálogo (misma caché del inicio); si la base falla, la sección no sale | No mostrar cifras | [ ] |
| D9 | Año del pie | Corregido de paso: el año llega del servidor por el contexto de banderas (INC-001) | PR aparte | [ ] |
| N1 | Bloque «Datos de la agencia» | Sí: titular, RNT 04100050179 y contrato Profeco 6635-2023, leídos del texto vigente de /terminos | No mostrarlo | [ ] |
| N2 | Copy de «Cómo trabajamos» | 4 tarjetas, solo con lo que hay en producción (elegir ciudad y tour, guías y agencias de cada ciudad, comunicación con Travel Puzzle de 9:00 a 19:00, condiciones publicadas) | Reescribir | [ ] |

Bloques en borrador (no salen en el sitio hasta que el PO llene el hueco y los marque «aprobado» en `src/about/lib/content.ts`):
- Historia: cargo de Claudia, «desde muy joven» o «a los 22», número de países, Durango o CDMX, año de fundación, retrato con permiso.
- Misión y visión: confirmar la redacción de 2023 (la visión dice «líder… al mejor precio»).
- Frase «Vivimos un viaje tres veces…».
- Equipo: personas, cargo, foto y permiso escrito.

## Contacto (PR de /contacto)

| # | Decisión | Opción aplicada (recomendada) | Alternativa | Firma |
|---|---|---|---|---|
| D1 | Formulario | **Sí**, porque lo pidió el PO (el plan recomendaba no hacerlo en esta entrega). Sin base de datos ni migración: un solo correo con Resend a info@, con reply-to del viajero. Consentimiento con enlace al aviso de privacidad (el integral y el simplificado ya listan «Respuesta a mensajes del formulario de contacto»). Sin casilla de publicidad (`MARKETING_CONSENT_ENABLED` sigue en false) | Solo WhatsApp y correo | [ ] |
| D1-b | Anti-spam | Campo trampa, 3 s mínimos de llenado y máximo 2 enlaces; el spam recibe «enviado» y no se manda nada. No se escribe nunca al viajero | Agregar Cloudflare Turnstile (requiere llave y secreto nuevos: candado) | [ ] |
| D4 | Domicilio | No se publica; solo canales en línea | — | [ ] |
| D5 | Correo público | Solo info@travelpuzzle.com.mx; contacto@ y comercial@ fuera | Agregar otro buzón (confirmar que existe) | [ ] |
| N3 | Formato del WhatsApp visible | «+52 1 55 3649 0320», como lo dio el PO (el enlace usa wa.me/525536490320) | «+52 55 3649 0320» | [ ] |
| N4 | Llamadas | Sin enlace tel: hasta confirmar que el número contesta llamadas | Agregar «Llamar» | [ ] |

Huecos que siguen abiertos (no se publican): días de atención y zona horaria (hoy solo «De 9:00 a 19:00 horas», como /ayuda), atención en inglés, URL oficial de Facebook, LinkedIn o X de empresa.

## Habla con un asesor de viaje (PR de /asesores)

| # | Decisión | Opción aplicada (recomendada) | Alternativa | Firma |
|---|---|---|---|---|
| E1 | Nombre | «Habla con un asesor de viaje» (H1, title y enlace del pie). La bandera conserva el nombre pedido: `EXPERTOS_ENABLED` | «Habla con un asesor»; otro nombre | [ ] |
| E2 | Formato | Página propia `/asesores` con el bloque reutilizable (WhatsApp + formulario corto) | Solo bloque dentro de /contacto o /nosotros | [ ] |
| E3 | Formulario | Nombre, correo, destino y aviso de privacidad obligatorios; WhatsApp, fechas y mensaje opcionales. Mismo envío y anti-spam que /contacto (Resend a info@) | Pedir WhatsApp obligatorio | [ ] |
| E4 | Personas | El bloque «Quiénes te atienden» no sale hasta tener nombres, destinos que conocen, fotos y permiso escrito | Publicar sin nombres | [ ] |

Hallazgo fuera de alcance (no se tocó): el inicio en producción todavía dice «Viajes armados por nuestros expertos» (src/trips/lib/copy.ts) y el menú del celular «Viajes armados por expertos» (src/home/lib/sections.ts). Choca con lo que el PO rechazó hoy; va en un PR aparte si el PO lo pide.

## Blog (PR de /blog)

Gate A del plan del blog (`paginas-nuevas/blog-plan.md`). Se construyó con lo recomendado; nada se publica.

| # | Decisión | Opción aplicada (recomendada) | Alternativa | Firma |
|---|---|---|---|---|
| B1 | Pilares | China, Perú y Machu Picchu, Colombia y Europa activos; Free tours **bloqueado** hasta la autorización B1 de FREETOUR por escrito; Asia fuera hasta publicar su inventario; transporte como satélite, no pilar | Otros pilares | [ ] |
| B2 | Almacenamiento | Opción A: artículos como datos tipados en `src/blog/content/` validados con Zod; sin base nueva ni migración | B (MDX) o C (tabla D1 + panel, fase 2) | [ ] |
| B3 | Rutas | `/blog`, `/blog/{pilar}`, `/blog/{pilar}/{slug}`; slug fijo | Otras | [ ] |
| B4 | Página comercial del pilar | `/destinos/{pais}` con PRIMERA_PIEZA_ENABLED; apagada, `/tours?search={país}` (nunca un 404) | Esperar a PRIMERA_PIEZA | [ ] |
| B5 | Enlace «Blog» en el pie | Con BLOG_ENABLED y al menos 3 artículos visibles | Desde el primer artículo | [ ] |
| B6 | Borradores en preview | `BLOG_SHOW_DRAFTS` (solo preview, con aviso rojo y noindex); en producción siempre "false" | No mostrar borradores nunca | [ ] |
| B7 | Autora | Claudia Leticia Rodríguez Laveaga (nombre de /terminos). Sin cargo, biografía, foto ni LinkedIn hasta confirmarlos; la firma enlaza a /nosotros si está encendida (no hay página de autora todavía) | Página `/blog/autores/claudia-rodriguez` | [ ] |
| B8 | Encendido | BLOG_ENABLED va después de PRIMERA_PIEZA_ENABLED (otro PR y otro deploy) y con ≥3 artículos aprobados por Claudia y por el PO | — | [ ] |

No construido en este PR (se reporta, no se hace de paso): «Del blog» en el inicio y en los hubs (no aplica con cero publicados; tocaría la home, que tiene PR abiertos), tarjetas del inventario dentro de la página pilar, página de autora, GA4 y `content_group` (bloqueado: no hay analítica ni política de cookies), `docs/blog/` (calendario, guía de entrevista, checklist; van en el PR de documentos del Gate A).
