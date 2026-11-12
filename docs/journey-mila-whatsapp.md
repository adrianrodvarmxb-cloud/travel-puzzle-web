# Journey de Mila en WhatsApp para Travel Puzzle (propuesta para firma del PO)

Petición (PO, 12 nov 2026 04:39): «necesito que Mila arme un journey espectacular con todas las herramientas que da WA API», con la guía de formatos que adjuntó (plantillas, mensajes interactivos, Flows, multimedia, footer).
Auditoría: zoefel-mila ya envía botones, lista, botón a liga (CTA URL), carrusel multimedia, Flows (estáticos), pedir ubicación, ubicación, contacto, reacción, imagen, video, documento, audio, plantillas e indicador «escribiendo…». Faltan: Flow con endpoint (disponibilidad en vivo), pedir datos de contacto y pedir permiso de llamada.

## Etapas
1. **Bienvenida:** presentación de Mila y lista «¿En qué te ayudo?» (hasta 10 opciones: destinos, tipos de viaje, mi reserva, hablar con una persona). Footer con el aviso corto.
2. **Descubrir:** carrusel multimedia de 2 a 10 viajes reales (foto, 160 caracteres sin precio si no lo pidió, botón «Ver viaje» a la ficha).
3. **Resolver dudas:** Mila consulta en línea la ficha, las condiciones del proveedor o el contenido y contesta el dato exacto; hasta 3 fotos del viaje (G2 A).
4. **Cotizar y apartar:** Flow con calendario de fechas con salida, adultos, niños y datos de contacto con aceptación del aviso de privacidad; disponibilidad y precio en vivo con el endpoint del sitio.
5. **Pagar:** botón a liga «Pagar» con la liga del sitio (Stripe); fuera de 24 h, plantilla de utilidad con botón URL.
6. **Confirmación:** voucher en PDF, ubicación del punto de encuentro y botones «Agregar a mi calendario» / «Tengo una duda».
7. **Antes del viaje:** plantilla de utilidad 48 h antes con ubicación y respuestas rápidas («Todo listo», «Tengo una duda»).
8. **Durante el viaje:** «Mi reserva» en la lista (estado, contacto de emergencia del operador, cambiar fecha o cancelar según su política); verificación por número o folio y correo (REQ-3357).
9. **Después:** Flow corto de calificación y carrusel de complementos para el siguiente destino (nunca FREETOUR).
10. **Baja:** footer «Responde BAJA para no recibir más» en plantillas de marketing; BAJA se confirma con un solo mensaje.

## Lo que no entra (y por qué)
- Cupones y ofertas con cuenta regresiva: no manejamos descuentos ni urgencia falsa (reglas de Mila).
- Notas de voz y llamadas: siguen apagadas hasta probarlas (OLA 4, `VOZ_ON`).
- Mensaje de dirección: solo existe en India.
- Cualquier promoción de FREETOUR por WhatsApp o por el bot (cumplimiento B3).

## Gates (uno por uno)
- J1: carrusel multimedia (ya existe) o carrusel de productos (requiere el catálogo en Commerce Manager).
- J2: «una pieza visual por turno» (regla firmada en OLA 1.2) frente a hasta 3 fotos por respuesta (G2 A).
- J3: Flow con endpoint (disponibilidad en vivo, requiere llaves de cifrado en Meta) o Flow estático.
- J4: firma del journey.
