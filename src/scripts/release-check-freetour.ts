/**
 * REQ-080 — Prueba de release: FREETOUR no le manda correos propios al cliente (Modo 2).
 * No reserva ni lee correo: evalúa los remitentes exportados del buzón de prueba.
 * Uso: npx tsx src/scripts/release-check-freetour.ts <remitentes.json>
 *      (sin archivo, solo imprime la checklist). Sale con código 1 si no pasa.
 * Procedimiento: docs/runbook/release-freetour-sin-correos.md
 */
import { readFileSync } from "node:fs";
import { checkNoFreetourEmails, RELEASE_CHECKLIST, type ReceivedEmail } from "../freetour/lib/release-email-check";

console.log("Checklist de release (REQ-080):\n" + RELEASE_CHECKLIST.join("\n") + "\n");

const file = process.argv[2];
if (!file) {
  console.log("Sin archivo de remitentes: solo checklist. NO PUBLICAR hasta correr la verificación.");
  process.exit(2);
}

const emails = JSON.parse(readFileSync(file, "utf8")) as ReceivedEmail[];
const r = checkNoFreetourEmails(emails);
console.log(`Correos de Travel Puzzle: ${r.ours}`);
for (const e of r.freetour) console.log(`FREETOUR: ${e.from} | ${e.subject ?? ""}`);
for (const e of r.unknown) console.log(`Revisar a mano: ${e.from} | ${e.subject ?? ""}`);
console.log(r.ok ? "RESULTADO: VERDE — solo correos de Travel Puzzle." : "RESULTADO: NO PUBLICAR — revisar arriba y abrir incidente.");
process.exit(r.ok ? 0 : 1);
