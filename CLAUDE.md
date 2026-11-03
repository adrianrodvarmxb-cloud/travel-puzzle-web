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
