import { EstadosFactura, type EstadoFactura } from '@/features/facturas';
import type { OpcionEstado } from '@/shared/ui/atoms/FiltroEstado';
import {
  ESTADO_DE_AVISO_LABEL,
  ESTADO_DE_MI_FACTURA,
  EstadosDeAviso,
  type EstadoDeAviso,
} from '../types';

/**
 * Qué opciones ofrecen los filtros de este apartado.
 *
 * El que dibuja es `shared/ui/atoms/FiltroEstado`, que no conoce ningún estado.
 * Lo del dominio es esto —qué opciones hay, en qué orden y de qué color— y es
 * lo que deja que el cliente use sus palabras sin tocar las del panel.
 */

/**
 * Los estados de una factura, **en orden de urgencia**: lo que hay que pagar
 * primero va primero.
 */
export const OPCIONES_DE_MIS_FACTURAS: readonly OpcionEstado<EstadoFactura>[] = [
  { value: null, label: 'Todas', color: null },
  {
    value: EstadosFactura.VENCIDA,
    label: ESTADO_DE_MI_FACTURA[EstadosFactura.VENCIDA],
    color: 'statusLate',
  },
  {
    value: EstadosFactura.PROXIMA_A_VENCER,
    label: ESTADO_DE_MI_FACTURA[EstadosFactura.PROXIMA_A_VENCER],
    color: 'statusSoon',
  },
  {
    value: EstadosFactura.PENDIENTE,
    label: ESTADO_DE_MI_FACTURA[EstadosFactura.PENDIENTE],
    color: 'statusWait',
  },
  {
    value: EstadosFactura.PAGADA,
    label: ESTADO_DE_MI_FACTURA[EstadosFactura.PAGADA],
    color: 'statusOk',
  },
  // Sin color: una dada de baja no es un punto de la escala de urgencia, y por
  // eso el badge también la apaga.
  {
    value: EstadosFactura.ANULADA,
    label: ESTADO_DE_MI_FACTURA[EstadosFactura.ANULADA],
    color: null,
  },
];

/**
 * Los tres estados de un aviso de pago. El rechazado va primero: es el único
 * que pide hacer algo — volver a avisar con la referencia correcta.
 */
export const OPCIONES_DE_MIS_AVISOS: readonly OpcionEstado<EstadoDeAviso>[] = [
  { value: null, label: 'Todos', color: null },
  {
    value: EstadosDeAviso.RECHAZADO,
    label: ESTADO_DE_AVISO_LABEL[EstadosDeAviso.RECHAZADO],
    color: 'statusLate',
  },
  {
    value: EstadosDeAviso.PENDIENTE,
    label: ESTADO_DE_AVISO_LABEL[EstadosDeAviso.PENDIENTE],
    color: 'statusWait',
  },
  {
    value: EstadosDeAviso.CONFIRMADO,
    label: ESTADO_DE_AVISO_LABEL[EstadosDeAviso.CONFIRMADO],
    color: 'statusOk',
  },
];
