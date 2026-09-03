import { useCallback, useState } from 'react';
import { useLogout } from '@/features/auth';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useDarDeBajaMutation, useGetVistaPreviaDeBajaQuery } from '../api';
import { confirmacionCoincide, type BajaHecha, type VistaPreviaDeBaja } from '../types';

/** Todo lo que necesita `EliminarCuentaScreen` para dibujarse. */
export interface BajaDeCuenta {
  // ── La vista previa (§3) ──
  /**
   * Qué va a pasar, con **todos los textos ya redactados por el servidor**.
   * `undefined` mientras carga o si falló.
   */
  vistaPrevia: VistaPreviaDeBaja | undefined;
  isLoading: boolean;
  isFetching: boolean;
  mensajeErrorVistaPrevia: string | null;
  reintentar: () => void;

  // ── La confirmación ──
  /** Lo que se escribió en el campo. */
  confirmacion: string;
  onConfirmacionChange: (texto: string) => void;
  /** `true` si lo escrito alcanza. Es lo que enciende el botón. */
  puedeConfirmar: boolean;

  // ── El borrado (§4) ──
  /** Borra la cuenta. No pide nada más: la palabra ya está escrita. */
  eliminar: () => void;
  eliminando: boolean;
  mensajeError: string | null;
  /**
   * `409`: la cuenta es de administración y no se da de baja desde acá. No es un
   * error que se reintente — se la pide al super admin—, así que la pantalla
   * deja de ofrecer el botón.
   */
  esCuentaDelNegocio: boolean;

  // ── Después ──
  /**
   * Lo que devolvió el `DELETE`: **lo último que la persona lee de la app**.
   * `null` mientras no se haya borrado nada.
   *
   * ⚠️ Con esto en mano **la sesión sigue abierta a propósito**: si se cerrara
   * en el mismo momento, el stack se reemplazaría solo y este mensaje no se
   * llegaría a ver. Lo que no se hace es pedirle nada más a la API — el token ya
   * no sirve.
   */
  resultado: BajaHecha | null;
  /** Cierra la sesión y devuelve al login. Es la única salida de la despedida. */
  salir: () => void;
}

/**
 * **Dar de baja la cuenta** (`docs/README_FRONT_BAJA_DE_CUENTA.md`).
 *
 * Son dos pasos y un solo botón para la persona: la app pregunta primero
 * (`GET /users/me/baja`), muestra lo que corresponda, y recién ahí borra
 * (`DELETE /users/me`).
 *
 * ⚠️ **Después del `DELETE` no se le pide nada más a la API.** El token dejó de
 * servir en el mismo request: cualquier llamada siguiente vuelve `401` y la
 * persona vería un error donde tendría que ver una despedida.
 */
export function useBajaDeCuenta(): BajaDeCuenta {
  const cerrarSesion = useLogout();

  const {
    data: vistaPrevia,
    error: errorVistaPrevia,
    isLoading,
    isFetching,
    refetch,
  } = useGetVistaPreviaDeBajaQuery();

  const [confirmacion, setConfirmacion] = useState('');
  const [resultado, setResultado] = useState<BajaHecha | null>(null);

  const [darDeBaja, { isLoading: eliminando, error, reset }] = useDarDeBajaMutation();

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  const onConfirmacionChange = useCallback(
    (texto: string) => {
      setConfirmacion(texto);
      // Un intento nuevo empieza sin el cartel del anterior: el error más
      // probable es justamente que la palabra no coincidiera.
      reset();
    },
    [reset],
  );

  const eliminar = useCallback(() => {
    darDeBaja({ confirmacion })
      .unwrap()
      .then(setResultado)
      // El `.unwrap()` rechaza cuando la API falla y el error ya queda en el
      // hook de la mutation, así que no hace falta un catch que lo duplique.
      // Se atrapa igual para que el `onPress` no deje una promesa colgada.
      .catch(() => {});
  }, [darDeBaja, confirmacion]);

  const salir = useCallback(() => {
    // `useLogout` y no un `logout()` suelto: además del token limpia la cache de
    // RTK Query, que todavía tiene el perfil de quien se acaba de ir.
    cerrarSesion().catch(() => {});
  }, [cerrarSesion]);

  return {
    vistaPrevia,
    isLoading,
    isFetching,
    mensajeErrorVistaPrevia: getApiErrorMessage(errorVistaPrevia),
    reintentar,

    confirmacion,
    onConfirmacionChange,
    // Sin la vista previa no hay contra qué comparar: la palabra la manda el
    // servidor, nunca está escrita en el front.
    puedeConfirmar:
      vistaPrevia !== undefined && confirmacionCoincide(confirmacion, vistaPrevia.confirmacion),

    eliminar,
    eliminando,
    mensajeError: getApiErrorMessage(error),
    esCuentaDelNegocio: getApiErrorStatus(error) === 409,

    resultado,
    salir,
  };
}
