import type { OpcionEstado } from '@/shared/ui/atoms/FiltroEstado';
import {
  ESTADO_CUENTA_LABEL,
  ESTADO_FACTURA_LABEL,
  EstadosCuenta,
  EstadosFactura,
  type EstadoCuenta,
  type EstadoFactura,
} from '../types';

/**
 * Qué estados ofrece cada filtro del apartado, y con qué color.
 *
 * El que dibuja es `shared/ui/atoms/FiltroEstado`, que no conoce ningún estado:
 * lo del dominio es esto —**qué opciones hay, en qué orden y de qué color**— y
 * por eso vive en la feature.
 *
 * Se arman a nivel de módulo: son listas fijas y recalcularlas en cada tecla del
 * buscador —estos filtros viven en el header de una lista— no aporta.
 *
 * ⚠️ Los dos juegos de valores **no son intercambiables**: el tablero espera
 * `al_dia` y la cuenta espera `pagada`; cruzarlos es un `400`.
 */

/**
 * Los estados de **una cuenta**, para el tablero.
 *
 * El orden no es el del objeto sino el de urgencia: lo que hay que cobrar
 * primero va primero.
 */
export const OPCIONES_ESTADO_CUENTA: readonly OpcionEstado<EstadoCuenta>[] = [
  { value: null, label: 'Todos', color: null },
  { value: EstadosCuenta.VENCIDA, label: ESTADO_CUENTA_LABEL.vencida, color: 'statusLate' },
  {
    value: EstadosCuenta.PROXIMA_A_VENCER,
    label: ESTADO_CUENTA_LABEL.proxima_a_vencer,
    color: 'statusSoon',
  },
  { value: EstadosCuenta.PENDIENTE, label: ESTADO_CUENTA_LABEL.pendiente, color: 'statusWait' },
  { value: EstadosCuenta.AL_DIA, label: ESTADO_CUENTA_LABEL.al_dia, color: 'statusOk' },
];

/**
 * Los estados de **una factura**, para la lista de la cuenta del cliente. El
 * cuarto es "Pagada" y no "Al día": una factura sí se paga.
 */
export const OPCIONES_ESTADO_FACTURA: readonly OpcionEstado<EstadoFactura>[] = [
  { value: null, label: 'Todas', color: null },
  { value: EstadosFactura.VENCIDA, label: ESTADO_FACTURA_LABEL.vencida, color: 'statusLate' },
  {
    value: EstadosFactura.PROXIMA_A_VENCER,
    label: ESTADO_FACTURA_LABEL.proxima_a_vencer,
    color: 'statusSoon',
  },
  { value: EstadosFactura.PENDIENTE, label: ESTADO_FACTURA_LABEL.pendiente, color: 'statusWait' },
  { value: EstadosFactura.PAGADA, label: ESTADO_FACTURA_LABEL.pagada, color: 'statusOk' },
  // Las dadas de baja se pueden aislar (`?estado=anulada`). Sin color: no son un
  // punto de la escala de urgencia, y por eso el badge también las apaga.
  { value: EstadosFactura.ANULADA, label: ESTADO_FACTURA_LABEL.anulada, color: null },
];
