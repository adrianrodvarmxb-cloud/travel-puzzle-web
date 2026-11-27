import type React from 'react';
import type { ComponentProps } from 'react';
import type { BlockId } from '@/ficha/lib/blocks';
import { MigasBlock } from './blocks/MigasBlock';
import { GaleriaBlock } from './blocks/GaleriaBlock';
import { TituloBlock } from './blocks/TituloBlock';
import { TaxonomiaBlock } from './blocks/TaxonomiaBlock';
import { DatosClaveBlock } from './blocks/DatosClaveBlock';
import { EnBreveBlock } from './blocks/EnBreveBlock';
import { DestacadoBlock } from './blocks/DestacadoBlock';
import { DescripcionBlock } from './blocks/DescripcionBlock';
import { ItinerarioBlock } from './blocks/ItinerarioBlock';
import { IncluyeBlock } from './blocks/IncluyeBlock';
import { PuntoEncuentroBlock } from './blocks/PuntoEncuentroBlock';
import { OpcionesBlock } from './blocks/OpcionesBlock';
import { AntesDeIrBlock } from './blocks/AntesDeIrBlock';
import { CondicionesBlock } from './blocks/CondicionesBlock';
import { InfoImportanteBlock } from './blocks/InfoImportanteBlock';
import { PreguntasBlock } from './blocks/PreguntasBlock';
import { MilaBlock } from './blocks/MilaBlock';
import { ResenasBlock } from './blocks/ResenasBlock';
import { CompletaTuViajeBlock } from './blocks/CompletaTuViajeBlock';
import { OtrasExperienciasBlock } from './blocks/OtrasExperienciasBlock';
import { GarantiasBlock } from './blocks/GarantiasBlock';

/** Un componente por bloque (plan §3), en el mismo orden de `BLOCK_ORDER`. */
const BLOCKS = {
    'migas': MigasBlock,
    'galeria': GaleriaBlock,
    'titulo': TituloBlock,
    'taxonomia': TaxonomiaBlock,
    'datos-clave': DatosClaveBlock,
    'en-breve': EnBreveBlock,
    'destacado': DestacadoBlock,
    'descripcion': DescripcionBlock,
    'itinerario': ItinerarioBlock,
    'incluye': IncluyeBlock,
    'punto-de-encuentro': PuntoEncuentroBlock,
    'opciones': OpcionesBlock,
    'antes-de-ir': AntesDeIrBlock,
    'condiciones': CondicionesBlock,
    'informacion-importante': InfoImportanteBlock,
    'preguntas': PreguntasBlock,
    'mila': MilaBlock,
    'resenas': ResenasBlock,
    'completa-tu-viaje': CompletaTuViajeBlock,
    'otras-experiencias': OtrasExperienciasBlock,
    'garantias': GarantiasBlock,
} satisfies Record<BlockId, React.ComponentType<never>>;

/** Las props ya armadas de cada bloque (vista del servidor); un bloque sin props no se pinta. */
export type FichaBlockViews = { [K in BlockId]?: ComponentProps<(typeof BLOCKS)[K]> };

/** Bloques de arriba a todo lo ancho; el resto va en la columna principal junto al panel. */
const TOP: ReadonlySet<BlockId> = new Set(['migas', 'galeria']);

export interface FichaViewProps {
    /** Bloques visibles en orden (`blocksFor` de `src/ficha/lib/blocks.ts`). */
    order: BlockId[];
    views: FichaBlockViews;
    /** Panel de reserva ya compuesto (`PricePanel` con su control como children); en computadora. */
    panel?: React.ReactNode;
    /** «Agregar a mi viaje» en el cuerpo en celular (decisión 25), bajo el título. */
    mobileAdd?: React.ReactNode;
    /** Barra fija de celular de hoy, sin cambios (decisión 25). */
    mobileBar?: React.ReactNode;
    /** REQ-10870: fichas sin barra fija de celular (viajes): el mismo panel, una sola vez en el DOM, debajo del contenido en celular. */
    panelOnMobile?: boolean;
    /** REQ-588 / REQ-834: el proveedor tiene enriquecimiento indexable (`data-enriquecimiento`, lo lee el contrato de ficha del humo). */
    enrichment?: boolean;
}

/** Pinta el bloque `id` con sus props; el tipo de `FichaBlockViews` ya amarra cada id con las props de su bloque. */
function Block({ id, props }: { id: BlockId; props: object }) {
    const C = BLOCKS[id] as unknown as React.ComponentType<Record<string, unknown>>;
    return <C {...(props as Record<string, unknown>)} />;
}

/**
 * REQ-10857 · Plantilla única de la ficha (plan §2: «`FichaView.tsx` la plantilla: solo compone bloques»; §5 SRP).
 * No decide qué bloque sale (eso es `blocksFor`), no arma vistas (eso es `src/ficha/lib/`), no lee base, banderas ni
 * proveedor (DIP): recibe el orden, las props de cada bloque y el panel ya compuesto (OCP). Un id sin props se salta.
 */
export function FichaView({ order, views, panel, mobileAdd, mobileBar, enrichment, panelOnMobile }: FichaViewProps) {
    const render = (id: BlockId) => {
        const props = views[id];
        return props ? <Block key={id} id={id} props={props} /> : null;
    };
    const top = order.filter((id) => TOP.has(id));
    const main = order.filter((id) => !TOP.has(id));
    return (
        <article data-ficha="unica" {...(enrichment !== undefined ? { 'data-enriquecimiento': String(enrichment) } : {})} className="mx-auto max-w-6xl px-4 pb-24 lg:pb-8">
            {top.map(render)}
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
                <div>
                    {main.map((id) => (
                        <div key={id} data-slot={id}>
                            {render(id)}
                            {id === 'titulo' && mobileAdd && <div data-agregar-celular className="mb-6 lg:hidden">{mobileAdd}</div>}
                        </div>
                    ))}
                </div>
                {panel && (panelOnMobile
                    ? <div data-panel-columna className="mt-8 lg:mt-0"><div className="lg:sticky lg:top-8">{panel}</div></div>
                    : <div data-panel-columna className="hidden lg:block"><div className="sticky top-8">{panel}</div></div>)}
            </div>
            {mobileBar && <div className="lg:hidden">{mobileBar}</div>}
        </article>
    );
}
