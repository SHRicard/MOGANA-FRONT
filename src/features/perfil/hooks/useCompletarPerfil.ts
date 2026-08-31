import { useCallback, useMemo } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { selectMotivoBloqueo, useLogout, useRefrescarSesion } from '@/features/auth';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useAppSelector } from '@/store';
import { useActualizarMiCuentaMutation } from '../api';
import {
  aActualizarPerfilPayload,
  completarPerfilSchema,
  esCallejonSinSalida,
  type CompletarPerfilFormValues,
} from '../types';

export interface CompletarPerfil {
  /** El texto del bloqueo que mandó el backend. Se muestra tal cual. */
  motivo: string | null;
  control: Control<CompletarPerfilFormValues>;
  guardar: () => void;
  guardando: boolean;
  /** Error de la API, ya redactado. */
  mensajeError: string | null;
  /**
   * `true` cuando el error es uno de los dos `409`: la persona no puede
   * resolverlo sola y hay que mandarla al local, no ofrecerle reintentar.
   */
  sinSalida: boolean;
  /** Vuelve a pedir `/users/me`. Es el "tirar para abajo" de la pantalla. */
  refrescar: () => Promise<void>;
  cerrarSesion: () => void;
}

/**
 * Cargar el DNI para destrabar la cuenta (`docs/flujo_login.md`).
 *
 * El estado que manda es **la sesión**: la pantalla se muestra mientras
 * `estado === "bloqueado"`, y desaparece sola cuando el usuario nuevo entra al
 * store (lo escribe `onQueryStarted`). No hay un `useState` diciendo "ya lo
 * cargó" que se pueda desincronizar de la realidad.
 *
 * **Las dos salidas que no son cargar el DNI**, y ninguna es decorativa:
 *
 *  - `refrescar` — el administrador puede cargarlo desde el panel con la persona
 *    enfrente. Tirando para abajo, la app se entera y se destraba sola.
 *  - `cerrarSesion` — si el `409` la deja sin salida, sin esto la única opción
 *    que le queda es desinstalar la app buscando destrabarse.
 */
export function useCompletarPerfil(): CompletarPerfil {
  const motivo = useAppSelector(selectMotivoBloqueo);
  const logout = useLogout();
  const refrescarSesion = useRefrescarSesion();
  const [actualizarMiCuenta, { isLoading, error }] = useActualizarMiCuentaMutation();

  const { control, handleSubmit } = useForm<CompletarPerfilFormValues>({
    resolver: zodResolver(completarPerfilSchema),
    defaultValues: { dni: '' },
    mode: 'onBlur',
  });

  const enviar = useMemo(
    () =>
      handleSubmit(async (valores) => {
        await actualizarMiCuenta(aActualizarPerfilPayload(valores)).unwrap();
      }),
    // El `.unwrap()` rechaza cuando la API falla; el error ya queda en el hook
    // de la mutation, así que no hace falta un catch que lo duplique.
    [handleSubmit, actualizarMiCuenta],
  );

  const guardar = useCallback(() => {
    // `handleSubmit` devuelve una promesa que ya no rechaza (RHF atrapa el error
    // del submit). Se descarta a propósito: el `onPress` de un botón no espera
    // nada, y devolverla haría que React avise de una promesa colgada.
    enviar().catch(() => {});
  }, [enviar]);

  const cerrarSesion = useCallback(() => {
    logout().catch(() => {});
  }, [logout]);

  return {
    motivo,
    control,
    guardar,
    guardando: isLoading,
    mensajeError: getApiErrorMessage(error),
    sinSalida: esCallejonSinSalida(getApiErrorStatus(error)),
    refrescar: refrescarSesion,
    cerrarSesion,
  };
}
