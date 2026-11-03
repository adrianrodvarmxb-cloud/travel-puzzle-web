# Gates — Viajes propios y de agencias (punto 17) · 3 nov 2026

Firmados por Adri (PO). Fuente: documentos "Página Web Travel Puzzle" (Next Steps 2024) y "Journey Customer".

| Gate | Decisión |
|---|---|
| A — Quién captura | Solo el equipo de Travel Puzzle (las agencias mandan la info). |
| B — Acceso | Cuenta del sitio con rol ADMIN en `/admin/entrar`; las cuentas de clientes siguen apagadas. Ajuste (3 nov): entrada principal con correo y contraseña; cada quien crea la suya con un enlace por correo (1 hora, un solo uso). Google queda como opción. |
| C — Dónde se ven | Mezclados en /tours (filtro por tipo) + carrusel "Viajes by Travel Puzzle" en el home (ola 2). |
| D — Pasaporte | Después, con enlace privado al confirmar (como el check-in de G Adventures / Go Ahead). Ola 3. |
| E — Moneda | Se captura en MXN/USD/EUR; se muestra en pesos grande + moneda original con tipo de cambio Banxico (art. 34 LFPC). Ola 2. |
| F — Fotos | Subidas a Cloudflare R2 (bucket `travel-puzzle-trips`). |

## Olas
1. **Gestor** (este PR): `/admin/viajes` crear, editar, publicar, ocultar (nunca borrar); agencias; fechas con máx. 4 horarios por día; máx. 4 puntos de encuentro + opción hotel; itinerario; incluye / no incluye; visa; fotos.
2. **Sitio**: ficha pública, /tours, carrusel, 3 formularios (circuitos/tours, experiencias únicas, personalizados), thank you page y correos, precio en pesos (Banxico). Tras `OWN_TOURS_ENABLED`.
3. **Pago y pasaportes**: pasarela (candado) y enlace privado de pasaportes.
