# Inventario de Tangol (11 nov 2026, 14:58 CDMX)

Corrida de `npm run inventario-tangol` en la pasarela de cPanel (REQ-1558), saliendo por 66.29.153.81. La autenticación funcionó: la IP ya está aceptada por Tangol.

**Total: 2,237 tours en 10 países y 184 ciudades.**

> **Corrección (REQ-3505, 12 nov 2026).** El 2,237 NO es el número de tours que se pueden cargar: es la suma del `ToursQty` que cada **país** declara en `GetTourCountries` (`summarizeInventory` suma `c.ToursQty`; la tabla de abajo suma exactamente 2,237). La lista real (`GetTourListByDestination`, corrida de solo lectura 43303152904 del 12 nov, REQ-3487) devolvió **2,059 tours válidos** (+1 tirado por validación = 2,060) en los mismos 10 países y 184 destinos, sin llamadas con error. Diferencia: 177 tours que los países declaran y las listas no traen. La causa no se puede saber sin preguntar a Tangol (ver REQ-3505 en `docs/requisitos.md`). Para planear, la cifra que vale es **2,059**.

| País | Tours | Ciudades principales |
|---|---|---|
| Argentina | 921 | Buenos Aires 184, Bariloche 91, Ushuaia 90, El Calafate 86, Mendoza 70, Salta 47, Puerto Madryn 40, Iguazú 32, Córdoba 30 |
| Brasil | 408 | Río de Janeiro 83, São Paulo 38, Manaus 24, Salvador 23, Foz de Iguazú 22, Recife 21 |
| Chile | 269 | Santiago 42, Puerto Varas 28, Puerto Natales 21, Pucón 19, San Pedro de Atacama 19, Isla de Pascua 13, Torres del Paine 11 |
| Colombia | 248 | Cartagena 36, Bogotá 31, Medellín 30, Santa Marta 28 |
| Perú | 224 | Cusco 46, Lima 37, Arequipa 25, Puno 18, Iquitos 16 |
| Ecuador | 75 | Quito 21, Galápagos 12, Puerto López 12 |
| Uruguay | 56 | Montevideo 25, Colonia 14, Punta del Este 7 |
| Bolivia | 18 | La Paz 6, Santa Cruz 4, Uyuni 4 |
| México | 17 | Cancún 8, Tulum 6, Cozumel 2, Puerto Escondido 1 |
| Paraguay | 1 | Asunción 1 |
