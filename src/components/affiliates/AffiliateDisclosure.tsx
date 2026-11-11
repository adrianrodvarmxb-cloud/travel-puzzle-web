/**
 * Aviso visible de relación de afiliado (cumplimiento FREETOUR G5 y LFPDPPP).
 * Solo texto: no pinta nada salvo el aviso. Se monta en las páginas con enlaces de afiliado.
 */
export function AffiliateDisclosure() {
  return (
    <p className="text-sm text-slate-600" role="note">
      Algunos enlaces de esta página son de afiliados. Si reservas a través de ellos, Travel Puzzle puede recibir una
      comisión sin costo adicional para ti.
    </p>
  );
}
