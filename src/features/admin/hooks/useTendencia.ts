import { useCallback, useRef, useState } from 'react';
import {
  esMesPosteriorApi,
  getApiErrorMessage,
  getApiErrorStatus,
  mesActualApi,
  moverMesApi,
} from '@/shared/utils';
import { useGetTendenciaQuery } from '../api';
import {
  MESES_DE_TENDENCIA,
  OrdenesDeTendencia,
  type EspecieDeTendencia,
  type OrdenDeTendencia,
  type TendenciaDeCompra,
  type TotalesDeTendencia,
} from '../mercaderia';

/** Todo lo que necesita `TendenciaScreen`. La pantalla no calcula nada. */
export interface TendenciaDelNegocio {
  /** `AAAA-MM`. Arranca en el mes en curso. */
  mes: string;
  mesAnterior: () => void;
  mesSiguiente: () => void;
  /** `true` en el mes en curso: adelante no hay nada que mirar. */
  esUltimoMes: boolean;
  /** El mes elegido todavía no terminó: la comparación es parcial. */
  enCurso: boolean;

  orden: OrdenDeTendencia;
  onOrdenChange: (orden: OrdenDeTendencia) => void;

  /**
   * **Todo lo que se movió en la ventana**, con los números del mes elegido —no
   * solo lo que se vendió este mes.
   */
  especies: readonly EspecieDeTendencia[];
  totales: TotalesDeTendencia | undefined;
  /** El eje del gráfico: los meses de la ventana, en orden. */
  meses: readonly string[];
  /** Contra qué mes se compara, para poder nombrarlo. */
  contra: string | undefined;

  isLoading: boolean;
  isFetching: boolean;
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
}

/**
 * La tendencia de compra (`docs/flujo_metricas.md` §5): **qué se llevan los
 * clientes, mes a mes**.
 *
 * Es la única pantalla que mira la mercadería y no la plata. El tablero dice
 * cuánto se facturó; esta dice *"este mes se llevaron 100 zapatillas y 10
 * remeras, y el mes pasado eran 60 y 40"* — dos meses de $500.000 pueden ser el
 * mismo negocio o dos negocios distintos.
 *
 * La ventana es de **doce meses** y no se toca desde la pantalla: en un negocio
 * estacional, seis meses mirados desde agosto son seis meses de caída sin un
 * solo mes de verano contra el cual leerlos.
 */
export function useTendencia(): TendenciaDelNegocio {
  const [mes, setMes] = useState(mesActualApi);
  const [orden, setOrden] = useState<OrdenDeTendencia>(OrdenesDeTendencia.MONTO);

  const { data, error, isLoading, isFetching, refetch } = useGetTendenciaQuery(
    { mes, meses: MESES_DE_TENDENCIA, orden },
    { refetchOnMountOrArgChange: true },
  );

  /**
   * Cada combinación de mes y orden es una entrada de cache distinta, así que
   * `data` vuelve a `undefined` en cuanto se toca una flecha. Se guarda la
   * última respuesta para dejarla puesta mientras carga la nueva: sin esto, la
   * lista entera parpadea en cada paso.
   */
  const ultima = useRef<TendenciaDeCompra | null>(null);
  if (data) {
    ultima.current = data;
  }

  const tendencia = error ? null : data ?? ultima.current;

  const mesAnterior = useCallback(() => setMes((actual) => moverMesApi(actual, -1)), []);
  const mesSiguiente = useCallback(() => setMes((actual) => moverMesApi(actual, 1)), []);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    mes,
    mesAnterior,
    mesSiguiente,
    // Se recalcula en cada render y no se congela al montar: la app puede quedar
    // abierta y cruzar la medianoche del 1°.
    esUltimoMes: !esMesPosteriorApi(mesActualApi(), mes),
    enCurso: tendencia !== null && !tendencia.cerrado,

    orden,
    onOrdenChange: setOrden,

    especies: tendencia?.especies ?? [],
    totales: tendencia?.totales,
    meses: tendencia?.meses ?? [],
    contra: tendencia?.mesAnterior,

    // Solo la primera carga: al cambiar de mes queda la anterior en pantalla.
    isLoading: isLoading && ultima.current === null,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
