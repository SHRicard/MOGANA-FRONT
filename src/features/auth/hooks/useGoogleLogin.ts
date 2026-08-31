import { useCallback, useState } from 'react';
import { useAppDispatch } from '@/store';
import { getApiErrorMessage } from '@/shared/utils';
import { useLoginWithGoogleMutation } from '../api';
import { GoogleSignInCancelled, signInWithGoogle } from '../googleSignIn';
import { setCredentials } from '../store';

/**
 * Login con Google, en dos pasos:
 *  1. SDK de Google → idToken (esto abre el diálogo nativo).
 *  2. `POST /auth/google` → nuestro usuario + NUESTRO token.
 *
 * Cancelar no es un error: si la persona cierra el diálogo, no se muestra nada.
 */
export function useGoogleLogin() {
  const dispatch = useAppDispatch();
  const [loginWithGoogle, { isLoading: isExchanging, error: apiError, reset }] =
    useLoginWithGoogleMutation();

  // Error del SDK de Google (paso 1). El del backend (paso 2) lo trae RTK Query.
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Cubre el diálogo nativo, que es tiempo en el que no hay request en vuelo
  // pero el botón igual tiene que estar bloqueado.
  const [isOpeningDialog, setIsOpeningDialog] = useState(false);

  const signIn = useCallback(async () => {
    setGoogleError(null);
    reset();
    setIsOpeningDialog(true);

    let idToken: string;
    try {
      idToken = await signInWithGoogle();
    } catch (error) {
      if (!(error instanceof GoogleSignInCancelled)) {
        setGoogleError(error instanceof Error ? error.message : 'No pudimos conectar con Google.');
      }
      return; // cancelado → silencio
    } finally {
      setIsOpeningDialog(false);
    }

    try {
      const result = await loginWithGoogle({ idToken }).unwrap();
      dispatch(setCredentials(result));
      // No navegamos a mano: al quedar autenticado, el RootNavigator cambia de stack.
    } catch {
      // El mensaje sale de `apiError` (abajo); acá solo evitamos el unhandled rejection.
    }
  }, [dispatch, loginWithGoogle, reset]);

  return {
    signIn,
    isSubmitting: isOpeningDialog || isExchanging,
    error: googleError ?? getApiErrorMessage(apiError),
  };
}
