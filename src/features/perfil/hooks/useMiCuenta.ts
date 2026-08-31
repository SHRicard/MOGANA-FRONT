import { useCallback, useEffect, useMemo } from 'react';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useActualizarMiCuentaMutation, useGetMiPerfilQuery } from '../api';
import {
  aCambiosDePerfil,
  aValoresDeFormulario,
  CamposDelPerfil,
  esCallejonSinSalida,
  miCuentaSchema,
  motivoCampoFijo,
  type MiCuentaFormValues,
  type Perfil,
} from '../types';

export interface MiCuenta {
  /** El perfil que devolvió la API. `null` mientras carga o si falló. */
  perfil: Perfil | null;
  control: Control<MiCuentaFormValues>;

  // ── Reglas de edición, tal como las manda el backend ──
  /** Por qué no se puede cambiar el correo. Siempre viene. */
  motivoEmail: string | null;
  /** Por qué no se puede cambiar el DNI, o `null` si todavía se puede cargar. */
  motivoDni: string | null;

  // ── Guardar ──
  guardar: () => void;
  guardando: boolean;
  /** `true` si hay algo distinto de lo que trajo la API. Sin esto no se manda nada. */
  hayCambios: boolean;
  /** `true` cuando lo último que pasó fue un guardado exitoso y no se tocó nada más. */
  guardado: boolean;
  mensajeError: string | null;
  /** Los dos `409` del DNI: no se arreglan reintentando, se arreglan en el local. */
  sinSalida: boolean;

  // ── Correo sin verificar ──
  /**
   * `true` si todavía no lo verificó. **No bloquea nada**: la pantalla solo
   * ofrece ir a escribir el código.
   */
  faltaVerificarEmail: boolean;

  // ── Estados de la pantalla ──
  isLoading: boolean;
  isFetching: boolean;
  mensajeErrorPerfil: string | null;
  reintentar: () => void;
  /** El "tirar para abajo": devuelve la promesa para que la rueda espere. */
  refrescar: () => Promise<void>;
}

/**
 * Mi cuenta: ver y corregir los datos propios (`docs/flujo_mi_cuenta.md`).
 *
 * **La pantalla se arma con `GET /users/me`, no con lo que quedó del login**: el
 * teléfono, la dirección y las reglas de edición no viajan en la sesión, y el
 * DNI puede habérselo cargado un administrador desde el panel.
 *
 * Lo que se puede editar y lo que no **lo decide el backend** y llega en
 * `camposFijos`: acá no hay ninguna regla propia sobre cuándo el DNI se puede
 * tocar. El día que la regla cambie, la pantalla se entera sola.
 */
export function useMiCuenta(): MiCuenta {
  const { data, error, isLoading, isFetching, refetch } = useGetMiPerfilQuery();
  const [actualizar, { isLoading: guardando, isSuccess, error: errorGuardar }] =
    useActualizarMiCuentaMutation();

  const perfil = data ?? null;

  const { control, handleSubmit, reset, formState } = useForm<MiCuentaFormValues>({
    resolver: zodResolver(miCuentaSchema),
    defaultValues: { displayName: '', telefono: '', direccion: '', dni: '' },
    mode: 'onBlur',
  });

  /**
   * El formulario se llena con lo que trajo la API, y se vuelve a llenar cuando
   * la API manda algo distinto —después de guardar, o si lo cambiaron del otro
   * lado—. `data` mantiene su identidad mientras la respuesta no cambie, así que
   * refrescar mientras se escribe **no pisa lo tipeado**.
   */
  useEffect(() => {
    if (data) {
      reset(aValoresDeFormulario(data));
    }
  }, [data, reset]);

  const valores = useWatch({ control });

  /**
   * Qué se mandaría si se guardara ahora. Se calcula en vivo porque decide dos
   * cosas: si el botón está habilitado, y si el cartel de "guardado" sigue
   * teniendo sentido.
   *
   * ⚠️ El `isDirty` no es redundante con la comparación. El formulario se llena
   * en un efecto, así que hay **un render en el que el perfil ya llegó y los
   * campos todavía están vacíos**: ahí la comparación diría que cambió todo y el
   * botón se habilitaría por un frame para guardar un nombre en blanco. `reset`
   * vuelve a fijar los valores por defecto, así que `isDirty` es `false` hasta
   * que la persona toca algo de verdad.
   */
  const cambios = useMemo(
    () =>
      perfil && formState.isDirty ? aCambiosDePerfil(valores as MiCuentaFormValues, perfil) : null,
    [valores, perfil, formState.isDirty],
  );

  const enviar = useMemo(
    () =>
      handleSubmit(async (formulario) => {
        if (!perfil) {
          return;
        }
        const cuerpo = aCambiosDePerfil(formulario, perfil);
        // Sin cambios no se sale a la red: el body vacío es `400`.
        if (!cuerpo) {
          return;
        }
        await actualizar(cuerpo).unwrap();
      }),
    // El `.unwrap()` rechaza cuando la API falla; el error ya queda en el hook
    // de la mutation, así que no hace falta un catch que lo duplique.
    [handleSubmit, actualizar, perfil],
  );

  const guardar = useCallback(() => {
    // El `onPress` de un botón no espera nada; RHF ya atrapó el error del submit.
    enviar().catch(() => {});
  }, [enviar]);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    perfil,
    control,

    motivoEmail: perfil ? motivoCampoFijo(perfil, CamposDelPerfil.EMAIL) : null,
    motivoDni: perfil ? motivoCampoFijo(perfil, CamposDelPerfil.DNI) : null,

    guardar,
    guardando,
    hayCambios: cambios !== null,
    // Se apaga solo en cuanto se vuelve a tocar algo: un "guardado" arriba de un
    // formulario ya modificado dice una mentira.
    guardado: isSuccess && !formState.isDirty,
    mensajeError: getApiErrorMessage(errorGuardar),
    sinSalida: esCallejonSinSalida(getApiErrorStatus(errorGuardar)),

    // `false` mientras no se sepa: un cartel de "verificá tu correo" que aparece
    // y desaparece al cargar es peor que uno que llega medio segundo tarde.
    faltaVerificarEmail: perfil?.emailVerificado === false,

    isLoading,
    isFetching,
    mensajeErrorPerfil: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
