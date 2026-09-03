/**
 * API pública del **panel del store de comprobantes**
 * (`MORGANA-BACK/docs/flujo_comprobantes.md` §5). Importar SOLO desde acá.
 *
 * Responde una pregunta —*¿cuánto estoy ocupando y qué puedo tirar?*— y ofrece
 * una sola acción, que **borra archivos y no se puede deshacer**.
 *
 * ⚠️ **No hay limpieza automática, y es a propósito.** Nada se borra solo por el
 * paso del tiempo: la retención es una decisión de negocio que cambia, y un cron
 * que ya borró no deja arrepentirse. Es siempre alguien apretando un botón con
 * el número delante.
 *
 * ⚠️ Nada de esto lo ve el cliente. Que su comprobante se haya borrado sí lo ve
 * —en su propio aviso, con el motivo—, pero cuánto ocupa el store y quién lo
 * limpia es del negocio.
 *
 * Todo cuelga de `/api/admin/comprobantes`, detrás del rol de administración.
 */
export { StoreDeComprobantesScreen } from './screens/StoreDeComprobantesScreen';
export { ComprobantesDelStoreScreen } from './screens/ComprobantesDelStoreScreen';

export {
  consumoDelStoreSchema,
  comprobanteEnElStoreSchema,
  listaDeComprobantesSchema,
  vistaPreviaDeLimpiezaSchema,
  limpiezaHechaSchema,
  tramoDeAntiguedadSchema,
} from './types';
export {
  TramosDeAntiguedad,
  TRAMO_LABEL,
  MESES_DEL_TRAMO,
  ESTADO_DE_AVISO_LABEL,
  ESTADOS_QUE_SE_LIMPIAN,
  DIAS_MINIMOS_PARA_LIMPIAR,
  COMPROBANTES_DEL_STORE_LIMITE,
  MAX_SELECCION,
} from './types';
export { huerfanos, estaBorrado, sePuedeBorrar, noHayNadaQueBorrar } from './types';
export {
  NivelesDeUso,
  NIVEL_DE_USO_LABEL,
  USO_QUE_PIDE_ATENCION,
  USO_CRITICO,
  nivelDeUso,
  porcentajeUsable,
} from './types';

export type {
  ConsumoDelStore,
  CuentaDeCloudinary,
  TramoDelStore,
  TramoDeAntiguedad,
  EstadoDeAviso,
  ComprobanteEnElStore,
  ListaDeComprobantes,
  ListarComprobantesParams,
  CriterioDeLimpieza,
  LimpiezaPayload,
  VistaPreviaDeLimpieza,
  LimpiezaHecha,
  BorrarSeleccionPayload,
  NivelDeUso,
} from './types';

export { useStoreDeComprobantes, useComprobantesDelStore } from './hooks';
export type { StoreDeComprobantes, ListadoDelStore } from './hooks';

export {
  storeComprobantesApi,
  useGetConsumoDelStoreQuery,
  useListarComprobantesDelStoreQuery,
  useVistaPreviaDeLimpiezaMutation,
  useLimpiarStoreMutation,
  useBorrarSeleccionMutation,
  useBorrarComprobanteMutation,
  CONSUMO_DEL_STORE,
  COMPROBANTES_DEL_STORE,
} from './api';
