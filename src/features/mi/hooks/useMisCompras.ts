import { useCallback } from 'react';
import { getApiErrorMessage } from '@/shared/utils';
import { useGetMisComprasQuery } from '../api';
import { sinCompras, type EspecieQueCompro, type MisComprasDelHistorial } from '../types';

/** Todo lo que necesita `MisComprasScreen` para dibujarse. */
export interface MisComprasDelCliente {
  /** El ritmo de compra. Sus `null` se ocultan, no se muestran en cero. */
  historial: MisComprasDelHistorial | undefined;
  /**
   * De mayor a menor plata. **Incluye lo que dejó de llevar**, en cero y con el
   * chip `parada`: filtrarlo sería quedarse justo sin el dato que la pantalla
   * existe para dar.
   */
  especies: readonly EspecieQueCompro[];
  /** Lo facturado desde siempre: es sobre esto que se calculan las participaciones. */
  facturado: number;
  /** Los días de cada ventana de la tendencia. Hoy 90. */
  ventanaDias: number;
  /** `true` si nunca compró nada: el vacío con texto, no una tabla de ceros. */
  sinHistoria: boolean;

  isLoading: boolean;
  isFetching: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
}

/**
 * **Qué compro** (`docs/user_cliente_flujo.md` §10): la única métrica que el
 * cliente ve de sí mismo.
 *
 * Va sin nada de cómo paga —la tasa de cumplimiento, las demoras y el fiado son
 * el juicio que el negocio hace sobre él— y eso se queda del lado del panel.
 *
 * ⚠️ **`variacionCantidad: null` no es 0 %**: es que en la ventana anterior no
 * llevó ninguna. Para ese caso está el chip `nueva`.
 */
export function useMisCompras(): MisComprasDelCliente {
  const { data, error, isLoading, isFetching, refetch } = useGetMisComprasQuery();

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    historial: data?.compras,
    especies: data?.especies ?? [],
    facturado: data?.facturado ?? 0,
    ventanaDias: data?.ventanaDias ?? 0,
    sinHistoria: data !== undefined && sinCompras(data),

    isLoading,
    isFetching,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
