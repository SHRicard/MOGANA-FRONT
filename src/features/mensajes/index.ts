/**
 * **El chat entre el cliente y el local.**
 *
 * Una feature con los dos lados del mostrador adentro: el hilo del cliente
 * (`/mi/mensajes`) y la bandeja del panel (`/admin/mensajes`). Ver el docblock
 * de `types.ts` para por qué no son dos features.
 */
export { MisMensajesScreen, BandejaDeMensajesScreen, HiloDelClienteScreen } from './screens';

export { useMiChat, useBandejaDeMensajes, useHiloDelPanel } from './hooks';
export type { MiChat, BandejaDeMensajes, HiloDelCliente, MensajeEnVuelo } from './hooks';

/**
 * Los ids de cache que necesita la campanita: leer un aviso de "te escribieron"
 * tiene que refrescar lo que ese aviso dice que cambió.
 */
export { MI_HILO, MI_RESUMEN, BANDEJA } from './api';

export {
  LadosDelMensaje,
  ContextosDeMensaje,
  LARGO_MAXIMO_DEL_MENSAJE,
  esDelNegocio,
  nombreDelCliente,
} from './types';
export type { ContextoDeMensaje, ContextoDelMensaje, SobreQue } from './types';
