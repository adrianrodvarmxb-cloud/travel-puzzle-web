# Dificultad de Tangol a la escala 1–5: tabla de equivalencias para la firma del PO (15 nov 2026)

**Folios:** REQ-10656 (código, decisión 12 = REQ-10591) y REQ-10657 (gate: firma de esta tabla y de las dudas). **Frente:** #549, ficha única, ola 3. **Plan:** `docs/plan-ficha-unica-2026-11.md`, fila «Dificultad» de la sección 4.
**Regla del plan:** la tabla se le pasa al PO para firma antes de aplicarla. Nada de esto se muestra en la ficha hasta esa firma y hasta que el bloque de datos clave de la ficha única la lea (ola 7).

## Qué hay hoy

Tangol manda la dificultad como texto libre en `Tour.difficulty` (columna de la migración 0032). Lectura de solo lectura de D1 el 15 nov 2026 (`SELECT difficulty, COUNT(*) … WHERE providerId = 'tangol' GROUP BY difficulty`): 1,214 tours, 136 textos distintos, 558 sin dato. Hay «Fácil», «Baja», «<p>Baja</p>», «**Bajo», «- Baja.», «Dificultad: Media / Altura: 3.400 msnm.», y párrafos enteros que no dicen un nivel.

## Cómo se lee (REQ-10656, `src/taxonomy/lib/difficulty.ts`)

1. Se limpia el texto: sin HTML, sin viñetas ni asteriscos, sin acentos, en minúsculas.
2. Si trae etiqueta («Dificultad:», «Grado de dificultad:», «Nivel de dificultad:», «Nivel …:»), se lee lo que sigue hasta el primer punto, salto de línea o «Altura».
3. Sin etiqueta, solo se confía en la cabeza si es corta (hasta 40 caracteres). Un párrafo largo va a dudas aunque mencione un nivel.
4. La cabeza se busca en la tabla de abajo; las filas compuestas («media alta») ganan antes que las simples («media», «alta»). Si coinciden dos filas simples distintas, es duda.
5. Altura: misma regla que firmó el PO el 11 nov (REQ-1519): 2,500–3,499 m = 3; desde 3,500 m = 4; desde 4,500 m = 5. Entre el término y la altura manda el mayor («Dificultad: Baja / Altura: 3.500 msnm» = 4).
6. Lo que no se reconoce queda en dudas: sin nivel y sin mostrarse. Sin texto = sin dato, tampoco se muestra.

Escala del diccionario (`circuito-dificultad`): 1 Relajado · 2 Ligero · 3 Moderado · 4 Exigente · 5 Muy exigente.

## Gates para el PO (REQ-10657)

| Gate | Pregunta | A (recomendada) | B |
|---|---|---|---|
| G-D1 | «Alta» o «Alto» solo, sin más señal | **4 Exigente**; el 5 queda para «muy alta / muy exigente» o altura desde 4,500 m (igual que la escala del 11 nov: 5 = trekking de varios días o 4,500 m) | 5 Muy exigente |
| G-D2 | «Fácil», «Baja», «Leve», «Para toda la familia», «No necesita» | **1 Relajado** | 2 Ligero (como la equivalencia vieja G-T8A «fácil → 2», que el PO ya reemplazó el 11 nov) |
| G-D3 | Rangos «Baja/Media», «Fácil a Moderado» | **2 Ligero** | 3 Moderado (el más exigente del rango) |
| G-D4 | Rangos «Media/Alta», «Moderado/Difícil», «Moderada y Alta» | **4 Exigente** (el más exigente del rango) | 3 Moderado |
| G-D5 | Las 27 dudas de abajo (27 tours) | **No se muestran** hasta que el PO las resuelva una por una o Tangol corrija el dato | Se leen a mano ahora, una por una, en esta tabla |

Con la tabla A en todo: 629 tours con nivel, 27 en duda, 558 sin dato.

## Firma del PO

- [x] **Firmada el 15 nov 2026** (REQ-10657): «A» en los cinco gates (G-D1 «Alta» = 4 Exigente; G-D2 «Fácil/Baja» = 1 Relajado; G-D3 rangos bajo-medio = 2 Ligero; G-D4 rangos medio-alto = 4 Exigente; G-D5 las 27 dudas no se muestran hasta resolverlas). La tabla de `src/taxonomy/lib/difficulty.ts` queda como está; la aplica en memoria el adaptador de Tangol de la ola 6 y la muestra la ficha única (ola 7) tras su bandera.

## Resultado con la tabla propuesta

Tours de Tangol: 1214 · con nivel: 629 · dudas: 27 (27 textos distintos) · sin dato: 558

| Nivel | Nombre | Tours |
|---|---|---|
| 1 | Relajado | 473 |
| 2 | Ligero | 7 |
| 3 | Moderado | 109 |
| 4 | Exigente | 40 |
| 5 | Muy exigente | 0 |

### Tabla de equivalencias (filas de la tabla, en orden de prioridad)

| Fila | Nivel | Términos reconocidos |
|---|---|---|
| muy-exigente | 5 Muy exigente | muy alta · muy alto · muy exigente · muy dificil · extrema · extremo |
| medio-alto | 4 Exigente | media alta · medio alto · media a alta · medio a alto · moderado alto · moderada alta · moderado a alto · moderado dificil · moderada dificil · medio dificil · media dificil · moderada y alta · moderado y alto · exigente alto · alto exigente · alta exigente |
| ligero | 2 Ligero | facil moderado · facil a moderado · facil moderada · baja media · bajo medio · baja a media · bajo moderado · baja moderada · bajo a moderado |
| exigente | 4 Exigente | alta · alto · exigente · dificil |
| moderado | 3 Moderado | media · medio · mediano · mediana · moderado · moderada · intermedio · intermedia |
| facil | 1 Relajado | facil · facii · baja · bajo · leve · para toda la familia · no necesita · sin dificultad · basica · basico |

### Texto del proveedor → nivel

| Texto de Tangol | Tours | Nivel | Regla |
|---|---|---|---|
| Fácil | 119 | 1 Relajado | termino:facil |
| Baja | 98 | 1 Relajado | termino:facil |
| Bajo. | 29 | 1 Relajado | termino:facil |
| Bajo | 29 | 1 Relajado | termino:facil |
| <p>Baja</p> | 29 | 1 Relajado | termino:facil |
| Leve | 27 | 1 Relajado | termino:facil |
| Baja. | 24 | 1 Relajado | termino:facil |
| <p>Fácil</p> | 21 | 1 Relajado | termino:facil |
| Media | 18 | 3 Moderado | termino:moderado |
| <p>Bajo</p> | 17 | 1 Relajado | termino:facil |
| Moderado | 14 | 3 Moderado | termino:moderado |
| <p>Moderado</p> | 12 | 3 Moderado | termino:moderado |
| **Bajo | 12 | 1 Relajado | termino:facil |
| - Baja. | 11 | 1 Relajado | termino:facil |
| Alta | 8 | 4 Exigente | termino:exigente |
| <p>Media</p> | 7 | 3 Moderado | termino:moderado |
| <p>Bajo.</p> | 7 | 1 Relajado | termino:facil |
| Medio | 6 | 3 Moderado | termino:moderado |
| Fácil. | 6 | 1 Relajado | termino:facil |
| <p>Medio</p> | 6 | 3 Moderado | termino:moderado |
| Medio. | 5 | 3 Moderado | termino:moderado |
| Moderada | 4 | 3 Moderado | termino:moderado |
| Media. | 4 | 3 Moderado | termino:moderado |
| <p>Alta</p> | 4 | 4 Exigente | termino:exigente |
| <p>**Bajo</p> | 4 | 1 Relajado | termino:facil |
| - Fácil. | 4 | 1 Relajado | termino:facil |
| - Bajo | 4 | 1 Relajado | termino:facil |
| media | 3 | 3 Moderado | termino:moderado |
| baja | 3 | 1 Relajado | termino:facil |
| BAJA | 3 | 1 Relajado | termino:facil |
| Para toda la familia | 2 | 1 Relajado | termino:facil |
| Moderado. | 2 | 3 Moderado | termino:moderado |
| Medio - Alto | 2 | 4 Exigente | termino:medio-alto |
| Media - alta | 2 | 4 Exigente | termino:medio-alto |
| Media - Alta | 2 | 4 Exigente | termino:medio-alto |
| Dificultad: Media / Altura: 3.400 msnm. | 2 | 3 Moderado | termino:moderado |
| Baja. Largas horas en vehículo. | 2 | 1 Relajado | termino:facil |
| ALTA | 2 | 4 Exigente | termino:exigente |
| <p>Para toda la familia</p> | 2 | 1 Relajado | termino:facil |
| <p>Moderada y Alta</p> | 2 | 4 Exigente | termino:medio-alto |
| <p>Medio.</p> | 2 | 3 Moderado | termino:moderado |
| <p>Fácil.</p> | 2 | 1 Relajado | termino:facil |
| <p>Alto</p> | 2 | 4 Exigente | termino:exigente |
| **Caminata moderada | 2 | 3 Moderado | termino:moderado |
| bajo | 1 | 1 Relajado | termino:facil |
| baja exigencia | 1 | 1 Relajado | termino:facil |
| Nivel de Dificultad: Moderado. Requiere buena condición física para afrontar una subida constante de 400 metros de desni | 1 | 3 Moderado | termino:moderado |
| Nivel Medio/Alto: requiere experiencia previa en trekking y buen estado físico. ⏎ Ascensos exigentes y tramos prolongado | 1 | 4 Exigente | termino:medio-alto |
| Moderado/Alto | 1 | 4 Exigente | termino:medio-alto |
| Medio-alto | 1 | 4 Exigente | termino:medio-alto |
| Medio-Difícil. | 1 | 4 Exigente | termino:medio-alto |
| Mediano | 1 | 3 Moderado | termino:moderado |
| MEDIO | 1 | 3 Moderado | termino:moderado |
| Fácil/Moderado | 1 | 2 Ligero | termino:ligero |
| Fácil a Moderado | 1 | 2 Ligero | termino:ligero |
| Fácil - Edad mínima 4 años | 1 | 1 Relajado | termino:facil |
| Fácii | 1 | 1 Relajado | termino:facil |
| Facil | 1 | 1 Relajado | termino:facil |
| Exigencia media.  ⏎ Se realizarán aproximadamente 3 horas de caminata discontinua en terreno irregular | 1 | 3 Moderado | termino:moderado |
| Dificultad: Media / Altura: 4.300 msnm. | 1 | 4 Exigente | altura |
| Dificultad: Media / Altura: 2.400 msnm. | 1 | 3 Moderado | termino:moderado |
| Dificultad: Media / Altura Máxima del Tour: 2.500 msnm | 1 | 3 Moderado | termino:moderado |
| Dificultad: Baja / Altura: 3.500 msnm | 1 | 4 Exigente | altura |
| Dificultad: Baja / Altura: 2.500 msnm. | 1 | 3 Moderado | altura |
| Dificultad media a alta. Se recomienda tener buena condición física. | 1 | 4 Exigente | termino:medio-alto |
| Dificultad Física: Media ⏎ Dificultad Técnica: Baja ⏎ Total distancia recorrida: 10 k ⏎ Desnivel: 160 ⏎ Tiempo de activi | 1 | 3 Moderado | termino:moderado |
| Baja/Media. | 1 | 2 Ligero | termino:ligero |
| BAJA. | 1 | 1 Relajado | termino:facil |
| ALTA ⏎ * Duración. 6/7 hs totales  ⏎ * Desnivel: 650 mts   ⏎ * Distancia recorrida: 7 km | 1 | 4 Exigente | termino:exigente |
| <p>No necesita</p> | 1 | 1 Relajado | termino:facil |
| <p>Moderado.</p> | 1 | 3 Moderado | termino:moderado |
| <p>Medio-Alto</p> | 1 | 4 Exigente | termino:medio-alto |
| <p>Media - Alta</p> | 1 | 4 Exigente | termino:medio-alto |
| <p>Fácil/Moderado</p> | 1 | 2 Ligero | termino:ligero |
| <p>Fácil (observar requerimientos físicos)</p> | 1 | 1 Relajado | termino:facil |
| <p>Exigente - Alto</p> | 1 | 4 Exigente | termino:medio-alto |
| <p>Exigencia media.</p> | 1 | 3 Moderado | termino:moderado |
| <p>Dificultad: Media. 5 Km Aprox / Altura: 3.200 msnm.</p> | 1 | 3 Moderado | termino:moderado |
| <p>Dificultad: Media / Altura: 4.200 msnm.</p> | 1 | 4 Exigente | altura |
| <p>Dificultad: Media / Altura: 2.800 msnm</p> | 1 | 3 Moderado | termino:moderado |
| <p>Dificultad: Baja / Altura: 2.800 msnm.</p> | 1 | 3 Moderado | altura |
| <p>Bajo - Capacidad para soportar alturas</p> | 1 | 1 Relajado | termino:facil |
| <p>Baja.</p> | 1 | 1 Relajado | termino:facil |
| <p>Baja, para toda la familia</p> | 1 | 1 Relajado | termino:facil |
| <p>Baja - Media</p> | 1 | 2 Ligero | termino:ligero |
| <p>Alto, Exigente.</p> | 1 | 4 Exigente | termino:medio-alto |
| <p>-Grado de Dificultad: Baja/Media. El 80% del circuito es en bajada, por lo que se requiere habilidad en el manejo de  | 1 | 2 Ligero | termino:ligero |
| <p>- Moderada y Alta. - En el itinerario se indica la intensidad diaria.</p> | 1 | 4 Exigente | termino:medio-alto |
| <p>- Fácil</p> | 1 | 1 Relajado | termino:facil |
| <p>- Dificultad: Media. - Altura: 2.400 msnm.</p> | 1 | 3 Moderado | termino:moderado |
| <p>- Baja.</p> | 1 | 1 Relajado | termino:facil |
| <p>*Bajo</p> | 1 | 1 Relajado | termino:facil |
| -Moderada | 1 | 3 Moderado | termino:moderado |
| -Medio | 1 | 3 Moderado | termino:moderado |
| -Grado de Dificultad: Medio. Este circuito ofrece la oportunidad de disfrutar de un pedaleo tranquilo en un entorno únic | 1 | 3 Moderado | termino:moderado |
| -Fácil | 1 | 1 Relajado | termino:facil |
| - Medio. | 1 | 3 Moderado | termino:moderado |
| - Media (Caminata leve de 3 horas de duración) | 1 | 3 Moderado | termino:moderado |
| - Intensidad media / alta.  ⏎ - 4 hs totales de remada ⏎ - Las salidas las realizamos en kayaks dobles de travesia con t | 1 | 4 Exigente | termino:medio-alto |
| - Fácil | 1 | 1 Relajado | termino:facil |
| *baja | 1 | 1 Relajado | termino:facil |
| *Mediana | 1 | 3 Moderado | termino:moderado |
| *Bajo | 1 | 1 Relajado | termino:facil |
| **Moderado / difícil | 1 | 4 Exigente | termino:medio-alto |
| **Medio | 1 | 3 Moderado | termino:moderado |
| **Bajo/moderado | 1 | 2 Ligero | termino:ligero |
| * Moderada. Se necesita contextura física sobretodo de los menores, ya que es necesario que pueda cumplir con los requis | 1 | 3 Moderado | termino:moderado |

### Dudas (no se muestran hasta que el PO decida)

| Texto de Tangol | Tours |
|---|---|
| ⚠️ No recomendable para niños pequeños ⏎ ⚠️ No apto para embarazadas ⏎ ⚠️ No recomendado para personas con problemas car | 1 |
| Tome en cuenta que para la caminata se realizará un ascenso hasta el morro | 1 |
| Se requiere experiencia previa para realizar esta actividad. | 1 |
| Para participar los pasajeros deben gozar de un buen estado de salud, le tienen que gustar los perros, y poseer un espír | 1 |
| Para este trekking de dificultad alta se necesita de muy buena condición física, pensado para aquellos que mantienen un  | 1 |
| No se requiere mayor dificultad, pero el agua es fría y se necesita flotabilidad y estabilidad en el agua, además de la  | 1 |
| No se necesita experiencia previa en rafting, sin embargo, los participantes deben tener confianza en el agua y poder na | 1 |
| La actividad presenta una exigencia física media, aunque gracias a la variedad de senderos puede adaptarse según la expe | 1 |
| Estado Físico aceptable | 1 |
| El nivel de dificultad de este trekking puede variar según las condiciones climáticas | 1 |
| Edad mínima: 18 años. | 1 |
| Caminata: ⏎ Intensidad moderada. 3:00 - 3:30 hs totales ⏎ Desnivel acumulado: 180 mts. / 580 ft. ⏎ Desnivel: 165 mts. /  | 1 |
| Bajo - EXCURSIÓN NO RECOMENDADAS PARA PERSONAS EMBARAZADAS O CON MOVILIDAD REDUCIDA | 1 |
| Actividad de dificultad baja ⏎ Recomendado para personas con condición física básica | 1 |
| <p>La degustación de vinos está reservada para mayores de 18 años. Los menores pueden disfrutar de la visita a la Viña S | 1 |
| <p>Experiencia: Nivel 2 Requiere el uso de elementos técnicos sin experiencia previa. Experiencia Física: Nivel 3 Gananc | 1 |
| <p>Edad mínima 15 años con permiso de padres / Pasajeros con condiciones de salud especiales, como hipertensión o enferm | 1 |
| <p>Dependiendo el sendero, puede presentar dificultares bajas, intermedias o avanzadas</p> | 1 |
| <p>Acorde a la actividad</p> | 1 |
| <p><strong>Distancia de trekking: </strong>19,6 km aproximadamente</p><p><strong>Desnivel positivo: </strong>890 metros  | 1 |
| <p><span style="color:rgb(30,35,40);">Esta travesía es recomendada para aquellas personas que cuenten con un buen estado | 1 |
| 45 Min Aproximadamente. Dependerá del Hotel. | 1 |
| 1 Horas Aproximadamente. Dependerá del Hotel. | 1 |
| * El recorrido es de dificultad moderada; se recomienda un nivel básico de condición física. | 1 |
| * Duración. 9 hs totales  ⏎ * Desnivel: 300 mts | 1 |
| * Duración. 7/8 hs totales. ⏎ * Desnivel: 550 mts. ⏎ * Distancia recorrida: 11 km. | 1 |
| * Duración. 6/7 hs totales  ⏎ * Desnivel: 650 mts   ⏎ * Distancia recorrida: 8,5 km | 1 |

## Filas que conviene que el PO mire aunque tengan nivel

- «Bajo - Capacidad para soportar alturas» (1 tour) sale como 1 Relajado por la palabra «Bajo», pero habla de altura sin dar metros. Propuesta: dejarlo en 1 salvo que el PO lo pase a duda.
- «Fácil - Edad mínima 4 años» y «Fácil (observar requerimientos físicos)» salen como 1 por «Fácil»; la edad y los requisitos van en su propio bloque de la ficha, no en la dificultad.
- «Dificultad: Baja / Altura: 3.500 msnm» sale como 4 Exigente por la regla de altura firmada el 11 nov, aunque el proveedor diga «Baja».

## Qué no hace este PR

No escribe en D1, no toca la ficha ni las tarjetas y no cambia el gestor de viajes (`Trip.difficulty`, REQ-1518/1520 siguen igual). La tabla se aplicará en memoria (decisión 8, REQ-10587) cuando el adaptador de Tangol de la ola 6 la lea; la columna original se conserva completa (decisión 14).

## Reproducir

```
npx vitest run src/taxonomy/lib/difficulty.test.ts
npx tsx src/scripts/dificultad-tangol.ts <conteos.json>   # conteos.json sale del SELECT de arriba; no se guarda en el repo
```
