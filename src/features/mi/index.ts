/**
 * API pública de la feature **mi**: la vista del cliente sobre su propia cuenta
 * (`docs/user_cliente_flujo.md`). Importar SOLO desde acá.
 *
 * Es el otro lado de `/admin`. Todo lo de acá cuelga de `/api/mi`, y **ninguna
 * URL lleva un id de persona**: el dueño sale del token. Eso no es una
 * comodidad de diseño — es lo único que hace imposible el bug de mostrarle a
 * alguien la cuenta de otro.
 *
 * ⚠️ **Sirve para cualquier rol**, no solo para el rol `cliente`: un
 * administrador que entre ve su propia cuenta, que normalmente está vacía.
 *
 * ⚠️ **Avisar un pago no descuenta nada.** Es la regla que le da forma a media
 * feature: el botón dice "Avisar que pagué", la deuda no cambia al mandarlo, y
 * la pantalla lo explica.
 */
export { InicioScreen } from './screens/InicioScreen';
export { MisFacturasScreen } from './screens/MisFacturasScreen';
export { MiFacturaScreen } from './screens/MiFacturaScreen';
export { InformarPagoScreen } from './screens/InformarPagoScreen';
export { ElegirFacturaScreen } from './screens/ElegirFacturaScreen';
export { MisAvisosScreen } from './screens/MisAvisosScreen';
export { MisComprasScreen } from './screens/MisComprasScreen';

export {
  miCuentaSchema,
  miFacturaSchema,
  miFacturaDeLaListaSchema,
  misFacturasPaginaSchema,
  miAvisoDePagoSchema,
  misAvisosPaginaSchema,
  comprobanteDelAvisoSchema,
  misComprasSchema,
  especieQueComproSchema,
} from './types';
export { MIS_FACTURAS_LIMITE, MIS_AVISOS_LIMITE, ULTIMAS_EN_EL_INICIO } from './types';
export { FACTURAS_PARA_COMPROBANTE } from './types';
export { MAX_LARGO_REFERENCIA, MAX_LARGO_NOTA_AVISO, AVISOS_SIN_RESOLVER } from './types';
export { MediosDePago, medioDePagoSchema, MEDIO_DE_PAGO_LABEL, MEDIOS_DE_PAGO } from './types';
export { MEDIOS_CON_COMPROBANTE, comprobanteObligatorio, MAX_COMPROBANTE_BYTES } from './types';
export { EstadosDeAviso, estadoDeAvisoSchema, ESTADO_DE_AVISO_LABEL } from './types';
export { Tendencias, aTendencia, TENDENCIA_LABEL } from './types';
export { ESTADO_DE_MI_CUENTA, ESTADO_DE_MI_FACTURA, cuandoVence } from './types';
export { textoDesdeLaUltima, formatParticipacion, formatVariacion } from './types';
export { avisoPendiente, seAnotoDistinto, yaInformadoDe } from './types';
export { crearInformarPagoSchema, aInformarPagoPayload, aCuerpoConComprobante } from './types';
export {
  esMiFacturaAnulada,
  puedoAvisarPago,
  textoDeLaAnulada,
  sinFacturas,
  sinCompras,
} from './types';

export type {
  MiCuenta,
  MiFactura,
  MiFacturaDeLaLista,
  MisFacturasPagina,
  MiItem,
  MiPago,
  MiAvisoDePago,
  MisAvisosPagina,
  ComprobanteDelAviso,
  MisCompras,
  MisComprasDelHistorial,
  EspecieQueCompro,
  MedioDePago,
  EstadoDeAviso,
  Tendencia,
  ListarMisFacturasParams,
  ListarMisAvisosParams,
  InformarPagoFormValues,
  InformarPagoPayload,
  DatosDelAviso,
} from './types';

export {
  useMiInicio,
  useMisFacturas,
  useMiFactura,
  useInformarPago,
  useAvisarConComprobante,
  useComprobantesCompartidos,
  useMisAvisos,
  useMisCompras,
} from './hooks';
export type {
  MiInicio,
  MisFacturas,
  DetalleDeMiFactura,
  AvisoDePago,
  AvisoConComprobante,
  ComprobantesCompartidos,
  MisAvisos,
  MisComprasDelCliente,
} from './hooks';

/**
 * El comprobante que llegó por la hoja de compartir
 * (`docs/compartir_comprobante.md`).
 *
 * El reducer NO se exporta desde acá: lo registra el store raíz, y tiene que
 * importarlo por su ruta profunda (`@/features/mi/store`) para no arrastrar las
 * pantallas de esta feature, que a su vez importan el store → ciclo en runtime.
 */
export { selectComprobantePendiente, VENCIMIENTO_PENDIENTE_MS } from './store';

export {
  miApi,
  useGetMiCuentaQuery,
  useListarMisFacturasQuery,
  useGetMiFacturaQuery,
  useListarMisAvisosQuery,
  useInformarPagoMutation,
  useGetMisComprasQuery,
} from './api';
/**
 * Los ids de cache de `/mi`. Se exportan por **un solo motivo**: la campanita
 * necesita poder invalidarlos cuando llega el aviso de que tomaron —o
 * rechazaron— un pago, que es lo único que cambia esta cuenta desde afuera
 * (§12 del doc).
 */
export { MIS_DATOS } from './api';
