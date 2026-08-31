import { z } from 'zod';
// La sesión es la única feature de la que se importa cruzado en todo el repo:
// el estado de acceso de una cuenta es el mismo dato en todas las pantallas.
import { estadoAccesoSchema, EstadosAcceso } from '@/features/auth';
import { fechaApiSchema, formatMonto, mesApiSchema, nombreDeMesApi } from '@/shared/utils';

/**
 * Las métricas del panel (`docs/flujo_metricas.md`): **"¿cómo va el negocio?"**
 * de un vistazo.
 *
 * Todo sale de **un solo endpoint**, así que acá no hay nada que componer: la
 * respuesta es la pantalla.
 */

/** Un importe en pesos. Puede tener centavos y —a diferencia de una factura— cero. */
const importe = z.number();

/**
 * Lo que pasó en el mes elegido. **Es lo único, junto con `evolucion`, que se
 * mueve al cambiar de mes.**
 */
export const delMesSchema = z.object({
  mes: mesApiSchema,
  desde: fechaApiSchema,
  hasta: fechaApiSchema,
  /** La plata que ENTRÓ en el mes, por fecha del cobro (no de la factura). */
  cobrado: importe,
  cobros: z.number().int(),
  /** Lo que se emitió en el mes, sin las anuladas. */
  facturado: importe,
  facturas: z.number().int(),
});

/**
 * La plata prestada, **a hoy**. No la mueve el selector de mes: elegir marzo no
 * muestra cuánto se debía en marzo.
 */
export const enLaCalleSchema = z.object({
  /** `deuda = vencido + porVencer`. Es el número grande de la pantalla. */
  deuda: importe,
  vencido: importe,
  porVencer: importe,
  facturasImpagas: z.number().int(),
  facturasVencidas: z.number().int(),
  /** `null` cuando no hay nada vencido. */
  vencimientoMasViejo: fechaApiSchema.nullable(),
  /**
   * Mismo signo que en toda la app: **negativo es que ya pasó**. `-76` es
   * "venció hace 76 días". `null` junto con `vencimientoMasViejo`.
   */
  diasDelMasViejo: z.number().int().nullable(),
});

/** La gente. También es foto de hoy. */
export const clientesSchema = z.object({
  /** Todos, hayan comprado o no. */
  total: z.number().int(),
  conFacturas: z.number().int(),
  /** Deber no es ser moroso: el que está en fecha entra acá y está perfecto. */
  conDeuda: z.number().int(),
  /** Tiene al menos una factura vencida sin pagar. */
  morosos: z.number().int(),
  sinFiado: z.number().int(),
});

/** Una tasa de 0 a 100 con un decimal, o `null` si no hay nada que medir. */
const tasa = z.number().min(0).max(100).nullable();

/**
 * Tres cortes de la misma pregunta. Dan números distintos **a propósito**.
 *
 * ⚠️ Los tres pueden venir `null`, y **no es lo mismo que `0`**: `null` es "no
 * hay nada que medir" (cero clientes facturados, ninguna factura vencida). Un
 * `0%` ahí haría que un negocio recién abierto se vea fundido.
 */
export const cumplimientoSchema = z.object({
  /** De mis clientes, ¿cuántos me pagan en fecha? */
  porClientes: tasa,
  /** De lo que ya se tenía que pagar, ¿cuánto se pagó? */
  porFacturas: tasa,
  /** De toda la plata que facturé, ¿cuánta cobré? */
  porPlata: tasa,
});

/** Desde que existe el negocio. Tampoco lo mueve el mes. */
export const globalSchema = z.object({
  totalFacturado: importe,
  totalCobrado: importe,
  facturas: z.number().int(),
  facturasPagadas: z.number().int(),
  facturasVencidas: z.number().int(),
  facturasAnuladas: z.number().int(),
  /** `null` si todavía no se emitió ninguna factura. */
  ticketPromedio: importe.nullable(),
  /**
   * Plata cobrada en facturas que después se anularon y que **todavía no se
   * devolvió**. Va para el otro lado: no es tuya.
   */
  aReembolsar: importe,
});

/** Un punto del gráfico. Los meses sin movimiento vienen igual, en cero. */
export const puntoEvolucionSchema = z.object({
  mes: mesApiSchema,
  facturado: importe,
  cobrado: importe,
});

export const metricasSchema = z.object({
  hoy: fechaApiSchema,
  delMes: delMesSchema,
  enLaCalle: enLaCalleSchema,
  clientes: clientesSchema,
  cumplimiento: cumplimientoSchema,
  global: globalSchema,
  /** Seis meses, **del más viejo al más nuevo**, terminando en el mes elegido. */
  evolucion: z.array(puntoEvolucionSchema),
});

export type DelMes = z.infer<typeof delMesSchema>;
export type EnLaCalle = z.infer<typeof enLaCalleSchema>;
export type ClientesMetricas = z.infer<typeof clientesSchema>;
export type Cumplimiento = z.infer<typeof cumplimientoSchema>;
export type GlobalMetricas = z.infer<typeof globalSchema>;
export type PuntoEvolucion = z.infer<typeof puntoEvolucionSchema>;
export type Metricas = z.infer<typeof metricasSchema>;

/** Params del endpoint. Sin `mes`, la API usa el mes en curso. */
export interface MetricasParams {
  mes?: string;
}

/**
 * Una tasa, lista para mostrar.
 *
 * **`null` sale como raya, nunca como `0%`.** Es la trampa que el doc marca en
 * mayúsculas: `${tasa ?? 0}%` haría que "no hay nada que medir" se lea como
 * "nadie te paga".
 */
export function formatTasa(valor: number | null): string {
  if (valor === null) {
    return '—';
  }
  return porcentaje(valor);
}

/**
 * Un número como porcentaje: **un decimal y coma**, como el resto de los números
 * de la app.
 *
 * El formateo es a mano y no con `Intl` (ver `money.ts`): en Android `Intl`
 * depende de los datos de ICU del dispositivo, así que el mismo número se vería
 * distinto en dos celulares.
 */
function porcentaje(valor: number): string {
  return `${valor.toFixed(1).replace('.', ',')} %`;
}

/**
 * Hace cuánto venció lo más viejo, en palabras.
 *
 * El signo viene **negativo** cuando ya pasó, que es el caso normal de este
 * campo. Un valor positivo significaría que "lo más viejo" todavía no venció, y
 * ahí no hay nada que reclamar.
 *
 * ⚠️ Los días se cuentan **contra la fecha del corte**, que en el tablero es hoy
 * y en el ticket de un mes cerrado es el último día de ese mes. Con `alCorte`,
 * la frase deja de hablar en presente: "venció hace 56 días" en el ticket de
 * julio se leería contra hoy, y son 56 días contados desde el 31 de julio.
 */
export function textoDelMasViejo(
  dias: number | null,
  opciones?: { alCorte?: boolean },
): string | null {
  if (dias === null || dias >= 0) {
    return null;
  }
  const pasados = Math.abs(dias);

  if (opciones?.alCorte) {
    return pasados === 1
      ? 'La más vieja llevaba 1 día vencida'
      : `La más vieja llevaba ${pasados} días vencida`;
  }

  return pasados === 1 ? 'La más vieja venció ayer' : `La más vieja venció hace ${pasados} días`;
}

// ─────────────────────────────────────────────────────────────
// Métricas por cliente (§4 del doc)
// ─────────────────────────────────────────────────────────────

/**
 * Por qué se ordena el listado. **Cada uno ya viene con la dirección en la que
 * sirve**: no hay `asc`/`desc` porque un "cumplimiento descendente" mostraría
 * primero a los que pagan bien, que es justo lo que nadie necesita mirar.
 */
export const OrdenesMetricaCliente = {
  FACTURADO: 'facturado',
  DEUDA: 'deuda',
  CUMPLIMIENTO: 'cumplimiento',
  FRECUENCIA: 'frecuencia',
  INACTIVIDAD: 'inactividad',
} as const;

export type OrdenMetricaCliente =
  (typeof OrdenesMetricaCliente)[keyof typeof OrdenesMetricaCliente];

/**
 * Qué aparece primero con cada orden.
 *
 * El label dice **quién encabeza la lista**, no el nombre del campo: "El que
 * peor paga" se entiende de una, "cumplimiento" hay que pensarlo.
 */
export const ORDEN_LABEL: Record<OrdenMetricaCliente, string> = {
  [OrdenesMetricaCliente.FACTURADO]: 'El que más compró',
  [OrdenesMetricaCliente.DEUDA]: 'El que más debe',
  [OrdenesMetricaCliente.CUMPLIMIENTO]: 'El que peor paga',
  [OrdenesMetricaCliente.FRECUENCIA]: 'El que compra más seguido',
  [OrdenesMetricaCliente.INACTIVIDAD]: 'El que hace más que no compra',
};

/** Para qué sirve cada orden. Es lo que vuelve útil al selector. */
export const ORDEN_AYUDA: Record<OrdenMetricaCliente, string> = {
  [OrdenesMetricaCliente.FACTURADO]: 'Quiénes son tus mejores clientes',
  [OrdenesMetricaCliente.DEUDA]: 'Dónde está tu plata',
  [OrdenesMetricaCliente.CUMPLIMIENTO]: 'A quién apretar o cortarle el fiado',
  [OrdenesMetricaCliente.FRECUENCIA]: 'Quiénes son tus habitués',
  [OrdenesMetricaCliente.INACTIVIDAD]: 'A quiénes estás perdiendo',
};

/** El orden que usa la API cuando no se le manda ninguno. */
export const ORDEN_POR_DEFECTO: OrdenMetricaCliente = OrdenesMetricaCliente.FACTURADO;

/** Clientes por página. Es el default de la API. */
export const METRICAS_CLIENTES_LIMITE = 20;

/** Lo mismo que el tablero: la búsqueda sale sola, sin botón. */
export const BUSQUEDA_DEBOUNCE_MS = 300;

/** Una tasa por cliente. Mismo criterio que las globales: `null` ≠ `0`. */
const tasaCliente = z.number().min(0).max(100).nullable();

/**
 * Un renglón del listado: **lo justo para barrer la lista y decidir a quién
 * abrir**. Cuánto compró, cuánto debe y hace cuánto que no aparece.
 *
 * ⚠️ **Acá no viene la tasa de cumplimiento, y es a propósito**: cómo paga
 * alguien no se entiende con un número suelto —hace falta ver contra cuántas
 * facturas se calcula y cuántos días se atrasa— y eso es una ficha, no una
 * celda. Todo lo que no entra en el renglón está en
 * `docs/flujo_metricas_cliente.md`, a un toque de acá.
 *
 * **Solo aparecen los clientes que tienen al menos una factura**: sin historial
 * no hay nada que medir, y una fila con todo en cero no le sirve a nadie.
 */
export const metricaClienteSchema = z.object({
  clienteId: z.string(),
  nombre: z.string(),
  dni: z.string().nullish(),
  /** `false` es que no se le fía (`docs/bloquear_fiado.md`). */
  seLeFia: z.boolean(),
  /** El estado de su cuenta hoy, el mismo del tablero de facturación. */
  estado: z.string(),

  /** Todo lo que se le facturó, esté cobrado o no. Sin las anuladas. */
  totalFacturado: importe,
  /** Lo que debe hoy. */
  deuda: importe,
  /** De esa deuda, la que ya se pasó de fecha. Es la que se pinta en rojo. */
  vencido: importe,

  /** Cuántas facturas vigentes tiene, en toda su historia. */
  facturas: z.number().int(),

  ultimaCompra: fechaApiSchema,
  /** **El número de fuga**: hace cuánto que no compra. */
  diasSinComprar: z.number().int(),
});

export const metricasClientesPaginaSchema = z.object({
  datos: z.array(metricaClienteSchema),
  total: z.number().int(),
  pagina: z.number().int(),
  limite: z.number().int(),
  paginas: z.number().int(),
});

export type MetricaCliente = z.infer<typeof metricaClienteSchema>;
export type MetricasClientesPagina = z.infer<typeof metricasClientesPaginaSchema>;

/** Params de `GET /api/admin/metricas/clientes`. */
export interface MetricasClientesParams {
  q?: string;
  orden?: OrdenMetricaCliente;
  pagina?: number;
  limite?: number;
}

/**
 * Una cantidad de días, lista para mostrar. `null` sale como raya: "no hay
 * intervalo que promediar" no es "vuelve cada cero días".
 */
export function formatDias(dias: number | null): string {
  if (dias === null) {
    return '—';
  }
  const redondeado = Math.round(dias);
  return redondeado === 1 ? '1 día' : `${redondeado} días`;
}

/**
 * Cuánto tarda en pagar, en palabras.
 *
 * El signo importa y se pierde si se muestra el número pelado: `-5` no es "menos
 * cinco días de demora", es **cinco días antes de tiempo**.
 */
export function textoDemora(dias: number | null): string {
  if (dias === null) {
    return '—';
  }
  const redondeado = Math.round(dias);
  if (redondeado === 0) {
    return 'El día del vencimiento';
  }
  return redondeado < 0
    ? `${formatDias(Math.abs(redondeado))} antes`
    : `${formatDias(redondeado)} tarde`;
}

// ─────────────────────────────────────────────────────────────
// Qué le está pasando a una especie (§5.2 del doc)
// ─────────────────────────────────────────────────────────────

/**
 * El chip que acompaña a cada especie, **decidido por unidades y no por plata**.
 * Así se piensa la mercadería: "se llevaron menos zapatillas" es un dato aunque
 * hayan sido más caras.
 *
 * Es el mismo catálogo en las tres pantallas que miran mercadería —la tendencia
 * del negocio, la global de productos y el "qué se lleva" de un cliente—, y por
 * eso vive acá y no en una de ellas.
 */
export const Tendencias = {
  /** No se vendió en ningún período anterior de la ventana y ahora sí. */
  NUEVA: 'nueva',
  /** Creció más de un 10 % contra el período anterior. */
  SUBE: 'sube',
  /** Se movió menos de un 10 %: es ruido, no una tendencia. */
  ESTABLE: 'estable',
  /** Cayó más de un 10 %. */
  BAJA: 'baja',
  /**
   * **No se vendió ninguna.** Es la que hay que mirar: no cayó, dejó de moverse.
   *
   * ⚠️ **Gana sobre todo lo demás.** Viene con `variacionCantidad: -100`, y
   * mostrarla como "bajó un 100 %" se lee como una caída fuerte cuando lo que
   * pasó es otra cosa.
   */
  PARADA: 'parada',
} as const;

export type Tendencia = (typeof Tendencias)[keyof typeof Tendencias];

/** Cómo se llama cada una en pantalla. */
export const TENDENCIA_LABEL: Record<Tendencia, string> = {
  [Tendencias.NUEVA]: 'Nueva',
  [Tendencias.SUBE]: 'Sube',
  [Tendencias.ESTABLE]: 'Estable',
  [Tendencias.BAJA]: 'Baja',
  [Tendencias.PARADA]: 'Parada',
};

/**
 * La tendencia cruda de la API a la de la app, o `null` si no la conoce.
 *
 * Un valor nuevo del backend **no rompe la lista**: se dibuja el renglón sin
 * chip. Los números que están al lado dicen lo mismo.
 */
export function aTendencia(valor: string): Tendencia | null {
  const conocidas: readonly string[] = Object.values(Tendencias);
  return conocidas.includes(valor) ? (valor as Tendencia) : null;
}

/**
 * Hace cuánto que no se lleva esta especie, en palabras.
 *
 * ⚠️ **No es lo mismo que hace cuánto que no compra**: un cliente puede haber
 * comprado ayer y hace ocho meses que no lleva vestidos. Para el primero está
 * activo; para el segundo, cambió lo que compra.
 */
export function textoDesdeLaUltima(dias: number): string {
  if (dias === 0) {
    return 'Hoy';
  }
  return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
}

// ─────────────────────────────────────────────────────────────
// Tickets: la foto de un mes (§5 del doc)
// ─────────────────────────────────────────────────────────────

/**
 * ⚠️ **Acá la deuda es la del cierre, no la de hoy.** Es exactamente al revés
 * que en el tablero, y es la razón de ser del ticket: una factura de junio que
 * se cobró en septiembre **figura impaga en el ticket de julio**, porque en
 * julio lo estaba.
 *
 * Por eso el apartado va como una pantalla aparte y no como una sección del
 * tablero: mezclarlas es lo único que puede confundir de verdad.
 */

/**
 * Un mes del índice (§5.1).
 *
 * **Los meses vacíos vienen igual, con ceros** (`conMovimiento: false`). Es lo
 * mismo que en `evolucion`: si se saltearan, el listado mostraría marzo pegado a
 * junio. Se marcan en gris, pero no se filtran.
 */
export const mesTicketSchema = z.object({
  mes: mesApiSchema,
  /** El mes ya terminó. En `false` el ticket va a ser **parcial**. */
  cerrado: z.boolean(),
  /** Hubo al menos una factura o un cobro. */
  conMovimiento: z.boolean(),
  facturado: importe,
  facturas: z.number().int(),
  cobrado: importe,
  cobros: z.number().int(),
  /**
   * La plata que quedaba en la calle al terminar ese mes. Es **la misma** que el
   * ticket de ese mes trae en `alCierre.deuda`.
   *
   * ⚠️ Un mes sin movimiento puede tenerla alta igual: es la deuda de arrastre.
   */
  deudaAlCierre: importe,
});

/** El índice de meses. **Sin paginado**: son doce por año. */
export const ticketsMesesSchema = z.object({
  hoy: fechaApiSchema,
  total: z.number().int(),
  /** Del más nuevo al más viejo, desde el primer mes con movimiento. */
  meses: z.array(mesTicketSchema),
});

/** Lo que se emitió en el mes, por fecha de emisión y **sin las anuladas**. */
export const ticketFacturacionSchema = z.object({
  facturado: importe,
  facturas: z.number().int(),
  /** `null` —no `0`— si no se emitió ninguna factura en el mes. */
  ticketPromedio: importe.nullable(),
  /** Cuántos clientes distintos recibieron una factura. */
  clientes: z.number().int(),
  /** `null` con el mismo criterio que `ticketPromedio`. */
  facturaMasAlta: importe.nullable(),
  /**
   * ⚠️ **No están sumadas en `facturado`.** Van aparte porque son el error del
   * mes, no su facturación. Con `anuladas` en cero, el renglón no se muestra.
   */
  anuladas: z.number().int(),
  montoAnulado: importe,
});

/**
 * La plata que entró, contada por **fecha del cobro**: un pago de julio contra
 * una factura de marzo entró en julio.
 *
 * La misma plata viene partida de dos maneras distintas, y **cada partición suma
 * exactamente `cobrado`**.
 */
export const ticketCobranzaSchema = z.object({
  cobrado: importe,
  cobros: z.number().int(),
  clientes: z.number().int(),
  /** `null` si no entró ningún cobro: un promedio de cero pagos no existe. */
  cobroPromedio: importe.nullable(),
  /** ¿Estoy cobrando al día o viviendo de recuperar lo viejo? */
  deEsteMes: importe,
  deMesesAnteriores: importe,
  /** De lo que entró, ¿cuánto llegó tarde? */
  enTermino: importe,
  fueraDeTermino: importe,
  /**
   * ⚠️ **No está en `cobrado`.** Entró de verdad, pero hay que devolverla: es el
   * mismo criterio de `global.aReembolsar` del tablero.
   */
  cobradoEnAnuladas: importe,
});

/**
 * Cómo cerró la calle: la deuda que quedaba **el último día del mes**,
 * reconstruida con los cobros anotados hasta esa fecha.
 *
 * Son los campos de `enLaCalle` (§3) más tres, y ese parecido es a propósito: es
 * el mismo bloque, mirado en otra fecha.
 */
export const alCierreSchema = enLaCalleSchema.extend({
  /**
   * El día del corte. En un mes cerrado es el último; **en el mes en curso es
   * hoy**. Es lo que hay que escribir en el encabezado del bloque.
   */
  al: fechaApiSchema,
  clientesConDeuda: z.number().int(),
  morosos: z.number().int(),
  /**
   * Cuánto **creció** la deuda durante el mes: `facturado − cobrado`. Negativo
   * es que bajó, que es lo que uno quiere ver. Va como delta con flecha, nunca
   * como un total.
   */
  variacionEnElMes: z.number(),
});

/** La gente que se movió en el mes. */
export const ticketClientesSchema = z.object({
  /** Cuentas creadas en el mes, hayan comprado o no. */
  registrados: z.number().int(),
  /** Los que **compraron por primera vez**: su primera factura cae en el mes. */
  nuevos: z.number().int(),
  compraron: z.number().int(),
  pagaron: z.number().int(),
});

/**
 * Contra el mes anterior.
 *
 * ⚠️ **Las dos variaciones pueden venir `null`**: si el mes anterior fue cero, no
 * hay porcentaje que calcular. De cero a un millón no es "un 100 % más".
 */
export const ticketComparacionSchema = z.object({
  mes: mesApiSchema,
  facturado: importe,
  cobrado: importe,
  variacionFacturado: z.number().nullable(),
  variacionCobrado: z.number().nullable(),
});

/**
 * Uno de los cinco que más compraron en el mes.
 *
 * `facturado` es del mes y `cobrado` también — pero **el cobrado puede ser de
 * facturas viejas**: un cliente con `facturado: 0` y `cobrado` alto no compró
 * nada, pagó lo que debía. Es un dato bueno, no un bug.
 */
export const ticketTopClienteSchema = z.object({
  clienteId: z.string(),
  nombre: z.string(),
  dni: z.string().nullish(),
  facturado: importe,
  facturas: z.number().int(),
  cobrado: importe,
});

/**
 * Lo más vendido del mes, por plata.
 *
 * El nombre es el que tipeó el mostrador: **no hay catálogo**. Se agrupa
 * ignorando mayúsculas y espacios de más, así que "Bidón" y "bidón " son la
 * misma línea.
 */
export const ticketTopProductoSchema = z.object({
  producto: z.string(),
  cantidad: z.number(),
  monto: importe,
  facturas: z.number().int(),
});

/**
 * Lo más vendido del mes **por especie**.
 *
 * ⚠️ No es lo mismo que `topProductos`: aquel agrupa por el texto que tipeó el
 * mostrador —"12 Coca 500ml" y "Coca 500" son dos líneas, y el mes que viene
 * pueden ser tres— y este por la etiqueta del catálogo. **Este es el único que
 * se puede leer de un mes a otro**, y el único que trae `clientes`: cabezas
 * distintas, no facturas.
 */
export const especieDelTicketSchema = z.object({
  especieId: z.string(),
  nombre: z.string(),
  cantidad: z.number(),
  monto: importe,
  facturas: z.number().int(),
  /** Cuántos clientes distintos se la llevaron. */
  clientes: z.number().int(),
});

/**
 * La foto completa de un mes: todo lo que se facturó, todo lo que entró, con
 * cuánta deuda cerró, quién compró y qué se vendió.
 *
 * **No se guarda: se calcula.** No hay tabla de tickets ni un cierre que alguien
 * tenga que ejecutar, así que **un mes cerrado puede cambiar**: si mañana se
 * anula una factura de julio, el ticket de julio va a decir otra cosa. Por eso
 * viaja `generadoEl` y por eso no se cachea del lado del cliente más de una
 * sesión.
 */
export const ticketSchema = z.object({
  mes: mesApiSchema,
  desde: fechaApiSchema,
  hasta: fechaApiSchema,
  /** En `false` el mes todavía no terminó y **hay que decirlo en pantalla**. */
  cerrado: z.boolean(),
  /** El día en que se armó esta foto. Va en el pie, sobre todo si se imprime. */
  generadoEl: fechaApiSchema,

  facturacion: ticketFacturacionSchema,
  cobranza: ticketCobranzaSchema,
  alCierre: alCierreSchema,
  clientes: ticketClientesSchema,
  comparacion: ticketComparacionSchema,

  /** Hasta 5. */
  topClientes: z.array(ticketTopClienteSchema),
  /** Hasta 10. */
  topProductos: z.array(ticketTopProductoSchema),
  /**
   * Hasta 10, por especie. Opcional para no romper con un backend que todavía
   * no lo manda: es un ranking más, no la mitad del ticket.
   */
  topEspecies: z.array(especieDelTicketSchema).nullish(),
});

export type MesTicket = z.infer<typeof mesTicketSchema>;
export type TicketsMeses = z.infer<typeof ticketsMesesSchema>;
export type TicketFacturacion = z.infer<typeof ticketFacturacionSchema>;
export type TicketCobranza = z.infer<typeof ticketCobranzaSchema>;
export type AlCierre = z.infer<typeof alCierreSchema>;
export type TicketClientes = z.infer<typeof ticketClientesSchema>;
export type TicketComparacion = z.infer<typeof ticketComparacionSchema>;
export type TicketTopCliente = z.infer<typeof ticketTopClienteSchema>;
export type TicketTopProducto = z.infer<typeof ticketTopProductoSchema>;
export type EspecieDelTicket = z.infer<typeof especieDelTicketSchema>;
export type Ticket = z.infer<typeof ticketSchema>;

/** En qué unidad se lee un delta: un porcentaje o plata. */
export const FormatosVariacion = {
  PORCENTAJE: 'porcentaje',
  MONTO: 'monto',
} as const;

export type FormatoVariacion = (typeof FormatosVariacion)[keyof typeof FormatosVariacion];

/**
 * Para dónde fue el número. **`sinDato` no es `igual`**: es que no hay con qué
 * comparar —el mes anterior fue cero— y no que se quedó como estaba.
 */
export const DireccionesVariacion = {
  SUBE: 'sube',
  BAJA: 'baja',
  IGUAL: 'igual',
  SIN_DATO: 'sinDato',
} as const;

export type DireccionVariacion = (typeof DireccionesVariacion)[keyof typeof DireccionesVariacion];

/** Para dónde fue el número, para elegir la flecha y el color. */
export function direccionVariacion(valor: number | null): DireccionVariacion {
  if (valor === null) {
    return DireccionesVariacion.SIN_DATO;
  }
  if (valor === 0) {
    return DireccionesVariacion.IGUAL;
  }
  return valor > 0 ? DireccionesVariacion.SUBE : DireccionesVariacion.BAJA;
}

/**
 * Cuánto cambió, **sin el signo**: eso lo dice la flecha al lado.
 *
 * `null` sale como raya, con el mismo criterio de siempre: no hay nada que
 * comparar.
 */
export function magnitudVariacion(valor: number | null, formato: FormatoVariacion): string {
  if (valor === null) {
    return '—';
  }
  const magnitud = Math.abs(valor);
  return formato === FormatosVariacion.MONTO ? formatMonto(magnitud) : porcentaje(magnitud);
}

/**
 * El mismo delta, en palabras: es lo que lee el lector de pantalla, donde una
 * flecha no dice nada.
 *
 * ⚠️ `null` es **"sin comparación"**, no "0 %": si el mes anterior fue cero, de
 * cero a un millón no es "un 100 % más".
 */
export function textoVariacion(valor: number | null, formato: FormatoVariacion): string {
  if (valor === null) {
    return 'Sin comparación';
  }
  if (valor === 0) {
    return 'Sin cambios';
  }
  const magnitud = magnitudVariacion(valor, formato);
  return valor > 0 ? `${magnitud} más` : `${magnitud} menos`;
}

/**
 * Cuántas unidades se vendieron de un producto, en palabras.
 *
 * La cantidad puede venir con decimales —no todo se vende por unidad— así que se
 * muestra tal cual y solo se concuerda el singular con el 1 exacto.
 */
export function textoCantidad(cantidad: number): string {
  return cantidad === 1 ? '1 unidad' : `${cantidad} unidades`;
}

/**
 * El delta contra el mes anterior, en palabras: `"39,6 % menos que en junio"`.
 *
 * ⚠️ Con `null` **no dice "0 %"**: dice que no hay con qué comparar. Si el mes
 * anterior fue cero, de cero a un millón no es "un 100 % más", y mostrarlo así
 * inventaría un crecimiento que nadie tuvo.
 */
export function textoComparacion(valor: number | null, mesAnterior: string): string {
  const contra = nombreDeMesApi(mesAnterior);
  return valor === null
    ? `Sin comparación con ${contra}`
    : `${textoVariacion(valor, FormatosVariacion.PORCENTAJE)} que en ${contra}`;
}

// ─────────────────────────────────────────────────────────────
// La ficha del cliente (`docs/flujo_metricas_cliente.md`)
// ─────────────────────────────────────────────────────────────

/**
 * **Cumplir no es pagar.** Es lo único que hay que entender antes de leer esta
 * pantalla: una factura que ya venció pudo terminar de tres maneras, y **solo
 * una es cumplir**.
 *
 * ```
 * se pagó en fecha  ✔ cumplió
 * se pagó tarde     ✘ no cumplió — pero la plata entró
 * sigue impaga      ✘ no cumplió — y la plata no está
 * ```
 *
 * Por eso la tasa de acá **no es** la del tablero (`cumplimiento.porFacturas`):
 * aquella contesta "¿se pagó?" y da por buena una factura saldada con veinte
 * días de atraso; esta contesta "¿se pagó cuando se había pactado?".
 */

/** Cómo está la **cuenta corriente** del cliente. Es el semáforo de la deuda. */
export const EstadosDeCuenta = {
  AL_DIA: 'al_dia',
  PENDIENTE: 'pendiente',
  PROXIMA_A_VENCER: 'proxima_a_vencer',
  VENCIDA: 'vencida',
} as const;

export type EstadoDeCuenta = (typeof EstadosDeCuenta)[keyof typeof EstadosDeCuenta];

/** Cómo se llama cada estado en pantalla. Los mismos textos que el tablero. */
export const ESTADO_DE_CUENTA_LABEL: Record<EstadoDeCuenta, string> = {
  [EstadosDeCuenta.AL_DIA]: 'Al día',
  [EstadosDeCuenta.PENDIENTE]: 'Pendiente',
  [EstadosDeCuenta.PROXIMA_A_VENCER]: 'Por vencer',
  [EstadosDeCuenta.VENCIDA]: 'Vencida',
};

/**
 * El estado crudo de la API al de la app, o `null` si no lo conoce.
 *
 * Ante un estado nuevo **no rompe la pantalla ni inventa un color**: no dibuja
 * el chip y listo. Los números de abajo dicen lo mismo y son los que importan.
 */
export function aEstadoDeCuenta(estado: string): EstadoDeCuenta | null {
  const conocidos: readonly string[] = Object.values(EstadosDeCuenta);
  return conocidos.includes(estado) ? (estado as EstadoDeCuenta) : null;
}

/**
 * Quién es la persona. Los datos de contacto están para **poder llamarla**: el
 * administrador no los edita desde acá, son de ella.
 */
export const clienteDeLaFichaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  dni: z.string().nullish(),
  email: z.string().nullish(),
  /** `null` hasta que la persona lo cargue: nadie está obligado. */
  telefono: z.string().nullish(),
  /**
   * El de la **cuenta de la app**: `bloqueado` mientras no tenga DNI.
   *
   * ⚠️ No es el estado de la cuenta corriente y **no frena la facturación**: a
   * ese cliente se le factura y se le cobra igual, porque el bloqueo es de la
   * app y no del mostrador.
   */
  estado: estadoAccesoSchema.nullish(),
  /** En `false`, la factura que se le emita **vence el mismo día**. */
  seLeFia: z.boolean(),
  /** Por qué se le cortó. Sin esto, el que atiende no sabe si puede hacer una excepción. */
  motivoSinFiado: z.string().nullish(),
});

/**
 * El bloque principal: `tasa = enFecha / (enFecha + tarde + sinPagar)`.
 *
 * **Las facturas que todavía están en fecha no entran** ni arriba ni abajo: una
 * emitida ayer a 30 días no cumplió ni incumplió nada todavía, y contarla como
 * incumplimiento haría que comprar mucho hunda la tasa.
 */
export const cumplimientoDelClienteSchema = z.object({
  /**
   * De 0 a 100. ⚠️ **`null` no es `0`**: es que todavía no le venció ninguna
   * factura. Un `0 %` ahí mostraría como el peor de todos al que compró la
   * semana pasada.
   */
  tasa: tasaCliente,
  /** Contra cuántas se calcula: las que **ya se tenían que pagar**. */
  exigibles: z.number().int(),
  /** Pagadas antes o el mismo día del vencimiento. */
  enFecha: z.number().int(),
  /** Pagadas, pero después de la fecha. */
  tarde: z.number().int(),
  /** Siguen impagas con el vencimiento cumplido. */
  sinPagar: z.number().int(),
  /**
   * Promedio sobre **todas** las que pagó. Puede ser negativo, y eso es bueno:
   * es el cliente que paga antes de tiempo.
   */
  demoraPromedio: z.number().nullable(),
  /**
   * Promedio sobre las que pagó **tarde**. Es el número del mostrador: "sí,
   * paga, pero ¿cuánto tengo que esperar?". `null` es que **nunca se atrasó**.
   */
  demoraCuandoSeAtrasa: z.number().nullable(),
  /** El peor caso. `null` con el mismo criterio: nunca pagó tarde. */
  demoraMaxima: z.number().nullable(),
  /**
   * **Qué clase de pagador es, en una palabra.** Es lo primero que hay que
   * mirar: con eso ya se sabe qué escribir y qué no.
   *
   * Viene resuelto del backend **a propósito**: armarlo acá significa cruzar
   * tres campos que pueden venir en `null` con dos contadores, y equivocarse en
   * ese cruce muestra al que nunca pagó como el mejor cliente del negocio. La
   * regla se escribe una sola vez, del lado que tiene los datos.
   *
   * ⚠️ **Habla del historial, no de hoy**: un cliente puede ser
   * `siempre_en_fecha` y tener una factura vencida ahora mismo. Eso lo dice
   * `atrasoActual`, y las dos cosas van juntas en pantalla.
   *
   * Se valida como `string` y **opcional**: un servidor que todavía no se
   * reinició no lo manda, y una forma nueva del backend no puede dejar sin
   * pantalla a toda la ficha.
   */
  comoPaga: z.string().nullish(),
  /**
   * **Los días que lleva colgada su factura impaga más vieja.** Positivo, como
   * las demoras de arriba; `null` si hoy no tiene ninguna vencida.
   *
   * Es el que faltaba, y el más importante de los cuatro: los otros tres miran
   * **lo que ya pagó**, así que el que nunca pagó nada los tiene todos en `null`
   * —y leído solo, ese `null` parece un cliente impecable cuando es justo el
   * contrario—. Este mide lo que **no** pagó.
   *
   * Es el mismo día que `plata.diasDelMasViejo` **con el signo dado vuelta**:
   * allá es cuánto falta para el vencimiento y negativo es que pasó; acá es un
   * atraso, y los atrasos se cuentan para arriba.
   */
  atrasoActual: z.number().int().nullish(),
});

/**
 * Cuántas facturas tiene y cómo están.
 *
 * `total` es `activas + pagadas`. **Las anuladas van aparte y no cuentan para
 * nada**: no suman al total, ni a la deuda, ni a la tasa — son facturas que no
 * existieron.
 */
export const facturasDelClienteSchema = z.object({
  total: z.number().int(),
  /** Las que todavía deben algo, **vencidas o no**. Son las abiertas. */
  activas: z.number().int(),
  /** De esas, cuántas ya se pasaron de fecha. Es el número que preocupa. */
  vencidas: z.number().int(),
  pagadas: z.number().int(),
  anuladas: z.number().int(),
});

/** Cuánto mueve y cuánto debe. */
export const plataDelClienteSchema = z.object({
  facturado: importe,
  cobrado: importe,
  /** `facturado − cobrado`. */
  deuda: importe,
  /** De esa deuda, la que ya se pasó de fecha. **Es la que va en rojo.** */
  vencido: importe,
  /** Y la que todavía está en tiempo: no es un problema, es plata en camino. */
  porVencer: importe,
  /** `null` si no tiene facturas. */
  ticketPromedio: importe.nullable(),
  /** El vencimiento impago más viejo. `null` si no debe nada. */
  vencimientoMasViejo: fechaApiSchema.nullable(),
  /** Mismo signo que en toda la app: **negativo es que ya pasó**. */
  diasDelMasViejo: z.number().int().nullable(),
});

/**
 * La plata que va **para el otro lado**: cuando se anula una factura que ya
 * tenía cobros, esa plata hay que devolverla.
 *
 * Se muestra separada de la deuda y con otro color: van justo para lados
 * contrarios y **no se restan una de otra**.
 */
export const reembolsosDelClienteSchema = z.object({
  hechos: z.number().int(),
  montoDevuelto: importe,
  pendientes: z.number().int(),
  aReembolsar: importe,
});

/**
 * Cada cuánto vuelve.
 *
 * Todo viene en `null` mientras no haya comprado nada: **un cliente que existe y
 * todavía no compró no es un error**, es una respuesta.
 */
export const comprasDelClienteSchema = z.object({
  primeraCompra: fechaApiSchema.nullable(),
  ultimaCompra: fechaApiSchema.nullable(),
  /** **El número de fuga.** Se lee contra `diasEntreCompras`, nunca solo. */
  diasSinComprar: z.number().int().nullable(),
  /** `null` con una sola factura: no hay intervalo que promediar. */
  diasEntreCompras: z.number().nullable(),
  /** `null` si es cliente hace menos de 30 días: sería una división sin datos. */
  comprasPorMes: z.number().nullable(),
  antiguedadDias: z.number().int().nullable(),
});

/**
 * Una especie que se lleva **este** cliente (§3.8).
 *
 * Es la pregunta del mostrador —*"¿qué le vendo a este?"*— y la que avisa que
 * algo cambió **antes de que se note en la deuda**: el que dejó de llevar
 * vestidos y ahora solo lleva arreglos se está yendo, aunque siga pagando todo
 * en fecha.
 *
 * La ventana de comparación va en **días, 90 contra 90**, y no en meses como la
 * tendencia del negocio: un negocio factura todos los días, pero una persona
 * compra cada quince o veinte, así que "agosto contra julio" para un solo
 * cliente es comparar dos compras contra tres y llamarlo tendencia.
 */
export const especieDelClienteSchema = z.object({
  especieId: z.string(),
  nombre: z.string(),

  /** Desde siempre: unidades, plata y en cuántas facturas suyas apareció. */
  cantidad: z.number(),
  monto: importe,
  facturas: z.number().int(),
  /** Qué parte de todo lo que se le facturó se fue acá. **Suman 100.** */
  participacion: tasaCliente,

  /** La última vez que se llevó **esta** especie. */
  ultimaCompra: fechaApiSchema,
  /**
   * ⚠️ **No es `compras.diasSinComprar`**: aquel es "hace cuánto que no compra
   * nada" y este "hace cuánto que no lleva **esto**".
   */
  diasSinComprar: z.number().int(),

  /** Los últimos 90 días, y los 90 anteriores, que es contra lo que se compara. */
  reciente: z.object({ cantidad: z.number(), monto: importe }),
  previo: z.object({ cantidad: z.number(), monto: importe }),
  /** `null` si en la ventana anterior no llevó ninguna: para eso está `nueva`. */
  variacionCantidad: z.number().nullable(),
  variacionMonto: z.number().nullable(),
  /** `nueva`, `sube`, `estable`, `baja` o `parada`. */
  tendencia: z.string(),
});

export const fichaClienteSchema = z.object({
  hoy: fechaApiSchema,
  cliente: clienteDeLaFichaSchema,
  /** El de la **cuenta corriente**: `al_dia`, `pendiente`, `proxima_a_vencer` o `vencida`. */
  estado: z.string(),
  cumplimiento: cumplimientoDelClienteSchema,
  facturas: facturasDelClienteSchema,
  plata: plataDelClienteSchema,
  reembolsos: reembolsosDelClienteSchema,
  compras: comprasDelClienteSchema,
  /**
   * **Qué se lleva**, de mayor a menor plata. Vacío si todavía no compró nada.
   *
   * Trae también las que **dejó de llevar** —en cero en la ventana reciente y
   * con `tendencia: "parada"`—: una lista que solo muestra lo que compra no
   * puede avisar lo que dejó de comprar.
   *
   * Opcional, para no romper con un backend que todavía no lo manda.
   */
  especies: z.array(especieDelClienteSchema).nullish(),
});

export type ClienteDeLaFicha = z.infer<typeof clienteDeLaFichaSchema>;
export type CumplimientoDelCliente = z.infer<typeof cumplimientoDelClienteSchema>;
export type FacturasDelCliente = z.infer<typeof facturasDelClienteSchema>;
export type PlataDelCliente = z.infer<typeof plataDelClienteSchema>;
export type ReembolsosDelCliente = z.infer<typeof reembolsosDelClienteSchema>;
export type ComprasDelCliente = z.infer<typeof comprasDelClienteSchema>;
export type EspecieDelCliente = z.infer<typeof especieDelClienteSchema>;
export type FichaCliente = z.infer<typeof fichaClienteSchema>;

/** `true` si a este cliente no se le fía (`docs/bloquear_fiado.md`). */
export function sinFiado(cliente: ClienteDeLaFicha): boolean {
  return cliente.seLeFia === false;
}

/** `true` si su cuenta de la app está trabada por falta de DNI. */
export function cuentaBloqueada(cliente: ClienteDeLaFicha): boolean {
  return cliente.estado === EstadosAcceso.BLOQUEADO;
}

/**
 * El historial en dos palabras, para la tarjeta de arriba.
 *
 * ⚠️ **No sale de mirar si la demora es `null`.** Ese `null` no distingue al que
 * paga impecable del que no pagó nunca —a los dos les faltan promedios— y
 * confundirlos deja al peor cliente posible mejor parado que a uno que se
 * atrasa dos días. Sale de `comoPaga`, que para eso está.
 */
export function resumenDeAtraso(
  cumplimiento: CumplimientoDelCliente,
  facturas: FacturasDelCliente,
): string {
  const forma = comoPagaDe(cumplimiento, facturas);
  return forma === FormasDePagar.SE_ATRASA
    ? formatDias(cumplimiento.demoraCuandoSeAtrasa ?? null)
    : COMO_PAGA_CORTO[forma];
}

/**
 * Hace cuánto que está colgada su factura impaga más vieja.
 *
 * **Va siempre que exista, en rojo y aparte del historial**: es lo que está
 * pasando ahora, y es el número que el historial no puede mostrar. Un cliente
 * `siempre_en_fecha` puede tener esto en 20 días, y las dos cosas son ciertas.
 *
 * Se compara con `== null` y no con `=== null` a propósito: un servidor que
 * todavía no se reinició manda el campo **ausente**, no en `null`, y cualquier
 * cuenta sobre ese `undefined` termina en un `NaN` en pantalla.
 */
export function textoAtrasoActual(dias: number | null | undefined): string | null {
  if (dias == null) {
    return null;
  }
  return dias === 1 ? 'Debe hace 1 día' : `Debe hace ${dias} días`;
}

/**
 * Las cinco formas de pagar que reconoce el backend (`comoPaga`).
 *
 * Resumen en una palabra **qué clase de pagador es**, y con eso ya se sabe qué
 * escribir: es lo que evita tener que deducirlo cruzando demoras que pueden
 * venir en `null` con contadores.
 */
export const FormasDePagar = {
  /** Todavía no compró nada: no hay nada que medir. */
  SIN_FACTURAS: 'sin_facturas',
  /** Compró, pero todavía no le venció ninguna. */
  SIN_VENCIMIENTOS: 'sin_vencimientos',
  /** Ya se le venció algo y **no pagó una sola factura**. */
  NUNCA_PAGO: 'nunca_pago',
  /** Todo lo que pagó, lo pagó antes del vencimiento. */
  SIEMPRE_EN_FECHA: 'siempre_en_fecha',
  /** Paga, pero alguna la pagó tarde. */
  SE_ATRASA: 'se_atrasa',
} as const;

export type ComoPaga = (typeof FormasDePagar)[keyof typeof FormasDePagar];

/** Qué se escribe en cada caso. El de `se_atrasa` lleva los días al lado. */
export const COMO_PAGA_TEXTO: Record<ComoPaga, string> = {
  [FormasDePagar.SIN_FACTURAS]: 'Todavía no compró',
  [FormasDePagar.SIN_VENCIMIENTOS]: 'Sin vencimientos todavía',
  [FormasDePagar.NUNCA_PAGO]: 'Nunca pagó una factura',
  [FormasDePagar.SIEMPRE_EN_FECHA]: 'Siempre en fecha',
  [FormasDePagar.SE_ATRASA]: 'Se atrasa',
};

/** Lo mismo en dos palabras, para una tarjeta donde no entra una frase. */
export const COMO_PAGA_CORTO: Record<ComoPaga, string> = {
  [FormasDePagar.SIN_FACTURAS]: 'Sin compras',
  [FormasDePagar.SIN_VENCIMIENTOS]: 'Sin vencer',
  [FormasDePagar.NUNCA_PAGO]: 'Nunca pagó',
  [FormasDePagar.SIEMPRE_EN_FECHA]: 'Nunca',
  [FormasDePagar.SE_ATRASA]: 'Se atrasa',
};

function esComoPaga(valor: unknown): valor is ComoPaga {
  const conocidas: readonly string[] = Object.values(FormasDePagar);
  return typeof valor === 'string' && conocidas.includes(valor);
}

/**
 * Qué clase de pagador es. **Sale del backend**, que es donde vive la regla.
 *
 * El cálculo de acá es solo la red para el rato en que el servidor todavía no
 * manda el campo: sin esto, la ficha se quedaría sin la línea que más importa
 * justo después de un deploy. Es el **mismo orden de preguntas** que del otro
 * lado —primero si hay algo que medir, después si pagó alguna, y recién al final
 * si las pagó tarde—, porque preguntar por los atrasos antes que por los pagos
 * es exactamente el error que hacía ver impecable al que no pagó nunca.
 */
export function comoPagaDe(
  cumplimiento: CumplimientoDelCliente,
  facturas: FacturasDelCliente,
): ComoPaga {
  if (esComoPaga(cumplimiento.comoPaga)) {
    return cumplimiento.comoPaga;
  }
  if (facturas.total === 0) {
    return FormasDePagar.SIN_FACTURAS;
  }
  if (cumplimiento.exigibles === 0) {
    return FormasDePagar.SIN_VENCIMIENTOS;
  }
  if (facturas.pagadas === 0) {
    return FormasDePagar.NUNCA_PAGO;
  }
  return cumplimiento.tarde === 0 ? FormasDePagar.SIEMPRE_EN_FECHA : FormasDePagar.SE_ATRASA;
}

/**
 * El historial en una línea: "Siempre en fecha", "Se atrasa 21 días".
 *
 * ⚠️ Solo en la rama `se_atrasa` se nombra `demoraCuandoSeAtrasa`, que es la
 * única donde es un número seguro. En las otras cuatro es `null`, y cualquier
 * cuenta sobre ese `null` termina en un `NaN` en pantalla.
 */
export function textoComoPaga(
  cumplimiento: CumplimientoDelCliente,
  facturas: FacturasDelCliente,
): string {
  const forma = comoPagaDe(cumplimiento, facturas);
  return forma === FormasDePagar.SE_ATRASA
    ? `Se atrasa ${formatDias(cumplimiento.demoraCuandoSeAtrasa ?? null)}`
    : COMO_PAGA_TEXTO[forma];
}

/**
 * Cuánto falta —o hace cuánto pasó— el vencimiento impago más viejo.
 *
 * A diferencia del tablero, acá el número **puede ser positivo**: si el cliente
 * debe pero todavía está en fecha, lo que hay que decir es cuándo vence, no que
 * venció. Mismo signo que en toda la app: negativo es que ya pasó.
 */
export function textoVencimientoMasViejo(dias: number | null): string | null {
  if (dias === null) {
    return null;
  }
  if (dias === 0) {
    return 'Vence hoy';
  }
  if (dias < 0) {
    const pasados = Math.abs(dias);
    return pasados === 1 ? 'Venció ayer' : `Venció hace ${pasados} días`;
  }
  return dias === 1 ? 'Vence mañana' : `Vence en ${dias} días`;
}

/**
 * Cuántas facturas **todavía están corriendo**: emitidas, en fecha y sin pagar.
 *
 * Es la diferencia entre las que tuvo y las exigibles, y por eso `exigibles`
 * casi nunca es igual al total. Vale la pena mostrarla: explica por qué la tasa
 * se calcula sobre menos facturas de las que se ven en la cuenta.
 */
export function facturasEnCurso(
  cumplimiento: CumplimientoDelCliente,
  facturas: FacturasDelCliente,
): number {
  return Math.max(0, facturas.total - cumplimiento.exigibles);
}

/**
 * Un promedio, listo para mostrar: un decimal y coma. `null` sale como raya,
 * con el criterio de siempre — "no hay datos suficientes" no es "cero".
 */
export function formatPromedio(valor: number | null): string {
  return valor === null ? '—' : valor.toFixed(1).replace('.', ',');
}
