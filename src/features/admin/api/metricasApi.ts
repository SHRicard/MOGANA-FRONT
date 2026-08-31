import { baseApi } from '@/services/api';
import {
  productosGlobalesSchema,
  tendenciaDeCompraSchema,
  type ProductosGlobales,
  type ProductosParams,
  type TendenciaDeCompra,
  type TendenciaParams,
} from '../mercaderia';
import {
  fichaClienteSchema,
  metricasClientesPaginaSchema,
  metricasSchema,
  ticketSchema,
  ticketsMesesSchema,
  type FichaCliente,
  type Metricas,
  type MetricasClientesPagina,
  type MetricasClientesParams,
  type MetricasParams,
  type Ticket,
  type TicketsMeses,
} from '../types';

/**
 * Las métricas del panel (`docs/flujo_metricas.md`). **Un solo endpoint trae la
 * pantalla entera**: seis agregados que el backend corre juntos en una
 * transacción, así que ninguno puede contradecir al otro por un pago que entre
 * en el medio.
 *
 * Solo administrador y super admin: al cliente le contesta `403`.
 */
export const metricasApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** `GET /api/admin/metricas` — sin `mes`, el mes en curso. */
    getMetricas: builder.query<Metricas, MetricasParams | void>({
      query: (params) => ({
        url: '/admin/metricas',
        method: 'GET',
        // `undefined` no viaja: sin mes, la query sale limpia y la API elige.
        params: { mes: params?.mes },
      }),
      responseSchema: metricasSchema,
      /**
       * Se cuelga del tag de las facturas —el mismo que invalidan cobrar, anular
       * y emitir— porque **eso es exactamente lo que mueve estos números**.
       * Registrar un pago y encontrarse el tablero al día pero las métricas
       * viejas sería peor que no tenerlas.
       */
      providesTags: [{ type: 'Factura', id: 'LIST' }],
    }),

    /**
     * `GET /api/admin/metricas/clientes` — la misma pregunta, **uno por uno**.
     *
     * El orden y el corte de página los hace **la base**, no el front: si se
     * ordenara después de traer la página, "los 20 que peor pagan" serían "los
     * que peor pagan de los 20 primeros".
     *
     * Solo trae clientes con **al menos una factura**: sin historial no hay nada
     * que medir.
     */
    listarMetricasClientes: builder.query<MetricasClientesPagina, MetricasClientesParams | void>({
      query: (params) => ({
        url: '/admin/metricas/clientes',
        method: 'GET',
        params: {
          // `undefined` no viaja: sin búsqueda, la query sale limpia.
          q: params?.q || undefined,
          orden: params?.orden,
          pagina: params?.pagina,
          limite: params?.limite,
        },
      }),
      responseSchema: metricasClientesPaginaSchema,
      /** Mismo tag que arriba: cobrar o anular también mueve estos números. */
      providesTags: [{ type: 'Factura', id: 'LIST' }],
    }),

    /**
     * `GET /api/admin/metricas/clientes/:id` — la ficha de un cliente
     * (`docs/flujo_metricas_cliente.md`): **"¿qué clase de cliente es este?"**.
     *
     * Sale de **la misma consulta que el listado**, acotada a un cliente, más un
     * agregado aparte para los reembolsos. Eso no es una optimización: es lo que
     * garantiza que la lista y la ficha no puedan decir números distintos del
     * mismo cliente.
     *
     * Un `404` es que no existe **o que no es un cliente**: pedir la ficha de un
     * administrador no devuelve nada. Un cliente que existe y todavía no compró
     * **no es un 404**: la ficha viene igual, con todo en cero y en `null`.
     *
     * Se cuelga de los tags del cliente y no del `LIST` general: lo que mueve
     * estos números es lo que le pasa a ÉL —un cobro, una factura nueva, una
     * anulación, el corte del fiado—, y todos invalidan `CLIENTE-<id>`. Con el
     * `LIST` volvería a pedirse cada vez que se cobra en la otra punta del
     * negocio.
     */
    getFichaCliente: builder.query<FichaCliente, string>({
      query: (clienteId) => ({ url: `/admin/metricas/clientes/${clienteId}`, method: 'GET' }),
      responseSchema: fichaClienteSchema,
      providesTags: (_result, _error, clienteId) => [
        { type: 'Factura', id: `CLIENTE-${clienteId}` },
        // El fiado y el DNI se cambian desde la ficha de usuarios, que invalida
        // este tag: los dos se muestran acá arriba.
        { type: 'User', id: clienteId },
      ],
    }),

    /**
     * `GET /api/admin/metricas/tendencia` — **qué se llevan**, mes a mes
     * (`docs/flujo_metricas.md` §5).
     *
     * La única pantalla que no mira la plata sino la mercadería: dos meses de
     * $500.000 pueden ser el mismo negocio o dos negocios distintos, y la
     * facturación sola no lo puede decir.
     *
     * **El default es un año** y no es un capricho: en un negocio estacional,
     * seis meses mirados desde agosto son seis meses de caída sin un solo mes de
     * verano contra el cual leerlos.
     */
    getTendencia: builder.query<TendenciaDeCompra, TendenciaParams | void>({
      query: (params) => ({
        url: '/admin/metricas/tendencia',
        method: 'GET',
        // `undefined` no viaja: sin params, la API elige el mes en curso y doce
        // meses de ventana.
        params: { mes: params?.mes, meses: params?.meses, orden: params?.orden },
      }),
      responseSchema: tendenciaDeCompraSchema,
      /**
       * Se cuelga de las facturas **y del catálogo**: una factura nueva mueve
       * las unidades, y renombrar una especie cambia el nombre de un renglón.
       */
      providesTags: [
        { type: 'Factura', id: 'LIST' },
        { type: 'Especie', id: 'LIST' },
      ],
    }),

    /**
     * `GET /api/admin/metricas/productos` — de todo lo que se vende, **qué
     * manda y qué no se vende** (`docs/flujo_metricas.md` §6).
     *
     * ⚠️ Arranca en el **catálogo** y no en las ventas, así que trae también las
     * especies que nadie compró nunca: el catálogo muerto es justamente lo que
     * hay que dejar de comprarle al proveedor, y no aparece en ninguna otra
     * pantalla.
     */
    getProductosGlobales: builder.query<ProductosGlobales, ProductosParams | void>({
      query: (params) => ({
        url: '/admin/metricas/productos',
        method: 'GET',
        params: { desde: params?.desde, hasta: params?.hasta, orden: params?.orden },
      }),
      responseSchema: productosGlobalesSchema,
      providesTags: [
        { type: 'Factura', id: 'LIST' },
        { type: 'Especie', id: 'LIST' },
      ],
    }),

    /**
     * `GET /api/admin/metricas/tickets` — el índice de meses (§5.1).
     *
     * **Sin parámetros y sin paginado**: son doce por año, y cortarlos en
     * páginas obligaría a pedir de nuevo para dibujar tres años. Es **una sola**
     * consulta, con las sumas acumuladas resueltas en la base.
     */
    listarTicketsMeses: builder.query<TicketsMeses, void>({
      query: () => ({ url: '/admin/metricas/tickets', method: 'GET' }),
      responseSchema: ticketsMesesSchema,
      /** Mismo tag: un cobro nuevo cambia la deuda al cierre de todos los meses. */
      providesTags: [{ type: 'Factura', id: 'LIST' }],
    }),

    /**
     * `GET /api/admin/metricas/tickets/2026-07` — la foto de un mes (§5.2).
     *
     * ⚠️ **Un ticket no se guarda: se calcula.** No hay tabla de tickets ni un
     * cierre que alguien ejecute a fin de mes, así que **un mes cerrado puede
     * cambiar**: si se anula una factura de julio, el ticket de julio dice otra
     * cosa. Muestra lo que **hoy se sabe** de julio, no lo que se creía el 31.
     *
     * Un mes que todavía no pasó es `400` con el texto ya redactado por la API.
     */
    getTicketDelMes: builder.query<Ticket, string>({
      query: (mes) => ({ url: `/admin/metricas/tickets/${mes}`, method: 'GET' }),
      responseSchema: ticketSchema,
      providesTags: [{ type: 'Factura', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetMetricasQuery,
  useListarMetricasClientesQuery,
  useGetFichaClienteQuery,
  useGetTendenciaQuery,
  useGetProductosGlobalesQuery,
  useListarTicketsMesesQuery,
  useGetTicketDelMesQuery,
} = metricasApi;
