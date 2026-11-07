# Plan — URL por idioma (Gate 3, firmado por el PO el 6 nov 2026: «URL por idioma ya»)

Estado: **Ola 0 (plan)**. Todo el código va tras `LOCALE_URLS_ENABLED="false"`. Sin la bandera, el sitio queda como hoy.
REQ-650 a REQ-676 en `docs/requisitos.md` (bloque 650–689 libre al 6 nov 2026: ninguna rama ni PR abierto los usa).

Fuentes: `reports/Fichas de tours para buscadores e IA.md` (prioridad 6) y `research_notes/.../datos-estructurados.md` §7.
Google rastrea desde EE. UU. y sin `Accept-Language`. Con el idioma en una cookie y la misma URL, Google y las IA solo ven español.
Google recomienda una URL por idioma con hreflang recíproco, `x-default` y canonical a sí misma
([Locale-adaptive](https://developers.google.com/search/docs/specialty/international/locale-adaptive-pages), [Localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)).

## 1. Auditoría (solo lectura, `origin/main` 5639863)

| Pieza | Hoy | Qué cambia |
|---|---|---|
| Idioma en servidor | `getPreferredLanguage()` (`src/lib/utils/cookies.ts`) lee la cookie `preferredLanguage`; por defecto `es`. La leen: `app/page.tsx`, `tours/page.tsx`, `tours/[id]`, `destinos/[pais]/[ciudad]/[slug]`, `events/[id]`, `not-found`, `nosotros`, `contacto`, `asesores`, `viajes/gracias`, `TripDetailView`, `api/freetour/booking` | En las rutas en alcance, el idioma sale de la URL (encabezado interno que pone el middleware). El resto sigue con la cookie |
| Idioma en cliente | `LanguageProvider` arranca en `es` y, al montar, cambia a `localStorage` o a `navigator.language` (gates-home, Gate 1 = B) y escribe la cookie | Con la bandera y en rutas en alcance: arranca con el idioma de la URL y no cambia solo. El navegador o la cookie solo sugieren (§3.3) |
| Selector | `LanguageSwitcher` llama `setLanguage` (misma URL) | En rutas en alcance navega a la URL del otro idioma y guarda la preferencia |
| Middleware | `src/middleware.ts`: 301 de transporte, `destinationsMiddleware` (301 `/tours/{id}` → ficha, 410, `/viajes` → `/destinos`), auth | Se antepone `localeMiddleware`: quita el prefijo, reescribe (rewrite, no redirect) y pone `x-tp-lang`. Después corren los mismos pasos sobre la ruta sin prefijo y las 301 conservan el prefijo |
| Rutas en alcance | `/`, `/destinos`, `/destinos/{pais}`, `/destinos/{pais}/{ciudad}`, `/destinos/{pais}/{ciudad}/{slug}`, `/viajes/{destino}/{slug}` (no hay índice `/viajes`), `/tours`, `/traslados`. «Cómo funciona» **no es página**: es el ancla `/#como-funciona` del home | Todas con prefijo `/en`, `/pt`, `/fr`, `/it`, `/de`. Cómo funciona = `/{lang}/#como-funciona`, sin ruta nueva |
| Fuera de alcance v1 | `/la-primera-pieza`, `/nosotros`, `/contacto`, `/asesores`, `/ayuda`, `/blog`, legales (gates-legal 9 = A: solo español), `/reserva/*`, `/arma-tu-viaje`, admin, api | Sin prefijo. `/{lang}/<fuera de alcance>` → 302 a la versión en español |
| Metadatos | `toMetadata()` (canonical propio, noindex con follow). Titles solo en español (`seo/lib/titles.ts`). `<html lang="es">` fijo y `og:locale es_MX` en `app/layout.tsx`. Sin hreflang en ningún lado | hreflang, canonical por idioma, `lang` y `og:locale` del idioma de la URL; plantillas de title en 6 idiomas |
| Modelo de páginas | `destinosPage`, `countryPage`, `cityPage` sin `lang`; `tourPage({ lang: 'es' })` fijo en la ficha y en su `generateMetadata` | Todas reciben `lang` de la ruta |
| Catálogo | `getDestinations()` (caché 5 min) arma el árbol con nombres en español (`placeName`) y el título de la fila del tour | `getDestinations(lang)`: nombres de país y ciudad por idioma (ya vienen en `translations`) y título de `TourTranslation` del idioma; clave de caché con `lang` |
| JSON-LD (PR #204, #208) | `fichaJsonLd`, `enBreve`, `tripFichaInput` ya reciben `lang` y `url`; `itemListJsonLd` recibe `siteUrl` y `href` | Se les pasa el idioma de la URL y la URL canónica de ese idioma |
| Tarjetas | Las de FREETOUR en `/tours` y el home enlazan `/tours/{id}`; el middleware hace 301 a la ficha | Enlazan la URL final, con el prefijo del idioma (Ola 2) |
| Sitemaps | `sitemap-index.xml` → `sitemap-destinos.xml`, `sitemaps/tours/{pais}`, `sitemap-paginas.xml` (+ `sitemap-viajes.xml` de #208). Solo URLs en español | Cada `<url>` con `xhtml:link` alternates de sus idiomas indexables (ver §3.6) |
| Robots | `robots.txt` sin Disallow, bots de IA permitidos | Sin cambio |
| Correos | Enlaces a `/tours/{id}`, `/tours`, `/traslados?ciudad=`, `/reserva/{token}` (+ `/resena`). Tienen `lang` propio | Sin cambio en v1 (siguen funcionando por la 301 y la ruta sin prefijo). Ver riesgos |
| Prueba de humo | `tests/smoke/pages.json`; `flagged` entra como fija solo con la bandera en `true` | Ola 3: `LOCALE_URLS_ENABLED: ["/en/", "/en/destinos/mx/ciudad-de-mexico"]` + una ficha en inglés descubierta y revisión de `<head>` |
| Render determinista (INC-001) | Precios y fechas se formatean en el servidor | El idioma llega del servidor al cliente como prop; nada lee `navigator` ni la URL para pintar en SSR |

## 2. Estructura de carpetas

Cambia: se agrega el dominio `src/i18n/` y un componente. **No** se mueve `src/app/` a `src/app/[lang]/` (sería mover todo el árbol y no se podría apagar con una bandera).

```
src/i18n/
  lib/
    locales.ts        LOCALES, DEFAULT_LOCALE='es', isLocale, ogLocale            puro
    flags.ts          localeUrlsEnabled(env)                                        puro
    path.ts           splitLocale(path), localizePath(path, lang), inScope(path)   puro
    alternates.ts     alternatesFor(path, langsIndexables, siteUrl) + x-default    puro
    contract.ts       checkHreflang(pages) — recíproco y canonical mismo idioma    puro
    suggest.ts        suggestLanguage({ routeLang, cookie, stored, browser })     puro
    copy.ts           títulos y textos de plantillas en 6 idiomas                 puro
  middleware.ts       localeMiddleware(request, env) → rewrite / 301 / 302 / null  I/O (edge)
  server.ts           getRouteLanguage(): encabezado x-tp-lang o cookie            I/O
src/components/i18n/
  LanguageSuggestion.tsx   aviso descartable (solo cliente, después de montar)
```

Se tocan (sin borrar): `src/middleware.ts`, `src/lib/language-context.tsx`, `LanguageSwitcher.tsx`, `Navbar`/`Footer`/`Breadcrumbs` (enlaces), `app/layout.tsx` (`lang`), las páginas en alcance (`getRouteLanguage`), `destinations/{server,load}.ts`, `destinations/lib/page-model.ts`, `seo/lib/{titles,sitemaps}.ts`, `tests/smoke/pages.json`, `wrangler.jsonc` (bandera en `"false"`).

## 3. Decisiones (con la recomendación que se aplica)

1. **Prefijos.** Español sin prefijo (`/destinos/...`), los demás con `/en`, `/pt`, `/fr`, `/it`, `/de`. `/es/...` → 301 a la ruta sin prefijo (una sola URL por idioma). **Aplicado.**
2. **Slugs.** El mismo slug en todos los idiomas en v1. El slug se guarda una vez y el sync no lo regenera (skill §2). Traducirlo duplicaría esa regla por idioma y obligaría a guardar 6 slugs por tour. La URL en inglés queda `/en/destinos/mx/ciudad-de-mexico/{slug-es}`. **Aplicado.**
3. **Cookie.** Con la bandera deja de cambiar el contenido de las rutas en alcance. Solo recuerda la preferencia. Si la preferencia (cookie, `localStorage` o `navigator.language`) es distinta del idioma de la URL y esa versión existe, sale un aviso pequeño y descartable («Esta página también está en English»), sin redirigir. Nunca se redirige por cookie ni por `Accept-Language`. Así un bot nunca recibe redirecciones. El aviso se pinta solo en el cliente después de montar, así que el HTML del servidor es igual para todos. Esto **reemplaza** el Gate 1 = B de `gates-home` (idioma del navegador automático), solo con la bandera y solo en rutas en alcance. Las páginas fuera de alcance (D7 de `gates-paginas`) siguen con la cookie. **Aplicado.**
4. **`x-default` = español** (la URL sin prefijo). **Aplicado.**
5. **Moneda por idioma: no cambia.** La regla vigente (skill §4, REQ-112) dice que el precio va en la moneda en que cobra el proveedor, con la conversión a MXN como aproximada. Eso es igual en los 6 idiomas, y `Offer.priceCurrency` también. No hay choque. Google pide una URL por moneda, y cada URL tiene una sola. **Aplicado.**
6. **Qué idioma es indexable en cada página** (no estaba cubierto; aplica la regla de publicación de la skill §3 por idioma, sin cambiarla):
   - Ficha de tour: indexable en un idioma solo si el proveedor entrega su texto en ese idioma (`TourTranslation`; viaje propio con traducción). Si no hay texto, la página se sirve a las personas con el texto de respaldo, pero lleva `noindex, follow`, queda fuera del hreflang y fuera del sitemap. Así no se publican duplicados en otro idioma.
   - Ciudad: los conteos de tours son los mismos; la guía propia cuenta solo en el idioma en que está escrita. Una ciudad indexada en español solo por su guía queda `noindex` en los demás idiomas.
   - País: indexable en un idioma si tiene ≥1 ciudad indexable en ese idioma. Home, `/destinos`, `/tours`, `/traslados`: indexables en los 6.
   - Filtros (`?formato=`, etc.): `noindex` en todos los idiomas, con canonical a la versión sin filtro **del mismo idioma**.
7. **FREETOUR C2 (`indexableEnrichment`).** En las fichas de FREETOUR, la versión en otro idioma muestra solo lo que FREETOUR ya da en su API para ese idioma (título, descripción, reseñas como del tour). Las plantillas propias que ya existen en español (title «{título} – Free tour en {ciudad} | Travel Puzzle», migas, «Operado por…», avisos) se traducen, porque no son texto nuevo. `enBreve` y la descripción del marcado siguen apagados para FREETOUR. **Aplicado.**
8. **Rutas fuera de alcance con prefijo** (`/en/nosotros`): 302 temporal a la versión en español. No es 301 porque esa URL puede existir mañana, y una 301 queda guardada en el navegador (el mismo criterio de G1 en `plan-taxonomia.md`). **Aplicado.**
9. **Cómo se implementa la ruta.** El middleware reescribe `/en/destinos/x` → `/destinos/x` y pone `x-tp-lang: en`. Ese encabezado se borra si llega desde fuera. Ninguna página se duplica ni se mueve. Sin la bandera, `localeMiddleware` regresa `null` y `/en/...` da 404 como hoy. **Aplicado.**

Ninguna decisión choca con algo firmado. Por eso se sigue con las recomendaciones; el Gate 1 = B y la cookie de D7 quedan acotados como se explica en el punto 3.

## 4. SOLID y pruebas por pieza

| Pieza | Responsabilidad única (SRP) / dependencias (DIP) | Test (`npx vitest run <archivo>`) | REQ |
|---|---|---|---|
| `i18n/lib/path.ts` | Partir y armar rutas con idioma; sin I/O | `src/i18n/lib/path.test.ts`: `/en/destinos/x` → `{en, /destinos/x}`; `/es/x` → 301; fuera de alcance; `localizePath` respeta `?`, `#` y enlaces externos | 651, 652, 655 |
| `i18n/lib/flags.ts` | Leer la bandera desde `env` recibido | `flags.test.ts` | 650 |
| `i18n/middleware.ts` | Decide rewrite / 301 / 302 con `splitLocale`; recibe `env` | `src/i18n/middleware.test.ts` con `NextRequest` real: bandera apagada = `null`; encabezado externo sobrescrito | 650–653, 658 |
| `i18n/server.ts` | `getRouteLanguage()`: encabezado si la bandera está encendida; si no, la cookie (OCP: `getPreferredLanguage` no cambia) | `server.test.ts` con `headers`/`cookies` simulados | 653, 659 |
| `language-context.tsx` | El provider recibe `initialLanguage` y `lockToRoute` por props (DIP) | `language-context.test.tsx`: con `lockToRoute`, ni `localStorage` ni `navigator` cambian el idioma; SSR = primer render | 654 |
| `i18n/lib/suggest.ts` + `LanguageSuggestion` | Pura: decide si sugerir y a qué idioma. El componente solo pinta | `suggest.test.ts`; `LanguageSuggestion.test.tsx` (no se pinta en SSR) | 657 |
| `LanguageSwitcher` | Navega con `localizePath`; la preferencia se guarda aparte | `LanguageSwitcher.test.tsx` | 656 |
| `i18n/lib/alternates.ts` | hreflang + `x-default` + canonical desde la ruta y los idiomas indexables | `alternates.test.ts` | 660, 661 |
| `destinations/lib/page-model.ts` | Modelos con `lang`; indexable por idioma | `page-model.test.ts` (casos nuevos) | 662, 665, 667 |
| `seo/lib/sitemaps.ts` | `xhtml:link` por `<url>` | `sitemaps.test.ts` | 663 |
| `i18n/lib/contract.ts` | Contrato hreflang/canonical sobre un conjunto de páginas | `contract.test.ts` + uso en la prueba de humo | 676 |
| `tests/smoke/pages.json` + `smoke.ts` | Páginas en inglés tras la bandera; revisa `<head>` | `src/ops/lib/smoke.test.ts` | 675 |

ISP: los componentes de enlace reciben solo `lang` (o el hook `useLocalizedHref()`), no el contexto completo. LSP: `LocalizedLink` acepta las mismas props que `next/link`.

## 5. Olas (un PR por ola, todas con `LOCALE_URLS_ENABLED="false"`)

| Ola | Contenido | REQ |
|---|---|---|
| 0 | Este plan + REQ registrados | — |
| 1 | `src/i18n/`, middleware, idioma de la URL en servidor y cliente, enlaces internos, selector, aviso, 301 con prefijo | 650–659 |
| 2 | hreflang, canonical, sitemaps, `lang`, titles/H1/JSON-LD por idioma, `tourPage(lang)`, tarjetas a la URL final, indexable por idioma | 660–670 |
| 3 | Prueba de humo con `/en/` y ficha en inglés; contrato hreflang/canonical | 675, 676 |
| Encendido | Lo mete el PO a la fila con su protocolo: preview con la bandera encendida, humo verde y OK | — |

Las Olas 1–3 parten de `main` cuando #204 y #208 estén fusionados.

## 6. Riesgos

- **URLs viejas compartidas con la cookie en inglés.** Quien abra un enlace `/destinos/...` con la cookie `en` verá español más el aviso con el enlace a `/en/...`. Antes veía inglés. Es el costo de que la URL mande; se mitiga con el aviso.
- **Correos ya enviados** enlazan `/tours/{id}`: siguen funcionando (301 a la ficha en español). Que los correos nuevos enlacen la URL en el idioma del correo queda fuera de v1 (se propone como REQ aparte).
- **Más URLs para rastrear** (hasta 6 por página). Se acota con la regla de §3.6: solo se indexa un idioma con texto real.
- **Texto mezclado** en idiomas sin traducción del proveedor (página `noindex`). Es aceptable para personas; no llega a Google.
- **`usePathname` con rewrite:** ningún componente debe deducir el idioma de `usePathname`; el idioma viene del contexto que llena el servidor (INC-001).
- **Caché:** las claves de `cached()` del árbol y del home deben incluir `lang`, o un idioma serviría el árbol de otro.
- **Duplicado con FREETOUR:** FREETOUR ya tiene sus versiones `/en/`, `/es/`, etc. En cada idioma competimos por el mismo hueco que hoy en español (Mueller, 2021). No cambia el riesgo, solo lo replica.
