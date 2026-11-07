# Calendario del blog diario (topic cluster) · v1, 6 nov 2026

Fuente de verdad en código: `src/blog/content/calendario.ts` (un test exige que esta tabla y el código coincidan, REQ-961).
Derivado del catálogo publicado el 6 nov 2026 (sitemaps y páginas de ciudad de travelpuzzle.com.mx; ver `docs/blog/plan-blog-diario.md` §2).

- **Orden:** el agente toma el siguiente ID pendiente del tipo que le toca hoy (pago o free). Pendiente = ningún artículo (publicado o borrador) usa ese `clusterId` ni ese término.
- **Mezcla:** cada bloque de 10 trae 8 de pago y 2 de free tour (posiciones 5 y 10). El validador mide la mezcla en una ventana móvil de 10 días (REQ-962).
- **Free tour (FT-…):** BLOQUEADO mientras no exista la autorización B1 por escrito (REQ-983). Esos días no se publica nada.
- **Trending:** un tema trending del mismo tipo puede tomar el lugar del día; el ID del calendario queda pendiente para otro día (REQ-964).
- **Término objetivo:** uno por artículo; no se repite ni se parece (canibalización) a otro artículo, a un pilar ni a otro ID (REQ-970).

| # | ID | Pilar | Mix | Término objetivo | Página del catálogo |
|---|---|---|---|---|---|
| 1 | EU-01 | europa | pago | requisitos para entrar a europa 2026 mexicanos | /tours?search=Europa |
| 2 | CN-02 | china | pago | excursion a la gran muralla desde pekin | /destinos/cn/pekin |
| 3 | CO-01 | colombia | pago | excursiones de un dia desde bogota | /destinos/co/bogota |
| 4 | EU-02 | europa | pago | excursiones de un dia desde sevilla | /destinos/es/sevilla |
| 5 | FT-MX-01 | mexico | free | free tour en ciudad de mexico | /destinos/mx/ciudad-de-mexico |
| 6 | MX-01 | mexico | pago | tour a pie por el centro historico de la cdmx | /destinos/mx/ciudad-de-mexico |
| 7 | PE-01 | peru | pago | excursiones de un dia desde cusco | /destinos/pe/cusco |
| 8 | EU-03 | europa | pago | excursiones de un dia desde praga | /destinos/cz/praga |
| 9 | CN-03 | china | pago | visita guiada a la ciudad prohibida | /destinos/cn/pekin |
| 10 | FT-EU-01 | europa | free | free tour en paris en español | /destinos/fr/paris |
| 11 | EU-04 | europa | pago | visita guiada a la acropolis de atenas | /destinos/gr/atenas |
| 12 | CO-02 | colombia | pago | visita guiada por la ciudad amurallada de cartagena | /destinos/co/cartagena-co |
| 13 | EU-05 | europa | pago | tours guiados en lisboa | /destinos/pt/lisboa |
| 14 | CN-04 | china | pago | viaje a china de 8 dias desde mexico | /tours?search=China |
| 15 | FT-PE-01 | peru | free | free tour en lima | /destinos/pe/lima |
| 16 | EU-06 | europa | pago | excursiones desde madrid a toledo y segovia | /destinos/es/madrid |
| 17 | PE-02 | peru | pago | como llegar a machu picchu desde cusco | /destinos/pe/cusco |
| 18 | MX-02 | mexico | pago | tours autoguiados en la ciudad de mexico | /destinos/mx/ciudad-de-mexico |
| 19 | EU-07 | europa | pago | tours guiados en budapest | /destinos/hu/budapest |
| 20 | FT-EU-02 | europa | free | free tour en madrid | /destinos/es/madrid |
| 21 | CO-03 | colombia | pago | visitas guiadas en medellin | /destinos/co/medellin |
| 22 | EU-08 | europa | pago | tour a pie por paris con guia | /destinos/fr/paris |
| 23 | CN-05 | china | pago | como pagar en china siendo turista | /tours?search=China |
| 24 | PE-03 | peru | pago | laguna humantay desde cusco | /destinos/pe/cusco |
| 25 | FT-CO-01 | colombia | free | free tour en bogota | /destinos/co/bogota |
| 26 | EU-09 | europa | pago | visitas guiadas en barcelona | /destinos/es/barcelona |
| 27 | MX-03 | mexico | pago | que hacer en la ciudad de mexico en un fin de semana | /destinos/mx/ciudad-de-mexico |
| 28 | EU-10 | europa | pago | tours a pie en londres en español | /destinos/gb/londres |
| 29 | CN-06 | china | pago | internet en china para turistas | /tours?search=China |
| 30 | FT-EU-03 | europa | free | free tour en praga | /destinos/cz/praga |
| 31 | CO-04 | colombia | pago | requisitos de entrada a colombia para mexicanos | /destinos/co |
| 32 | EU-11 | europa | pago | excursiones de un dia desde lisboa | /destinos/pt/lisboa |
| 33 | PE-04 | peru | pago | mal de altura en cusco | /destinos/pe/cusco |
| 34 | CN-07 | china | pago | tren bala de pekin a shanghai | /destinos/cn/shanghai |
| 35 | FT-EU-04 | europa | free | free tour en lisboa | /destinos/pt/lisboa |
| 36 | EU-12 | europa | pago | tours en oporto | /destinos/pt/porto |
| 37 | CO-05 | colombia | pago | islas del rosario desde cartagena | /destinos/co/cartagena-co |
| 38 | MX-04 | mexico | pago | tour nocturno en la ciudad de mexico | /destinos/mx/ciudad-de-mexico |
| 39 | EU-13 | europa | pago | excursiones de un dia desde atenas | /destinos/gr/atenas |
| 40 | FT-EU-05 | europa | free | free tour en barcelona | /destinos/es/barcelona |
| 41 | PE-05 | peru | pago | visitas guiadas en lima | /destinos/pe/lima |
| 42 | CN-08 | china | pago | cuando viajar a china | /tours?search=China |
| 43 | EU-14 | europa | pago | visita a la mezquita de cordoba | /destinos/es/cordoba |
| 44 | CO-06 | colombia | pago | excursiones desde medellin | /destinos/co/medellin |
| 45 | FT-CN-01 | china | free | free tour en pekin | /destinos/cn/pekin |
| 46 | EU-15 | europa | pago | visita a la alhambra de granada | /destinos/es/granada |
| 47 | PE-06 | peru | pago | montaña de colores desde cusco | /destinos/pe/cusco |
| 48 | MX-05 | mexico | pago | museos de la ciudad de mexico con guia | /destinos/mx/ciudad-de-mexico |
| 49 | EU-16 | europa | pago | pompeya desde napoles | /destinos/it/napoles |
| 50 | FT-EU-06 | europa | free | free tour en londres | /destinos/gb/londres |
| 51 | CN-09 | china | pago | tours en shanghai en español | /destinos/cn/shanghai |
| 52 | EU-17 | europa | pago | tours en amsterdam | /destinos/nl/amsterdam |
| 53 | CO-07 | colombia | pago | cuando viajar a colombia | /destinos/co |
| 54 | PE-07 | peru | pago | tour al valle sagrado de los incas | /destinos/pe/cusco |
| 55 | FT-MX-02 | mexico | free | cuanto dar de propina en un free tour | /la-primera-pieza |
| 56 | EU-18 | europa | pago | tours guiados en roma | /destinos/it/roma |
| 57 | CN-10 | china | pago | viaje al tibet desde mexico | /tours?search=China |
| 58 | EU-19 | europa | pago | tours en florencia | /destinos/it/florencia |
| 59 | MX-06 | mexico | pago | como moverse en la ciudad de mexico como turista | /destinos/mx/ciudad-de-mexico |
| 60 | FT-EU-07 | europa | free | free tour en sevilla | /destinos/es/sevilla |

Cobertura: 60 entradas (48 pago, 12 free = 80/20). Europa 26, China 10, Colombia 8, Perú 8, México 8. El término `visa china para mexicanos` lo tiene el borrador escrito a mano CN-01 y no entra al calendario.
