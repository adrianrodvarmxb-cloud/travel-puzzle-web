import json,glob,re,csv,sys,unicodedata
IMP=sys.argv[1]; OUT=sys.argv[2]
def norm(s): return unicodedata.normalize('NFD',s.lower()).encode('ascii','ignore').decode()
# Altitudes conocidas (m), solo si el lugar aparece en el texto del viaje
LUGARES={'vinicunca':5036,'montana de colores':5036,'montana de siete colores':5036,'arcoiris':5036,'patapampa':4910,'laguna humantay':4200,'humantay':4200,
 'puno':3827,'titicaca':3812,'uros':3812,'taquile':3812,'sillustani':3850,'chivay':3635,'colca':3635,'cusco':3399,'cuzco':3399,'la paz':3640,'uyuni':3656,'lhasa':3656,
 'huaraz':3052,'moray':3500,'maras':3380,'pisac':2972,'kuelap':3000,'chachapoyas':2335,'quito':2850,'bogota':2640,'ollantaytambo':2792,'urubamba':2870,'valle sagrado':2870,
 'machu picchu':2430,'aguas calientes':2040,'arequipa':2335,'nuwara eliya':1868,'cuenca':2560}
NIVEL_A={'facil':2,'moderada':3,'exigente':4}
def frag(t,m,w=90):
    a=max(0,m.start()-w); b=min(len(t),m.end()+w); return ('…'+t[a:b].replace('\n',' ')+'…').strip()
def textos(t):
    parts=[t.get('titleEs',''),t.get('summaryEs',''),t.get('descriptionEs','')]
    for k in ('highlights','importantInfo','whatToBring','includes'):
        v=t.get(k) or []
        parts+= v if isinstance(v,list) else [str(v)]
    for d in t.get('itinerary') or []:
        parts.append(' '.join(str(d.get(x,'')) for x in ('title','text')))
    return '\n'.join(p for p in parts if p)
REGLAS=[ # (nivel, regex sobre texto normalizado, motivo)
 (5,r'camino inca|trek(king)? de (varios|[2-9]) dias|inca trail|salkantay|ausangate',"trekking de varios días"),
 (4,r'trek(king)?\b|desnivel|ascenso (al volcan|a pie|a la cumbre|hasta la cumbre)|subida (exigente|empinada)|rafting|escalada|via ferrata|caminata(s)? de ([4-9]|cuatro|cinco|seis|siete|ocho) horas|buena condicion fisica|condicion fisica (buena|media)',"caminata larga, desnivel o actividad exigente"),
 (3,r'kayak|sandboard|senderismo|caminata(s)? de ([2-3]|dos|tres) horas|bicicleta|ciclismo|cabalgata|a caballo|snorkel|nado con|varias horas a pie|caminata (por|en) (el|la) (bosque|selva|montana|sendero)',"actividad física moderada"),
 (2,r'caminata|a pie|recorrido peatonal|walking|paseo por|escaleras|escalones|camina',"caminatas cortas"),
]
SOLO_VEHICULO=r'sobrevuelo|crucero|espectaculo|\\bshow\\b|\\bcena\\b|clase de cocina|degustacion|bus turistico|hop-on|paseo en barco|en barco'
rows=[]
for f in sorted(glob.glob(IMP+'/*.json')):
    ag=f.split('imports_')[-1].replace('.json','')
    for e in json.load(open(f))['trips']:
        t=e['trip']; raw=textos(t); n=norm(raw)
        actual=t.get('difficulty'); nA=NIVEL_A.get(actual)
        if t['kind']=='transporte':
            rows.append([e['ref'],ag,e['status'],t['kind'],t['titleEs'],actual,nA,'','alta','Traslado o transporte: sin dificultad (no se muestra)','']); continue
        cand=[]
        for nivel,rx,mot in REGLAS:
            m=re.search(rx,n)
            if m: cand.append((nivel,mot,frag(raw,m) if len(raw)==len(n) else frag(n,m)))
        # altitud explícita
        for m in re.finditer(r'(\d{1,2}[.,]?\d{3})\s*(m\b|metros|msnm|m\.s\.n\.m)',n):
            alt=int(re.sub(r'[.,]','',m.group(1)))
            if 1500<=alt<=6500:
                lv=5 if alt>=4500 else 4 if alt>=3500 else 3 if alt>=2500 else None
                if lv: cand.append((lv,f'altitud {alt:,} m (texto del viaje)',frag(n,m)))
        for lugar,alt in LUGARES.items():
            m=re.search(r'\b'+lugar+r'\b',n)
            if m:
                lv=5 if alt>=4500 else 4 if alt>=3500 else 3 if alt>=2500 else None
                if lv: cand.append((lv,f'{lugar} a {alt:,} m (altitud de referencia, no del texto)',frag(n,m,60)))
        if cand:
            nivel=max(c[0] for c in cand); top=[c for c in cand if c[0]==nivel][0]
            conf='media' if 'referencia' in top[1] else 'alta' if nivel>=3 else 'media'
            mot,ev=top[1],top[2]
        elif re.search(SOLO_VEHICULO,norm(t['titleEs'])) and not re.search(r'louvre|museo|orsay|versalles|disney|catacumbas|notre|museum pass|city tour|guiad|torre eiffel|paris en un dia|iluminado',norm(t['titleEs'])):
            nivel,conf,mot,ev=1,'media','Por el título, la actividad es en vehículo, barco o en un lugar fijo, sin caminatas en el texto',''
        else:
            nivel,conf,mot,ev=2,'baja','Sin señal de esfuerzo ni de altura en el texto: visitas con caminatas cortas',''
        # el valor del proveedor, si es más alto, se respeta como piso
        if nA and nA>nivel and actual!='facil':
            nivel=nA; mot=f'El proveedor la marcó «{actual}»; '+mot; conf='media'
        rows.append([e['ref'],ag,e['status'],t['kind'],t['titleEs'],actual,nA,nivel,conf,mot,ev[:300]])
with open(OUT,'w',newline='',encoding='utf-8') as fh:
    w=csv.writer(fh); w.writerow(['ref','agencia','estado','kind','titulo','dificultad_hoy','nivel_hoy_GT8A','nivel_propuesto','confianza','motivo','evidencia']); w.writerows(rows)
import collections
print(len(rows)); print(collections.Counter((r[6],r[7]) for r in rows)); print(collections.Counter(r[8] for r in rows))
