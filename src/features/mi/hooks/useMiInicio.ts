import { useCallback } from 'react';
import { getApiErrorMessage } from '@/shared/utils';
import { useGetMiCuentaQuery, useListarMisFacturasQuery } from '../api';
import {
  sinFacturas,
  ULTIMAS_EN_EL_INICIO,
  type MiCuenta,
  type MiFacturaDeLaLista,
} from '../types';

/** Todo lo que necesita `InicioScreen` para dibujarse. */
export interface MiInicio {
  /** `undefined` mientras carga o si falló. */
  cuenta: MiCuenta | undefined;
  /** Las últimas cinco, para reconocer la compra sin entrar al listado. */
  ultimas: readonly MiFacturaDeLaLista[];
  /**
   * `true` si a esta cuenta **nunca** se le facturó nada. Es distinto de estar
   * al día, y confundirlos hace creer que se perdieron las facturas.
   */
  sinHistoria: boolean;
  isLoading: boolean;
  isFetching: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  /** Con la promesa, para el "tirar para abajo". */
  refrescar: () => Promise<void>;
}

/**
 * El inicio del cliente: **cuánto debo** (`docs/user_cliente_flujo.md` §4).
 *
 * Son dos consultas y van **en paralelo**: el resumen de la cuenta y las últimas
 * facturas son preguntas distintas y ninguna depende de la otra. RTK Query las
 * dispara juntas por el solo hecho de que los dos hooks se llamen en el mismo
 * render.
 *
 * ⚠️ El resumen es el de la cuenta **entera** y no lo toca ningún filtro: el
 * listado tiene los suyos, y mirar solo las vencidas no puede cambiar cuánto se
 * debe.
 */
export function useMiInicio(): MiInicio {
  const cuenta = useGetMiCuentaQuery();
  const ultimas = useListarMisFacturasQuery({ limite: ULTIMAS_EN_EL_INICIO });

  const reintentar = useCallback(() => {
    cuenta.refetch();
    ultimas.refetch();
  }, [cuenta, ultimas]);

  /**
   * Las dos a la vez, y la promesa espera a las dos: si volviera con la primera,
   * la rueda del gesto se bajaría con media pantalla todavía vieja.
   */
  const refrescar = useCallback(async () => {
    await Promise.all([cuenta.refetch(), ultimas.refetch()]);
  }, [cuenta, ultimas]);

  // El cartel manda: una cuenta vieja que ya no representa nada es peor que no
  // mostrar cuenta. El error del resumen gana porque es el encabezado.
  const error = cuenta.error ?? ultimas.error;

  return {
    cuenta: cuenta.error ? undefined : cuenta.data,
    ultimas: ultimas.data?.datos ?? [],
    sinHistoria: cuenta.data !== undefined && sinFacturas(cuenta.data),
    isLoading: cuenta.isLoading || ultimas.isLoading,
    isFetching: cuenta.isFetching || ultimas.isFetching,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
