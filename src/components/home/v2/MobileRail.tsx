/**
 * En celular, los hijos van en un carrusel horizontal que se desliza (la siguiente tarjeta se asoma);
 * desde `sm` vuelven a ser una cuadrícula con las clases de `gridClass` (gate 2 de la auditoría de diseño).
 */
export function MobileRail({ gridClass, children }: { gridClass: string; children: React.ReactNode }) {
  return (
    <div
      className={`-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:w-[84%] [&>*]:shrink-0 [&>*]:snap-start sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 sm:[&>*]:w-auto ${gridClass}`}
    >
      {children}
    </div>
  );
}
