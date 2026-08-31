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
    return { user: null, isAuthenticated: false };
  }
  return { user, isAuthenticated: true };
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

    /** Cierra la sesión y limpia todo rastro del usuario. */
    logout: (state) => {
      secureStorageService.removeToken(SecureStorageKeys.AUTH_TOKEN);
      storageService.remove(StorageKeys.USER);
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
