# Gates — Comunicación en Modo 2 con FREETOUR (Ola 2) · 5 nov 2026

Firmados por el PO (Adri) y transmitidos por el coordinador de La Primera Pieza.

1. **«Más planes» en los correos transaccionales:** SÍ se quitan los tours de FREETOUR. El filtro es el mismo de REQ-081 (`filterPostTourOffers`, en `src/freetour/lib/promo-policy.ts`) y aplica en:
   - el correo de confirmación;
   - los recordatorios de 48 h y del día;
   - los correos de rechazo, cancelación y cambio;
   - el correo post-tour.

   Se controla con la bandera `FREETOUR_POSTTOUR_PROMO_ENABLED` (hoy en `"false"`). Solo se enciende con autorización escrita de FREETOUR guardada en `docs/freetour/autorizaciones.md`. Base: skill cumplimiento-freetour, reglas B2 y B3 (no promover tours de FREETOUR por correo hasta autorización).

   Efecto práctico: hoy «Más planes» solo trae tours del catálogo de FREETOUR, así que mientras no haya ofertas de otros proveedores esa sección no aparece en los correos. Los 9 datos obligatorios de la confirmación (REQ-079) no cambian.
