import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { baseApi } from '@/services/api';
// Import del slice por su ruta profunda, NO del barrel `@/features/auth`:
// el barrel arrastra las screens, que a su vez importan este store → ciclo en runtime.
import { authReducer } from '@/features/auth/store';
// Mismo motivo que arriba: ruta profunda, no el barrel `@/features/mi`.
import { comprobanteReducer } from '@/features/mi/store';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    /**
     * El comprobante que llegó por la hoja de compartir y todavía no se subió
     * (`docs/compartir_comprobante.md`). Va en el store raíz y no adentro de una
     * pantalla porque tiene que sobrevivir al login: llega antes de que se sepa
     * si hay sesión.
     */
    comprobante: comprobanteReducer,
    // 👇 Los slices de cada feature se registran acá.
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Hooks tipados. Usar SIEMPRE estos, nunca `useDispatch`/`useSelector` crudos
 * de react-redux (perderías el tipado del state y del dispatch).
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
