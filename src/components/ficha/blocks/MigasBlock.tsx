import { Breadcrumbs } from '@/components/destinations/Breadcrumbs';
import type { FichaCrumb } from '@/ficha/lib/crumbs';

/**
 * REQ-10808 · Bloque 1 «Migas de pan» de la ficha única. Solo pinta: recibe las migas ya calculadas por
 * `fichaCrumbs` (ISP: nada más del modelo) y reutiliza las migas de /destinos. Sin base, banderas ni proveedor (DIP).
 */
export function MigasBlock({ items }: { items: FichaCrumb[] }) {
    if (items.length === 0) return null;
    return (
        <div className="mb-6" data-bloque="migas">
            <Breadcrumbs items={items} />
        </div>
    );
}
