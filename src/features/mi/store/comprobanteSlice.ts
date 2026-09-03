import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { storageService, StorageKeys } from '@/services/storage';
import type { ComprobanteCompartido } from '@/services/share';

/**
 * Cuánto vive un comprobante compartido sin subir
 * (`docs/compartir_comprobante.md` §5.1).
 *
 * El doc pide un vencimiento y dice por qué: *"un comprobante viejo apareciendo
 * tres días después confunde más de lo que ayuda"*. Veinticuatro horas alcanzan
 * para cubrir el caso real —compartir, tener que loguearse, dejarlo para más
 * tarde— sin llegar a eso.
 *
 * Es el mismo plazo con el que el módulo nativo limpia las copias del disco: si
 * fueran distintos, uno de los dos lados quedaría apuntando a un archivo que el
 * otro ya borró.
 */
export const VENCIMIENTO_PENDIENTE_MS = 24 * 60 * 60 * 1000;

interface ComprobanteState {
  /**
   * Lo compartido y todavía sin mandar. Uno solo: el backend acepta **un**
   * comprobante por aviso, así que una cola sería prometer algo que no existe.
   */
  pendiente: ComprobanteCompartido | null;
}

/** `true` si el comprobante todavía sirve. */
function vigente(comprobante: ComprobanteCompartido, ahora: number): boolean {
  return ahora - comprobante.recibidoEn < VENCIMIENTO_PENDIENTE_MS;
}

/**
 * Se rehidrata del storage al arrancar. MMKV es síncrono, así que la app ya sabe
 * en el primer render si hay algo esperando: sin eso haría falta una pantalla de
 * carga intermedia justo en el momento en que el cliente viene de otra app y
 * quiere ver que su captura llegó.
 */
function getInitialState(): ComprobanteState {
  const guardado = storageService.get<ComprobanteCompartido>(StorageKeys.COMPROBANTE_PENDIENTE);

  if (!guardado || !vigente(guardado, Date.now())) {
    // Un pendiente vencido se borra en el arranque y no se arrastra: el archivo
    // que apuntaba ya lo limpió el nativo con el mismo plazo.
    if (guardado) {
      storageService.remove(StorageKeys.COMPROBANTE_PENDIENTE);
    }
    return { pendiente: null };
  }
  return { pendiente: guardado };
}

const comprobanteSlice = createSlice({
  name: 'comprobante',
  initialState: getInitialState(),
  reducers: {
    /**
     * Llegó una imagen por la hoja de compartir.
     *
     * **Se guarda antes de mirar la sesión** (§5.1): si primero se mandara al
     * login y la imagen se descartara en el camino, el cliente tendría que
     * volver a Mercado Pago y compartir de nuevo — y ahí ya se perdió el flujo
     * entero, que es justo lo que este apartado viene a evitar.
     */
    comprobanteRecibido: (state, action: PayloadAction<ComprobanteCompartido>) => {
      storageService.set(StorageKeys.COMPROBANTE_PENDIENTE, action.payload);
      state.pendiente = action.payload;
    },

    /**
     * Se terminó con este comprobante: se subió, o el cliente lo descartó.
     *
     * ⚠️ **Recién después del `201`**, nunca antes (§7). Borrarlo al abrir la
     * pantalla dejaría al cliente sin nada si el envío falla o si se va y vuelve.
     */
    comprobanteConsumido: (state) => {
      storageService.remove(StorageKeys.COMPROBANTE_PENDIENTE);
      state.pendiente = null;
    },
  },
});

export const { comprobanteRecibido, comprobanteConsumido } = comprobanteSlice.actions;
export const comprobanteReducer = comprobanteSlice.reducer;
