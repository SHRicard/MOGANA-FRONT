import { z } from 'zod';
import { baseApi } from '@/services/api';
import {
  clientesFacturadosPaginaSchema,
  cuentaClienteSchema,
  facturaSchema,
  type AnularFacturaPayload,
  type BorrarPagoPayload,
  type ClientesFacturadosPagina,
  type CuentaCliente,
  type CuentaClienteParams,
  type Factura,
  type ListarClientesConFacturasParams,
  type NuevaFacturaPayload,
  type RegistrarPagoPayload,
  type ReembolsoPayload,
} from '../types';

/**
 * Endpoints de facturación, inyectados sobre el `baseApi` (`docs/flujo_pagos.md`).
 *
 * Cuelgan de `/admin`: los usan el `administrador` y el `super_admin`. Un
 * `cliente` que llegue acá se lleva un `403` — que sería un bug de la app, no
 * un caso de uso.
 */
export const facturasApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * El tablero: **un renglón por cliente, con su cuenta entera**
     * (`docs/flujo_pagos.md` §3). No es una lista de facturas: es la lista de a
     * quién hay que cobrarle, cuánto y desde cuándo, ordenada por urgencia.
     *
     * El sobre trae además `totales` —deuda, vencido y por vencer— del **filtro
     * entero**, no de la página: es el encabezado de la pantalla sin pedir nada
     * más.
     *
     * Los clientes sin ninguna factura no aparecen — el listado completo sigue
     * siendo `GET /admin/clientes`. Sin facturas, o si el filtro no encuentra
     * nada, llega `200` con `datos: []`: esa es la pantalla vacía, no un error.
     *
     * **Filtra y pagina la base**, no el front: `total` y `paginas` ya cuentan
     * lo filtrado. Está pensado para llamarse mientras la persona tipea, con
     * debounce del lado del hook; cada combinación de filtros es una entrada de
     * cache distinta, así que volver a una ya vista no vuelve a pegarle a la API.
     */
    listarClientesConFacturas: builder.query<
      ClientesFacturadosPagina,
      ListarClientesConFacturasParams | void
    >({
      query: (params) => ({
        url: '/admin/clientes-con-facturas',
        method: 'GET',
        // `fetchBaseQuery` omite los `undefined` del query string, así que no
        // hace falta limpiarlos a mano. El `|| undefined` del `q` es para que un
        // texto vacío no viaje como `q=`.
        params: {
          q: params?.q || undefined,
          estado: params?.estado,
          pagina: params?.pagina,
          limite: params?.limite,
        },
      }),
      responseSchema: clientesFacturadosPaginaSchema,
      providesTags: (result) => [
        { type: 'Factura' as const, id: 'LIST' },
        ...(result?.datos ?? []).map((fila) => ({
          type: 'Factura' as const,
          id: `CLIENTE-${fila.clienteId}`,
        })),
      ],
    }),

    /**
     * Emitir una factura. **El cliente va en la URL** y los items en el body:
     * así no hay forma de que termine en otra cuenta.
     *
     * ⚠️ El body no lleva `subtotal` ni `total`: los calcula el backend y un
     * campo de más es `400` (ver `aNuevaFacturaPayload`).
     *
     * Un `404` acá también significa que ese id es de un administrador: en este
     * apartado solo existen los clientes.
     *
     * Invalida el tablero —le cambió la deuda y con eso su lugar en el orden— y
     * la cuenta de ese cliente, que es de donde suele venir.
     */
    crearFactura: builder.mutation<Factura, NuevaFacturaPayload>({
      query: ({ clienteId, datos }) => ({
        url: `/admin/clientes/${clienteId}/facturas`,
        method: 'POST',
        body: datos,
      }),
      responseSchema: facturaSchema,
      invalidatesTags: (_result, _error, { clienteId }) => [
        { type: 'Factura', id: 'LIST' },
        { type: 'Factura', id: `CLIENTE-${clienteId}` },
        /**
         * El catálogo de especies también: un renglón puede traer una especie
         * **nueva**, que el backend crea en la misma transacción
         * (`docs/flujo_especies.md` §5). Sin esto, la factura siguiente no la
         * encontraría en el selector y se crearía un duplicado.
         */
        { type: 'Especie', id: 'LIST' },
      ],
    }),

    /** Una factura con su detalle, por id. Es a donde lleva el clic del tablero. */
    getFactura: builder.query<Factura, string>({
      query: (facturaId) => ({ url: `/admin/facturas/${facturaId}`, method: 'GET' }),
      responseSchema: facturaSchema,
      providesTags: (_result, _error, facturaId) => [{ type: 'Factura', id: facturaId }],
    }),

    /**
     * La cuenta de un cliente: el resumen de su deuda y sus facturas, con
     * filtros por estado y por fecha de emisión (`docs/flujo_pagos.md` §4).
     *
     * Es a donde lleva el clic del tablero. Los renglones son **livianos**: no
     * traen sus productos ni sus cobros, sino cuántos tiene y una línea para
     * reconocer la factura. El detalle completo se pide al tocar uno.
     *
     * ⚠️ El `resumen` es de la cuenta **entera**: no lo tocan ni la paginación ni
     * los filtros. Mirar solo las vencidas no puede cambiar cuánto debe el
     * cliente. `total` y `paginas`, en cambio, sí cuentan lo filtrado.
     *
     * Un `404` acá también significa que ese id es de un administrador: en este
     * apartado solo existen los clientes.
     */
    getCuentaCliente: builder.query<CuentaCliente, CuentaClienteParams>({
      query: ({ clienteId, estado, desde, hasta, pagina, limite }) => ({
        url: `/admin/clientes/${clienteId}/cuenta`,
        method: 'GET',
        // `fetchBaseQuery` omite los `undefined`, así que un filtro sin poner
        // simplemente no viaja.
        params: { estado, desde, hasta, pagina, limite },
      }),
      responseSchema: cuentaClienteSchema,
      // El mismo tag que invalidan el alta y los cobros: emitir o cobrar cambia
      // esta cuenta, y así se refresca sola sin que nadie la vuelva a pedir.
      providesTags: (_result, _error, { clienteId }) => [
        { type: 'Factura', id: `CLIENTE-${clienteId}` },
      ],
    }),

    /**
     * Anotar un cobro. Es **lo único que se le puede agregar** a una factura
     * emitida: el detalle, las fechas y los importes quedan como se emitieron.
     *
     * Se puede cobrar en varias veces y cada pago queda con su fecha. Cuando el
     * saldo llega a cero, el `estado` pasa a `pagada` y `pagadaEn` toma la fecha
     * del último pago.
     *
     * ⚠️ **Un pago no puede superar el saldo de su factura.** Si el cliente trae
     * plata para tres, son tres pagos: a qué factura se imputó cada peso es un
     * dato que después nadie puede reconstruir.
     */
    /**
     * Reclamarle la deuda a un cliente: le deja un **aviso en la app** y le
     * manda un **correo** si tiene dirección cargada (`docs/notificaciones.md`).
     *
     * **El sistema no reclama solo**: no hay tarea nocturna. Esto se aprieta con
     * la decisión tomada, y por eso la pantalla pide confirmación — del otro
     * lado le suena el teléfono a una persona.
     *
     * Vive en esta feature y no en `notifications` porque es una acción sobre la
     * **cuenta** de un cliente y se dispara desde ahí; `notifications` es la
     * punta que recibe.
     *
     * ⚠️ El contrato de este endpoint **no está documentado** más allá de su URL
     * y su método: `docs/notificaciones.md` manda a `flujo_pagos.md`, que no lo
     * describe. Va sin body y la respuesta se ignora a propósito —lo único que
     * importa es que haya salido 2xx—, así que si el backend devuelve algo útil,
     * se declara acá y nada más.
     *
     * No invalida nada: el aviso es del cliente, no cambia su cuenta.
     */
    avisarDeuda: builder.mutation<unknown, string>({
      query: (clienteId) => ({
        url: `/admin/clientes/${clienteId}/aviso-deuda`,
        method: 'POST',
      }),
      responseSchema: z.unknown(),
    }),

    registrarPago: builder.mutation<Factura, RegistrarPagoPayload>({
      query: ({ facturaId, datos }) => ({
        url: `/admin/facturas/${facturaId}/pagos`,
        method: 'POST',
        body: datos,
      }),
      responseSchema: facturaSchema,
      /**
       * Los dos endpoints de pagos devuelven **la factura completa ya
       * recalculada**, así que en vez de invalidarla —lo que dispararía un GET
       * para traer algo que ya está en la mano— se escribe la respuesta directo
       * en el cache del detalle.
       */
      async onQueryStarted({ facturaId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(facturasApi.util.upsertQueryData('getFactura', facturaId, data));
      },
      /**
       * El tablero sí se invalida: cambió el saldo que muestra el renglón y, si
       * la factura quedó saldada, el filtro por estado ya no la ubica en el
       * mismo lado.
       */
      invalidatesTags: (result) => [
        { type: 'Factura' as const, id: 'LIST' },
        ...(result ? [{ type: 'Factura' as const, id: `CLIENTE-${result.cliente.id}` }] : []),
      ],
    }),

    /**
     * Borrar un cobro mal cargado. **Un pago no se edita: se borra y se vuelve a
     * anotar**, así no se pierde qué se había cargado antes.
     *
     * Devuelve la factura con el saldo y el estado recalculados: una que había
     * quedado `pagada` vuelve al estado que le toque por fecha.
     *
     * Un `404` acá también significa que ese pago es de otra factura.
     */
    borrarPago: builder.mutation<Factura, BorrarPagoPayload>({
      query: ({ facturaId, pagoId }) => ({
        url: `/admin/facturas/${facturaId}/pagos/${pagoId}`,
        method: 'DELETE',
      }),
      responseSchema: facturaSchema,
      /**
       * Los dos endpoints de pagos devuelven **la factura completa ya
       * recalculada**, así que en vez de invalidarla —lo que dispararía un GET
       * para traer algo que ya está en la mano— se escribe la respuesta directo
       * en el cache del detalle.
       */
      async onQueryStarted({ facturaId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(facturasApi.util.upsertQueryData('getFactura', facturaId, data));
      },
      /**
       * El tablero sí se invalida: cambió el saldo que muestra el renglón y, si
       * la factura quedó saldada, el filtro por estado ya no la ubica en el
       * mismo lado.
       */
      invalidatesTags: (result) => [
        { type: 'Factura' as const, id: 'LIST' },
        ...(result ? [{ type: 'Factura' as const, id: `CLIENTE-${result.cliente.id}` }] : []),
      ],
    }),

    /**
     * Anular una factura mal emitida (`docs/flujo_pagos.md` §9).
     *
     * **Anular no es borrar**: la factura se queda con su número, su detalle y
     * su total, y sigue apareciendo en la cuenta marcada. Lo que cambia es que
     * deja de contar — el `saldo` pasa a `0`, sale de la deuda del cliente y del
     * tablero, y no vence nunca más. Un número que desaparece de la numeración
     * no lo puede explicar nadie seis meses después.
     *
     * ⚠️ **No se puede deshacer**: si hacía falta, se emite otra.
     *
     * ⚠️ **Con cobros anotados no se anula**: primero hay que decidir qué pasa
     * con esa plata (`Esta factura tiene cobros anotados: borrá los pagos antes
     * de anularla.`).
     */
    anularFactura: builder.mutation<Factura, AnularFacturaPayload>({
      query: ({ facturaId, motivo }) => ({
        url: `/admin/facturas/${facturaId}/anular`,
        method: 'POST',
        body: { motivo },
      }),
      responseSchema: facturaSchema,
      // Igual que los cobros: devuelve la factura ya recalculada, así que se
      // escribe en el cache del detalle en vez de disparar un GET.
      async onQueryStarted({ facturaId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(facturasApi.util.upsertQueryData('getFactura', facturaId, data));
      },
      /** Cambió la deuda del cliente: el tablero y su cuenta quedan viejos. */
      invalidatesTags: (result) => [
        { type: 'Factura' as const, id: 'LIST' },
        ...(result ? [{ type: 'Factura' as const, id: `CLIENTE-${result.cliente.id}` }] : []),
      ],
    }),

    /**
     * Marcar que ya se le devolvió al cliente la plata de una factura anulada
     * (`docs/flujo_pagos.md` §9). **Sin body**: no hay monto ni medio de pago.
     *
     * ⚠️ **La devolución se hace afuera del sistema** —efectivo, transferencia,
     * lo que arreglen—. Esto solo baja `aReembolsar` a cero y deja registrado
     * cuándo y quién, para que el aviso deje de aparecer.
     *
     * Solo aplica a una anulada que tenía cobros: en cualquier otra es `400`.
     */
    marcarReembolso: builder.mutation<Factura, ReembolsoPayload>({
      query: ({ facturaId }) => ({
        url: `/admin/facturas/${facturaId}/reembolso`,
        method: 'POST',
      }),
      responseSchema: facturaSchema,
      async onQueryStarted({ facturaId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(facturasApi.util.upsertQueryData('getFactura', facturaId, data));
      },
      invalidatesTags: (result) => [
        { type: 'Factura' as const, id: 'LIST' },
        ...(result ? [{ type: 'Factura' as const, id: `CLIENTE-${result.cliente.id}` }] : []),
      ],
    }),

    /** Deshacer la marca de devuelto, para cuando se apretó sin querer. */
    deshacerReembolso: builder.mutation<Factura, ReembolsoPayload>({
      query: ({ facturaId }) => ({
        url: `/admin/facturas/${facturaId}/reembolso`,
        method: 'DELETE',
      }),
      responseSchema: facturaSchema,
      async onQueryStarted({ facturaId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(facturasApi.util.upsertQueryData('getFactura', facturaId, data));
      },
      invalidatesTags: (result) => [
        { type: 'Factura' as const, id: 'LIST' },
        ...(result ? [{ type: 'Factura' as const, id: `CLIENTE-${result.cliente.id}` }] : []),
      ],
    }),
  }),
});

export const {
  useAvisarDeudaMutation,
  useCrearFacturaMutation,
  useListarClientesConFacturasQuery,
  useGetFacturaQuery,
  useGetCuentaClienteQuery,
  useRegistrarPagoMutation,
  useBorrarPagoMutation,
  useAnularFacturaMutation,
  useMarcarReembolsoMutation,
  useDeshacerReembolsoMutation,
} = facturasApi;
