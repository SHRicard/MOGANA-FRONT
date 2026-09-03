import type { RootState } from '@/store';
import type { ComprobanteCompartido } from '@/services/share';

/**
 * El comprobante compartido que está esperando que lo suban, o `null`.
 *
 * Es lo que hace que la app pueda llevar al login —o al DNI— y **volver** a
 * donde estaba (`docs/compartir_comprobante.md` §5.1 y §5.2).
 */
export const selectComprobantePendiente = (state: RootState): ComprobanteCompartido | null =>
  state.comprobante.pendiente;
