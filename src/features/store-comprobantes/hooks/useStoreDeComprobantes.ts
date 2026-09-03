import { useCallback, useState } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import {
  useGetConsumoDelStoreQuery,
  useLimpiarStoreMutation,
  useVistaPreviaDeLimpiezaMutation,
} from '../api';
import {
  type ConsumoDelStore,
  type CriterioDeLimpieza,
  type LimpiezaHecha,
  type VistaPreviaDeLimpieza,
} from '../types';

/**
 * `409`: entre que se abrió el cartel y se apretó el botón cambió el número.
 *
 * Es la guarda que hace que la vista previa sea **vinculante y no decorativa**:
 * se pudo haber resuelto un aviso en el medio, y entonces lo que se confirmó ya
 * no es lo que se iba a borrar.
 */
const CAMBIO_EL_NUMERO = 409;

export interface StoreDeComprobantes {
  consumo: ConsumoDelStore | undefined;

  // ── La limpieza, en sus tres pasos ──
  /**
   * Lo que la limpieza se llevaría, o `null` si todavía no se miró.
   *
   * ⚠️ **Es el paso obligatorio.** No hay forma de borrar sin haber mirado: el
   * número que devuelve es el que viaja como `comprobantesEsperados`, y sin él
   * el backend no tiene contra qué chequear.
   */
  previa: VistaPreviaDeLimpieza | null;
  /** Qué criterio se está mirando. Se manda igual a la previa y al borrado. */
  criterio: CriterioDeLimpieza | null;
  /** Paso 1: mirar qué se llevaría. Abre el cartel. */
  mirar: (criterio: CriterioDeLimpieza) => void;
  /** Paso 2: borrar lo que dijo el cartel. No se puede deshacer. */
  borrar: () => void;
  /** Cerrar el cartel sin borrar. */
  cancelar: () => void;
  mirando: boolean;
  borrando: boolean;
  /** El resultado del último borrado, para el cartel de "listo". */
  hecho: LimpiezaHecha | null;
  /**
   * `true` si el `409` frenó el borrado: el número cambió y hay que volver a
   * mirar. Es lo único que se arregla apretando "mirar de nuevo".
   */
  hayQueVolverAMirar: boolean;
  mensajeErrorLimpieza: string | null;

  // ── Estados de la pantalla ──
  isLoading: boolean;
  isFetching: boolean;
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
}

/**
 * **El panel del store** (`MORGANA-BACK/docs/flujo_comprobantes.md` §5).
 *
 * ⚠️ **Acá se borran archivos y no se puede deshacer.** Por eso la limpieza es
 * de tres pasos y no de uno: elegir el criterio → **mirar qué se lleva** →
 * confirmar. El paso del medio no se puede saltear, y no es una molestia: es lo
 * que convierte "borrá lo viejo" en "vas a borrar 143 comprobantes de 38
 * clientes, del 11/02 al 30/06".
 *
 * Las guardas viven en el backend y este hook las respeta en vez de esquivarlas:
 *
 * - manda **siempre** `comprobantesEsperados` con el número de la previa, que es
 *   lo que la hace vinculante;
 * - manda `confirmo: true` recién en el borrado, nunca en la previa —pedirlo
 *   para mirar sería pedir que se confirme antes de saber qué—;
 * - trata el `409` como "volvé a mirar" y no como un error de red.
 *
 * ⚠️ El borrado se lleva **hasta 500 por pasada** y contesta `restan`. No se
 * reintenta solo: mientras queden, el cartel lo dice y se aprieta de nuevo.
 * Automatizarlo sería volver a hacer sola la parte que el doc quiere que alguien
 * decida con el número delante.
 */
export function useStoreDeComprobantes(): StoreDeComprobantes {
  const { data, isLoading, isFetching, error, refetch } = useGetConsumoDelStoreQuery();

  const [criterio, setCriterio] = useState<CriterioDeLimpieza | null>(null);
  const [previa, setPrevia] = useState<VistaPreviaDeLimpieza | null>(null);
  const [hecho, setHecho] = useState<LimpiezaHecha | null>(null);

  const [pedirPrevia, estadoPrevia] = useVistaPreviaDeLimpiezaMutation();
  const [limpiar, estadoLimpieza] = useLimpiarStoreMutation();

  const mirar = useCallback(
    (elegido: CriterioDeLimpieza) => {
      // Un intento nuevo empieza sin el resultado ni el cartel del anterior.
      setHecho(null);
      estadoLimpieza.reset();
      setCriterio(elegido);

      pedirPrevia(elegido)
        .unwrap()
        .then(setPrevia)
        // El error ya queda en `estadoPrevia`; el catch solo evita la promesa
        // colgada. Sin previa el cartel no se abre, que es lo correcto.
        .catch(() => setPrevia(null));
    },
    [pedirPrevia, estadoLimpieza],
  );

  const borrar = useCallback(() => {
    if (!criterio || !previa) {
      return;
    }
    limpiar({
      ...criterio,
      confirmo: true,
      // ⚠️ El número de la previa, siempre. Es lo que hace que mirar sirva.
      comprobantesEsperados: previa.comprobantes,
    })
      .unwrap()
      .then((resultado) => {
        setHecho(resultado);
        // El cartel de la previa se cierra: lo que sigue es el resumen de lo que
        // se borró, no volver a confirmar lo mismo.
        setPrevia(null);
      })
      .catch(() => {});
  }, [limpiar, criterio, previa]);

  const cancelar = useCallback(() => {
    setPrevia(null);
    setCriterio(null);
    setHecho(null);
    estadoPrevia.reset();
    estadoLimpieza.reset();
  }, [estadoPrevia, estadoLimpieza]);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    consumo: data,

    previa,
    criterio,
    mirar,
    borrar,
    cancelar,
    mirando: estadoPrevia.isLoading,
    borrando: estadoLimpieza.isLoading,
    hecho,
    hayQueVolverAMirar: getApiErrorStatus(estadoLimpieza.error) === CAMBIO_EL_NUMERO,
    // Los textos del backend vienen redactados: van tal cual al cartel.
    mensajeErrorLimpieza:
      getApiErrorMessage(estadoPrevia.error) ?? getApiErrorMessage(estadoLimpieza.error),

    isLoading,
    isFetching,
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
