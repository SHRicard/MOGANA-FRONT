import { useCallback, useRef, useState } from 'react';
import {
  esMesPosteriorApi,
  getApiErrorMessage,
  getApiErrorStatus,
  mesActualApi,
  moverMesApi,
} from '@/shared/utils';
import { useGetMetricasQuery } from '../api';
import type {
  ClientesMetricas,
  Cumplimiento,
  DelMes,
  EnLaCalle,
  GlobalMetricas,
  Metricas,
  PuntoEvolucion,
} from '../types';

/** Todo lo que necesita `MetricasScreen` para dibujarse. Acá no se calcula nada. */
export interface MetricasDelPanel {
  /** El día al que corresponde la foto, tal como lo devuelve la API. */
  hoy: string | undefined;

  // ── El mes elegido ──
  /** `AAAA-MM`. Arranca en el mes en curso. */
  mes: string;
  mesAnterior: () => void;
  mesSiguiente: () => void;
  /** `true` en el mes en curso: adelante no hay nada que mirar. */
  esUltimoMes: boolean;

  // ── Los bloques ──
  /** Lo del mes elegido. `undefined` mientras carga o si falló. */
  delMes: DelMes | undefined;
  /** ⚠️ **Foto de hoy**, no del mes elegido. */
  enLaCalle: EnLaCalle | undefined;
  clientes: ClientesMetricas | undefined;
  cumplimiento: Cumplimiento | undefined;
  global: GlobalMetricas | undefined;
  /** Seis meses, del más viejo al más nuevo. Los ceros están a propósito. */
  evolucion: readonly PuntoEvolucion[];

  // ── Estados ──
  isLoading: boolean;
  isFetching: boolean;
  /** `403`: el rol de quien mira no alcanza. */
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /** Con la promesa, para el "tirar para abajo". */
  refrescar: () => Promise<void>;
}

/**
 * Las métricas del panel de administración (`docs/flujo_metricas.md`).
 *
 * **El mes solo mueve dos cosas**: lo del período (`delMes`) y en qué mes
 * termina el gráfico. La plata en la calle, los morosos y las tasas de
 * cumplimiento son **la foto de hoy** y no cambian nunca — la pantalla tiene que
 * dejar eso claro, o se lee la deuda de hoy como si fuera la de marzo.
 *
 * Se pide de nuevo **cada vez que se entra a la pantalla**
 * (`refetchOnMountOrArgChange`): son números que envejecen mal y la consulta es
 * barata. Lo que el doc pide que NO se haga es ponerla en un `setInterval`.
 */
export function useMetricas(): MetricasDelPanel {
  const [mes, setMes] = useState(mesActualApi);

  const { data, error, isLoading, isFetching, refetch } = useGetMetricasQuery(
    { mes },
    { refetchOnMountOrArgChange: true },
  );

  /**
   * Cada mes es una entrada de cache distinta, así que `data` vuelve a ser
   * `undefined` en cuanto se toca una flecha. Se guarda la última respuesta para
   * dejarla puesta mientras carga la nueva: sin esto, la pantalla entera se
   * borra y se vuelve a dibujar al pasar de mes.
   */
  const ultima = useRef<Metricas | null>(null);
  if (data) {
    ultima.current = data;
  }

  // Con error manda el cartel: números viejos que ya no representan nada son
  // peor que no mostrar números.
  const metricas = error ? null : data ?? ultima.current;

  const mesAnterior = useCallback(() => setMes((actual) => moverMesApi(actual, -1)), []);
  const mesSiguiente = useCallback(() => setMes((actual) => moverMesApi(actual, 1)), []);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    hoy: metricas?.hoy,

    mes,
    mesAnterior,
    mesSiguiente,
    // El mes en curso se recalcula en cada render y no se congela al montar: la
    // app puede quedar abierta y cruzar la medianoche del 1°.
    esUltimoMes: !esMesPosteriorApi(mesActualApi(), mes),

    delMes: metricas?.delMes,
    enLaCalle: metricas?.enLaCalle,
    clientes: metricas?.clientes,
    cumplimiento: metricas?.cumplimiento,
    global: metricas?.global,
    evolucion: metricas?.evolucion ?? [],

    // Solo la primera carga: al cambiar de mes queda la anterior en pantalla.
    isLoading: isLoading && ultima.current === null,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
