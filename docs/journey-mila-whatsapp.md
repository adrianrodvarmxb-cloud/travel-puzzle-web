# Journey de Mila en WhatsApp para Travel Puzzle (propuesta para firma del PO)

Petición (PO, 12 nov 2026 04:39): «necesito que Mila arme un journey espectacular con todas las herramientas que da WA API», con la guía de formatos que adjuntó (plantillas, mensajes interactivos, Flows, multimedia, footer).
Auditoría: zoefel-mila ya envía botones, lista, botón a liga (CTA URL), carrusel multimedia, Flows (estáticos), pedir ubicación, ubicación, contacto, reacción, imagen, video, documento, audio, plantillas e indicador «escribiendo…». Faltan: Flow con endpoint (disponibilidad en vivo), pedir datos de contacto y pedir permiso de llamada.

## Etapas
1. **Bienvenida:** presentación de Mila y lista «¿En qué te ayudo?» (hasta 10 opciones: destinos, tipos de viaje, mi reserva, hablar con una persona). Footer con el aviso corto.
2. **Descubrir:** carrusel de productos del catálogo de Meta (J1 = B, REQ-3377): 2 a 10 viajes con foto, título y precio, y botón «Ver»; sin catálogo conectado, carrusel multimedia.
3. **Resolver dudas:** Mila consulta en línea la ficha, las condiciones del proveedor o el contenido y contesta el dato exacto; todas las fotos disponibles del viaje en un carrusel (hasta 10, límite de Meta; si hay más, liga a la galería) (REQ-3363).
4. **Cotizar y apartar:** botón «Lo quiero» (mismo texto que la página) que abre un Flow con calendario de fechas con salida, adultos, niños y datos de contacto con aceptación del aviso de privacidad; disponibilidad y precio en vivo con el endpoint del sitio, iguales a los de la página (REQ-3364).
5. **Pagar:** botón a liga «Pagar» con la liga del sitio (Stripe); fuera de 24 h, plantilla de utilidad con botón URL.
6. **Confirmación:** voucher en PDF, ubicación del punto de encuentro y botones «Agregar a mi calendario» / «Tengo una duda».
7. **Antes del viaje:** plantilla de utilidad 48 h antes con ubicación y respuestas rápidas («Todo listo», «Tengo una duda»).
8. **Durante el viaje:** «Mi reserva» en la lista (estado, contacto de emergencia del operador, cambiar fecha o cancelar según su política); verificación por número o folio y correo (REQ-3357).
9. **Después:** Flow corto de calificación y carrusel de complementos para el siguiente destino (nunca FREETOUR).
10. **Baja:** footer «Responde BAJA para no recibir más» en plantillas de marketing; BAJA se confirma con un solo mensaje.

## Agregado tras la investigación (PO, 12 nov 05:06; reporte «Agentes IA turismo en WhatsApp»)
- Resumen antes de pagar con lo que pide la NOM-010-TUR y la LFPC; Mila espera el «sí» (REQ-3383).
- Perfil de empresa con el RNT (REQ-3384) y RNT al pie de las plantillas (REQ-3385).
- Identificador de usuario de WhatsApp guardado junto al teléfono para «Mi reserva» (REQ-3386).
- Consentimiento aparte para promociones; venta cruzada solo a quien aceptó (REQ-3387).
- Constancia con membrete en el voucher (REQ-3388).
- Frase para verificarnos en SECTUR y PROFECO; pago solo por liga oficial (REQ-3389).
- Prioridad 2 (PO, 12 nov 05:07): insignia azul (REQ-3390), accesos rápidos y comandos (REQ-3391), tarjeta de estado de la reserva si hay pagos de WhatsApp en México (REQ-3392), paso a persona con resumen y horario (REQ-3393), alcance solo Travel Puzzle (REQ-3394), menos burbujas y medición (REQ-3395).
- Prioridad 3 (PO, 12 nov 05:10): QR por destino (REQ-3396), bienvenida para anuncios (REQ-3397), explorar pago dentro de WhatsApp (REQ-3398, candado), grupos de viajeros por salida (REQ-3399).

## Lo que no entra (y por qué)
- Cupones y ofertas con cuenta regresiva: no manejamos descuentos ni urgencia falsa (reglas de Mila).
- Notas de voz y llamadas: siguen apagadas hasta probarlas (OLA 4, `VOZ_ON`).
- Mensaje de dirección: solo existe en India.
- Agente de IA de Meta: dejaría a Mila en espera.
- Cualquier promoción de FREETOUR por WhatsApp o por el bot (cumplimiento B3).

## Gates (uno por uno)
- J1: carrusel multimedia (ya existe) o carrusel de productos (requiere el catálogo en Commerce Manager).
- J2: «una pieza visual por turno» (regla firmada en OLA 1.2) frente a hasta 3 fotos por respuesta (G2 A).
- J3: Flow con endpoint (disponibilidad en vivo, requiere llaves de cifrado en Meta) o Flow estático.
- J4: firma del journey.
