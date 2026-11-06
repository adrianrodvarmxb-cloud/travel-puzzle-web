# Borrador: actualización del aviso de privacidad (REQ-084)

> **Pendiente de revisión del PO y de un abogado. No publicar sin OK.**
> No toca `src/legal/lib/privacidad.ts`, que dice «No editar sin OK del PO». Cuando el PO y el abogado aprueben, el texto final se pasa a ese archivo en su propio PR, con prueba de humo de `/privacidad`.

## Por qué cambia

Fuentes: skill cumplimiento-freetour, reglas G1 a G5.

1. **Transferencia de datos fuera de la UE (G4).** La plataforma de reservación de tours que usamos para los free tours puede transferir los datos de la reserva fuera de la Unión Europea cuando el tour lo requiere: por ejemplo, al guía o al operador local del país de destino. El aviso actual habla de transferencias «dentro y fuera del país», pero no dice que hay un tercero en Europa ni que de ahí los datos pueden ir a otro país.
2. **Datos mínimos (G2).** A la plataforma solo se le envían los datos que pide la reserva: correo, nombre, apellido y, si el tour lo exige, teléfono. Conviene decirlo en el aviso.
3. **Consentimiento de marketing separado (G1, LFPDPPP).** La publicidad ya está declarada como finalidad no necesaria. Se agrega la casilla separada y sin marcar del registro (`MARKETING_CONSENT_ENABLED`).
4. **Contacto adulto (G3).** El contacto de la reserva debe ser mayor de edad (REQ-083).
5. **Cookies (G5).** El aviso remite a la nueva política de cookies (`/cookies`, borrador en `src/legal/lib/cookies.ts`).

## Texto propuesto

Usa el mismo formato que `privacidad.ts`: `## ` para títulos y `- ` para incisos.

### Reemplaza la sección «¿Con quién compartimos su información personal y para qué fines?»

```
## ¿Con quién compartimos su información personal y para qué fines?
Le informamos que sus datos personales son compartidos dentro y fuera del país (según sea la solicitud de su destino) con las siguientes personas, empresas, organizaciones o autoridades distintas a nosotros, para los siguientes fines:
Agencias de viaje receptoras, Tour operadores, Plataformas de reservación de tours, Guías de Turismo en el destino contratado
Para reservar un tour, compartimos únicamente los datos que la reservación requiere: nombre, apellido, correo electrónico y, cuando el prestador lo exige, teléfono.
Algunas plataformas de reservación de tours con las que trabajamos tienen su sede en Europa. Cuando el tour se realiza fuera de la Unión Europea, esas plataformas pueden transferir los datos de la reservación al guía u operador local en el país de destino, únicamente para prestar el servicio que usted contrató. Estas transferencias son necesarias para cumplir el contrato celebrado en su interés, por lo que no requieren su consentimiento (artículo 37, fracción IV, de la LFPDPPP).
```

### Agrega al final de «¿Para qué fines utilizaremos sus datos personales?»

```
Si crea una cuenta, le preguntaremos en una casilla aparte, que aparece sin marcar, si desea recibir publicidad. Marcarla es opcional y no afecta su registro ni sus reservas.
La persona de contacto de una reservación debe ser mayor de edad.
```

### Reemplaza el segundo párrafo de «El uso de tecnologías de rastreo en nuestro portal de internet»

```
Los datos personales que obtenemos de estas tecnologías de rastreo son los siguientes:
Idioma preferido por el usuario
En algunas secciones mostramos ofertas de socios comerciales mediante enlaces de afiliado; esos socios pueden usar sus propias cookies. Consulte nuestra política de cookies en https://travelpuzzle.com.mx/cookies.
```

## Preguntas para el abogado

1. **¿Nombrar a la plataforma?** El PO firmó que la marca de la plataforma no se le menciona al cliente (REQ-098). ¿Basta con «plataformas de reservación de tours con sede en Europa», o la LFPDPPP exige identificar al tercero por su nombre?
2. **¿Fundamento correcto?** ¿El artículo 37, fracción IV (transferencia necesaria por un contrato celebrado en interés del titular) es el fundamento adecuado? ¿O conviene pedir el consentimiento expreso?
3. **¿Edad mínima?** La plataforma pide 16 años. El borrador dice «mayor de edad», que en México son 18. ¿Se queda en 18?
4. **¿Fecha?** Hay que actualizar la línea «Última actualización».

## Cómo se publica

Cuando el PO y el abogado den su OK, se hace un PR que:

1. pasa el texto a `privacidad.ts`;
2. corre `legal.test.ts`;
3. corre la prueba de humo de `/privacidad`;
4. lleva capturas a 390 y 1366 px.

Encender `COOKIES_POLICY_ENABLED` es otro PR, con el mismo protocolo.
