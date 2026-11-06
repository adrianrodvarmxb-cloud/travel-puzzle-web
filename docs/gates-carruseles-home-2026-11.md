# Gates: carruseles del home (6 nov 2026)

PO: Adrián Rodvar. Decisiones del 6 nov 2026 (06:14, 06:16 y 06:28). REQ-450 a REQ-454. Todo lo nuevo va tras `CARRUSELES_HOME_ENABLED="false"`, salvo REQ-452 (borrado) y REQ-454 (filtro de títulos).

## Ya decidido por el PO

| # | Decisión |
|---|---|
| 1 | Los carruseles consideran experiencias de cualquier proveedor (FREETOUR, viajes propios/DMC, Big Bus…). |
| 2 | «¿A dónde vamos?» no cambia. |
| 3 | «Los más elegidos» usa el medidor de reseñas, mezcla formatos y proveedores, solo con reseñas reales (REQ-100), sin «fuera» (cat 8 y 31) ni transporte/traslados. Los viajes propios sin reseñas no entran. |
| 4 | El carrusel «viajes» y su sección del menú se **borran** (06:16: OK explícito para borrar código porque la frase era falsa). |
| 5 | Nuevo carrusel «Excursiones de un día» en su lugar, como sección del registro del menú. |
| 6 | (06:28) Ningún carrusel del inicio muestra experiencias cuyo título diga FreeTour, FREETOUR o «free tour»: se saltan y entra la siguiente. |

## Gates C1–C12: se aplicó la recomendación

**Firmado por recomendación, PO autopiloto 6-11.** La instrucción llegó por el coordinador. El PO no firmó cada gate en persona; si quiere cambiar alguno, se cambia aquí y en la constante que corresponde.

| Gate | Recomendación aplicada | Alternativa no elegida | Estado |
|---|---|---|---|
| C1. Fórmula | `puntaje = (v·R + m·C) / (v + m)`: R = calificación, v = número de reseñas reales | — | Firmado por recomendación, PO autopiloto 6-11 |
| C2. m | **50 reseñas**, el mismo mínimo de la insignia «Favorito» (REQ-098). Con 50 reseñas, un tour pesa igual que el promedio del catálogo; con 5,000, casi solo cuenta su nota. Ejemplo con C = 4.8: 5.0 con 3 reseñas da 4.81, y 4.9 con 5,000 da 4.90 | m = 100 (más conservador) | Firmado por recomendación, PO autopiloto 6-11 |
| C3. C | El promedio del catálogo ponderado por reseñas, calculado en cada carga (tours activos con reseñas). Si no es válido, 4.5 | C fijo | Firmado por recomendación, PO autopiloto 6-11 |
| C4. Diversidad en «Los más elegidos» | En las primeras posiciones, máximo 2 por ciudad y 3 por formato. Si no alcanza la variedad, se relaja primero el formato y luego la ciudad, para no dejar huecos | También máximo 3 por país | Firmado por recomendación, PO autopiloto 6-11 |
| C5. Diversidad en excursiones | Máximo 1 por ciudad y 2 por país; se relaja primero el país | 2 por ciudad | Firmado por recomendación, PO autopiloto 6-11 |
| C6. Sin reseñas en excursiones | Los de FREETOUR con 0 reseñas no entran. Los de proveedores sin sistema de reseñas (viajes propios/DMC) ocupan hasta **2 lugares al final**, y completan si faltan con reseñas (`DAY_TRIP_UNRATED_SLOTS`; 0 = excluirlos) | Excluirlos (0) | Firmado por recomendación, PO autopiloto 6-11 |
| C7. Tamaño | 9 tarjetas por carrusel (3×3 en escritorio, deslizable en celular) | 6 | Firmado por recomendación, PO autopiloto 6-11 |
| C8. Excursión a propina | Una excursión de la cat 4 con precio 0 cuenta como «excursión de un día» en el carrusel. En los filtros sigue siendo «pieza libre» por precedencia | Excluirla | Firmado por recomendación, PO autopiloto 6-11 |
| C9. Copy | es: «EXCURSIONES DE UN DÍA» / «Excursiones de un día.» / «Sales de la ciudad y vuelves el mismo día.» · en: «DAY TRIPS» / «Day trips.» / «Leave the city and be back the same day.» (definición del diccionario de taxonomía; no nombra al proveedor) | — | Firmado por recomendación, PO autopiloto 6-11 |
| C11. Excursión de menos de 6 h | En el carrusel, una cat 4 de FREETOUR necesita ≥ 6 h cuando se conoce la duración. En el preview con datos de producción salían recorridos a pie de 1:30 a 2:30 h marcados como cat 4 (Zamora, Weimar, Arusha), y el copy «Sales de la ciudad y vuelves el mismo día» no sería cierto | Aceptar cualquier cat 4 (regla del diccionario) | Firmado por recomendación, PO autopiloto 6-11 |
| C12. Sin repetidos | Lo que ya sale en «Los más elegidos» no se repite en «Excursiones de un día» | Permitir repetidos | Firmado por recomendación, PO autopiloto 6-11 |
| C10. Tours de pago | Mientras `PAID_TOURS_ENABLED="false"`, solo entran tours de precio 0: no se recomienda lo que no se puede reservar (`paid_not_available`). Por eso, hoy la mezcla de formatos es limitada | Mostrarlos sin poder reservarlos (no recomendado) | Firmado por recomendación, PO autopiloto 6-11 |

## Reglas que se derivan

- Formato: es la regla mínima temporal `src/home/lib/experience-format.ts` (REQ-451). Se reemplaza por el clasificador de la taxonomía cuando llegue.
- El SQL solo prefiltra (con la misma fórmula). El orden, el formato, la diversidad y el filtro de títulos los decide `src/home/lib/`.
- Una fila inválida se descarta y se registra en el log. Si el medidor falla, «Los más elegidos» vuelve a la regla anterior y las excursiones no se muestran.
- Filtro de títulos (REQ-454): `src/home/lib/provider-brand.ts` es provisional. Se une con la `mentionsProviderBrand` del otro PR (agente a41f4aa).

Firma: por recomendación, PO autopiloto 6-11 (vía coordinador).
