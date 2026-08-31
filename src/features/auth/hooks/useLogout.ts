import { useCallback } from 'react';
import { baseApi } from '@/services/api';
import { useAppDispatch } from '@/store';
import { signOutFromGoogle } from '../googleSignIn';
import { logout } from '../store';

/**
 * Cierre de sesión completo. Usar SIEMPRE esto en vez de despachar `logout()`
 * suelto, o quedan rastros del usuario anterior.
 *
 * Hace tres cosas:
 *  1. Cierra la sesión de Google (best-effort: si falla, seguimos igual).
 *  2. Borra token, usuario y estado de auth.
 *  3. Vacía la cache de RTK Query, para que el próximo usuario no vea datos
 *     del anterior.
 */
export function useLogout() {
  const dispatch = useAppDispatch();

  return useCallback(async () => {
    await signOutFromGoogle();
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());
  }, [dispatch]);
}
