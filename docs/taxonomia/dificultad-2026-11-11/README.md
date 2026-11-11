# REQ-1518 · Lote de dificultad (11 nov 2026)

Propuesta para la firma del PO. Solo lectura: no se escribió nada en D1.

- Fuente: los 371 viajes de `imports/*.json` en main. Los PDF originales no están en el repo (REQ-1352), así que la evidencia es el texto del viaje.
- Método: `clasificar.py` busca señales en título, resumen, descripción, itinerario, información importante y qué llevar. Por ejemplo trekking de varios días, caminatas de varias horas, desnivel, rafting, kayak, bicicleta, altitud en metros, o un lugar con altitud conocida. Toma el nivel más alto que encuentre. Después hubo una revisión a mano de los niveles 3 a 5 y de los casos dudosos (columna `motivo`, «Revisión a mano»).
- Escala (diccionario): 1 Relajado · 2 Ligero · 3 Moderado («varias horas a pie o algo de altura», 2,500–3,499 m) · 4 Exigente («caminatas largas, desnivel o altura», 3,500 m o más) · 5 Muy exigente (trekking de varios días o 4,500 m o más).
- Sin evidencia en el texto, el viaje queda «sin dato» y no se muestra (REQ-422). Los traslados nunca llevan dificultad.
- Si el proveedor marcó moderada o exigente y el texto no lo contradice, se respeta como piso.

Resultado: 1 → 22 · 2 → 26 · 3 → 38 · 4 → 30 · 5 → 11 · sin dato → 244 (39 de ellos son traslados). De los 270 viajes publicados, 76 mostrarían la dificultad.
Las altitudes «de referencia» (`motivo` dice «no del texto») son públicas del lugar. Están marcadas para que el PO las vea.
