import { baseApi } from '@/services/api';
import {
  aCuerpoConComprobante,
  miCuentaSchema,
  miFacturaSchema,
  misAvisosPaginaSchema,
  misComprasSchema,
  misFacturasPaginaSchema,
  miAvisoDePagoSchema,
  type InformarPagoPayload,
  type ListarMisAvisosParams,
  type ListarMisFacturasParams,
  type MiAvisoDePago,
  type MiCuenta,
  type MiFactura,
  type MisAvisosPagina,
  type MisCompras,
  type MisFacturasPagina,
} from '../types';
import { MI_CUENTA, MIS_AVISOS, MIS_COMPRAS, MIS_DATOS, MIS_FACTURAS, miFacturaTag } from './tags';

/**
 * Endpoints de **lo mío** (`docs/user_cliente_flujo.md`), inyectados sobre el
 * `baseApi`.
 *
 * ⚠️ **Ninguna URL lleva un id de persona**, ni la va a llevar: el dueño sale
 * del token. Es lo único que hace imposible ver la cuenta de otro — sin
 * `:clienteId` no hay parámetro que manipular.
 *
 * Sirven para **cualquier rol**: un administrador que entre ve su propia cuenta,
 * que normalmente está vacía. No hay `403` de permisos acá.
 *
 * Todo es de lectura salvo avisar un pago, y **eso tampoco mueve plata**: deja
 * un aviso que alguien tiene que confirmar.
 */
export const miApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * El encabezado del inicio: cuánto debo, cuánto está vencido y cuándo vence
     * lo próximo (§4).
     *
     * Va **sin la lista de facturas** a propósito: son dos preguntas distintas
     * —"¿cómo estoy?" y "¿de qué está hecho?"— y la primera se responde con una
     * consulta agregada que no depende de ningún filtro ni de ninguna página.
     */
    getMiCuenta: builder.query<MiCuenta, void>({
      query: () => ({ url: '/mi/cuenta', method: 'GET' }),
      responseSchema: miCuentaSchema,
      providesTags: [
        { type: 'Factura', id: MI_CUENTA },
        { type: 'Factura', id: MIS_DATOS },
      ],
    }),

    /**
     * Mis facturas, la última primero, con filtros por estado y por **fecha de
     * emisión** (§5).
     *
     * ⚠️ **Los filtros filtran la lista, no lo que debo.** El resumen de
     * `/mi/cuenta` es siempre el de la cuenta entera: mirar solo las vencidas no
     * puede cambiar cuánto se debe. Lo que sí cambia es `total` y `paginas`.
     *
     * Cada combinación de filtros y página es una entrada de cache distinta, así
     * que volver a una ya vista no vuelve a pegarle a la API.
     */
    listarMisFacturas: builder.query<MisFacturasPagina, ListarMisFacturasParams | void>({
      query: (params) => ({
        url: '/mi/facturas',
        method: 'GET',
        // `fetchBaseQuery` omite los `undefined`, así que un filtro sin poner
        // simplemente no viaja.
        params: {
          estado: params?.estado,
          desde: params?.desde,
          hasta: params?.hasta,
          pagina: params?.pagina,
          limite: params?.limite,
          // Solo cuando se pide: mandar `soloImpagas=false` sería decir algo que
          // el resto de las pantallas no quiere decir.
          soloImpagas: params?.soloImpagas ? true : undefined,
        },
      }),
      responseSchema: misFacturasPaginaSchema,
      providesTags: (result) => [
        { type: 'Factura' as const, id: MIS_FACTURAS },
        { type: 'Factura' as const, id: MIS_DATOS },
        ...(result?.datos ?? []).map((factura) => ({
          type: 'Factura' as const,
          id: miFacturaTag(factura.id),
        })),
      ],
    }),

    /**
     * Una factura mía, con el detalle de lo que llevé y los cobros anotados (§6).
     *
     * La de otro devuelve **404**, el mismo que una que no existe: un `403` le
     * confirmaría a quien prueba ids que esa factura existe y es de alguien.
     */
    getMiFactura: builder.query<MiFactura, string>({
      query: (facturaId) => ({ url: `/mi/facturas/${facturaId}`, method: 'GET' }),
      responseSchema: miFacturaSchema,
      providesTags: (_result, _error, facturaId) => [
        { type: 'Factura', id: miFacturaTag(facturaId) },
        { type: 'Factura', id: MIS_DATOS },
      ],
    }),

    /**
     * Mis avisos de pago y en qué quedó cada uno (§9). El último primero.
     *
     * Es la pantalla que contesta *"avisé que pagué, ¿y?"*, y también la que
     * alimenta el renglón de "avisaste …, sin confirmar" del detalle de una
     * factura: se filtra por `factura.id` sobre los pendientes.
     */
    listarMisAvisos: builder.query<MisAvisosPagina, ListarMisAvisosParams | void>({
      query: (params) => ({
        url: '/mi/pagos-informados',
        method: 'GET',
        params: {
          estado: params?.estado,
          pagina: params?.pagina,
          limite: params?.limite,
        },
      }),
      responseSchema: misAvisosPaginaSchema,
      providesTags: [
        { type: 'Factura', id: MIS_AVISOS },
        { type: 'Factura', id: MIS_DATOS },
      ],
    }),

    /**
     * **Avisar que pagué** una factura (§8). Devuelve `201` con el aviso creado.
     *
     * ⚠️ **No descuenta nada.** Deja el aviso en la bandeja del panel y la deuda
     * baja recién cuando un administrador lo confirma contra el resumen del
     * banco. En la respuesta, `factura.saldo` sigue siendo el mismo: es la
     * confirmación de que la pantalla no tiene que descontar nada.
     *
     * Por eso invalida los avisos y el detalle de esa factura —que es donde se
     * ve el "avisaste …, sin confirmar"— y **no la cuenta**: la deuda no cambió,
     * y refrescarla mostraría el mismo número y haría parecer que falló (§12).
     */
    informarPago: builder.mutation<MiAvisoDePago, InformarPagoPayload>({
      /*
        Un endpoint, dos cuerpos (`docs/compartir_comprobante.md` §1). Con
        imagen sale `multipart/form-data`; sin imagen, el JSON de siempre. Al
        backend le da igual de dónde salió la foto.

        ⚠️ **Ninguno de los dos pone `Content-Type` a mano**, y no es un olvido:
        el multipart lo tiene que escribir el runtime para incluir el `boundary`.
        Forzarlo es la causa número uno del `400` de "falta el comprobante"
        (§4, trampa 2). `fetchBaseQuery` tampoco lo agrega solo: solo pone el de
        JSON cuando el body es un objeto plano, y un `FormData` no lo es.
      */
      query: ({ facturaId, datos, comprobante }) => ({
        url: `/mi/facturas/${facturaId}/informar-pago`,
        method: 'POST',
        body: comprobante ? aCuerpoConComprobante(datos, comprobante) : datos,
      }),
      responseSchema: miAvisoDePagoSchema,
      invalidatesTags: (_result, _error, { facturaId }) => [
        { type: 'Factura', id: MIS_AVISOS },
        { type: 'Factura', id: miFacturaTag(facturaId) },
      ],
    }),

    /**
     * **Qué compro** (§10): la mercadería que me llevo, por especie, de mayor a
     * menor plata.
     *
     * Trae también lo que **dejé de llevar** —en cero y con `parada`—: una lista
     * que solo muestra lo que se compra no puede mostrar lo que se dejó de
     * comprar.
     */
    getMisCompras: builder.query<MisCompras, void>({
      query: () => ({ url: '/mi/compras', method: 'GET' }),
      responseSchema: misComprasSchema,
      providesTags: [
        { type: 'Factura', id: MIS_COMPRAS },
        { type: 'Factura', id: MIS_DATOS },
      ],
    }),
  }),
});

export const {
  useGetMiCuentaQuery,
  useListarMisFacturasQuery,
  useGetMiFacturaQuery,
  useListarMisAvisosQuery,
  useInformarPagoMutation,
  useGetMisComprasQuery,
} = miApi;
