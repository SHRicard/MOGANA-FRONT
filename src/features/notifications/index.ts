/**
 * API pública de la feature notifications. Importar SOLO desde acá.
 *
 * Son los avisos **adentro de la app** (`docs/notificaciones.md`): la campanita,
 * no las notificaciones push. Hay cinco tipos y ninguno lo dispara el sistema
 * solo (`docs/user_cliente_flujo.md` §11).
 */
export { NotificationsScreen } from './screens/NotificationsScreen';

/** El número del globito de la campanita. Lo usa el navigator. */
export { useNoLeidas } from './hooks';

export { useNotificaciones } from './hooks';
export type { ListadoNotificaciones } from './hooks';

export { notificacionSchema, notificacionesPaginaSchema, sinLeer } from './types';
export { NOTIFICACIONES_LIMITE, PARAMS_GLOBITO } from './types';
export { TiposNotificacion, datosDePagoSchema } from './types';
export { datosDePagoDe, esPagoResuelto, destinoDeAviso } from './types';
export type {
  Notificacion,
  NotificacionesPagina,
  ListarNotificacionesParams,
  TipoNotificacion,
  DatosDePago,
  DestinoDeAviso,
} from './types';
