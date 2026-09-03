import type { RootState } from '@/store';
import { estaBloqueado } from '../types';
import type { Rol } from '../types';

export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectCurrentUser = (state: RootState) => state.auth.user;

/**
 * Rol del usuario logueado, o `null` si no hay sesión **o si el backend mandó
 * uno que la app no conoce** (lo acota `toRol` al normalizar el usuario).
 *
 * **Es lo único que decide qué se ve** (`docs/s.roles.md`): el array
 * `permissions` ya no existe. Quien lo consume trata el `null` como el mínimo
 * privilegio.
 */
export const selectRol = (state: RootState): Rol | null => state.auth.user?.rol ?? null;

/**
 * `true` si esta sesión tiene que completar el perfil antes de poder usar la app
 * (`docs/flujo_login.md`).
 *
 * Es lo que lee el `RootNavigator` para decidir **antes que el rol**: el bloqueo
 * no distingue entre cliente y administrador, así que se pregunta primero.
 */
export const selectEstaBloqueado = (state: RootState): boolean => estaBloqueado(state.auth.user);

/** El texto del bloqueo que mandó el backend, para mostrarlo tal cual. */
export const selectMotivoBloqueo = (state: RootState): string | null =>
  state.auth.user?.motivoBloqueo ?? null;

/**
 * Por qué se terminó la sesión sin que la persona la cerrara, o `null`.
 *
 * Hoy es el mensaje de la **cuenta dada de baja**
 * (`docs/README_FRONT_BAJA_DE_CUENTA.md` §5), escrito por el backend y para
 * mostrarse tal cual. Lo lee el login.
 */
export const selectMotivoDeSalida = (state: RootState) => state.auth.motivoDeSalida;
