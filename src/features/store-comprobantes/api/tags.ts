/**
 * Los ids de cache del **panel del store**, bajo el tag `Factura`.
 *
 * Van bajo `Factura` como el resto del apartado: borrar comprobantes toca los
 * avisos de la bandeja —el aviso sigue estando, su imagen ya no—, así que
 * compartir el tag hace que la bandeja se entere sola en vez de que haya que
 * acordarse de invalidarla desde acá.
 */

/** Cuánto ocupa el store: el resumen de arriba del panel. */
export const CONSUMO_DEL_STORE = 'CONSUMO-DEL-STORE';

/** Cualquier página del listado de comprobantes del store. */
export const COMPROBANTES_DEL_STORE = 'COMPROBANTES-DEL-STORE';
