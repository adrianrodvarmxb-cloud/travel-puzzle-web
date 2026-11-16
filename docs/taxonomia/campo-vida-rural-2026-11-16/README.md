# Tema «Campo y vida rural» (REQ-10701, 16 nov 2026)

Ficha única, ola 3, gate G-R3 firmado por el PO el 15-11-2026 («B: crear «Campo y vida rural»»). Un cambio por PR.

## Qué cambia
- Diccionario: tema nuevo `campo-vida-rural` («Campo y vida rural» / «Countryside & rural life»), activo, con chip, prioridad 14 (el último: no desplaza a ningún tema de hoy en el tope de 3). Palabras del título: estancia*, granja*, finca*, hacienda*, rancho, ranch, gaucho*, día de campo, de campo, campestre*, rural*, farm, farms, farmstay, countryside, agroturismo. Excluye los palacios de «La Granja» (San Ildefonso).
- `TEMAS` (types.ts) y el filtro de /tours (`TEMAS_FILTRO`, `TEMA_LABEL`): 14 temas, 13 con chip.
- Mapeo de Tangol: 9000007 (Día de estancia, 13 tours) lleva el tema por categoría y conserva Naturaleza.
- Contrato del diccionario: fila 146 nueva en `docs/taxonomia-diccionario.csv` y `contrato-diccionario.json`.
- Regla REQ-10709: la palabra vale para cualquier proveedor.

## Antes y después (datos reales, D1 de producción, solo lectura, 16-11-2026)
Títulos publicados que llevan alguna palabra del tema: **30 de Tangol** (los 13 de «Día de estancia» más estancias, fincas cafeteras y haciendas de otras categorías) y **27 de FREETOUR** (granjas de especias de Zanzíbar, fincas de café, cocina rural en Hoi An, estancia en familia). Ganan el chip «Campo y vida rural» salvo los que ya tengan 3 temas (el nuevo va al final). Ningún tour cambia de formato ni pierde un tema. Falsos positivos revisados y excluidos: Palacio Real de la Granja de San Ildefonso, Jardines del Palacio de la Granja, «El farmacéutico desaparecido», «Campo De Piedra Pomez» (no lleva «de campo» ni «campo» solo).

Ejemplos: «Dia De Estancia En Peuma Hue», «Cabalgata En Estancia Cristina», «Visita A Finca Cafetera En El Quindío», «Gaucho Patagon Tradiciones Campestres En Coyhaique», «Excursión de un día a la granja de cacao», «Clase de cocina rural en Hoi An con la familia de Lily».

## Regreso
Revertir el PR. (Quitar el tema del diccionario exige quitarlo también de `TEMAS`, `TEMAS_FILTRO`, el mapeo de Tangol y la fila 146 del contrato.)
