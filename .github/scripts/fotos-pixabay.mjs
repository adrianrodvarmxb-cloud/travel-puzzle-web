// Descarga candidatas (vista previa 640 px) por destino desde la API de Pixabay. No imprime la llave.
import { mkdirSync, writeFileSync } from "node:fs";
const key = process.env.PIXABAY_API_KEY;
if (!key) { console.log("Falta PIXABAY_API_KEY"); process.exit(1); }
const out = process.argv[2] || "fotos";
const Q = {
  delhi: ["qutub minar", "jama masjid delhi", "india gate delhi", "humayun tomb", "red fort delhi", "lotus temple delhi", "akshardham", "chandni chowk", "gurudwara bangla sahib", "rickshaw delhi"],
  agra: ["taj mahal", "taj mahal sunrise", "agra fort", "fatehpur sikri", "mehtab bagh"],
  jaipur: ["hawa mahal", "amber fort", "jaipur city palace", "patrika gate", "jal mahal", "chand baori", "panna meena kund", "jantar mantar jaipur", "rajasthan dance"],
  rajasthan: ["udaipur lake pichola", "udaipur city palace", "mehrangarh fort", "jodhpur blue city", "ranakpur temple", "mandawa haveli", "junagarh fort bikaner", "rajasthan camel", "pushkar", "rajasthan turban"],
  ganges: ["varanasi ghats", "varanasi boat", "ganges aarti", "sarnath stupa", "khajuraho temple", "orchha"],
  norte: ["golden temple amritsar", "amritsar", "wagah border"],
  mumbai: ["gateway of india mumbai", "marine drive mumbai", "chhatrapati shivaji terminus", "elephanta caves", "mumbai skyline"],
  nepal: ["boudhanath stupa", "swayambhunath", "patan durbar square", "bhaktapur", "pashupatinath", "kathmandu"],
  srilanka: ["sigiriya", "dambulla cave temple", "temple of the tooth kandy", "nuwara eliya tea", "nine arch bridge", "yala leopard", "galle fort", "pinnawala elephant", "polonnaruwa", "sri lanka beach"],
  fiestas: ["holi festival", "holi colors india", "diwali lamps", "diwali diya", "sariska tiger", "henna hands", "indian spices", "indian sari women", "yoga india", "chai tea india", "block printing india"],
};
mkdirSync(out, { recursive: true });
const meta = [];
for (const [dest, queries] of Object.entries(Q)) {
  mkdirSync(`${out}/${dest}`, { recursive: true });
  const seen = new Set();
  for (const q of queries) {
    const u = `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(q)}&image_type=photo&orientation=horizontal&min_width=1600&safesearch=true&per_page=10`;
    const r = await fetch(u);
    if (!r.ok) { console.log(`${q}: HTTP ${r.status}`); continue; }
    const { hits = [] } = await r.json();
    for (const h of hits) {
      if (seen.has(h.id)) continue; seen.add(h.id);
      const img = await fetch(h.webformatURL);
      if (!img.ok) continue;
      writeFileSync(`${out}/${dest}/${h.id}.jpg`, Buffer.from(await img.arrayBuffer()));
      meta.push({ dest, q, id: h.id, tags: h.tags, page: h.pageURL, user: h.user, likes: h.likes, w: h.imageWidth, h: h.imageHeight });
    }
    console.log(`${dest} · ${q}: ${hits.length}`);
    await new Promise((s) => setTimeout(s, 700));
  }
}
writeFileSync(`${out}/fotos.json`, JSON.stringify(meta, null, 2));
console.log(`Total: ${meta.length}`);
