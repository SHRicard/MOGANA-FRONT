/**
 * API pública de la feature facturas. Importar SOLO desde acá.
 *
 * Es el apartado de **facturación del administrador** (`docs/flujo_pagos.md`):
 * el tablero de quién debe, el detalle de una factura con sus cobros, y el alta.
 * El cliente todavía no tiene ningún endpoint para ver las suyas.
 */
export { ClientesFacturadosScreen } from './screens/ClientesFacturadosScreen';
export { NuevaFacturaScreen } from './screens/NuevaFacturaScreen';
export { FacturaScreen } from './screens/FacturaScreen';
export { CuentaClienteScreen } from './screens/CuentaClienteScreen';

export { facturaSchema, facturaItemSchema, facturaClienteSchema, pagoSchema } from './types';
export {
  clienteFacturadoSchema,
  clientesFacturadosPaginaSchema,
  totalesTableroSchema,
} from './types';
export { cuentaClienteSchema, resumenCuentaSchema, facturaDeCuentaSchema } from './types';
export { CLIENTES_FACTURADOS_LIMITE, TABLERO_DEBOUNCE_MS, FACTURAS_CUENTA_LIMITE } from './types';
export {
  EstadosFactura,
  estadoFacturaSchema,
  ESTADO_FACTURA_LABEL,
  textoVencimiento,
} from './types';
export {
  EstadosCuenta,
  estadoCuentaSchema,
  ESTADO_CUENTA_LABEL,
  labelDeEstado,
  textoImpagas,
} from './types';
export { nuevaFacturaSchema, aNuevaFacturaPayload, nombreDeCliente, nombreDeEmisor } from './types';
export { crearNuevoPagoSchema, aNuevoPagoPayload } from './types';
export { anularFacturaSchema, aAnularFacturaPayload, esFacturaAnulada } from './types';
export { clienteSinFiado, clienteSinDni } from './types';
export { MAX_ITEMS_FACTURA, MAX_LARGO_PRODUCTO, MAX_LARGO_NOTAS } from './types';
export { MAX_LARGO_NOTA_PAGO, MAX_ANIOS_VENCIMIENTO } from './types';
export { MIN_LARGO_MOTIVO_ANULACION, MAX_LARGO_MOTIVO_ANULACION } from './types';

export type {
  Factura,
  FacturaItem,
  FacturaCliente,
  ClienteFacturado,
  ClientesFacturadosPagina,
  ListarClientesConFacturasParams,
  EstadoFactura,
  EstadoCuenta,
  EstadoCualquiera,
  TotalesTablero,
  CuentaCliente,
  CuentaClienteDatos,
  FacturaDeCuenta,
  CuentaClienteParams,
  ResumenCuenta,
  Pago,
  FacturaEmisor,
  NuevoPagoFormValues,
  RegistrarPagoPayload,
  BorrarPagoPayload,
  AnularFacturaFormValues,
  AnularFacturaPayload,
  ReembolsoPayload,
  NuevaFacturaFormValues,
  NuevaFacturaItemFormValues,
  NuevaFacturaPayload,
} from './types';

export {
  useNuevaFactura,
  useClientesConFacturas,
  useCuentaCliente,
  useFactura,
  useRegistrarPago,
  useAnularFactura,
} from './hooks';
export type {
  NuevaFactura,
  TableroFacturas,
  CuentaDelCliente,
  DetalleFactura,
  RegistroDePago,
  AnulacionDeFactura,
} from './hooks';

export {
  useCrearFacturaMutation,
  useListarClientesConFacturasQuery,
  useGetFacturaQuery,
  useGetCuentaClienteQuery,
  useRegistrarPagoMutation,
  useBorrarPagoMutation,
  useAnularFacturaMutation,
  useMarcarReembolsoMutation,
  useDeshacerReembolsoMutation,
} from './api';
