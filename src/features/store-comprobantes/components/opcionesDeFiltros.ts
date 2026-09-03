import type { OpcionEstado } from '@/shared/ui/atoms/FiltroEstado';
import {
  ESTADO_DE_AVISO_LABEL,
  TRAMO_LABEL,
  TramosDeAntiguedad,
  type EstadoDeAviso,
  type TramoDeAntiguedad,
} from '../types';

/**
 * Qué opciones ofrecen los filtros del listado del store, y con qué color.
 *
 * El que dibuja es `shared/ui/atoms/FiltroEstado`, que no conoce ningún estado:
 * lo del dominio es esto —qué opciones hay, en qué orden y de qué color— y por
 * eso vive en la feature.
 *
 * Se arman a nivel de módulo: son listas fijas y no dependen de nada.
 */

/**
 * Por antigüedad. El orden es **del más viejo al más nuevo**, igual que la
 * lista: es una pantalla para tirar cosas, y lo primero que se mira es lo
 * primero que se va.
 */
export const OPCIONES_ANTIGUEDAD: readonly OpcionEstado<TramoDeAntiguedad>[] = [
  { value: null, label: 'Toda la antigüedad', color: null },
  {
    value: TramosDeAntiguedad.MAS_DE_DOS_MESES,
    label: TRAMO_LABEL.mas_de_dos_meses,
    color: 'statusLate',
  },
  { value: TramosDeAntiguedad.DOS_MESES, label: TRAMO_LABEL.dos_meses, color: 'statusSoon' },
  { value: TramosDeAntiguedad.UN_MES, label: TRAMO_LABEL.un_mes, color: 'statusWait' },
  { value: TramosDeAntiguedad.ESTE_MES, label: TRAMO_LABEL.este_mes, color: 'statusOk' },
];

/**
 * Por estado del aviso.
 *
 * Los tres están, incluido `pendiente`: acá se **mira**, y ver cuánto ocupan los
 * que todavía no se resolvieron es parte de entender el store. Lo que no se
 * puede es borrarlos, y eso lo resuelve cada fila.
 */
export const OPCIONES_ESTADO_DEL_AVISO: readonly OpcionEstado<EstadoDeAviso>[] = [
  { value: null, label: 'Todos los estados', color: null },
  { value: 'pendiente', label: ESTADO_DE_AVISO_LABEL.pendiente, color: 'statusWait' },
  { value: 'confirmado', label: ESTADO_DE_AVISO_LABEL.confirmado, color: 'statusOk' },
  { value: 'rechazado', label: ESTADO_DE_AVISO_LABEL.rechazado, color: 'statusLate' },
];
