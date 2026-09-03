/**
 * Los ids de cache del chat, bajo el tag `Mensaje`.
 *
 * Son cuatro y están separados a propósito: **el hilo del cliente y la bandeja
 * del panel viven en el mismo teléfono solo por accidente** —un administrador
 * que también es cliente—, así que escribirle a alguien no tiene por qué
 * refrescar la conversación propia.
 */

/** El hilo del cliente con el local. Es uno solo: no lleva id de nadie. */
export const MI_HILO = 'MI-HILO';

/**
 * El resumen del hilo propio. **Entrada de cache aparte del hilo**, y esa
 * separación es todo el punto: es lo que se pregunta cada ocho segundos, y
 * mezclarlo con el hilo haría que cada refresco arrastre la página entera de
 * mensajes.
 */
export const MI_RESUMEN = 'MI-RESUMEN';

/** Cualquier página de la bandeja del panel, con cualquier filtro. */
export const BANDEJA = 'BANDEJA-DE-MENSAJES';

/** El hilo de UN cliente visto desde el panel. */
export const hiloDelPanelTag = (clienteId: string) => `HILO-${clienteId}`;
