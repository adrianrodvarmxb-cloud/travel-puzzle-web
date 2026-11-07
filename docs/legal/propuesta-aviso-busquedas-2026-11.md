# Propuesta: aviso de privacidad y analítica del buscador (REQ-344)

> **Pendiente de revisión del PO y de quien lleve lo legal. No publicar sin OK.**
> No toca `src/legal/lib/privacidad.ts` («No editar sin OK del PO»). Cuando se apruebe, el texto se pasa a ese archivo en su propio PR, con prueba de humo de `/privacidad`, y **antes** de encender `SEARCH_LOG_ENABLED`.
> No se revisó el texto vigente de la LFPDPPP 2025 (ni su reglamento); el informe del 6 nov 2026 lo deja como pendiente para quien lleve lo legal.

## Qué se registra (S4, `SEARCH_LOG_ENABLED`)

- La consulta escrita en el buscador, sin acentos ni mayúsculas (máx. 80 caracteres), el idioma del sitio, el número de resultados, si se corrigió una errata, y en qué posición se hizo clic.
- Todo se suma en un renglón por **día**, idioma y consulta (`search_log_daily`). No hay un registro por persona ni por visita.
- **No** se guarda IP, cuenta, cookie, identificador del navegador, agente de usuario ni la hora exacta.
- Antes de contar una consulta se descarta si parece correo, teléfono (7 o más dígitos), dirección web o un número largo (5+ cifras seguidas: reservas, tarjetas).
- Retención propuesta: 400 días; después se borra (`PURGE_SQL`).
- Para qué sirve: corregir alias y sinónimos del buscador cada mes y ver qué búsquedas no encuentran nada.

## Texto propuesto

Formato de `privacidad.ts` (`## ` títulos). Se agrega al final de «El uso de tecnologías de rastreo en nuestro portal de internet», antes de «¿Cómo puede conocer los cambios…?»:

```
Cuando usa el buscador de tours, registramos de forma anónima y agregada por día las palabras que busca, el número de resultados y el resultado en el que hace clic. Este registro no se asocia con su nombre, cuenta, dirección IP ni con cookies, y antes de guardarlo descartamos cualquier búsqueda que parezca un correo electrónico, un teléfono o un número de reservación. Lo usamos únicamente para mejorar el buscador y lo conservamos hasta 400 días.
```

## Por qué así

- Al no poder asociarse con una persona identificada o identificable, el registro agregado no debería contar como dato personal; aun así se menciona por transparencia (informe del 6 nov 2026, sección «Analítica anónima»).
- Se descartan las consultas con forma de dato personal porque una persona puede escribir su correo o teléfono en el buscador por error.
