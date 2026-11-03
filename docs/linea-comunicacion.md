# Línea de comunicación — Travel Puzzle (firmada el 3 nov 2026)

Basada en el ADN de Mila ("Vender sin vender" y "Neuroventa con ética") y en los referentes del sector.
Aplica al sitio, a los correos y a cualquier texto que vea el cliente.

## Voz
- **Guía, no protagonista:** el viajero es el héroe; Travel Puzzle le da el plan y lo acompaña.
- **Lema registrado (IMPI, reg. 2607150):** "Te armamos tu viaje".
- Español de México, cálido y claro. Frases cortas. Beneficios concretos, no funciones.
- Cada sección deja **un siguiente paso** (buscar, ver tours, escribir a un asesor).

## Se dice así (mostrar, no adjetivar)
- El dato exacto: "★ 4.8 · 12,703 reseñas".
- Lo incómodo, de frente: "Los free tours no tienen costo de entrada: al final dejas al guía la propina que te parezca justa."
- Ayuda concreta: "Cuéntanos a dónde vas y cuántos días tienes. Un asesor te sugiere tours y horarios."

## No se dice
- **Nunca mencionar a FREETOUR.com ni a otros proveedores**: el cliente solo ve Travel Puzzle.
- "real/reales", "verificado" como adjetivo, "miles", "increíble", "el mejor", "único", "garantizado".
- Urgencia o escasez inventada ("última oportunidad", "solo hoy", "quedan X lugares").
- Testimonios, cifras o casos que no podamos respaldar. Casos de clientes solo con su permiso.
- Promesas de funciones que no están encendidas (p. ej. reservar en línea mientras `BOOKINGS_ENABLED=false`).

## Control
`src/home/lib/copy.test.ts` falla si vuelven a aparecer palabras prohibidas en los textos del inicio, las traducciones (es/en) o la vista previa al compartir.
