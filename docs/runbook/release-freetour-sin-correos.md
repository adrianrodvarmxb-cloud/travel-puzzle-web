# Runbook: FREETOUR no manda correos propios (REQ-080)

**Regla:** en Modo 2 el cliente es de Travel Puzzle y FREETOUR no le escribe (skill cumplimiento-freetour, A1 y A4). Soporte confirmó la desactivación el 4 nov 2026. Hay que comprobarlo en cada release que toque reservas o correos, y siempre que FREETOUR cambie algo de su lado.

**Candados:** la reserva de prueba es una reserva real en producción. Se necesita el OK del PO antes de hacerla. Nunca se usan datos de un cliente. Ningún agente la hace solo.

## Checklist de release

Esta lista es la misma que imprime el script (`RELEASE_CHECKLIST` en `src/freetour/lib/release-email-check.ts`).

- [ ] 1. Con OK del PO, hacer una reserva de prueba de un free tour en producción. Usar un buzón de prueba de Travel Puzzle, nunca los datos de un cliente.
- [ ] 2. Esperar 30 minutos. Revisar la bandeja de entrada, spam y promociones del buzón de prueba.
- [ ] 3. Exportar los remitentes a un JSON con el formato `[{ "from": "...", "subject": "...", "receivedAt": "..." }]` y correr:
  `npx tsx src/scripts/release-check-freetour.ts <archivo.json>`
  - Verde (código 0): hay correos de Travel Puzzle y ninguno de FREETOUR (`freetour.com`, `freetour.dev` o el nombre «freetour») ni de remitentes desconocidos.
  - Código 1: NO PUBLICAR.
  - Código 2: no se pasó el archivo; NO PUBLICAR.
- [ ] 4. Si llega un correo de FREETOUR o de un remitente desconocido:
  - NO PUBLICAR;
  - avisar a support@freetour.com;
  - abrir un incidente en `docs/incidentes/INC-###.md`.
- [ ] 5. Cancelar la reserva de prueba desde `/reserva/{token}` y confirmar que llegó el correo de cancelación de Travel Puzzle.
- [ ] 6. Avisar a support@freetour.com que fue una reserva de prueba (regla B6).
- [ ] 7. Registrar la corrida en la tabla de abajo.

El JSON de remitentes no se sube al repo: contiene el buzón de prueba. Guárdalo en `tmp/` (ignorado por git).

## Registro de corridas

| Fecha | Release / PR | refNumber de prueba | Remitentes recibidos | Resultado | Cancelada y avisada |
|---|---|---|---|---|---|
| (pendiente: primera corrida con OK del PO) | | | | | |
