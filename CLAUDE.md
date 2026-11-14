# CLAUDE.md — travel-puzzle-web

Sigue el estándar do-plan y las reglas fijas de Adri:
- Plan antes de código (auditoría, estructura de carpetas, unit tests, SOLID, gates A/B/C uno por uno) y firma del PO.
- Lógica pura en `src/<dominio>/lib/`; la raíz del dominio hace I/O y recibe sus dependencias por parámetro.
- Tests primero con `npx vitest run <archivo>`; antes de publicar: suite completa, build y revisión visual (escritorio y celular).
- No borrar código: lo que se deja de usar se oculta de forma reversible.
- Rama + PR por tarea; nunca push a `main` ni force-push; merge solo con OK del PO (merge = publicar).
- Candados con OK explícito: deploy, DNS, secretos/variables, pagos, migraciones, datos de producción, borrar archivos o ramas.
- Lo que no existe va tras bandera en `false`; el copy solo promete lo que hay en producción.
- Typecheck: `data/countries.json` no está en el repo; usar el fixture temporal y no commitearlo.
- Al cerrar un frente: actualizar `STATUS.md`. Gates firmados en `docs/`.

## Catálogo único (REQ-1605, regla del PO)
- Todo producto publicado de cualquier proveedor sale en el mapa, en /tours, en el buscador y en los filtros, como en GetYourGuide, Civitatis y Viator. Proveedor nuevo = mismo trato; una excepción solo con decisión escrita del PO.

## Blindaje de publicación (obligatorio; ISO/IEC/IEEE 29119, ISO/IEC 27001 A.8.32, ISO/IEC 20000-1 8.5)

Nada llega a producción sin evidencia de que el sitio sigue funcionando. Si un paso no se puede cumplir, se dice "NO PUBLICAR" y por qué; nunca se simula.

**Antes de pedir el merge (en el PR):**
1. Pruebas unitarias completas en verde (`npx vitest run`) y build de producción en verde (el mismo comando que usa el deploy).
2. Prueba de humo con navegador real (Playwright) contra el build de producción, a 390 y 1366 px: cada página clave del proyecto (lista en `tests/smoke/pages.json` o equivalente) responde 200, no muestra "Application error" ni la pantalla de error, y no lanza excepciones en consola (`pageerror`).
3. Si el cambio depende de datos (base, CMS, API, banderas), la prueba de humo se corre con esos datos y con la bandera ENCENDIDA en un entorno de preview, nunca solo con la bandera apagada.
4. El PR incluye: requisitos (REQ-###) que toca, salida de las pruebas, capturas 390/1366 y plan de regreso (qué revertir si falla).

**En el pipeline de deploy (gate automático):**
5. El workflow corre unitarias + build + prueba de humo; si cualquiera falla, no publica. La prueba de humo es obligatoria en la protección de rama.
6. Después de publicar, prueba de humo contra producción. Si falla, se revierte solo (o se avisa al PO para revertir en ese momento) y se abre incidente.

**Diseño que tolera fallos (ISO/IEC 25010):**
7. Cada sección que depende de datos externos va envuelta en un error boundary: si falla, se oculta esa sección y el resto de la página sigue funcionando. La página raíz tiene `global-error`/`error` con mensaje útil, nunca la pantalla en blanco.
8. Datos de base o API se validan (Zod o similar) antes de llegar al cliente; un registro malo se descarta y se registra, no tumba la página.

**Cambios que encienden algo (banderas, variables, DNS, migraciones):**
9. Un cambio a la vez, en su propio PR; nunca dos deploys seguidos sin prueba de humo entre ellos.
10. Encender una bandera = mismo protocolo que código: preview con la bandera encendida, prueba de humo verde, OK del PO.

**Incidentes (ISO/IEC 20000-1, ISO 9001 10.2):**
11. Primero contener (revertir), luego diagnosticar (reproducir con el error exacto y el stack, bisect, 5 porqués), luego corregir con test rojo → verde que reproduzca la falla, y verificar en producción. Registro en `docs/incidentes/INC-###.md` con causa raíz y por qué ningún test lo detectó.
- En este repo: prueba de humo `npx tsx src/scripts/smoke.ts <url>` (páginas en `tests/smoke/pages.json`); requisitos en `docs/requisitos.md`; incidentes en `docs/incidentes/`.
- Render determinista: un componente de cliente no formatea con `Intl`/`toLocale*` sin idioma fijo ni usa `Date.now()`/`Math.random()` al pintar; lo que dependa del idioma se calcula en el servidor (INC-001).

## Sesiones en paralelo (REQ-1587; obligatorio para toda sesión, agente y trigger)
Hay varias sesiones trabajando a la vez. Antes de empezar cualquier frente (código, documento, acuerdo o correo), el paso 0:
1. **Migraciones:** nunca «el último + 1»: `npx tsx src/scripts/folio.ts migracion` da el siguiente número libre (INC-014); el PR falla si se repite.
1. **Frente:** `npx tsx src/scripts/frente.ts buscar "<tema>"`. Si ya hay un issue `en-curso` de ese tema, te sumas a ese frente (y a su rama); no abres otro. Si no hay, `frente.ts abrir "<tema>"`. Al terminar, `frente.ts cerrar <n>`. En la nube de Claude, antepón `NODE_USE_ENV_PROXY=1` (el `fetch` de Node no usa el proxy solo).
2. **Folios:** nunca tomes «el último + 1» de tu copia. Aparta con `npx tsx src/scripts/folio.ts apartar <n>` y usa solo los que imprime. El PR corre `folio.ts revisar` y falla si un folio choca con main o no está apartado (desde REQ-1588).
3. **Correos:** antes de crear un borrador en Gmail, revisa los borradores que ya hay para ese proveedor. Debe quedar un solo borrador vigente: creas el nuevo, borras el anterior (solo borradores, nunca enviados) y anotas el ID del borrador vigente en el issue del frente (`frente.ts nota <n> "Borrador vigente: r-…"`).
4. **Proyecto de Claude:** revisa también los documentos del proyecto (p. ej. `legal/`) antes de redactar uno nuevo del mismo tema.

## Protocolo de trazabilidad (ISO/IEC/IEEE 29148, obligatorio también para agentes externos)
1. Toda petición del PO (código, bandera, definición, validación o tarea a mano) recibe folio REQ-### en `docs/requisitos.md` antes del código: petición literal, criterio Dado/Cuando/Entonces, tipo, responsable y estado.
2. Tests primero (rojo → verde), con el ID en el nombre (`it('REQ-014: …')`) y `// REQ-014` en la función que lo implementa.
3. Matriz `| ID | Requisito | Origen | Archivo(s) | Test | Estado |` en `STATUS.md`, en el mismo commit que el código.
4. Prohibido marcar CUMPLIDO sin test verde corrido en la sesión, usar `.skip`, debilitar tests, mocks que oculten la lógica o dejar fachadas.
5. Al cerrar: lista de REQ con estado, salida de `npx vitest run -t "REQ-"` y cruce con `grep -r "REQ-" src tests` (huérfanos).
6. Cambio de alcance: el REQ viejo queda REEMPLAZADO y se crea uno nuevo que lo cite.
7. «AUDITA»: correr el punto 5 completo con salida íntegra. «PENDIENTES»: tablero desde `docs/requisitos.md`.
8. Código anterior al protocolo: modo retroactivo (REQ RETRO, SIN VERIFICAR, tests de caracterización sin cambiar lógica).

## Protocolo de trazabilidad: detalle de tipos y estados (ISO/IEC/IEEE 29148)
1. Toda petición, decisión, bandera, validación o tarea a mano del PO recibe un REQ-### en `docs/requisitos.md` antes del código, con petición literal, origen (NUEVO/RETRO), tipo (CÓDIGO, BANDERA, DEFINICIÓN, VALIDACIÓN, TAREA-PO, DATOS), responsable, criterio Dado/Cuando/Entonces y estado (PENDIENTE, EN CURSO, CUMPLIDO, SIN VERIFICAR, NO CUMPLIDO, BLOQUEADO, REEMPLAZADO). Si es ambigua, se pregunta.
2. Tests primero; cada test con el ID en el nombre (`it('REQ-014: …')`) y `// REQ-014` en la función que lo implementa.
3. Matriz ID | Requisito | Origen | Archivo(s) | Test | Estado en STATUS.md, en el mismo commit que el código.
4. Prohibido: CUMPLIDO sin test verde corrido en la sesión, `.skip`, tests debilitados, mocks que oculten la lógica, fachadas.
5. Cierre: lista de REQ con estado, `npx vitest run -t "REQ-"`, cruce con `grep -r "REQ-" src` (huérfanos) y lo no cumplido.
6. Cambio de alcance: el REQ viejo queda REEMPLAZADO y se crea uno nuevo que lo cite.
7. PENDIENTES: banderas apagadas, sin iniciar, a medias, validaciones, definiciones y tareas del PO, una por una. AUDITA: el punto 5 completo, sin recortar.
8. Lo anterior al protocolo entra como RETRO y SIN VERIFICAR hasta tener su test de caracterización.
