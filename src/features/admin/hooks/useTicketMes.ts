import { useCallback } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useGetTicketDelMesQuery } from '../api';
import type { Ticket } from '../types';

/** Todo lo que necesita `TicketMesScreen`. La pantalla no calcula nada. */
export interface TicketDelMes {
  /** `AAAA-MM`, el que se pidió. Sirve para el encabezado mientras carga. */
  mes: string;
  ticket: Ticket | undefined;
  /**
   * El mes todavía no terminó, así que los números son **parciales** y hay que
   * decirlo: comparar veinte días de agosto contra julio entero es comparar
   * cualquier cosa.
   */
  enCurso: boolean;

  // ── Estados ──
  isLoading: boolean;
  isFetching: boolean;
  /** `403`: el rol de quien mira no alcanza. */
  sinPermiso: boolean;
  /**
   * `400`: el mes no existe o todavía no pasó. No es una falla de conexión, así
   * que la pantalla lo cuenta distinto (y sin botón de reintentar: volver a
   * pedirlo daría lo mismo).
   */
  mesImposible: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /** Con la promesa, para el "tirar para abajo". */
  refrescar: () => Promise<void>;
}

/**
 * El ticket de un mes (`docs/flujo_metricas.md` §5.2): **"¿qué pasó en julio?"**.
 *
 * ⚠️ **La deuda que muestra es la del cierre del mes, no la de hoy.** Una factura
 * de junio que se cobró en septiembre figura impaga en el ticket de julio,
 * porque en julio lo estaba: esa era la plata que había en la calle entonces.
 *
 * **No se guarda: se calcula.** Un mes cerrado puede cambiar si se anula una
 * factura vieja o se anota un cobro con fecha atrasada, así que se vuelve a
 * pedir al entrar y viaja `generadoEl` para dejar constancia de cuándo se armó
 * esta foto.
 */
export function useTicketMes(mes: string): TicketDelMes {
  const { data, error, isLoading, isFetching, refetch } = useGetTicketDelMesQuery(mes, {
    refetchOnMountOrArgChange: true,
  });

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Con error no se muestran números viejos: el mes que se está mirando podría
  // no ser el que se pidió.
  const ticket = error ? undefined : data;

  return {
    mes,
    ticket,
    // Mientras carga se asume cerrado: es el caso normal —se entra desde el
    // índice, donde el mes en curso es uno solo— y así el cartel de "en curso"
    // no aparece y desaparece en el medio de la carga.
    enCurso: ticket !== undefined && !ticket.cerrado,

    isLoading,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mesImposible: getApiErrorStatus(error) === 400,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
