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
