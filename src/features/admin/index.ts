/**
 * API pública de la feature admin. Importar SOLO desde acá.
 *
 * Es el **panel de administración**: la puerta a las herramientas del negocio,
 * a la que se llega desde el panel "Más". Hoy tiene dos apartados andando —las
 * **métricas** y los **tickets por mes** (`docs/flujo_metricas.md`)— y uno que
 * todavía no: mandarle un aviso a todos los clientes.
 *
 * ⚠️ Los apartados contestan preguntas distintas y **no se mezclan**: las
 * métricas dicen cómo va el negocio **hoy**, la ficha de un cliente qué clase de
 * cliente es, y el ticket qué pasó en un mes —con la deuda que había **al
 * cerrarlo**, no la de ahora.
 *
 * Todo lo de acá es de administración: la API contesta `403` a un cliente.
 */
export { PanelAdminScreen } from './screens/PanelAdminScreen';
export { MetricasScreen } from './screens/MetricasScreen';
export { MetricasClientesScreen } from './screens/MetricasClientesScreen';
export { FichaClienteScreen } from './screens/FichaClienteScreen';
export { TendenciaScreen } from './screens/TendenciaScreen';
export { ProductosScreen } from './screens/ProductosScreen';
export { TicketsScreen } from './screens/TicketsScreen';
export { TicketMesScreen } from './screens/TicketMesScreen';

export { PANEL_ITEMS } from './panelItems';
export type { PanelItem } from './panelItems';

export {
  useMetricas,
  useMetricasClientes,
  useFichaCliente,
  useTendencia,
  useProductosGlobales,
  useTicketsMeses,
  useTicketMes,
} from './hooks';
export type {
  MetricasDelPanel,
  MetricasDeClientes,
  FichaDelCliente,
  TendenciaDelNegocio,
  ProductosDelNegocio,
  TicketsPorMes,
  TicketDelMes,
} from './hooks';

/** Las dos pantallas que miran la mercadería (`docs/flujo_metricas.md` §5 y §6). */
export {
  tendenciaDeCompraSchema,
  productosGlobalesSchema,
  OrdenesDeTendencia,
  OrdenesDeProducto,
  MESES_DE_TENDENCIA,
  textoDiasSinVenderse,
  textoParaLaMitad,
  textoEstacionalidad,
  textoUnidades,
} from './mercaderia';
export type {
  TendenciaDeCompra,
  EspecieDeTendencia,
  ProductosGlobales,
  EspecieGlobal,
  OrdenDeTendencia,
  OrdenDeProducto,
} from './mercaderia';

export { metricasSchema, formatTasa, textoDelMasViejo } from './types';
export { metricaClienteSchema, metricasClientesPaginaSchema } from './types';
export { OrdenesMetricaCliente, ORDEN_LABEL, ORDEN_AYUDA, formatDias, textoDemora } from './types';
export { mesTicketSchema, ticketsMesesSchema, ticketSchema } from './types';
export { fichaClienteSchema } from './types';
export {
  EstadosDeCuenta,
  ESTADO_DE_CUENTA_LABEL,
  Tendencias,
  TENDENCIA_LABEL,
  aTendencia,
  textoDesdeLaUltima,
  FormasDePagar,
  COMO_PAGA_TEXTO,
  COMO_PAGA_CORTO,
  aEstadoDeCuenta,
  comoPagaDe,
  textoComoPaga,
  facturasEnCurso,
  formatPromedio,
  resumenDeAtraso,
  textoAtrasoActual,
  textoVencimientoMasViejo,
  sinFiado,
  cuentaBloqueada,
} from './types';
export {
  DireccionesVariacion,
  FormatosVariacion,
  direccionVariacion,
  magnitudVariacion,
  textoVariacion,
  textoComparacion,
  textoCantidad,
} from './types';
export type {
  Metricas,
  MetricasParams,
  DelMes,
  EnLaCalle,
  ClientesMetricas,
  Cumplimiento,
  GlobalMetricas,
  PuntoEvolucion,
  MetricaCliente,
  MetricasClientesPagina,
  MetricasClientesParams,
  OrdenMetricaCliente,
  MesTicket,
  TicketsMeses,
  Ticket,
  TicketFacturacion,
  TicketCobranza,
  AlCierre,
  TicketClientes,
  TicketComparacion,
  TicketTopCliente,
  TicketTopProducto,
  DireccionVariacion,
  FormatoVariacion,
  FichaCliente,
  ClienteDeLaFicha,
  CumplimientoDelCliente,
  FacturasDelCliente,
  PlataDelCliente,
  ReembolsosDelCliente,
  ComprasDelCliente,
  EstadoDeCuenta,
  ComoPaga,
  Tendencia,
  EspecieDelCliente,
  EspecieDelTicket,
} from './types';
