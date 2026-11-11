# Gates — tiempos de carga (REQ-1530 a REQ-1534)

| Gate | Decisión | Firmó | Fecha |
|---|---|---|---|
| A | Logo del encabezado: mismo logo animado, idéntico a la vista, en WebP animado ligero (~150 KB) y sin preload; reemplaza `logo-travel.gif` (6.4 MB). El GIF original no se borra. | PO (Adri) | 11 nov 2026 |
| B | Fotos de experiencias (R2 y Freetour) redimensionadas y en WebP/AVIF con Cloudflare Image Transformations. El código va tras bandera `IMAGE_TRANSFORMS_ENABLED=false`; el PO enciende Transformations en el dashboard con paso a paso. Las fotos de Freetour pasan antes por la revisión de cumplimiento FREETOUR. | PO (Adri) | 11 nov 2026 |
