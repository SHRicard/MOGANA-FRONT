import { useCallback } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import {
  useBorrarPagoMutation,
  useDeshacerReembolsoMutation,
  useGetFacturaQuery,
  useMarcarReembolsoMutation,
} from '../api';
import { esFacturaAnulada, type Factura, type Pago } from '../types';

/** Todo lo que necesita `FacturaScreen` para dibujarse. */
export interface DetalleFactura {
  /** `undefined` mientras carga o si falló. */
  factura: Factura | undefined;
  isLoading: boolean;
  /** Hay una request en vuelo (incluye el refetch al reintentar). */
  isFetching: boolean;
  /** `404`: esa factura no existe. No se arregla reintentando. */
  noEncontrada: boolean;
  /** `403`: el rol de quien mira no alcanza. */
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /**
   * Vuelve a pedirle los datos a la API, igual que `reintentar`, pero
   * **devolviendo la promesa**: es lo que usa el "tirar para abajo" para dejar
   * la rueda girando hasta que la respuesta llega.
   */
  refrescar: () => Promise<void>;

  // ── Cobros ──
  /** Los cobros anotados, del más viejo al más nuevo. */
  pagos: readonly Pago[];
  /** Cuánto falta cobrar. `0` es una factura saldada. */
  saldo: number;
  /** Cuánto entró hasta ahora. */
  pagado: number;
  /** `true` si no queda nada por cobrar: ahí no se ofrece registrar otro pago. */
  estaSaldada: boolean;
  /** `true` si entró algo pero todavía falta: el caso que hay que mostrar entero. */
  hayPagoParcial: boolean;
  /**
   * Borrar un cobro mal cargado. **No hay editar**: se borra y se vuelve a
   * anotar, así no se pierde qué se había cargado antes.
   */
  borrarPago: (pagoId: string) => void;
  /**
   * Si los cobros se pueden tocar. En una factura anulada **quedan congelados**:
   * son el registro de la plata que entró y que hay que devolver, así que no se
   * borran ni se agregan (`Esta factura está anulada: sus cobros quedan como
   * registro de lo que hay que devolver.`).
   */
  puedeBorrarPagos: boolean;
  /** Hay un borrado en vuelo: los tachos se bloquean. */
  borrandoPago: boolean;
  /** Error del borrado, aparte del de la carga de la pantalla. */
  mensajeErrorPago: string | null;

  // ── Anulación ──
  /** `true` si está dada de baja: no se cobra, no vence y no cuenta para la deuda. */
  estaAnulada: boolean;
  /**
   * Si se puede dar de baja. **También se anula una ya cobrada**: pasa que se
   * emitió, se cobró y después quedó claro que fue un error. Lo cobrado no se
   * borra — pasa a ser plata a devolver.
   */
  puedeAnular: boolean;

  // ── Reembolso ──
  /**
   * Lo que hay que devolverle al cliente. Cero salvo en una anulada que ya se
   * había cobrado.
   */
  aReembolsar: number;
  /** `true` si quedó plata para devolver y todavía no se marcó como devuelta. */
  hayQueDevolver: boolean;
  /** `true` si ya se marcó que se devolvió. */
  estaReembolsado: boolean;
  /**
   * Marcar que ya se le devolvió la plata. ⚠️ **La devolución se hace afuera del
   * sistema**: esto solo apaga el aviso y deja registrado cuándo y quién.
   */
  marcarReembolso: () => void;
  /** Deshacer la marca, para cuando se apretó sin querer. */
  deshacerReembolso: () => void;
  /** Hay un cambio de reembolso en vuelo: el botón se bloquea. */
  guardandoReembolso: boolean;
  mensajeErrorReembolso: string | null;
}

/**
 * Una factura emitida, sus cobros y su baja (`docs/flujo_pagos.md` §5, §8 y §9).
 *
 * El `DELETE` de un pago devuelve la factura **ya recalculada**, así que borrar
 * un cobro no dispara una segunda request para refrescar la pantalla: el api
 * slice escribe la respuesta en el cache de esta misma factura.
 */
export function useFactura(facturaId: string): DetalleFactura {
  const { data, error, isLoading, isFetching, refetch } = useGetFacturaQuery(facturaId);
  const [borrar, { isLoading: borrandoPago, error: errorPago }] = useBorrarPagoMutation();
  const [marcar, { isLoading: marcando, error: errorMarcar }] = useMarcarReembolsoMutation();
  const [deshacer, { isLoading: deshaciendo, error: errorDeshacer }] =
    useDeshacerReembolsoMutation();

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  /**
   * Lo mismo que `reintentar`, pero esperable. Son dos porque se usan distinto:
   * el botón de reintentar dispara y se olvida, y el gesto de refrescar necesita
   * saber cuándo terminó para bajar la rueda.
   */
  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const borrarPago = useCallback(
    (pagoId: string) => {
      // Se descarta el rechazo a propósito: el error ya queda en el hook de la
      // mutation y se muestra desde `mensajeErrorPago`. Sin el catch, RTK Query
      // lo reporta como una promesa sin manejar.
      borrar({ facturaId, pagoId })
        .unwrap()
        .catch(() => {});
    },
    [borrar, facturaId],
  );

  const marcarReembolso = useCallback(() => {
    // Se descarta el rechazo a propósito: el error queda en el hook de la
    // mutation y se muestra desde `mensajeErrorReembolso`.
    marcar({ facturaId })
      .unwrap()
      .catch(() => {});
  }, [marcar, facturaId]);

  const deshacerReembolso = useCallback(() => {
    deshacer({ facturaId })
      .unwrap()
      .catch(() => {});
  }, [deshacer, facturaId]);

  const status = getApiErrorStatus(error);

  // Los importes salen tal cual del backend: acá no se resta nada. Rehacer la
  // cuenta en JavaScript es como el front termina mostrando `$999.9999999`.
  const saldo = data?.saldo ?? 0;
  const pagado = data?.pagado ?? 0;
  const aReembolsar = data?.aReembolsar ?? 0;

  const estaAnulada = data !== undefined && esFacturaAnulada(data);

  return {
    factura: data,
    isLoading,
    isFetching,
    noEncontrada: status === 404,
    sinPermiso: status === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,

    pagos: data?.pagos ?? [],
    saldo,
    pagado,
    // Se mira el saldo y no el `estado`: es el dato del que sale el estado, y el
    // que decide si todavía se puede registrar un cobro.
    estaSaldada: data !== undefined && saldo <= 0,
    hayPagoParcial: pagado > 0 && saldo > 0,
    borrarPago,
    borrandoPago,
    // Los cobros de una anulada quedan congelados: son el registro de lo que
    // entró y de lo que hay que devolver.
    puedeBorrarPagos: !estaAnulada,
    mensajeErrorPago: getApiErrorMessage(errorPago),

    estaAnulada,
    puedeAnular: data !== undefined && !estaAnulada,

    aReembolsar,
    hayQueDevolver: aReembolsar > 0,
    // Se mira la marca y no el importe: al marcarlo `aReembolsar` pasa a cero, y
    // es lo que permite ofrecer el "deshacer".
    estaReembolsado: Boolean(data?.reembolsadoEn),
    marcarReembolso,
    deshacerReembolso,
    guardandoReembolso: marcando || deshaciendo,
    mensajeErrorReembolso: getApiErrorMessage(errorMarcar ?? errorDeshacer),
  };
}
