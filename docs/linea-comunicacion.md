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
- **Nunca mostrar teléfonos o datos de contacto del guía**: el contacto es Travel Puzzle por WhatsApp (términos de Freetour 2.2).
- "real/reales", "verificado" como adjetivo, "miles", "increíble", "el mejor", "único", "garantizado".
- Urgencia o escasez inventada ("última oportunidad", "solo hoy", "quedan X lugares").
- Testimonios, cifras o casos que no podamos respaldar. Casos de clientes solo con su permiso.
- Promesas de funciones que no están encendidas (p. ej. reservar en línea mientras `BOOKINGS_ENABLED=false`).

## Control
`src/home/lib/copy.test.ts` falla si vuelven a aparecer palabras prohibidas en los textos del inicio, las traducciones (es/en) o la vista previa al compartir.

## Revisión punto por punto (firmada por el PO, 3 nov 2026)
1. Textos generales sin adjetivos inflados ni mención a Freetour (hecho antes).
2. Franja de confianza: "4.8 ★ · CALIFICACIÓN PROMEDIO", sin conteo ni fuente.
3. Cómo funciona, tono premium: "Tres piezas, un gran viaje." — Elige / Te lo apartamos (Reserva con reservas encendidas) / Vive la ciudad.
4. Reseñas: "En palabras de los viajeros." + "Lo que cuentan quienes ya recorrieron estas ciudades."; línea de fuente oculta.
5. Asesor: "Te armamos tu viaje." + "a tu medida" + botón "Hablar con un asesor".
6. Vista previa al compartir: título "Travel Puzzle · Te armamos tu viaje", descripción con el asesor por WhatsApp, imagen `og-2.jpg` sin el lema repetido.
- Footer: se oculta el lema en texto porque el logo animado ya lo trae.
- Pendiente de diseño: el logo dice "Armamos tu viaje"; el lema registrado es "Te armamos tu viaje".
