import { baseApi } from '@/services/api';
import {
  leidosSchema,
  miHiloSchema,
  miMensajeSchema,
  resumenDelHiloSchema,
  type EscribirMensajePayload,
  type ListarMensajesParams,
  type MiHilo,
  type MiMensaje,
  type ResumenDelHilo,
} from '../types';
import { MI_HILO, MI_RESUMEN } from './tags';

/**
 * **El chat del cliente con el local**, del lado del cliente.
 *
 * Ninguna de estas rutas lleva un id de persona ni un id de hilo, y no es un
 * descuido: **el hilo es la persona**, así que sale del token igual que todo lo
 * demás de `/mi`. Sin parámetro no hay parámetro que manipular.
 */
export const mensajesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * `GET /api/mi/mensajes` — el hilo, **del más nuevo al más viejo**.
     *
     * ⚠️ **Leerlo no lo marca leído.** Un `GET` que escribe hace que abrir la
     * pantalla sin querer vacíe el globito, y que un reintento de red cambie el
     * estado. Para eso está `leerMisMensajes`, que es un `POST`.
     */
    miHilo: builder.query<MiHilo, ListarMensajesParams | void>({
      query: (params) => ({
        url: '/mi/mensajes',
        method: 'GET',
        params: { pagina: params?.pagina, limite: params?.limite },
      }),
      responseSchema: miHiloSchema,
      providesTags: [{ type: 'Mensaje', id: MI_HILO }],
    }),

    /**
     * `GET /api/mi/mensajes/resumen` — cuántos me escribieron, sin traer nada.
     *
     * **Es el endpoint del refresco.** Dos lecturas baratas, pensadas para
     * preguntarlas cada tantos segundos: es lo que reemplaza al websocket que
     * este canal deliberadamente no tiene.
     */
    resumenDeMiHilo: builder.query<ResumenDelHilo, void>({
      query: () => ({ url: '/mi/mensajes/resumen', method: 'GET' }),
      responseSchema: resumenDelHiloSchema,
      providesTags: [{ type: 'Mensaje', id: MI_RESUMEN }],
    }),

    /**
     * `POST /api/mi/mensajes` — escribirle al local. **Solo texto.**
     *
     * Puede colgar de una factura o de un aviso de pago con `sobre`, para que
     * del otro lado no haya que preguntar *"¿cuál pago?"*. Eso tiene que ser
     * suyo: mandar la factura de otro es un `400`.
     *
     * Los dos errores que la pantalla tiene que saber leer, porque **no son
     * fallas y traen un texto ya redactado para mostrar**:
     *
     * - **`429`** — escribió muy seguido (diez por minuto) o acumuló treinta
     *   mensajes sin que nadie los mire.
     * - **`403`** — el local cortó este canal.
     */
    escribirMensaje: builder.mutation<MiMensaje, EscribirMensajePayload>({
      query: (payload) => ({
        url: '/mi/mensajes',
        method: 'POST',
        body: { texto: payload.texto, sobre: payload.sobre },
      }),
      responseSchema: miMensajeSchema,
      /**
       * Invalida el resumen además del hilo: `silenciada` sale de los dos, y sin
       * esto quedaría diciendo que se puede escribir después del `403` que dice
       * que no.
       */
      invalidatesTags: [
        { type: 'Mensaje', id: MI_HILO },
        { type: 'Mensaje', id: MI_RESUMEN },
      ],
    }),

    /**
     * `POST /api/mi/mensajes/leidos` — marca leídos los del local.
     *
     * Idempotente: la segunda vez devuelve `0`, que es la respuesta correcta y
     * no un error.
     *
     * ⚠️ Invalida también **la campanita**: el backend publica un aviso por cada
     * mensaje del local, y dejar ese aviso sin leer después de haber leído el
     * mensaje deja dos números contando lo mismo y en desacuerdo.
     */
    leerMisMensajes: builder.mutation<{ leidos: number }, void>({
      query: () => ({ url: '/mi/mensajes/leidos', method: 'POST' }),
      responseSchema: leidosSchema,
      invalidatesTags: [
        { type: 'Mensaje', id: MI_HILO },
        { type: 'Mensaje', id: MI_RESUMEN },
        { type: 'Notificacion', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useMiHiloQuery,
  useLazyMiHiloQuery,
  useResumenDeMiHiloQuery,
  useEscribirMensajeMutation,
  useLeerMisMensajesMutation,
} = mensajesApi;
