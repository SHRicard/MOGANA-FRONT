import { z } from 'zod';
// La feature especies es el dueño del catálogo: acá solo se consume la etiqueta
// que viaja en cada renglón y los topes de un nombre nuevo. Nunca al revés.
import { especieDeItemSchema, MAX_LARGO_ESPECIE, MIN_LARGO_ESPECIE } from '@/features/especies';
import {
  cantidadSchema,
  enAniosPantalla,
  esHoyOPosteriorPantalla,
  esPosteriorAPantalla,
  fechaApiSchema,
  fechaPantallaSchema,
  formatMonto,
  montoSchema,
  parseAMonto,
  parseCantidad,
  parseFechaPantalla,
} from '@/shared/utils';

/**
 * Fuente de verdad de la feature facturas (`docs/flujo_pagos.md`). Los tipos se
 * infieren de los schemas, nunca se escriben en paralelo.
 *
 * El modelo entero son tres cosas:
 *
 * ```
 * Factura  →  qué le vendiste, cuánto y hasta cuándo tiene para pagar
 * Pago     →  plata que entró, con su fecha
 * Saldo    →  total − pagos   (no se guarda: lo calcula el backend)
 * ```
 *
 * **Una factura emitida no se edita nunca.** Si el cliente se lleva más
 * mercadería, eso es otra factura; si paga una parte, eso es un pago. Lo único
 * que se le agrega o se le saca son cobros.
 *
 * ⚠️ Es **solo del administrador** (y del super admin). El cliente todavía no
 * tiene ningún endpoint para ver sus facturas.
 */

// ─────────────────────────────────────────────────────────────
// Constantes del dominio
// ─────────────────────────────────────────────────────────────
/** Renglones que acepta una factura: de 1 a 100. */
export const MAX_ITEMS_FACTURA = 100;

/** Largo máximo del nombre de un producto. Es texto libre: no hay catálogo. */
export const MAX_LARGO_PRODUCTO = 200;

/** Largo máximo de las notas. */
export const MAX_LARGO_NOTAS = 500;

/**
 * Días que se proponen para el vencimiento al abrir el formulario.
 *
 * No es una regla del backend —no hay ningún default del otro lado— sino un
 * valor para que la pantalla no arranque vacía. El campo queda editable: el que
 * decide hasta cuándo tiene tiempo de pagar es quien factura.
 */
export const DIAS_VENCIMIENTO_SUGERIDO = 30;

/**
 * Hasta cuándo puede estirarse el vencimiento: **un año**. Es una regla del
 * backend (`El vencimiento no puede estar a más de un año: revisá el año de la
 * fecha.`), y casi siempre se choca por escribir mal el año.
 */
export const MAX_ANIOS_VENCIMIENTO = 1;

/** Largo máximo de la nota de un cobro: "en efectivo", "lo trajo el hijo". */
export const MAX_LARGO_NOTA_PAGO = 200;

/**
 * Largo del motivo de una anulación. Es lo único que explica el agujero en la
 * numeración, así que el backend pide una línea de verdad: de 3 a 300.
 */
export const MIN_LARGO_MOTIVO_ANULACION = 3;
export const MAX_LARGO_MOTIVO_ANULACION = 300;

// ─────────────────────────────────────────────────────────────
// Estados
// ─────────────────────────────────────────────────────────────
/**
 * Los cuatro estados de una factura (`docs/flujo_pagos.md` §5).
 *
 * **No hay ningún estado guardado**: el backend lo calcula en cada request con
 * dos cosas que sí están en la base, los pagos anotados y la `fechaFin`. Por eso
 * una factura cambia de estado sola al pasar el día y la app no tiene nada que
 * recalcular: muestra lo que llega.
 *
 * ⚠️ **Un pago parcial no cambia el estado.** La factura de la que cobraste la
 * mitad y venció ayer sigue `vencida`, con la mitad de saldo. No es un bug: el
 * estado dice *si hay que ir a cobrar* y el saldo dice *cuánto*.
 *
 * ⚠️ Los valores son los de la tabla, en minúscula y con guión bajo. Son los
 * mismos que viajan en el query param `estado`.
 */
export const EstadosFactura = {
  /** Falta más de una semana para la `fechaFin`. */
  PENDIENTE: 'pendiente',
  /** Faltan 7 días o menos. Incluye el día del fin: ese es el día de pagar. */
  PROXIMA_A_VENCER: 'proxima_a_vencer',
  /** Pasó la `fechaFin` y todavía debe, desde el día siguiente. */
  VENCIDA: 'vencida',
  /** Saldo en cero. Le gana al resto: una saldada nunca se muestra vencida. */
  PAGADA: 'pagada',
  /**
   * Se dio de baja porque estaba mal emitida. **Le gana a todo**: no se cobra,
   * no vence y no cuenta para la deuda.
   *
   * Anular no es borrar: la factura se queda con su número, su detalle y su
   * total, y sigue apareciendo en la cuenta marcada. Un número que desaparece de
   * la numeración no lo puede explicar nadie seis meses después.
   */
  ANULADA: 'anulada',
} as const;

export const estadoFacturaSchema = z.enum(EstadosFactura);
export type EstadoFactura = z.infer<typeof estadoFacturaSchema>;

/**
 * Texto de cada estado. Hace falta escribirlo acá porque el filtro se dibuja
 * **antes** de tener resultados, y porque la API manda el slug
 * (`proxima_a_vencer`), no algo para mostrar.
 */
export const ESTADO_FACTURA_LABEL: Record<EstadoFactura, string> = {
  [EstadosFactura.PENDIENTE]: 'Pendiente',
  [EstadosFactura.PROXIMA_A_VENCER]: 'Por vencer',
  [EstadosFactura.VENCIDA]: 'Vencida',
  [EstadosFactura.PAGADA]: 'Pagada',
  [EstadosFactura.ANULADA]: 'Anulada',
};

// ─────────────────────────────────────────────────────────────
// Estados de la CUENTA de un cliente
// ─────────────────────────────────────────────────────────────
/**
 * Los cuatro estados de **una cuenta**, que no son los de una factura
 * (`docs/flujo_pagos.md` §6).
 *
 * Una persona no está "pagada": está **al día** o le tenés que ir a cobrar. Los
 * otros tres son los de **su factura impaga más urgente** — un cliente con una
 * vencida de marzo y otra recién emitida está `vencida`, porque manda lo peor
 * que arrastra. Por eso el chip del cliente y el de su factura más urgente
 * siempre coinciden.
 *
 * ⚠️ Son los valores que van en el query param `estado` del tablero: `al_dia`,
 * **no** `pagada`.
 */
export const EstadosCuenta = {
  /** No debe nada. */
  AL_DIA: 'al_dia',
  PENDIENTE: 'pendiente',
  PROXIMA_A_VENCER: 'proxima_a_vencer',
  VENCIDA: 'vencida',
} as const;

export const estadoCuentaSchema = z.enum(EstadosCuenta);
export type EstadoCuenta = z.infer<typeof estadoCuentaSchema>;

/** Texto de cada estado de cuenta. La API manda el slug, no algo para mostrar. */
export const ESTADO_CUENTA_LABEL: Record<EstadoCuenta, string> = {
  [EstadosCuenta.AL_DIA]: 'Al día',
  [EstadosCuenta.PENDIENTE]: 'Pendiente',
  [EstadosCuenta.PROXIMA_A_VENCER]: 'Por vencer',
  [EstadosCuenta.VENCIDA]: 'Vencida',
};

/**
 * Cualquiera de los dos estados. Existe porque el badge de color es el mismo
 * para una factura y para una cuenta: los tres del medio se llaman igual y el
 * cuarto (`pagada` / `al_dia`) se pinta del mismo verde.
 */
export type EstadoCualquiera = EstadoFactura | EstadoCuenta;

/** El texto de un estado, sea de una factura o de una cuenta. */
export function labelDeEstado(estado: EstadoCualquiera): string {
  return estado === EstadosCuenta.AL_DIA
    ? ESTADO_CUENTA_LABEL[EstadosCuenta.AL_DIA]
    : ESTADO_FACTURA_LABEL[estado];
}

/**
 * El cartelito del vencimiento a partir de `diasParaVencer`: `8` → "Vence en 8
 * días", `0` → "Vence hoy", `-3` → "Venció hace 3 días".
 *
 * Se usa el número que manda el backend en vez de comparar contra la fecha del
 * dispositivo: el estado lo calcula el servidor con SU reloj, y un celular con
 * la fecha corrida mostraría "vence mañana" al lado de un chip que dice
 * "vencida".
 *
 * En una factura pagada —o en un cliente al día— devuelve `null`: ahí el
 * vencimiento ya no es un aviso y el chip de estado dice todo lo que hay que
 * decir. Lo mismo si no llegan los días: una cuenta sin nada impago no tiene
 * ningún vencimiento que contar.
 *
 * Sirve para los dos estados —el de una factura y el de una cuenta— porque la
 * cuenta muestra el vencimiento de su factura impaga más urgente, que es
 * exactamente el mismo cartel.
 */
export function textoVencimiento(
  estado: EstadoCualquiera,
  diasParaVencer: number | null | undefined,
): string | null {
  if (
    estado === EstadosFactura.PAGADA ||
    estado === EstadosFactura.ANULADA ||
    estado === EstadosCuenta.AL_DIA ||
    diasParaVencer === null ||
    diasParaVencer === undefined
  ) {
    return null;
  }
  if (diasParaVencer < 0) {
    const dias = Math.abs(diasParaVencer);
    return dias === 1 ? 'Venció ayer' : `Venció hace ${dias} días`;
  }
  if (diasParaVencer === 0) {
    return 'Vence hoy';
  }
  return diasParaVencer === 1 ? 'Vence mañana' : `Vence en ${diasParaVencer} días`;
}

// ─────────────────────────────────────────────────────────────
// Respuestas de la API
// ─────────────────────────────────────────────────────────────
/**
 * A quién se le emitió. Es un recorte del cliente, no la cuenta entera: la
 * factura guarda con quién se hizo, no su perfil.
 */
export const facturaClienteSchema = z.object({
  id: z.string(),
  /** `null` cuando la cuenta no tiene nombre cargado: ahí se muestra el email o el DNI. */
  displayName: z.string().nullish(),
  /** `null` en una cuenta creada con DNI (`docs/s.auth.md`). */
  email: z.string().nullish(),
  /** `null` en una cuenta creada con email o con Google. */
  dni: z.string().nullish(),
});

/**
 * Un renglón. **El nombre y el precio quedan copiados acá**: cambiar mañana el
 * precio de un producto no toca las facturas ya emitidas, que es justo lo que
 * uno quiere de una factura.
 */
export const facturaItemSchema = z.object({
  id: z.string(),
  producto: z.string(),
  /**
   * Con qué se agrupa este renglón (`docs/flujo_especies.md`).
   *
   * ⚠️ **Es lo único del renglón que puede cambiar después**: renombrar la
   * especie en el catálogo corrige también las facturas viejas, porque clasifica
   * y no es lo que se cobró. El producto y el precio quedan congelados.
   *
   * Se valida como opcional para no atarse a la fecha exacta en que el backend
   * la sumó: una factura vieja sin especie se muestra igual, sin esa línea.
   */
  especie: especieDeItemSchema.nullish(),
  cantidad: cantidadSchema,
  /** Lo que sale **una** unidad. */
  precioUnitario: montoSchema,
  /**
   * `cantidad × precioUnitario`, ya calculado por el backend con decimales
   * exactos. ⚠️ **Se muestra, no se recalcula**: rehacer la cuenta en JavaScript
   * es como el front termina mostrando `$80.17000000000002`.
   */
  subtotal: montoSchema,
});

/**
 * El administrador que la emitió. Queda `null` si esa cuenta se borró, así que
 * la pantalla tiene que tolerar no saber quién la hizo.
 */
export const facturaEmisorSchema = z.object({
  id: z.string(),
  displayName: z.string().nullish(),
  email: z.string().nullish(),
});

/**
 * Un cobro anotado contra una factura.
 *
 * **Un pago no se edita: se borra y se vuelve a cargar.** Por eso la pantalla
 * pone un tacho al lado de cada uno y no un lápiz — un importe corregido
 * dejaría sin rastro cuánto se había anotado antes.
 */
export const pagoSchema = z.object({
  id: z.string(),
  /** Cuánta plata entró. Nunca supera el saldo que la factura tenía en ese momento. */
  monto: montoSchema,
  /** El día del cobro, `AAAA-MM-DD`. Puede ser anterior al día en que se cargó. */
  fecha: fechaApiSchema,
  /** Texto libre: "en efectivo", "transferencia", "lo trajo el hijo". */
  nota: z.string().nullish(),
  /** Quién lo anotó. `null` si esa cuenta se borró. */
  registradoPor: facturaEmisorSchema.nullish(),
});

/**
 * Una factura con su detalle y sus cobros. Es **la misma forma** que devuelven
 * el alta, los dos `GET` y los dos endpoints de pagos, así que cualquier
 * pantalla la lee igual sin importar de dónde salió.
 */
export const facturaSchema = z.object({
  id: z.string(),
  /**
   * Correlativo y único en toda la app: **es el número que se muestra**. El `id`
   * es para las URLs.
   */
  numero: z.number().int(),
  cliente: facturaClienteSchema,
  /**
   * El día en que se emitió. `AAAA-MM-DD`, sin hora y sin zona.
   *
   * **Lo pone el servidor** —es el día en que se creó— y no viaja en el alta:
   * mandarlo es `400` (`property fechaEmision should not exist`).
   */
  fechaEmision: fechaApiSchema,
  /** El día en que hay que pagarla. Es la única fecha que elige el administrador. */
  fechaFin: fechaApiSchema,
  /** Vuelven en el mismo orden en que se mandaron. */
  items: z.array(facturaItemSchema),
  /** La suma de los subtotales, hecha por el backend. Se muestra tal cual. */
  total: montoSchema,
  /**
   * Cuánto se cobró y cuánto falta, ya calculados: `saldo = total − pagado`.
   *
   * ⚠️ **Se muestran, no se recalculan.** Rehacer la resta en JavaScript es como
   * el front termina mostrando `$999.9999999`.
   */
  pagado: montoSchema,
  saldo: montoSchema,
  /** Los cobros, del más viejo al más nuevo. Vacío en una factura recién emitida. */
  pagos: z.array(pagoSchema),
  notas: z.string().nullish(),
  creadaPor: facturaEmisorSchema.nullish(),
  /** ISO completo con hora: es un instante de auditoría. */
  createdAt: z.string(),

  /** Calculado por el backend en cada request. Llega en TODA factura. */
  estado: estadoFacturaSchema,
  /**
   * La fecha del pago que la terminó de saldar, o `null` si todavía debe.
   * Es un dato derivado de los pagos, no un campo que se edite.
   */
  pagadaEn: fechaApiSchema.nullish(),
  /** Entero: `0` vence hoy, negativo ya venció. */
  diasParaVencer: z.number().int(),

  /**
   * Los datos de la baja. Llegan solo en una factura `anulada`.
   *
   * ⚠️ `anuladaEn` es un **instante ISO con hora**, no una fecha de negocio como
   * `fechaEmision`: es cuándo se dio de baja, un dato de auditoría.
   */
  anuladaEn: z.string().nullish(),
  /** Por qué se anuló. Es lo único que explica el agujero en la numeración. */
  motivoAnulacion: z.string().nullish(),
  /** Quién la dio de baja. `null` si esa cuenta se borró. */
  anuladaPor: facturaEmisorSchema.nullish(),

  /**
   * Lo que hay que **devolverle** al cliente de esta factura. Cero salvo en una
   * anulada que ya se había cobrado.
   *
   * Va para el otro lado que el saldo: el saldo es lo que el cliente debe, esto
   * es lo que se le debe a él. La devolución **se hace afuera del sistema**
   * —efectivo, transferencia, lo que arreglen— y el backend no la mueve: este
   * número está para que no se olvide.
   */
  aReembolsar: montoSchema,
  /** Cuándo se marcó devuelta esa plata y quién. `null` mientras no se marcó. */
  reembolsadoEn: z.string().nullish(),
  reembolsadoPor: facturaEmisorSchema.nullish(),
});

export type Factura = z.infer<typeof facturaSchema>;
export type FacturaItem = z.infer<typeof facturaItemSchema>;
export type FacturaCliente = z.infer<typeof facturaClienteSchema>;
export type Pago = z.infer<typeof pagoSchema>;

/**
 * Cómo se nombra a quien emitió una factura o anotó un cobro. `null` es una
 * cuenta borrada: la pantalla tiene que tolerar no saber quién fue.
 */
export function nombreDeEmisor(emisor: FacturaEmisor | null | undefined): string {
  return emisor?.displayName?.trim() || emisor?.email || 'Cuenta eliminada';
}

export type FacturaEmisor = z.infer<typeof facturaEmisorSchema>;

// ─────────────────────────────────────────────────────────────
// Formulario
// ─────────────────────────────────────────────────────────────
/**
 * Un renglón **tal como se tipea**: los tres campos son texto.
 *
 * La conversión a lo que espera la API (cantidad entera y precio decimal) la
 * hace `aNuevaFacturaPayload`. Se valida el texto y no el número convertido
 * para poder marcar el campo exacto que está mal.
 */
export const nuevaFacturaItemSchema = z
  .object({
    producto: z
      .string()
      .trim()
      .min(1, 'Cada renglón necesita un producto')
      .max(MAX_LARGO_PRODUCTO, `Máximo ${MAX_LARGO_PRODUCTO} caracteres`),
    cantidad: z
      .string()
      .refine((texto) => parseCantidad(texto) !== null, 'Una cantidad entera, de 1 para arriba'),
    /** Lo que sale UNA unidad. La API admite 0 o más, con hasta dos decimales. */
    precioUnitario: z.string().refine((texto) => {
      const monto = parseAMonto(texto);
      return monto !== null && monto >= 0;
    }, 'Un precio de 0 o más, con hasta dos decimales'),

    /**
     * La especie **elegida del catálogo**. Vacío si todavía no se eligió o si se
     * escribió una nueva (`docs/flujo_especies.md` §5).
     */
    especieId: z.string(),
    /**
     * El nombre de una especie **que no existe todavía**. Vacío si se eligió una
     * del catálogo.
     *
     * Es la escotilla del mostrador: la especie se crea junto con la factura, en
     * la misma transacción. Obligar a poner especie y a la vez obligar a salir de
     * la pantalla a crearla terminaría siempre en un catálogo con una sola
     * especie llamada "varios".
     */
    especieNombre: z.string(),
  })
  /**
   * **Una y solo una de las dos.** Es la misma regla del backend, traída acá para
   * marcar el renglón exacto en vez de gastar un request que volvería con este
   * mismo texto. Las dos juntas no es "por las dudas": es un renglón que dice dos
   * cosas distintas, y elegir una en silencio guardaría la que nadie vio.
   */
  .superRefine((item, ctx) => {
    const nombre = item.especieNombre.trim();
    const conId = item.especieId.length > 0;
    const conNombre = nombre.length > 0;

    if (conId === conNombre) {
      ctx.addIssue({
        code: 'custom',
        // El error se cuelga del selector, que es donde se arregla.
        path: ['especieId'],
        message: conId
          ? 'Este renglón tiene dos especies: elegí una sola.'
          : 'Cada renglón necesita una especie.',
      });
      return;
    }

    // Los topes del nombre nuevo, los mismos del catálogo.
    if (conNombre && (nombre.length < MIN_LARGO_ESPECIE || nombre.length > MAX_LARGO_ESPECIE)) {
      ctx.addIssue({
        code: 'custom',
        path: ['especieId'],
        message: `El nombre de la especie va de ${MIN_LARGO_ESPECIE} a ${MAX_LARGO_ESPECIE} caracteres.`,
      });
    }
  });

/**
 * La factura tal como se carga en la pantalla: la fecha en día/mes/año y los
 * precios en pesos.
 *
 * **Una sola fecha**: hasta cuándo tiene tiempo de pagarla. La de emisión la
 * pone el servidor el día en que se crea, así que no se pide ni se manda.
 *
 * `fechaFin` tiene que ser **hoy o más adelante** —una factura no puede nacer
 * vencida—, y eso se valida acá para no gastar un request que volvería con ese
 * mismo texto del backend.
 */
export const nuevaFacturaSchema = z.object({
  fechaFin: fechaPantallaSchema
    .refine(
      esHoyOPosteriorPantalla,
      'La factura no puede terminar antes de emitirse: el fin es hoy o más adelante.',
    )
    // El otro tope: a lo sumo dentro de un año. Casi siempre se choca por
    // escribir mal el año, así que el mensaje apunta ahí.
    .refine(
      (texto) => !esPosteriorAPantalla(texto, enAniosPantalla(MAX_ANIOS_VENCIMIENTO)),
      'El vencimiento no puede estar a más de un año: revisá el año de la fecha.',
    ),
  notas: z.string().trim().max(MAX_LARGO_NOTAS, `Máximo ${MAX_LARGO_NOTAS} caracteres`),
  items: z
    .array(nuevaFacturaItemSchema)
    .min(1, 'La factura necesita al menos un producto.')
    .max(MAX_ITEMS_FACTURA, `Como mucho ${MAX_ITEMS_FACTURA} renglones`),
});

export type NuevaFacturaFormValues = z.infer<typeof nuevaFacturaSchema>;
export type NuevaFacturaItemFormValues = z.infer<typeof nuevaFacturaItemSchema>;

// ─────────────────────────────────────────────────────────────
// Payload que viaja a la API
// ─────────────────────────────────────────────────────────────
/**
 * Un renglón ya convertido: cantidad entera, precio en pesos y **su especie**.
 *
 * La especie viaja de una de dos formas y **nunca las dos**
 * (`docs/flujo_especies.md` §5):
 *
 *  - `especieId` — ya está en el catálogo y se eligió del selector. Es el caso
 *    normal;
 *  - `especie` — el nombre de una nueva, que el backend crea en la **misma
 *    transacción** que la factura. Si la factura falla, la especie no queda
 *    dando vueltas.
 */
export type ItemPayload = {
  producto: string;
  cantidad: number;
  precioUnitario: number;
  especieId?: string;
  especie?: string;
};

/**
 * ⚠️ **El cliente va en la URL, nunca en el body**: la factura no puede terminar
 * en otra cuenta que la que el administrador tiene abierta.
 */
export type NuevaFacturaPayload = {
  clienteId: string;
  datos: {
    /** El día en que vence. La emisión la pone el backend. */
    fechaFin: string;
    notas?: string;
    items: ItemPayload[];
  };
};

/**
 * Formulario → cuerpo del POST. Es la frontera entre **cómo se escribe** y
 * **cómo viaja**: la fecha de día/mes/año a `AAAA-MM-DD`, los precios de texto a
 * número.
 *
 * ⚠️ **No manda `subtotal`, `total` ni `fechaEmision`.** Los calcula o los pone
 * el backend, y un campo de más en el body es `400` (`property total should not
 * exist`). Si el front mandara los importes, la factura diría lo que diga el
 * celular; si mandara la emisión, la fecha de una factura la elegiría quien la
 * carga.
 *
 * `notas` vacías se omiten en vez de mandarse en blanco: es un campo opcional,
 * no un texto vacío.
 *
 * Asume que los valores YA pasaron por `nuevaFacturaSchema`.
 */
export function aNuevaFacturaPayload(
  clienteId: string,
  valores: NuevaFacturaFormValues,
): NuevaFacturaPayload {
  const notas = valores.notas.trim();

  return {
    clienteId,
    datos: {
      fechaFin: parseFechaPantalla(valores.fechaFin) ?? '',
      ...(notas ? { notas } : {}),
      items: valores.items.map((item) => ({
        producto: item.producto.trim(),
        cantidad: parseCantidad(item.cantidad) ?? 0,
        precioUnitario: parseAMonto(item.precioUnitario) ?? 0,
        // Una sola de las dos: el schema ya garantizó que no vengan ambas, y
        // mandar la vacía sería el `400` de "lleva una sola especie".
        ...(item.especieId
          ? { especieId: item.especieId }
          : { especie: item.especieNombre.trim() }),
      })),
    },
  };
}

/**
 * Cómo se nombra al cliente de una factura: el nombre cargado, y si no hay, lo
 * que sí identifica a esa cuenta. Sin esto, una cuenta creada con DNI se
 * mostraría como una fila en blanco.
 */
export function nombreDeCliente(cliente: FacturaCliente): string {
  return cliente.displayName?.trim() || cliente.email || cliente.dni || 'Sin nombre';
}

// ─────────────────────────────────────────────────────────────
// Tablero de clientes facturados (`docs/flujo_pagos.md`)
// ─────────────────────────────────────────────────────────────
/**
 * Filas por página del tablero.
 *
 * Ocho, y no los veinte que la API usa por defecto: ocho renglones se recorren
 * de un vistazo en un celular y pasar de página es el gesto normal para
 * moverse por el tablero, en vez de scrollear un rato largo hasta el final. El
 * paginador queda fijo abajo, siempre a la vista.
 *
 * La API acepta de 1 a 100: si el tablero queda corto, se sube acá y no hay
 * nada más que tocar — el sobre de la respuesta ya recalcula `paginas`.
 */
export const CLIENTES_FACTURADOS_LIMITE = 8;

/**
 * Un renglón del tablero: **la cuenta de un cliente**, no una factura.
 *
 * Antes era la última factura de cada persona, y eso escondía justo lo que
 * importa para cobrar: lo que arrastra de antes. Ahora el renglón contesta las
 * tres preguntas del mostrador —cuánto debe **en total**, cuántas facturas le
 * faltan pagar y desde cuándo se pasó la más vieja—, y el detalle vive en la
 * pantalla de la cuenta.
 *
 * ⚠️ **No trae número de factura ni productos.** El clic lleva a
 * `GET /admin/clientes/:id/cuenta`, no a una factura.
 */
export const clienteFacturadoSchema = z.object({
  clienteId: z.string(),
  /** Ya resuelto por el backend (nombre → usuario del email → DNI): nunca viene vacío. */
  nombre: z.string(),
  /** `null` en las cuentas de Google o de email, que no tienen documento. */
  dni: z.string().nullish(),
  /** **El número de la pantalla**: la suma de los saldos de todas sus impagas. */
  deuda: montoSchema,
  /** Histórico completo del cliente: cuánto se le facturó y cuánto pagó. */
  totalFacturado: montoSchema,
  totalPagado: montoSchema,
  /** Cuántas facturas tiene en total y cuántas le faltan pagar. */
  facturas: z.number().int(),
  facturasImpagas: z.number().int(),
  /**
   * El vencimiento **más urgente de lo que debe** —no el de su última factura—,
   * y cuántos días faltan para ese. `null` en un cliente al día: no hay nada
   * pendiente que pueda vencer.
   */
  vencimientoMasViejo: fechaApiSchema.nullish(),
  diasParaVencer: z.number().int().nullish(),
  /** El de su factura impaga más urgente, o `al_dia` si no debe nada. */
  estado: estadoCuentaSchema,
  /**
   * Si se le fía (`docs/bloquear_fiado.md`). En el tablero alcanza con la marca:
   * el motivo va donde se decide, que es la ficha y la cuenta.
   *
   * Opcional porque el ejemplo del tablero en `flujo_pagos.md` todavía no lo
   * trae: sin el campo, `sinFiado()` responde que sí se le fía, que es como
   * arranca todo el mundo.
   */
  seLeFia: z.boolean().nullish(),
});

/**
 * Lo que hay que cobrar en el filtro **entero**, no en la página: es lo que
 * permite poner "por cobrar / vencido / por vencer" en el encabezado sin pedir
 * nada más ni sumar en el front.
 */
export const totalesTableroSchema = z.object({
  /** Todo lo impago: es `vencido + porVencer`. */
  deuda: montoSchema,
  /** Lo que ya se pasó de fecha. Es el número que decide a quién llamar hoy. */
  vencido: montoSchema,
  porVencer: montoSchema,
});

/**
 * Una página del tablero. El sobre es el mismo de todos los listados del panel,
 * más los `totales` del filtro.
 *
 * ⚠️ Ojo con los dos `total`: la `deuda` de cada renglón es **plata**, y el
 * `total` de acá afuera es **cuántos clientes** hay.
 */
export const clientesFacturadosPaginaSchema = z.object({
  datos: z.array(clienteFacturadoSchema),
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
  /** Cantidad de páginas. Con `<= 1` la paginación no se dibuja. */
  paginas: z.number(),
  totales: totalesTableroSchema,
});

export type ClienteFacturado = z.infer<typeof clienteFacturadoSchema>;
export type ClientesFacturadosPagina = z.infer<typeof clientesFacturadosPaginaSchema>;
export type TotalesTablero = z.infer<typeof totalesTableroSchema>;

/**
 * Query de `GET /api/admin/clientes-con-facturas`. Los dos filtros se combinan:
 * `?q=perez&estado=vencida` es "los Pérez que tienen algo vencido".
 *
 * Filtrar, ordenar y paginar pasan en la base, así que `total` y `paginas`
 * cuentan lo filtrado. El orden es siempre por factura más reciente.
 */
export type ListarClientesConFacturasParams = {
  /**
   * Nombre, DNI o email. Va por pedazo de texto y no distingue mayúsculas
   * (`38180` encuentra a `38180903`, y el DNI se puede escribir con puntos).
   * ⚠️ **No iguala tildes**: `perez` no encuentra a `Pérez`.
   */
  q?: string;
  /**
   * ⚠️ Son los estados de **la cuenta**: `al_dia` y no `pagada`. Mandar el otro
   * es `400` (`Estado inválido: al_dia, pendiente, proxima_a_vencer, vencida.`).
   */
  estado?: EstadoCuenta;
  /** Desde 1. */
  pagina?: number;
  /** De 1 a 100. La API usa 20 si no se manda. */
  limite?: number;
};

/** Espera antes de llamar a la API mientras la persona tipea. */
export const TABLERO_DEBOUNCE_MS = 300;

// ─────────────────────────────────────────────────────────────
// Cuenta del cliente (`docs/flujo_pagos.md` §4)
// ─────────────────────────────────────────────────────────────
/**
 * Facturas por página en la cuenta.
 *
 * Diez y no las veinte que la API usa por defecto: cada renglón trae su estado,
 * su saldo y su vencimiento, así que diez ya son una pantalla larga en un
 * celular. El resto se pasa con el paginador.
 */
export const FACTURAS_CUENTA_LIMITE = 10;

/** A quién pertenece la cuenta. Trae el nombre ya resuelto **y** los crudos. */
export const cuentaClienteDatosSchema = facturaClienteSchema.extend({
  /** Nombre para mostrar, ya resuelto por el backend: nunca viene vacío. */
  nombre: z.string(),
  /**
   * Si se le fía, y por qué se le cortó (`docs/bloquear_fiado.md`). Acá el
   * motivo sí se muestra: la cuenta es una de las dos pantallas donde se decide
   * si se le sigue fiando.
   */
  seLeFia: z.boolean().nullish(),
  motivoSinFiado: z.string().nullish(),
  /**
   * Si puede usar **la app** (`docs/flujo_login.md`). Sin DNI cargado está
   * `bloqueado`.
   *
   * ⚠️ No cambia nada de esta pantalla: **a un cliente bloqueado se le factura,
   * se le cobra y se le anula igual**. El bloqueo es de la app, no del
   * mostrador. Se muestra para que quien atiende sepa que a esa persona le falta
   * el documento y se lo pueda cargar desde su ficha.
   */
  estado: z.string().nullish(),
});

/**
 * El estado de plata de la cuenta **entera**.
 *
 * ⚠️ No lo tocan ni la paginación ni los filtros: mirar solo las vencidas no
 * puede cambiar cuánto debe el cliente. Con `?estado=pagada` la lista trae otras
 * facturas, pero la deuda de arriba sigue siendo la misma.
 */
export const resumenCuentaSchema = z.object({
  /** Las **vigentes**: las anuladas se cuentan aparte. */
  facturas: z.number().int(),
  /**
   * Cuántas se dieron de baja. Va separado para que los números cierren con la
   * lista: "5 facturas, 1 anulada".
   *
   * ⚠️ Las anuladas **no** suman a `totalFacturado`, `totalPagado` ni `deuda`.
   */
  facturasAnuladas: z.number().int(),
  facturasImpagas: z.number().int(),
  totalFacturado: montoSchema,
  totalPagado: montoSchema,
  /** Lo que debe: la suma de los saldos de sus facturas impagas. */
  deuda: montoSchema,
  /**
   * Lo que **vos le debés al cliente**: lo que había pagado de facturas que
   * después se anularon y todavía no se le devolvió.
   */
  aReembolsar: montoSchema,
  /** El vencimiento más urgente de lo impago, y los días que faltan. `null` si está al día. */
  vencimientoMasViejo: fechaApiSchema.nullish(),
  diasParaVencer: z.number().int().nullish(),
  estado: estadoCuentaSchema,
});

/**
 * Una factura **en la lista de la cuenta**: un renglón liviano, no la factura
 * entera.
 *
 * No trae sus renglones ni sus cobros: trae **cuántos** tiene (`items`, `pagos`)
 * y una línea para reconocerla (`detalle`). Sobre las mismas facturas, la lista
 * pesa un 66% menos que devolverlas completas, y la diferencia crece con el
 * detalle — un cliente puede tener mil.
 *
 * ⚠️ Para ver una factura entera está `GET /admin/facturas/:id`, que es a donde
 * lleva el toque en el renglón. **No se pide para pintar la lista.**
 */
export const facturaDeCuentaSchema = z.object({
  id: z.string(),
  /** Correlativo y único: es el número que se muestra. */
  numero: z.number().int(),
  fechaEmision: fechaApiSchema,
  fechaFin: fechaApiSchema,
  estado: estadoFacturaSchema,
  /** Entero: `0` vence hoy, negativo ya venció. */
  diasParaVencer: z.number().int(),
  total: montoSchema,
  pagado: montoSchema,
  saldo: montoSchema,
  /** Cuántos renglones tiene. Es un NÚMERO, no la lista. */
  items: z.number().int(),
  /** Cuántos cobros tiene. Es un NÚMERO, no la lista. */
  pagos: z.number().int(),
  /** El primer producto y `+N` si hay más: alcanza para reconocerla sin abrirla. */
  detalle: z.string(),
  /** Por qué se dio de baja. Solo en las `anulada`. */
  motivoAnulacion: z.string().nullish(),
  /**
   * Lo que hay que devolverle al cliente de esta factura.
   *
   * Va opcional a propósito: el doc lo describe en prosa pero no aparece en el
   * ejemplo del renglón, así que si un día no llega, la lista se dibuja igual y
   * el dato manda el detalle.
   */
  aReembolsar: montoSchema.nullish(),
});

export type FacturaDeCuenta = z.infer<typeof facturaDeCuentaSchema>;

/**
 * La cuenta de un cliente: el resumen de su deuda y sus facturas, con filtros y
 * paginado.
 *
 * Es la pantalla que contesta "¿tiene algo atrás?". Las facturas vienen como
 * renglones livianos: el detalle completo se pide al tocar una.
 */
export const cuentaClienteSchema = z.object({
  cliente: cuentaClienteDatosSchema,
  resumen: resumenCuentaSchema,
  /** La última primero (por número, que es correlativo). Vienen paginadas. */
  facturas: z.array(facturaDeCuentaSchema),
  /**
   * Cuántas FACTURAS entran en el filtro (no cuánta plata: eso es
   * `resumen.deuda`). ⚠️ Este sí cuenta lo filtrado; el `resumen` no.
   */
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
  paginas: z.number(),
});

export type CuentaCliente = z.infer<typeof cuentaClienteSchema>;
export type ResumenCuenta = z.infer<typeof resumenCuentaSchema>;
export type CuentaClienteDatos = z.infer<typeof cuentaClienteDatosSchema>;

/**
 * Query de `GET /api/admin/clientes/:clienteId/cuenta`. Filtra y pagina **las
 * facturas**; el resumen de la cuenta no se mueve.
 *
 * Se combinan todos: `?estado=pendiente&desde=2026-08-01&limite=10`.
 */
export type CuentaClienteParams = {
  clienteId: string;
  /**
   * ⚠️ Acá van los estados de **la factura** —`pagada` incluido—, no los de la
   * cuenta: `al_dia` es del tablero y acá es `400`.
   */
  estado?: EstadoFactura;
  /** `AAAA-MM-DD`. Emitidas **desde** ese día, incluido. */
  desde?: string;
  /** `AAAA-MM-DD`. Emitidas **hasta** ese día, incluido. */
  hasta?: string;
  /** Desde 1. */
  pagina?: number;
  /** De 1 a 100. La API usa 20 si no se manda. */
  limite?: number;
};

/**
 * Cuántas facturas le faltan pagar, en texto: `"2 de 3 impagas"`, y cuántas se
 * dieron de baja si hay.
 *
 * Los dos números juntos y no solo el de impagas: "2 impagas" no dice si el
 * cliente es un moroso o alguien con mucho movimiento que dejó dos abiertas. Las
 * anuladas van aparte para que los números cierren con la lista, donde se ven.
 */
export function textoImpagas(resumen: {
  facturas: number;
  facturasImpagas: number;
  facturasAnuladas?: number;
}): string {
  const anuladas = resumen.facturasAnuladas ?? 0;
  const cola = anuladas > 0 ? `, ${anuladas} ${anuladas === 1 ? 'anulada' : 'anuladas'}` : '';

  if (resumen.facturasImpagas === 0) {
    const vigentes =
      resumen.facturas === 1 ? '1 factura, saldada' : `${resumen.facturas} facturas, saldadas`;
    return `${vigentes}${cola}`;
  }
  return `${resumen.facturasImpagas} de ${resumen.facturas} impagas${cola}`;
}

/**
 * `true` si a este cliente **no** se le fía.
 *
 * Es la misma regla que en `@/features/usuarios` —se pregunta por el negativo
 * porque todos arrancan con fiado—, repetida acá con el tipo de esta feature
 * para no tener que importar la otra por una línea.
 */
export function clienteSinFiado(cliente: { seLeFia?: boolean | null }): boolean {
  return cliente.seLeFia === false;
}

/**
 * `true` si a este cliente le falta cargar el DNI y por eso no puede usar la app
 * (`docs/flujo_login.md`).
 *
 * Misma regla que en `@/features/usuarios`, repetida acá con el tipo de esta
 * feature para no importar la otra por una línea. **No cambia nada de la
 * cobranza**: es un dato del cliente, no de su cuenta.
 */
export function clienteSinDni(cliente: { estado?: string | null }): boolean {
  return cliente.estado === 'bloqueado';
}

/** `true` si la factura está dada de baja: no se cobra, no vence y no suma. */
export function esFacturaAnulada(factura: { estado: EstadoFactura }): boolean {
  return factura.estado === EstadosFactura.ANULADA;
}

// ─────────────────────────────────────────────────────────────
// Cobros (`docs/flujo_pagos.md` §7)
// ─────────────────────────────────────────────────────────────
/**
 * El formulario de cobro, tal como se carga: el monto en pesos y la fecha en
 * día/mes/año.
 *
 * Los tres campos son texto y se validan como texto —no como el número ya
 * convertido— para poder marcar el campo exacto que está mal.
 */
const nuevoPagoBaseSchema = z.object({
  monto: z.string().refine((texto) => {
    const monto = parseAMonto(texto);
    return monto !== null && monto > 0;
  }, 'El monto tiene que ser mayor a cero, con hasta dos decimales'),
  /**
   * El día del cobro. Arranca en hoy y se puede mover para atrás: la plata pudo
   * entrar el viernes y anotarse el lunes.
   */
  fecha: fechaPantallaSchema,
  nota: z.string().trim().max(MAX_LARGO_NOTA_PAGO, `Máximo ${MAX_LARGO_NOTA_PAGO} caracteres`),
});

export type NuevoPagoFormValues = z.infer<typeof nuevoPagoBaseSchema>;

/**
 * El schema del cobro para **una factura concreta**: hace falta el saldo porque
 * un pago nunca puede superarlo.
 *
 * Es una función y no una constante justamente por eso — el tope cambia con cada
 * cobro que se anota. Validarlo acá evita gastar un request que volvería con
 * `El pago supera el saldo de esta factura: debe $500.00.`, y marca el campo.
 *
 * ⚠️ Si el cliente trae plata para tres facturas, son **tres pagos**, uno en
 * cada una: a qué factura se imputó cada peso es un dato que después nadie
 * puede reconstruir.
 */
export function crearNuevoPagoSchema(saldo: number) {
  return nuevoPagoBaseSchema.refine(
    (valores) => {
      const monto = parseAMonto(valores.monto);
      return monto === null || monto <= saldo;
    },
    {
      path: ['monto'],
      message: `El pago no puede superar el saldo: debe ${formatMonto(saldo)}`,
    },
  );
}

/**
 * `POST /api/admin/facturas/:id/pagos`. Responde con **la factura completa y su
 * saldo al día**, así que no hace falta volver a pedirla.
 */
export type RegistrarPagoPayload = {
  facturaId: string;
  datos: {
    monto: number;
    /** `AAAA-MM-DD`. Si no viaja, el backend usa hoy. */
    fecha?: string;
    nota?: string;
  };
};

/** `DELETE /api/admin/facturas/:id/pagos/:pagoId`. Devuelve la factura recalculada. */
export type BorrarPagoPayload = {
  facturaId: string;
  pagoId: string;
};

/**
 * Formulario → cuerpo del POST: el monto de texto a número y la fecha de
 * día/mes/año a `AAAA-MM-DD`.
 *
 * La nota vacía se omite en vez de mandarse en blanco. La fecha se manda siempre
 * —aunque sea la de hoy— porque ya está elegida en la pantalla: dejar que el
 * backend la ponga solo cambiaría algo si el día cambiara entre que se abre el
 * formulario y se toca el botón.
 *
 * Asume que los valores YA pasaron por `crearNuevoPagoSchema`.
 */
export function aNuevoPagoPayload(
  facturaId: string,
  valores: NuevoPagoFormValues,
): RegistrarPagoPayload {
  const nota = valores.nota.trim();

  return {
    facturaId,
    datos: {
      monto: parseAMonto(valores.monto) ?? 0,
      fecha: parseFechaPantalla(valores.fecha) ?? undefined,
      ...(nota ? { nota } : {}),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Anulación (`docs/flujo_pagos.md` §9)
// ─────────────────────────────────────────────────────────────
/**
 * El formulario de la baja: **solo un motivo**.
 *
 * No hay nada más que decidir —anular no toca importes ni fechas—, y el motivo
 * es obligatorio porque es lo único que explica, seis meses después, por qué
 * falta ese número en la numeración.
 */
export const anularFacturaSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(MIN_LARGO_MOTIVO_ANULACION, 'Contá en una línea por qué se anula')
    .max(MAX_LARGO_MOTIVO_ANULACION, `Máximo ${MAX_LARGO_MOTIVO_ANULACION} caracteres`),
});

export type AnularFacturaFormValues = z.infer<typeof anularFacturaSchema>;

/**
 * `POST /api/admin/facturas/:id/anular`. Responde `201` con la factura ya
 * anulada, así que no hace falta volver a pedirla.
 *
 * ⚠️ **No se puede deshacer**, y **no se anula una factura con cobros
 * anotados**: primero hay que decidir qué pasa con esa plata, borrar los pagos
 * y recién ahí anular.
 */
export type AnularFacturaPayload = {
  facturaId: string;
  motivo: string;
};

/** Formulario → cuerpo del POST. Asume que ya pasó por `anularFacturaSchema`. */
export function aAnularFacturaPayload(
  facturaId: string,
  valores: AnularFacturaFormValues,
): AnularFacturaPayload {
  return { facturaId, motivo: valores.motivo.trim() };
}

/**
 * `POST` y `DELETE /api/admin/facturas/:id/reembolso`: marcar que la plata ya se
 * devolvió, o deshacer la marca si se apretó sin querer. **Sin body**: no hay
 * monto ni medio de pago, la devolución se hace afuera del sistema.
 *
 * Solo aplica a una factura **anulada que tenía cobros**; en cualquier otra es
 * `400` (`Esta factura no está anulada: lo que se cobró no hay que devolverlo.`).
 */
export type ReembolsoPayload = {
  facturaId: string;
};
