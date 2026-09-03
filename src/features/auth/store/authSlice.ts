import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  secureStorageService,
  storageService,
  SecureStorageKeys,
  StorageKeys,
} from '@/services/storage';
import type { AuthResponse, User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /**
   * Por qué se terminó la sesión, cuando no la cerró la persona.
   *
   * Hoy es uno solo: la cuenta **dada de baja**
   * (`docs/README_FRONT_BAJA_DE_CUENTA.md` §5). El texto lo escribe el backend y
   * se muestra tal cual en el login — sin esto, alguien con la app abierta en
   * otro teléfono se encontraría de golpe en la pantalla de ingreso sin ninguna
   * explicación.
   *
   * **No se persiste**: es un aviso para este arranque, no un estado de la
   * cuenta. Al reabrir la app ya no tiene sentido.
   */
  motivoDeSalida: string | null;
}

/**
 * Estado inicial leído del storage. MMKV es síncrono, así que al arrancar la app
 * ya sabemos si hay sesión: no hace falta una pantalla de carga intermedia.
 *
 * El TOKEN no vive en Redux (quedaría expuesto en devtools y en cualquier dump
 * del state). Vive solo en el storage encriptado y lo inyecta el `baseApi` en
 * cada request.
 */
function getInitialState(): AuthState {
  const token = secureStorageService.getToken(SecureStorageKeys.AUTH_TOKEN);
  const user = storageService.get<User>(StorageKeys.USER);

  // Sin token no hay sesión válida, aunque haya quedado un usuario cacheado.
  if (!token) {
    return { user: null, isAuthenticated: false, motivoDeSalida: null };
  }
  return { user, isAuthenticated: true, motivoDeSalida: null };
}

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    /** Guarda la sesión tras un login/registro exitoso. */
    setCredentials: (state, action: PayloadAction<AuthResponse>) => {
      const { user, token } = action.payload;
      secureStorageService.setToken(SecureStorageKeys.AUTH_TOKEN, token);
      storageService.set(StorageKeys.USER, user);
      state.user = user;
      state.isAuthenticated = true;
      // Entró: el cartel del intento anterior ya no explica nada.
      state.motivoDeSalida = null;
    },

    /**
     * Refresca los datos del usuario SIN tocar el token. Lo usa `useSyncSession`
     * con lo que devuelve `GET /users/me`.
     *
     * Existe aparte de `setCredentials` porque los permisos pueden cambiar del
     * otro lado mientras la sesión sigue viva: el token guardado puede tener
     * horas y seguir siendo válido con otros permisos detrás.
     *
     * Si no hay sesión no hace nada: sin token, un usuario en el state sería una
     * sesión fantasma que la app trataría como válida.
     */
    setUser: (state, action: PayloadAction<User>) => {
      if (!state.isAuthenticated) {
        return;
      }
      storageService.set(StorageKeys.USER, action.payload);
      state.user = action.payload;
    },

    /**
     * Cierra la sesión y limpia todo rastro del usuario.
     *
     * El `motivo` es **opcional y solo para las salidas que no pidió la
     * persona**: hoy, la cuenta dada de baja desde otro teléfono
     * (`docs/README_FRONT_BAJA_DE_CUENTA.md` §5). El texto lo manda el backend y
     * se muestra tal cual en el login. Un logout normal no lleva nada y el
     * cartel no aparece.
     */
    logout: (state, action: PayloadAction<string | undefined>) => {
      secureStorageService.removeToken(SecureStorageKeys.AUTH_TOKEN);
      storageService.remove(StorageKeys.USER);
      state.user = null;
      state.isAuthenticated = false;
      state.motivoDeSalida = action.payload ?? null;
    },

    /** Baja el cartel del login una vez leído. */
    limpiarMotivoDeSalida: (state) => {
      state.motivoDeSalida = null;
    },
  },
});

export const { setCredentials, setUser, logout, limpiarMotivoDeSalida } = authSlice.actions;
export const authReducer = authSlice.reducer;
