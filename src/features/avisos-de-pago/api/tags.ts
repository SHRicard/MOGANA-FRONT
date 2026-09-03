/**
 * Los ids de cache de la **bandeja de avisos de pago**, bajo el tag `Factura`.
 *
 * Van bajo `Factura` y no bajo un tag propio por un motivo concreto: confirmar
 * un aviso **anota un cobro**, y eso cambia la factura, la cuenta del cliente y
 * el tablero. Con un tag aparte habría que acordarse de invalidar los tres a
 * mano desde acá; compartiendo el tag, lo que ya escuchaba una factura se entera
 * solo.
 */

/** Cualquier página de la bandeja, en cualquier estado. */
export const AVISOS_DE_PAGO = 'AVISOS-DE-PAGO';
