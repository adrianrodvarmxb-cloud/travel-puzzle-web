/**
 * REQ-283: clave fonética española, adaptación propia de Spanish Metaphone (amsqr, BSD; Abydos) con seseo
 * latinoamericano: S = Z = C ante e/i. Une b/v, ll/y, h muda, qu/k, gue/gui = g, ge/gi = j y cch = ch.
 * Solo sirve para REORDENAR candidatos de corrección: nunca descarta ni filtra resultados. Puro.
 */
import { foldTokens } from "./normalize";

const VOWELS = new Set(["a", "e", "i", "o", "u"]);
const isVowel = (c: string | undefined) => !!c && VOWELS.has(c);
const soft = (c: string | undefined) => c === "e" || c === "i";

function wordKey(w: string): string {
  const s = [...w];
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1], n2 = s[i + 2];
    switch (c) {
      case "a": case "e": case "i": case "o": case "u":
        if (!out) out += c.toUpperCase(); // solo la vocal inicial
        break;
      case "b": case "v": out += "B"; break;
      case "c":
        if (n === "h") { out += "X"; i++; }
        else if (n === "c" && s[i + 2] === "h") { /* «cch» (Picchu) = «ch» */ }
        else if (soft(n)) out += "S"; // seseo
        else out += "K";
        break;
      case "g":
        if (soft(n)) out += "J";
        else if (n === "u" && soft(n2)) { out += "G"; i++; }
        else out += "G";
        break;
      case "h": break; // muda
      case "j": out += "J"; break;
      case "k": out += "K"; break;
      case "l":
        if (n === "l") { out += "Y"; i++; } else out += "L";
        break;
      case "p":
        if (n === "h") { out += "F"; i++; } else out += "P";
        break;
      case "q":
        out += "K";
        if (n === "u") i++;
        break;
      case "w": out += "U"; break;
      case "x": out += out ? "KS" : "S"; break;
      case "y":
        if (isVowel(n)) out += "Y";
        else if (!out) out += "I";
        break;
      case "z": out += "S"; break; // seseo
      default: out += c.toUpperCase();
    }
  }
  return out.replace(/(.)\1+/g, "$1");
}

// REQ-283
export function esMetaphone(text: string): string {
  return foldTokens(text).map(wordKey).filter(Boolean).join(" ");
}
