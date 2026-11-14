# Plan — entradas a partidos de futbol de Tangol (REQ-3403, REQ-3404)

Decisión del PO (12 nov 2026 05:19, «A») ante «Tangol vende entradas a partidos; ¿lo levantamos como línea nueva?»: sí, con folio y gate propio. **Nada se implementa hasta que el PO firme los gates de abajo.**

## Qué ofrece la API (verificado en el Swagger de Tangol el 12 nov 2026)
Siete rutas, todas bajo `/Tour/`, con el mismo token que los tours:

| Ruta | Método | Qué da |
|---|---|---|
| `GetEstadios` | GET | Estadios: nombre, descripción en 3 idiomas, domicilio, ciudad, país, foto, link de Google Maps |
| `GetEstadioUbicaciones` | GET (`estId`) | Ubicaciones del estadio: nombre, descripción, foto y **plano** |
| `GetEquipos` | GET | Equipos: nombre, país, ciudad, foto |
| `GetCompetencias` | GET | Competencias: nombre, descripción, foto, si es destacada |
| `GetWebPartidos` | POST (`LanguageCode`) | Partidos: local, visitante, competencia, estadio, fecha y horario, hora de llegada (`KickOffTime`), punto de recogida, horas de cancelación, y su disponibilidad anidada |
| `GetWebPartidosDispo` | POST (`PartidoId`, idioma, moneda) | Por partido y ubicación: **precio**, moneda, capacidad, qué incluye |
| `GetAvailableGamesAndTickets` | POST (idioma, moneda) | Todo lo anterior de una sola llamada |

Reserva: no hay ruta propia. Se usa el mismo `MakeBooking` de los tours, y el Swagger **no dice** cómo viaja el partido ni la ubicación en ese cuerpo (`TourBookingRequest` solo habla de tours). Hay que preguntárselo a Hernán.

## Lo que esto NO es
No es un tour con fecha: es un asiento en una ubicación de un estadio, para un partido con fecha fija, con capacidad y con horas de cancelación propias. Por eso va en su propia línea y no dentro del catálogo de experiencias.

## Candado de datos (REQ-3404)
`GetWebPartidosDispo` devuelve `Neto` y `Comision` junto al `Precio`. Igual que con los tours (REQ-1543, REQ-1556): al cliente solo se le muestra el precio público; el neto, la comisión y el nombre del proveedor nunca salen del servidor. Debe haber una prueba que falle si alguno de esos campos llega al cliente.

## Gates que el PO tiene que firmar antes del código
- **G1 — alcance:** ¿todos los partidos que publique Tangol, o solo ciertas competencias y países?
- **G2 — dónde vive:** ¿sección propia (p. ej. `/partidos`), dentro de /tours como un tipo más, o solo como complemento en «Arma tu viaje» cuando el cliente ya tiene una experiencia en esa ciudad?
- **G3 — marcas de terceros:** los nombres, escudos y fotos de equipos, competencias y estadios son marcas registradas de terceros. Antes de publicar cualquiera de esas imágenes o nombres hace falta revisión legal, igual que se hizo con los proveedores. Sin eso, no se publica.
- **G4 — reserva:** confirmar con Tangol cómo se reserva un partido por `MakeBooking` (qué campo lleva `PartidoId` y `DispoId`), y probar en `ModoTest` antes de cobrar.
- **G5 — precio y capacidad:** la capacidad cambia rápido; definir cada cuánto se refresca y qué se muestra cuando ya no hay lugar.

## Preguntas abiertas para Hernán (Tangol)
1. ¿Cómo se reserva un partido con `MakeBooking`? ¿Qué campos llevan el partido y la ubicación?
2. ¿Hay permiso por escrito para usar nombres, escudos y fotos de equipos, competencias y estadios en el sitio de Travel Puzzle?
3. ¿La comisión del 20 % aplica igual a entradas que a tours?
4. ¿Cada cuánto cambia la disponibilidad y hay algún aviso cuando un partido se reprograma?
