/**
 * REQ-049: modelo común de salidas para TODOS los proveedores (Freetour, viajes propios y los que vengan).
 * Cada proveedor implementa DepartureSource con un adaptador en src/departures/sources/<proveedor>.ts;
 * la app nunca lee eventos de un proveedor directamente.
 */
export interface Departure { date: string; language: string } // fecha local YYYY-MM-DD + idioma del guía
export interface DepartureSummary { languages: string[]; dates: string[] }
export interface DepartureSource { list(productRef: number): Promise<Departure[]> }
