/**
 * Los ids de cache de **lo mío**, todos bajo el tag `Factura`.
 *
 * Van con prefijo `MI-` y separados de los del panel a propósito: son otras
 * consultas —acotadas al dueño del token— y mezclarlas haría que emitirle una
 * factura a un cliente cualquiera desde el mismo teléfono refrescara la cuenta
 * propia, que no cambió.
 */

/**
 * El comodín que **provee toda consulta de `/mi`**.
 *
 * Existe para un solo caso: cuando llega el aviso de que le tomaron —o
 * rechazaron— un pago, lo que cambió no es una pantalla sino la cuenta entera
 * (§12 del doc). Invalidando esto se refrescan la cuenta, la lista, el detalle
 * y los avisos de una, sin que quien lee la campanita tenga que saber cuáles
 * son.
 *
 * ⚠️ **Informar un pago NO lo invalida**: la deuda no cambió, y refrescar la
 * cuenta ahí mostraría el mismo número y haría parecer que el aviso falló.
 */
export const MIS_DATOS = 'MIS-DATOS';

/** El resumen de arriba: cuánto debo. */
export const MI_CUENTA = 'MI-CUENTA';

/** Cualquier página de mis facturas. */
export const MIS_FACTURAS = 'MIS-FACTURAS';

/** Mis avisos de pago, en cualquier estado. */
export const MIS_AVISOS = 'MIS-AVISOS';

/** Qué compro. */
export const MIS_COMPRAS = 'MIS-COMPRAS';

/** El detalle de una factura mía. */
export function miFacturaTag(facturaId: string): string {
  return `MI-FACTURA-${facturaId}`;
}
