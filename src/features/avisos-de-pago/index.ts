/**
 * API pública de **avisos de pago**: la bandeja del administrador.
 * Importar SOLO desde acá.
 *
 * Es el otro lado de `features/mi`. Ahí el cliente dice que pagó y adjunta la
 * captura; acá alguien la mira contra el resumen del banco y decide.
 *
 * ⚠️ **Un aviso no es un cobro.** Mientras esté pendiente, la deuda del cliente
 * sigue entera; confirmarlo es lo que anota el cobro y la baja. Esa distinción
 * le da forma a toda la feature: el botón dice "Anotar el cobro", cada tarjeta
 * muestra el saldo al lado del monto informado, y rechazar pide un motivo que le
 * llega al cliente tal cual.
 *
 * Todo cuelga de `/api/admin/pagos-informados`, detrás del rol de
 * administración: a un cliente le contesta `403`.
 */
export { AvisosDePagoScreen } from './screens/AvisosDePagoScreen';

/**
 * El visor de comprobantes a pantalla completa.
 *
 * Se exporta porque lo usa también el **panel del store**: es el mismo
 * comprobante mirado desde otro lado —acá para decidir sobre un pago, allá para
 * decidir si se tira el archivo— y tener dos formas de ver la misma foto sería
 * mantener dos.
 */
export { VisorDeComprobante } from './components';
export type { VisorDeComprobanteProps } from './components';

export {
  avisoDePagoSchema,
  avisosDePagoPaginaSchema,
  comprobanteSchema,
  estadoDeAvisoDePagoSchema,
  medioDePagoSchema,
  rechazarAvisoSchema,
} from './types';
export {
  EstadosDeAvisoDePago,
  ESTADO_DE_AVISO_LABEL,
  MEDIO_DE_PAGO_LABEL,
  MotivosDeBorrado,
  MOTIVO_DE_BORRADO_LABEL,
  AVISOS_DE_PAGO_LIMITE,
  MIN_LARGO_MOTIVO,
  MAX_LARGO_MOTIVO,
  MAX_LARGO_NOTA_COBRO,
} from './types';
export {
  hayImagen,
  textoDelBorrado,
  seAnotoDistinto,
  nombreDelCliente,
  crearConfirmarAvisoSchema,
  aConfirmarAvisoPayload,
} from './types';

export type {
  AvisoDePago,
  AvisosDePagoPagina,
  Comprobante,
  EstadoDeAvisoDePago,
  MedioDePago,
  MotivoDeBorrado,
  ListarAvisosDePagoParams,
  ConfirmarAvisoPayload,
  RechazarAvisoPayload,
  ConfirmarAvisoFormValues,
  RechazarAvisoFormValues,
} from './types';

export { useAvisosDePago, useResolverAviso } from './hooks';
export type { BandejaDeAvisos, ResolucionDeAviso, AccionSobreElAviso } from './hooks';

export {
  avisosDePagoApi,
  useListarAvisosDePagoQuery,
  useConfirmarAvisoMutation,
  useRechazarAvisoMutation,
  AVISOS_DE_PAGO,
} from './api';
