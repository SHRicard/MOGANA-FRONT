import { useCallback, useMemo } from 'react';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { Roles } from '@/features/auth';
import { useGetCuentaDelSistemaQuery } from '../api';
import { opcionesDeRol, type CuentaDelSistema, type OpcionDeRol } from '../types';

/** Todo lo que necesita `CuentaDelSistemaScreen` para dibujarse. */
export interface FichaDelSistema {
  /** `undefined` mientras carga o si falló. */
  cuenta: CuentaDelSistema | undefined;
  isLoading: boolean;
  isFetching: boolean;
  /** `404`: no hay ninguna cuenta con ese id. */
  noEncontrada: boolean;
  /** `400`: el id no tiene forma de uuid. La API lo corta antes de tocar la base. */
  idInvalido: boolean;
  /** `403`: el rol de quien mira no alcanza. */
  sinPermiso: boolean;
  mensajeError: string | null;
  reintentar: () => void;
  refrescar: () => Promise<void>;
  /**
   * Las tres opciones del selector con su bloqueo ya resuelto contra las reglas
   * que evaluó el backend. Vacío mientras la ficha no llegó.
   */
  opciones: readonly OpcionDeRol[];
  /**
   * Si esta cuenta tiene además una **ficha de cliente** —la del otro apartado,
   * donde están el fiado, el DNI y el botón de facturar—. Solo los clientes: en
   * `/admin/clientes/:id` una cuenta de administración da `404`.
   */
  esCliente: boolean;
}

/**
 * La ficha de una cuenta en el panel del sistema
 * (`GET /api/super-admin/usuarios/:id`).
 *
 * Es la del listado más lo que solo tiene sentido acá: los tres bloques de
 * auditoría, cuántas facturas tiene y qué cambios de rol admite hoy.
 */
export function useCuentaDelSistema(cuentaId: string): FichaDelSistema {
  const { data, error, isLoading, isFetching, refetch } = useGetCuentaDelSistemaQuery(cuentaId);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const status = getApiErrorStatus(error);

  /**
   * Se memoiza: es un array nuevo en cada render y el selector está memoizado,
   * así que sin esto se redibujaría con cada tecla del motivo del diálogo.
   */
  const opciones = useMemo(() => (data ? opcionesDeRol(data) : []), [data]);

  return {
    cuenta: data,
    isLoading,
    isFetching,
    noEncontrada: status === 404,
    idInvalido: status === 400,
    sinPermiso: status === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
    opciones,
    esCliente: data?.rol === Roles.CLIENTE,
  };
}
