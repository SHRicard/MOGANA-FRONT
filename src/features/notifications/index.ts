/**
 * API pública de la feature notifications. Importar SOLO desde acá.
 *
 * Son los avisos **adentro de la app** (`docs/notificaciones.md`): la campanita,
 * no las notificaciones push. Hay seis tipos; cinco los dispara una persona y el
 * sexto —`store_lleno`— lo publica un cron cuando el almacenamiento se acerca al
 * límite.
 *
 * ⚠️ **A dónde lleva tocar un aviso lo decide el backend**, en el campo
 * `destino`. La app traduce `pantalla` a ruta en un solo mapa y nada más: el
 * mapeo de `tipo` a pantalla NO se duplica acá.
 */
export { NotificationsScreen } from './screens/NotificationsScreen';

/** El número del globito de la campanita. Lo usa el navigator. */
export { useNoLeidas } from './hooks';

export { useNotificaciones } from './hooks';
export type { ListadoNotificaciones } from './hooks';

export { notificacionSchema, notificacionesPaginaSchema, destinoSchema, sinLeer } from './types';
export { NOTIFICACIONES_LIMITE, PARAMS_GLOBITO } from './types';
export { TiposNotificacion, PantallasDeAviso, datosDePagoSchema } from './types';
export { datosDePagoDe, esPagoResuelto, destinoDeAviso, llevaAAlgunLado } from './types';
export type {
  Notificacion,
  NotificacionesPagina,
  ListarNotificacionesParams,
  TipoNotificacion,
  DatosDePago,
  DestinoDeAviso,
  PantallaDeAviso,
} from './types';
