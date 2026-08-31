import { useCallback, useMemo } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useGetMiFacturaQuery, useListarMisAvisosQuery } from '../api';
import {
  AVISOS_SIN_RESOLVER,
  puedoAvisarPago,
  textoDeLaAnulada,
  yaInformadoDe,
  type MiAvisoDePago,
  type MiFactura,
  type MiItem,
  type MiPago,
} from '../types';

/** Todo lo que necesita `MiFacturaScreen` para dibujarse. */
export interface DetalleDeMiFactura {
  /** `undefined` mientras carga o si falló. */
  factura: MiFactura | undefined;
  /** En el orden en que se cargaron. */
  items: readonly MiItem[];
  /** Del más viejo al más nuevo: se lee como un extracto. */
  pagos: readonly MiPago[];

  // ── Avisos de esta factura ──
  /**
   * Los avisos de **esta** factura que todavía nadie resolvió.
   *
   * Explican por qué la deuda no bajó y son lo que evita informar dos veces lo
   * mismo (§6). Se muestran en el detalle, no en otra pantalla.
   */
  avisosSinResolver: readonly MiAvisoDePago[];
  /** Cuánto de esta factura ya se informó y sigue sin resolverse. */
  yaInformado: number;
  /** `saldo − yaInformado`: el máximo que se puede informar ahora. */
  puedeInformar: number;
  /**
   * Si se ofrece el botón de avisar. **Es la misma regla del backend traída
   * acá**: no mostrar el botón es mejor que mostrarlo y contestar un `400`.
   */
  sePuedeAvisar: boolean;

  // ── Anulada ──
  /** `true` si está dada de baja: no se cobra, no vence y no hay que pagarla. */
  estaAnulada: boolean;
  /**
   * Qué decir de la anulada: *"Te devolvemos $21.450"*, *"Ya te lo devolvimos"*
   * o nada. `null` cuando no hay nada para decir.
   */
  textoAnulada: string | null;

  // ── Estados ──
  isLoading: boolean;
  isFetching: boolean;
  /** `404`: **no existe o no es tuya**. No se arregla reintentando. */
  noEncontrada: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
}

/**
 * Una factura mía, con su detalle y sus cobros
 * (`docs/user_cliente_flujo.md` §6).
 *
 * Son dos consultas: la factura y **los avisos sin resolver**, que es lo que
 * permite mostrar *"avisaste $12.000 el 20/08, sin confirmar"* y calcular
 * cuánto queda por informar. La segunda es una entrada de cache compartida con
 * el resto del apartado, así que no cuesta una request por factura.
 *
 * ⚠️ **`saldo − yaInformado` es la única resta de plata que el front hace**, y
 * puede hacerla porque los dos números ya vienen calculados. Todo lo demás
 * llega listo.
 */
export function useMiFactura(facturaId: string): DetalleDeMiFactura {
  const { data, error, isLoading, isFetching, refetch } = useGetMiFacturaQuery(facturaId);
  const avisos = useListarMisAvisosQuery(AVISOS_SIN_RESOLVER);

  const reintentar = useCallback(() => {
    refetch();
    avisos.refetch();
  }, [refetch, avisos]);

  /**
   * Lo mismo que `reintentar`, pero esperable: el botón dispara y se olvida, y
   * el gesto de refrescar necesita saber cuándo terminó para bajar la rueda.
   */
  const refrescar = useCallback(async () => {
    await Promise.all([refetch(), avisos.refetch()]);
  }, [refetch, avisos]);

  const avisosSinResolver = useMemo(
    () => (avisos.data?.datos ?? []).filter((aviso) => aviso.factura.id === facturaId),
    [avisos.data, facturaId],
  );

  const yaInformado = yaInformadoDe(avisos.data?.datos ?? [], facturaId);
  const saldo = data?.saldo ?? 0;

  return {
    factura: data,
    items: data?.items ?? [],
    pagos: data?.pagos ?? [],

    avisosSinResolver,
    yaInformado,
    // `Math.max` para que un backend que ya tomó el aviso no deje un negativo en
    // pantalla mientras la lista de avisos todavía es la vieja.
    puedeInformar: Math.max(0, saldo - yaInformado),
    sePuedeAvisar: data !== undefined && puedoAvisarPago(data, yaInformado),

    estaAnulada: data?.anulada ?? false,
    textoAnulada: data ? textoDeLaAnulada(data) : null,

    isLoading,
    isFetching,
    noEncontrada: getApiErrorStatus(error) === 404,
    // El de la factura manda: sin ella no hay pantalla, y que fallen los avisos
    // solo esconde un renglón de contexto.
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
