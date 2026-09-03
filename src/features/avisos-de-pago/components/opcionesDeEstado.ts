import type { OpcionEstado } from '@/shared/ui/atoms/FiltroEstado';
import { ESTADO_DE_AVISO_LABEL, EstadosDeAvisoDePago, type EstadoDeAvisoDePago } from '../types';

/**
 * Qué estados ofrece el filtro de la bandeja, y con qué color.
 *
 * ⚠️ **La opción `null` no es "todos"**, y es la única diferencia con los otros
 * filtros de la app: sin `estado` el backend devuelve **los pendientes**, que
 * son para lo que se abre la pantalla. Por eso se llama "Por resolver" y va
 * primera. No hay forma de pedir los tres estados juntos, y está bien: mezclar
 * lo que hay que decidir con lo que ya se decidió convierte una bandeja de
 * trabajo en un historial.
 */
export const OPCIONES_ESTADO_AVISO: readonly OpcionEstado<EstadoDeAvisoDePago>[] = [
  { value: null, label: 'Por resolver', color: 'statusWait' },
  {
    value: EstadosDeAvisoDePago.CONFIRMADO,
    label: ESTADO_DE_AVISO_LABEL.confirmado,
    color: 'statusOk',
  },
  {
    value: EstadosDeAvisoDePago.RECHAZADO,
    label: ESTADO_DE_AVISO_LABEL.rechazado,
    color: 'statusLate',
  },
];
