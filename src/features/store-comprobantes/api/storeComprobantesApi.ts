import { baseApi } from '@/services/api';
import { AVISOS_DE_PAGO } from '@/features/avisos-de-pago';
import {
  consumoDelStoreSchema,
  limpiezaHechaSchema,
  listaDeComprobantesSchema,
  vistaPreviaDeLimpiezaSchema,
  type ConsumoDelStore,
  type CriterioDeLimpieza,
  type LimpiezaHecha,
  type BorrarSeleccionPayload,
  type LimpiezaPayload,
  type ListaDeComprobantes,
  type ListarComprobantesParams,
  type VistaPreviaDeLimpieza,
} from '../types';
import { COMPROBANTES_DEL_STORE, CONSUMO_DEL_STORE } from './tags';

/**
 * El panel del store (`MORGANA-BACK/docs/flujo_comprobantes.md` §5).
 *
 * Los cinco son **solo de administración**: el backend los tiene detrás de
 * `@Roles('administrador', 'super_admin')`.
 *
 * ⚠️ Dos de estos **borran archivos y no se puede deshacer**. Las guardas viven
 * en el backend —`confirmo`, el mínimo de 30 días, los pendientes protegidos, el
 * `409` si el número cambió— y este archivo no las esquiva: manda lo que ellas
 * piden.
 */
export const storeComprobantesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * **Cuánto ocupa el store**, por los dos lados: lo que subió esta app y el
     * estado real de la cuenta de Cloudinary.
     *
     * ⚠️ `cuenta` puede venir en `null` —store sin configurar, o la API que no
     * contestó— y la pantalla sigue mostrando `propio` igual.
     */
    getConsumoDelStore: builder.query<ConsumoDelStore, void>({
      query: () => ({ url: '/admin/comprobantes/consumo', method: 'GET' }),
      responseSchema: consumoDelStoreSchema,
      providesTags: [{ type: 'Factura', id: CONSUMO_DEL_STORE }],
    }),

    /**
     * Los comprobantes, **el más viejo primero**: es una pantalla para tirar
     * cosas, y lo primero que se mira es lo primero que se va.
     */
    listarComprobantesDelStore: builder.query<ListaDeComprobantes, ListarComprobantesParams | void>(
      {
        query: (params) => ({
          url: '/admin/comprobantes',
          method: 'GET',
          params: {
            antiguedad: params?.antiguedad,
            anterioresA: params?.anterioresA,
            estado: params?.estado,
            // El backend lo valida como texto (`IsBooleanString`), así que va como
            // 'true' y no como booleano. Solo cuando se pide: mandar 'false' sería
            // decir algo que el default ya dice.
            incluirBorrados: params?.incluirBorrados ? 'true' : undefined,
            pagina: params?.pagina,
            limite: params?.limite,
          },
        }),
        responseSchema: listaDeComprobantesSchema,
        providesTags: [{ type: 'Factura', id: COMPROBANTES_DEL_STORE }],
      },
    ),

    /**
     * **Qué se va a llevar la limpieza, sin llevarse nada.**
     *
     * Es `POST` y no `GET` porque toma **exactamente el mismo body** que el
     * borrado: se manda el mismo objeto a las dos rutas, así que no hay una
     * traducción a query string que pueda hacer que el cartel diga una cosa y el
     * borrado haga otra.
     *
     * No invalida nada: no cambió nada.
     */
    vistaPreviaDeLimpieza: builder.mutation<VistaPreviaDeLimpieza, CriterioDeLimpieza>({
      query: (criterio) => ({
        url: '/admin/comprobantes/limpiar/vista-previa',
        method: 'POST',
        body: criterio,
      }),
      responseSchema: vistaPreviaDeLimpiezaSchema,
    }),

    /**
     * **Borrar de verdad. No se puede deshacer.**
     *
     * Se lleva hasta 500 por pasada y contesta `restan`: mientras sea mayor que
     * cero, se aprieta de nuevo. Es idempotente, así que repetir el criterio no
     * borra de más — la segunda vez da `borrados: 0`.
     *
     * Invalida las tres cosas que cambiaron: cuánto ocupa, el listado, y **la
     * bandeja de avisos** —los avisos siguen ahí pero sus imágenes ya no, y sin
     * esto la bandeja mostraría miniaturas de archivos que no existen—.
     */
    limpiarStore: builder.mutation<LimpiezaHecha, LimpiezaPayload>({
      query: (payload) => ({
        url: '/admin/comprobantes/limpiar',
        method: 'POST',
        body: payload,
      }),
      responseSchema: limpiezaHechaSchema,
      invalidatesTags: [
        { type: 'Factura', id: CONSUMO_DEL_STORE },
        { type: 'Factura', id: COMPROBANTES_DEL_STORE },
        { type: 'Factura', id: AVISOS_DE_PAGO },
      ],
    }),

    /**
     * **Borrar los que se tildaron en la lista.** Hasta 100 por vez.
     *
     * Es el punto medio entre los otros dos: `limpiar` borra **por criterio y a
     * ciegas** —de ahí su vista previa y sus guardas—, y el `DELETE` borra el
     * que se está mirando. Esto borra **una lista explícita**, que es lo que
     * hace una pantalla con casillas.
     *
     * Va **sin `confirmo` y sin antigüedad mínima**, al revés que la limpieza
     * por criterio: enumerar los ids uno por uno ya es la confirmación. Las
     * guardas de aquella existen porque ahí un criterio mal escrito se lleva
     * puesto un mes entero sin que nadie lo vea venir.
     *
     * ⚠️ **Si hay un pendiente en la selección, falla entera y no borra nada**,
     * diciendo cuántos son. Es a propósito: saltearlos y borrar el resto dejaría
     * a alguien viendo "borrados: 9" de 12 sin forma de saber cuáles quedaron.
     *
     * Los ya borrados y los ids que no existen **se saltean y no son un error**,
     * así que reintentar la misma selección es seguro.
     */
    borrarSeleccion: builder.mutation<LimpiezaHecha, BorrarSeleccionPayload>({
      query: (payload) => ({
        url: '/admin/comprobantes/borrar',
        method: 'POST',
        body: payload,
      }),
      responseSchema: limpiezaHechaSchema,
      invalidatesTags: [
        { type: 'Factura', id: CONSUMO_DEL_STORE },
        { type: 'Factura', id: COMPROBANTES_DEL_STORE },
        { type: 'Factura', id: AVISOS_DE_PAGO },
      ],
    }),

    /**
     * Borrar **uno solo**, el que se está mirando.
     *
     * Sin confirmación y sin mínimo de antigüedad: las guardas del masivo existen
     * porque ahí no se ve lo que se borra. Acá sí.
     *
     * ⚠️ Uno ya borrado devuelve `200` con todo en cero, no un error: no hay nada
     * que hacer, que es distinto de que algo haya salido mal.
     */
    borrarComprobante: builder.mutation<LimpiezaHecha, string>({
      query: (avisoId) => ({ url: `/admin/comprobantes/${avisoId}`, method: 'DELETE' }),
      responseSchema: limpiezaHechaSchema,
      invalidatesTags: [
        { type: 'Factura', id: CONSUMO_DEL_STORE },
        { type: 'Factura', id: COMPROBANTES_DEL_STORE },
        { type: 'Factura', id: AVISOS_DE_PAGO },
      ],
    }),
  }),
});

export const {
  useGetConsumoDelStoreQuery,
  useListarComprobantesDelStoreQuery,
  useVistaPreviaDeLimpiezaMutation,
  useLimpiarStoreMutation,
  useBorrarSeleccionMutation,
  useBorrarComprobanteMutation,
} = storeComprobantesApi;
