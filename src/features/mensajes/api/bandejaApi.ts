import { baseApi } from '@/services/api';
import {
  conversacionSchema,
  hiloDelPanelSchema,
  leidosSchema,
  listaConversacionesSchema,
  mensajeDelPanelSchema,
  resumenDeLaBandejaSchema,
  type Conversacion,
  type EscribirDelPanelPayload,
  type HiloDelPanel,
  type ListarConversacionesParams,
  type ListarMensajesParams,
  type ListaConversaciones,
  type MensajeDelPanel,
  type ResumenDeLaBandeja,
  type SilenciarPayload,
} from '../types';
import { BANDEJA, hiloDelPanelTag } from './tags';

/** El hilo de un cliente, del lado del panel. */
type HiloDelPanelParams = ListarMensajesParams & { clienteId: string };

/**
 * **La bandeja de mensajes del panel**, el otro lado de `/mi/mensajes`.
 *
 * Acá sí hay `:clienteId` en la URL, por lo mismo que en el resto de `/admin`:
 * el administrador elige de quién habla.
 *
 * ⚠️ **La bandeja es compartida.** Si un administrador lee un hilo, queda leído
 * para todos — igual que la bandeja de avisos de pago, y por el mismo motivo:
 * quién atiende depende del día, y un hilo que sigue en negrita para el otro es
 * una invitación a contestar dos veces lo mismo. De ahí sale `leidoPor`.
 */
export const bandejaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * `GET /api/admin/mensajes` — un renglón por cliente que escribió alguna
     * vez, el más reciente arriba.
     *
     * `q` busca por **nombre, correo o documento del cliente**, nunca por el
     * texto de los mensajes: buscar adentro de conversaciones ajenas es otra
     * cosa y el backend no lo ofrece.
     */
    listarConversaciones: builder.query<ListaConversaciones, ListarConversacionesParams | void>({
      query: (params) => ({
        url: '/admin/mensajes',
        method: 'GET',
        params: {
          q: params?.q,
          // `undefined` no viaja: sin la pestaña puesta, la query sale limpia.
          soloSinLeer: params?.soloSinLeer ? true : undefined,
          pagina: params?.pagina,
          limite: params?.limite,
        },
      }),
      responseSchema: listaConversacionesSchema,
      providesTags: [{ type: 'Mensaje', id: BANDEJA }],
    }),

    /**
     * `GET /api/admin/mensajes/resumen` — el número del globito, sin la lista.
     *
     * Igual que el del cliente: es el endpoint del refresco, dos conteos
     * indexados pensados para preguntarlos cada tantos segundos.
     */
    resumenDeLaBandeja: builder.query<ResumenDeLaBandeja, void>({
      query: () => ({ url: '/admin/mensajes/resumen', method: 'GET' }),
      responseSchema: resumenDeLaBandejaSchema,
      providesTags: [{ type: 'Mensaje', id: BANDEJA }],
    }),

    /** `GET /api/admin/mensajes/:clienteId` — el hilo. **Leerlo no lo marca leído.** */
    hiloDelPanel: builder.query<HiloDelPanel, HiloDelPanelParams>({
      query: ({ clienteId, pagina, limite }) => ({
        url: `/admin/mensajes/${clienteId}`,
        method: 'GET',
        params: { pagina, limite },
      }),
      responseSchema: hiloDelPanelSchema,
      providesTags: (_resultado, _error, { clienteId }) => [
        { type: 'Mensaje', id: hiloDelPanelTag(clienteId) },
      ],
    }),

    /**
     * `POST /api/admin/mensajes/:clienteId` — contestarle, o empezar el hilo.
     *
     * Sirve para las dos cosas: si no había conversación, se crea con este
     * mensaje. Un id que no es de un cliente da `404` — a otro administrador no
     * se le escribe por acá.
     */
    escribirDelPanel: builder.mutation<MensajeDelPanel, EscribirDelPanelPayload>({
      query: ({ clienteId, texto, sobre }) => ({
        url: `/admin/mensajes/${clienteId}`,
        method: 'POST',
        body: { texto, sobre },
      }),
      responseSchema: mensajeDelPanelSchema,
      /**
       * Invalida la bandeja además del hilo: contestar cambia el adelanto y
       * sube ese renglón al tope de la lista.
       */
      invalidatesTags: (_resultado, _error, { clienteId }) => [
        { type: 'Mensaje', id: hiloDelPanelTag(clienteId) },
        { type: 'Mensaje', id: BANDEJA },
      ],
    }),

    /**
     * `POST /api/admin/mensajes/:clienteId/leidos` — marca leído lo del cliente
     * y anota quién lo miró.
     *
     * ⚠️ También invalida **la campanita**: el aviso de "te escribió" le llegó a
     * todos los administradores, y leer el hilo es exactamente lo que ese aviso
     * pedía que se hiciera.
     */
    leerDelPanel: builder.mutation<{ leidos: number }, string>({
      query: (clienteId) => ({
        url: `/admin/mensajes/${clienteId}/leidos`,
        method: 'POST',
      }),
      responseSchema: leidosSchema,
      invalidatesTags: (_resultado, _error, clienteId) => [
        { type: 'Mensaje', id: hiloDelPanelTag(clienteId) },
        { type: 'Mensaje', id: BANDEJA },
        { type: 'Notificacion', id: 'LIST' },
      ],
    }),

    /**
     * `POST /api/admin/mensajes/:clienteId/silenciar` — cortarle la palabra, o
     * devolvérsela.
     *
     * ⚠️ **No borra ni oculta nada.** El hilo se sigue viendo y desde el panel
     * se le puede seguir escribiendo: lo que corta es que **él** escriba. Es
     * importante que la pantalla lo diga así, porque "silenciar" suena a
     * bloquear y no lo es.
     */
    silenciarConversacion: builder.mutation<Conversacion, SilenciarPayload>({
      query: ({ clienteId, silenciar }) => ({
        url: `/admin/mensajes/${clienteId}/silenciar`,
        method: 'POST',
        body: { silenciar },
      }),
      responseSchema: conversacionSchema,
      invalidatesTags: (_resultado, _error, { clienteId }) => [
        { type: 'Mensaje', id: hiloDelPanelTag(clienteId) },
        { type: 'Mensaje', id: BANDEJA },
      ],
    }),
  }),
});

export const {
  useListarConversacionesQuery,
  useLazyHiloDelPanelQuery,
  useResumenDeLaBandejaQuery,
  useHiloDelPanelQuery,
  useEscribirDelPanelMutation,
  useLeerDelPanelMutation,
  useSilenciarConversacionMutation,
} = bandejaApi;
