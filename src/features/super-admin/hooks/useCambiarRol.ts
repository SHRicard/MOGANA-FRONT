import { useCallback } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Rol } from '@/features/auth';
import { getApiErrorMessage } from '@/shared/utils';
import { useCambiarRolMutation } from '../api';
import {
  aCambiarRolPayload,
  cambiarRolSchema,
  type CambiarRolFormValues,
  type CuentaDelSistema,
} from '../types';

export interface CambioDeRol {
  /** El formulario del cambio: un solo campo, el motivo. */
  control: Control<CambiarRolFormValues>;
  /**
   * Manda el cambio con el motivo cargado. Valida antes de salir a la red: el
   * motivo es obligatorio del lado del servidor, así que pedirlo acá evita un
   * viaje para que conteste lo mismo.
   */
  cambiar: (rol: Rol) => void;
  /** Hay un cambio en vuelo: el botón se deshabilita, un doble toque no lo repite. */
  isSubmitting: boolean;
  /**
   * El error de la API, **ya redactado para mostrarse tal cual**: los tres
   * mensajes del `400` y de los dos `409` están escritos para el que mira. No se
   * reescriben.
   */
  mensajeError: string | null;
  /** Deja el formulario vacío y sin el cartel del intento anterior. */
  limpiar: () => void;
}

/**
 * **Mover a alguien de rol** (`PATCH /api/super-admin/usuarios/:id/rol`).
 *
 * ⚠️ Es la acción más pesada del panel: le da o le quita a alguien el acceso a
 * la facturación de todo el negocio, y **no se deshace con un botón** —se
 * deshace haciendo el cambio al revés, que deja otro renglón en la auditoría—.
 * Por eso el motivo es obligatorio y se pide en el diálogo, no después del
 * error.
 *
 * ⚠️ **El cambio pega en el request siguiente de esa persona, no en su próximo
 * login**: el rol se lee de la base en cada request y no del token. Si tiene la
 * app abierta, su próxima pantalla ya le contesta `403`.
 *
 * La respuesta trae la ficha entera actualizada y el endpoint la escribe solo en
 * el cache (ver `superAdminApi`), así que acá no hace falta volver a pedir nada.
 *
 * @param cuentaId a quién. Va en la URL.
 * @param onCambiado se llama con la ficha ya actualizada que devuelve el 200.
 */
export function useCambiarRol(
  cuentaId: string,
  onCambiado?: (cuenta: CuentaDelSistema) => void,
): CambioDeRol {
  const [cambiarRol, { isLoading, error, reset: resetMutation }] = useCambiarRolMutation();

  const { control, handleSubmit, reset } = useForm<CambiarRolFormValues>({
    resolver: zodResolver(cambiarRolSchema),
    defaultValues: { motivo: '' },
    mode: 'onBlur',
  });

  const limpiar = useCallback(() => {
    resetMutation();
    reset({ motivo: '' });
  }, [reset, resetMutation]);

  const cambiar = useCallback(
    (rol: Rol) => {
      // Un intento nuevo tiene que empezar sin el cartel del anterior.
      resetMutation();
      handleSubmit(async (valores) => {
        const actualizada = await cambiarRol(
          aCambiarRolPayload(cuentaId, rol, valores),
        ).unwrap();
        onCambiado?.(actualizada);
      })()
        // `handleSubmit` devuelve una promesa que ya no rechaza (RHF atrapa el
        // error del submit) y el `.unwrap()` deja el error en el hook de la
        // mutation. Se descarta a propósito: el `onPress` de un botón no espera
        // nada, y devolverla haría que React avise de una promesa colgada.
        .catch(() => {});
    },
    [handleSubmit, cambiarRol, cuentaId, onCambiado, resetMutation],
  );

  return {
    control,
    cambiar,
    isSubmitting: isLoading,
    mensajeError: getApiErrorMessage(error),
    limpiar,
  };
}
