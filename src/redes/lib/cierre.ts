/**
 * REQ-1514: qué hacer con el issue «Redes del día» después de una corrida. Puro.
 * Se cierra cuando Facebook e Instagram ya salieron (publicadas o ya registradas); LinkedIn manual no lo impide,
 * porque su texto se pega a mano a propósito. Si algo de FB o IG sigue pendiente, el issue se actualiza.
 */
import type { Resultado } from "../run";

const LISTAS = ["publicado"];
const YA_SALIO = (x: Resultado | undefined) => !!x && (LISTAS.includes(x.estado) || (x.estado === "manual" && /ya se publicó/.test(x.detalle)));

export function decidirIssue(resultados: Resultado[]): "cerrar" | "actualizar" {
  const fb = resultados.find((x) => x.red === "facebook");
  const ig = resultados.find((x) => x.red === "instagram");
  return YA_SALIO(fb) && YA_SALIO(ig) ? "cerrar" : "actualizar";
}
