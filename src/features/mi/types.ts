import { z } from 'zod';
// El dueño de "qué es una factura" es la facturación del panel: los estados y
// el cartel del vencimiento son EXACTAMENTE los mismos de los dos lados del
// mostrador, y el doc lo pide así — *"es el mismo chip que ve el administrador,
// así que los dos hablan de lo mismo cuando se llaman por teléfono"*
// (`docs/user_cliente_flujo.md` §3). Lo que NO se comparte son las palabras:
// las de acá le hablan a la persona que debe, no a quien cobra.
import {
  estadoCuentaSchema,
  estadoFacturaSchema,
  EstadosCuenta,
  EstadosFactura,
  type EstadoCuenta,
  type EstadoFactura,
} from '@/features/facturas';
import {
  fechaApiSchema,
  fechaPantallaSchema,
  formatMonto,
  montoSchema,
  parseAMonto,
  parseFechaPantalla,
} from '@/shared/utils';

/**
 * Fuente de verdad de **lo mío**: la vista del cliente sobre su propia cuenta
 * (`docs/user_cliente_flujo.md`).
 *
 * Es el otro lado de `/admin`. El administrador entra por
 * `/admin/clientes/:clienteId/…` y elige de quién habla; acá **no hay ningún id
 * de persona en ninguna URL**, ni lo va a haber: el dueño sale del token. Eso no
 * es una comodidad, es lo único que hace imposible el bug de mostrarle a alguien
 * la cuenta de otro.
 *
 * Seis reglas que valen para todo el archivo (§1.5 del doc):
 *
 * 1. **El dueño sale del token, nunca de la URL.**
 * 2. **La factura de otro devuelve `404`, no `403`**: un `403` le confirmaría a
 *    quien prueba ids que esa factura existe y es de alguien.
 * 3. Los importes son números y las fechas de negocio son texto `AAAA-MM-DD`.
 * 4. **`null` no es cero**: `proximoVencimiento: null` es *"no hay nada que
 *    vencer"*, y se lee "estás al día".
 * 5. **Los días llevan signo**: `0` vence hoy y **negativo ya venció**.
 * 6. **Ningún cálculo de plata acá**: todo lo que se muestra viene calculado.
 *
 * ⚠️ El `403` de `/mi` **no es "no tenés permiso"**: todo `/mi` lo puede usar
 * cualquier sesión, y el único que sale de acá es el del perfil incompleto, que
 * ya resuelve el `baseApi` volviendo a pedir la sesión (`docs/flujo_login.md`).
 */

// ─────────────────────────────────────────────────────────────
// Constantes del apartado
// ─────────────────────────────────────────────────────────────
/**
 * Facturas por página, igual que el resto de los listados de la app: una página
 * se recorre de un vistazo y el paginador queda fijo abajo. La API acepta de 1 a
 * 100 y usa 20 si no se manda.
 */
export const MIS_FACTURAS_LIMITE = 8;

/** Avisos de pago por página. Mismo criterio. */
export const MIS_AVISOS_LIMITE = 8;

/**
 * Cuántas facturas se asoman en el inicio. Cinco: las suficientes para
 * reconocer la última compra sin convertir la portada en el listado, que está a
 * un "ver todas" de distancia.
 */
export const ULTIMAS_EN_EL_INICIO = 5;

/** Topes del aviso de pago, los mismos que valida el backend. */
export const MAX_LARGO_REFERENCIA = 120;
export const MAX_LARGO_NOTA_AVISO = 500;

// ─────────────────────────────────────────────────────────────
// Cómo está mi cuenta, en palabras
// ─────────────────────────────────────────────────────────────
/**
 * El estado de la cuenta, **escrito para el que debe**.
 *
 * Es el mismo `estado` que ve el panel —sale de lo peor que haya sin pagar, no
 * del promedio ni de la última factura— pero dicho en segunda persona: el
 * encabezado del inicio es una frase, no una etiqueta. La etiqueta corta sigue
 * siendo la del badge.
 */
export const ESTADO_DE_MI_CUENTA: Record<EstadoCuenta, string> = {
  [EstadosCuenta.AL_DIA]: 'Estás al día',
  [EstadosCuenta.PENDIENTE]: 'Tenés facturas por pagar',
  [EstadosCuenta.PROXIMA_A_VENCER]: 'Vence pronto',
  [EstadosCuenta.VENCIDA]: 'Tenés algo vencido',
};

/**
 * La etiqueta corta de una factura, del lado del cliente.
 *
 * Difiere en una palabra de la del panel (`Por vencer`): a quien tiene que pagar
 * se le dice **cuándo**, no en qué casillero del tablero cayó.
 */
export const ESTADO_DE_MI_FACTURA: Record<EstadoFactura, string> = {
  [EstadosFactura.PENDIENTE]: 'Pendiente',
  [EstadosFactura.PROXIMA_A_VENCER]: 'Vence pronto',
  [EstadosFactura.VENCIDA]: 'Vencida',
  [EstadosFactura.PAGADA]: 'Pagada',
  [EstadosFactura.ANULADA]: 'Anulada',
};

/**
 * El cartel del vencimiento a partir de `diasParaVencer`: `-14` → "venció hace
 * 14 días", `0` → "vence hoy", `3` → "en 3 días".
 *
 * ⚠️ **Los días llevan signo y negativo ya venció.** Un `-14` que se muestra
 * como "quedan −14 días" es el error que el doc marca primero (§1.5).
 *
 * Se usa el número que manda el backend en vez de comparar contra la fecha del
 * teléfono: el estado lo calcula el servidor con SU reloj, y un celular con la
 * fecha corrida mostraría "vence mañana" al lado de un chip que dice "vencida".
 */
export function cuandoVence(dias: number): string {
  if (dias < 0) {
    const pasados = Math.abs(dias);
    return `venció hace ${pasados} ${pasados === 1 ? 'día' : 'días'}`;
  }
  if (dias === 0) {
    return 'vence hoy';
  }
  return `en ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

// ─────────────────────────────────────────────────────────────
// Cómo se avisa un pago
// ─────────────────────────────────────────────────────────────
/**
 * Los cinco medios de pago. **Es cerrado a propósito**: "transf.",
 * "transferencia bancaria" y "banco" son la misma cosa escrita de tres maneras
 * que después no se puede agrupar.
 *
 * `otro` está para no obligar a mentir — lo que no entre se explica en la
 * referencia o en la nota.
 */
export const MediosDePago = {
  TRANSFERENCIA: 'transferencia',
  EFECTIVO: 'efectivo',
  MERCADO_PAGO: 'mercado_pago',
  DEPOSITO: 'deposito',
  OTRO: 'otro',
} as const;

export const medioDePagoSchema = z.enum(MediosDePago);
export type MedioDePago = z.infer<typeof medioDePagoSchema>;

/** Cómo se escribe cada uno. La API manda el slug, no algo para mostrar. */
export const MEDIO_DE_PAGO_LABEL: Record<MedioDePago, string> = {
  [MediosDePago.TRANSFERENCIA]: 'Transferencia',
  [MediosDePago.EFECTIVO]: 'Efectivo',
  [MediosDePago.MERCADO_PAGO]: 'Mercado Pago',
  [MediosDePago.DEPOSITO]: 'Depósito',
  [MediosDePago.OTRO]: 'Otro',
};

/** En el orden en que se ofrecen: primero el que más se usa. */
export const MEDIOS_DE_PAGO: readonly MedioDePago[] = [
  MediosDePago.TRANSFERENCIA,
  MediosDePago.EFECTIVO,
  MediosDePago.MERCADO_PAGO,
  MediosDePago.DEPOSITO,
  MediosDePago.OTRO,
];

/**
 * En qué quedó un aviso de pago.
 *
 * ⚠️ **Avisar no descuenta nada.** El aviso queda en la bandeja del panel y la
 * deuda baja recién cuando un administrador lo confirma contra el resumen del
 * banco. Si el aviso descontara solo, cualquiera saldaría su cuenta escribiendo
 * un número en un formulario.
 */
export const EstadosDeAviso = {
  /** Todavía no lo miraron. */
  PENDIENTE: 'pendiente',
  /** Se anotó como cobro. El monto que entró puede no ser el que se informó. */
  CONFIRMADO: 'confirmado',
  /** No se tomó, y viene el motivo escrito. */
  RECHAZADO: 'rechazado',
} as const;

export const estadoDeAvisoSchema = z.enum(EstadosDeAviso);
export type EstadoDeAviso = z.infer<typeof estadoDeAvisoSchema>;

/**
 * Cómo se lee cada estado. Ninguno dice "pago": lo que se manda es un **aviso**,
 * y esa distinción es la que evita que alguien crea que ya saldó la factura.
 */
export const ESTADO_DE_AVISO_LABEL: Record<EstadoDeAviso, string> = {
  [EstadosDeAviso.PENDIENTE]: 'Esperando confirmación',
  [EstadosDeAviso.CONFIRMADO]: 'Tomado',
  [EstadosDeAviso.RECHAZADO]: 'No se tomó',
};

// ─────────────────────────────────────────────────────────────
// Qué le está pasando a lo que compro
// ─────────────────────────────────────────────────────────────
/**
 * El chip de cada especie, **decidido por unidades y no por plata**.
 *
 * Es el mismo catálogo cerrado que usa el panel, con **otras palabras**: acá se
 * le habla a la persona de lo que ella se lleva ("Estás llevando más"), no al
 * mostrador de cómo se mueve un producto ("Sube"). Por eso se declara acá y no
 * se importa de `admin`: son dos vocabularios distintos sobre el mismo dato, y
 * la vista del cliente no depende del panel (§13, el muro).
 */
export const Tendencias = {
  /** En la ventana anterior no llevó ninguna: no hay contra qué comparar. */
  NUEVA: 'nueva',
  /** Creció más de un 10 % contra el período anterior. */
  SUBE: 'sube',
  /** Se movió menos de un 10 %: es ruido, no una tendencia. */
  ESTABLE: 'estable',
  /** Cayó más de un 10 %. */
  BAJA: 'baja',
  /**
   * **No llevó ninguna.** Viene con `variacionCantidad: -100`, y mostrarla como
   * "bajó un 100 %" cuenta otra historia: no cayó, dejó de llevarla.
   */
  PARADA: 'parada',
} as const;

export type Tendencia = (typeof Tendencias)[keyof typeof Tendencias];

/** Cómo se le cuenta cada una a la persona. */
export const TENDENCIA_LABEL: Record<Tendencia, string> = {
  [Tendencias.NUEVA]: 'Empezaste a llevar esto',
  [Tendencias.SUBE]: 'Estás llevando más',
  [Tendencias.ESTABLE]: 'Igual que antes',
  [Tendencias.BAJA]: 'Estás llevando menos',
  [Tendencias.PARADA]: 'Hace tiempo que no lo llevás',
};

/**
 * La tendencia cruda de la API a la de la app, o `null` si no la conoce.
 *
 * Un valor nuevo del backend **no rompe la lista**: se dibuja el renglón sin
 * chip. Los números que están al lado dicen lo mismo, y un chip inventado no.
 */
export function aTendencia(valor: string): Tendencia | null {
  const conocidas: readonly string[] = Object.values(Tendencias);
  return conocidas.includes(valor) ? (valor as Tendencia) : null;
}

// ─────────────────────────────────────────────────────────────
// GET /mi/cuenta — cuánto debo (§4)
// ─────────────────────────────────────────────────────────────
/**
 * El encabezado del inicio. Una consulta agregada, sin filtros ni paginado: no
 * depende de qué esté mirando la persona.
 *
 * ⚠️ **`vencido + porVencer = deuda`, siempre**, y lo calcula el servidor a
 * propósito: restar plata en el teléfono es la forma más fácil de que el
 * encabezado y la lista no cierren.
 *
 * ⚠️ **`aReembolsar` va para el otro lado que `deuda`.** No se restan nunca en
 * la misma línea: son dos platas distintas, una que se debe y otra que se tiene
 * a favor.
 */
export const miCuentaSchema = z.object({
  /** Cuántas tiene. **No cuenta las anuladas.** */
  facturas: z.number(),
  /** De esas, cuántas siguen sin saldarse. */
  facturasImpagas: z.number(),
  /** Desde siempre. */
  totalFacturado: montoSchema,
  totalPagado: montoSchema,
  /** Lo que falta pagar en total. */
  deuda: montoSchema,
  /** De esa deuda, lo que **ya se pasó de fecha**. */
  vencido: montoSchema,
  /** Y lo que todavía tiene plazo. */
  porVencer: montoSchema,
  /**
   * Lo que el negocio **le tiene que devolver**: plata que pagó de facturas que
   * después se anularon. Se muestra como plata **a favor**, en una fila aparte y
   * solo si es mayor que cero — nunca restando de la deuda.
   */
  aReembolsar: montoSchema,
  /**
   * El vencimiento más urgente de lo que debe, o `null` si está al día.
   *
   * ⚠️ `null` **no es una fecha vacía**: es "no hay nada que vencer", y se
   * muestra como "estás al día".
   */
  proximoVencimiento: fechaApiSchema.nullable(),
  /** Días hasta ese vencimiento, **con signo**. `null` si no hay ninguno. */
  diasParaVencer: z.number().nullable(),
  estado: estadoCuentaSchema,
});

export type MiCuenta = z.infer<typeof miCuentaSchema>;

// ─────────────────────────────────────────────────────────────
// GET /mi/facturas — la lista (§5)
// ─────────────────────────────────────────────────────────────
/**
 * Un renglón de la lista. Es **liviano**: no trae los productos ni los cobros,
 * sino cuántos tiene y una línea para reconocer la factura.
 */
export const miFacturaDeLaListaSchema = z.object({
  id: z.string(),
  numero: z.number(),
  fechaEmision: fechaApiSchema,
  fechaFin: fechaApiSchema,
  estado: estadoFacturaSchema,
  /** Con signo: negativo ya venció. */
  diasParaVencer: z.number(),
  total: montoSchema,
  pagado: montoSchema,
  saldo: montoSchema,
  anulada: z.boolean(),
  aReembolsar: montoSchema,
  /** Cuántos renglones tiene, **no** los renglones. */
  items: z.number(),
  /** Cuántos cobros tiene anotados. */
  pagos: z.number(),
  /** El primer renglón más `+N` si hay más: `"4× Pack 6 gaseosas 500ml +2"`. */
  detalle: z.string(),
});

/**
 * Una página de facturas, la última primero.
 *
 * ⚠️ Sin resultados llega `paginas: 0`, **no `1`**: no hay ninguna página que
 * mostrar. Es un `200` con `datos: []`, no un `404`.
 */
export const misFacturasPaginaSchema = z.object({
  datos: z.array(miFacturaDeLaListaSchema),
  /** Cuántas hay **con el filtro puesto**, no cuántas tiene. */
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
  paginas: z.number(),
});

export type MiFacturaDeLaLista = z.infer<typeof miFacturaDeLaListaSchema>;
export type MisFacturasPagina = z.infer<typeof misFacturasPaginaSchema>;

// ─────────────────────────────────────────────────────────────
// GET /mi/facturas/:id — el detalle (§6)
// ─────────────────────────────────────────────────────────────
/** Un renglón de la factura, con la etiqueta con la que se agrupa. */
export const miItemSchema = z.object({
  id: z.string(),
  producto: z.string(),
  cantidad: z.number(),
  precioUnitario: montoSchema,
  subtotal: montoSchema,
  /**
   * La especie es la misma de "qué compro" (§10), así que se puede llevar de una
   * pantalla a la otra.
   */
  especie: z.object({ id: z.string(), nombre: z.string() }),
});

/** Un cobro anotado. Del más viejo al más nuevo: se lee como un extracto. */
export const miPagoSchema = z.object({
  id: z.string(),
  monto: montoSchema,
  fecha: fechaApiSchema,
});

/**
 * Una factura mía, entera.
 *
 * ⚠️ **Una anulada siempre tiene `saldo: 0`**: dejó de ser una deuda el día que
 * se dio de baja. Si tenía cobros, esa plata aparece en `aReembolsar` y va como
 * plata **a favor**, nunca restando de la deuda.
 *
 * ⚠️ **El motivo de la anulación no viene, y no es un olvido**: es una nota
 * escrita para adentro (§13). Que la factura figure anulada, sí; el motivo, no.
 */
export const miFacturaSchema = z.object({
  id: z.string(),
  numero: z.number(),
  fechaEmision: fechaApiSchema,
  fechaFin: fechaApiSchema,
  estado: estadoFacturaSchema,
  diasParaVencer: z.number(),
  total: montoSchema,
  pagado: montoSchema,
  saldo: montoSchema,
  /** El día del cobro que la terminó de saldar. `null` mientras deba algo. */
  pagadaEn: fechaApiSchema.nullable(),
  anulada: z.boolean(),
  anuladaEn: z.string().nullable(),
  aReembolsar: montoSchema,
  reembolsado: z.boolean(),
  /** La observación de la venta, la misma que está impresa en el papel. */
  notas: z.string().nullable(),
  /** En el orden en que se cargaron. */
  items: z.array(miItemSchema),
  /** Del más viejo al más nuevo. */
  pagos: z.array(miPagoSchema),
});

export type MiItem = z.infer<typeof miItemSchema>;
export type MiPago = z.infer<typeof miPagoSchema>;
export type MiFactura = z.infer<typeof miFacturaSchema>;

// ─────────────────────────────────────────────────────────────
// Los avisos de pago (§8 y §9)
// ─────────────────────────────────────────────────────────────
/**
 * Un aviso de pago y en qué quedó.
 *
 * Tres campos hacen la pantalla:
 *
 * - **`motivoRechazo`** es el más importante de todos: es lo único que explica
 *   por qué avisó que pagó y le sigue figurando la deuda. Va **entero**.
 * - **`montoCobrado`** es lo que se anotó de verdad, que puede no ser lo que se
 *   informó. Cuando difiere de `monto`, se muestran **los dos**.
 * - **`factura.saldo`** es el saldo de **hoy**, no el de cuando avisó.
 */
export const miAvisoDePagoSchema = z.object({
  id: z.string(),
  estado: estadoDeAvisoSchema,
  /** Lo que dijo el cliente. */
  monto: montoSchema,
  fecha: fechaApiSchema,
  medio: medioDePagoSchema,
  referencia: z.string().nullable(),
  nota: z.string().nullable(),
  /** Instantes, no días de calendario: llegan en ISO con hora. */
  informadoEn: z.string(),
  resueltoEn: z.string().nullable(),
  motivoRechazo: z.string().nullable(),
  /** Lo que se anotó de verdad. `null` mientras no esté confirmado. */
  montoCobrado: montoSchema.nullable(),
  factura: z.object({
    id: z.string(),
    numero: z.number(),
    total: montoSchema,
    /** El saldo de **hoy**, no el de cuando avisó. */
    saldo: montoSchema,
    fechaFin: fechaApiSchema,
  }),
});

/** Una página de avisos, el último primero. */
export const misAvisosPaginaSchema = z.object({
  datos: z.array(miAvisoDePagoSchema),
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
  paginas: z.number(),
});

export type MiAvisoDePago = z.infer<typeof miAvisoDePagoSchema>;
export type MisAvisosPagina = z.infer<typeof misAvisosPaginaSchema>;

/** `true` si el aviso todavía no lo miraron: es el que frena informar de más. */
export function avisoPendiente(aviso: MiAvisoDePago): boolean {
  return aviso.estado === EstadosDeAviso.PENDIENTE;
}

/**
 * `true` si lo que se anotó no es lo que se informó. Cuando pasa hay que mostrar
 * **los dos números**: la diferencia es justamente lo que explica por qué el
 * saldo no bajó lo esperado.
 */
export function seAnotoDistinto(aviso: MiAvisoDePago): boolean {
  return aviso.montoCobrado !== null && aviso.montoCobrado !== aviso.monto;
}

/**
 * Cuánto de esta factura ya se informó y todavía nadie resolvió.
 *
 * Es la única resta de plata que el front **sí** puede hacer, porque los dos
 * números ya vienen calculados: `saldo − yaInformado` es el máximo de lo que
 * queda por informar.
 *
 * ⚠️ **Lo informado y sin resolver cuenta como si estuviera cobrado.** Sin esa
 * regla, avisar tres veces el saldo entero pasaría las tres, y del otro lado
 * quedaría una bandeja con tres avisos de los que solo uno puede ser cierto.
 */
export function yaInformadoDe(avisos: readonly MiAvisoDePago[], facturaId: string): number {
  return avisos
    .filter((aviso) => avisoPendiente(aviso) && aviso.factura.id === facturaId)
    .reduce((suma, aviso) => suma + aviso.monto, 0);
}

// ─────────────────────────────────────────────────────────────
// GET /mi/compras — qué compro (§10)
// ─────────────────────────────────────────────────────────────
/**
 * Una especie que se lleva.
 *
 * ⚠️ **`variacionCantidad: null` no es 0 %.** Es que en la ventana anterior no
 * llevó ninguna, así que no hay contra qué comparar: para ese caso está el chip
 * `nueva`, y pintar un `0 %` o un `∞` ahí es un bug.
 */
export const especieQueComproSchema = z.object({
  especieId: z.string(),
  nombre: z.string(),
  /** **Desde siempre**, no de la ventana. */
  cantidad: z.number(),
  monto: montoSchema,
  /** En cuántas facturas apareció. */
  facturas: z.number(),
  /** Qué parte de `facturado` se fue en esto, de 0 a 100. */
  participacion: z.number().nullable(),
  ultimaCompra: fechaApiSchema,
  /**
   * Hace cuánto que no lleva **esta especie**.
   *
   * ⚠️ No es `compras.diasSinComprar`: se puede haber comprado ayer y hace ocho
   * meses no llevar gaseosa.
   */
  diasSinComprar: z.number(),
  /** Los últimos `ventanaDias` contra los `ventanaDias` anteriores. */
  reciente: z.object({ cantidad: z.number(), monto: montoSchema }),
  previo: z.object({ cantidad: z.number(), monto: montoSchema }),
  /** Cuánto cambió, en %, con un decimal. `null` = no hay contra qué comparar. */
  variacionCantidad: z.number().nullable(),
  variacionMonto: z.number().nullable(),
  /** Cruda: un valor que esta versión no conozca deja el renglón sin chip. */
  tendencia: z.string(),
});

/**
 * El ritmo de compra. Los `null` **no son ceros** y cada uno significa algo
 * distinto (§10):
 *
 * - `diasEntreCompras: null` → tiene una sola factura. Entre una compra y
 *   ninguna otra no hay intervalo que promediar.
 * - `comprasPorMes: null` → es cliente hace menos de un mes. Tres compras en
 *   cuatro días no son "22 compras por mes".
 *
 * En los dos casos **se oculta la fila**, no se muestra un cero.
 */
export const misComprasDelHistorialSchema = z.object({
  primeraCompra: fechaApiSchema.nullable(),
  ultimaCompra: fechaApiSchema.nullable(),
  diasSinComprar: z.number().nullable(),
  diasEntreCompras: z.number().nullable(),
  comprasPorMes: z.number().nullable(),
  antiguedadDias: z.number().nullable(),
});

/**
 * **Qué compro**: la única métrica que el cliente ve de sí mismo.
 *
 * Va sin nada de cómo paga —la tasa de cumplimiento, las demoras y el fiado son
 * el juicio que el negocio hace sobre él— y eso se queda del lado del panel
 * (§13).
 */
export const misComprasSchema = z.object({
  /** El día con el que se calculó todo. */
  hoy: fechaApiSchema,
  /** Los días de cada ventana de la tendencia. Hoy 90. */
  ventanaDias: z.number(),
  /** Lo facturado desde siempre. Es sobre esto que se calculan las `participacion`. */
  facturado: montoSchema,
  compras: misComprasDelHistorialSchema,
  /**
   * De mayor a menor plata, y las `participacion` suman 100.
   *
   * ⚠️ **Trae también lo que dejó de llevar**, en cero y con `parada`. No se
   * filtra por `reciente.cantidad === 0`: una lista que solo muestra lo que se
   * compra no puede mostrar lo que se dejó de comprar, que es la mitad de para
   * qué sirve la pantalla.
   */
  especies: z.array(especieQueComproSchema),
});

export type EspecieQueCompro = z.infer<typeof especieQueComproSchema>;
export type MisComprasDelHistorial = z.infer<typeof misComprasDelHistorialSchema>;
export type MisCompras = z.infer<typeof misComprasSchema>;

/** Hace cuánto que no lleva esta especie, en palabras. */
export function textoDesdeLaUltima(dias: number): string {
  if (dias === 0) {
    return 'Hoy';
  }
  return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
}

/**
 * Una participación como porcentaje con un decimal: `28.6` → `"28,6 %"`.
 *
 * `null` es "no se puede calcular" —no hay facturado contra qué medir—, y se
 * muestra con una raya en vez de un `0 %`, que diría algo falso.
 */
export function formatParticipacion(valor: number | null): string {
  if (valor === null) {
    return '—';
  }
  return `${valor.toFixed(1).replace('.', ',')} %`;
}

/**
 * La variación en %, con su signo: `12.5` → `"+12,5 %"`, `-8` → `"−8 %"`.
 *
 * `null` devuelve `null` y **no un `0 %`**: significa que no hay período
 * anterior contra el cual comparar (§10).
 */
export function formatVariacion(valor: number | null): string | null {
  if (valor === null) {
    return null;
  }
  const signo = valor > 0 ? '+' : valor < 0 ? '−' : '';
  const magnitud = Math.abs(valor).toFixed(1).replace('.', ',');
  return `${signo}${magnitud} %`;
}

// ─────────────────────────────────────────────────────────────
// Params que viajan a la API
// ─────────────────────────────────────────────────────────────
/**
 * Query de `GET /mi/facturas`.
 *
 * ⚠️ `desde`/`hasta` filtran por **fecha de emisión**, no de vencimiento: "qué
 * me facturaron en julio" se pide así, y "qué está vencido" se pide con
 * `estado`.
 */
export type ListarMisFacturasParams = {
  estado?: EstadoFactura;
  /** `AAAA-MM-DD`, con los dos extremos incluidos. */
  desde?: string;
  hasta?: string;
  pagina?: number;
  /** De 1 a 100. La API usa 20 si no se manda. */
  limite?: number;
};

/** Query de `GET /mi/pagos-informados`. Todo opcional. */
export type ListarMisAvisosParams = {
  estado?: EstadoDeAviso;
  pagina?: number;
  limite?: number;
};

/**
 * Los avisos **sin resolver**, que son los que frenan informar de más.
 *
 * Van sin paginar —el tope de la API es 100 y son los que todavía nadie miró—
 * porque hacen falta enteros para dos cosas: el renglón de *"avisaste …, sin
 * confirmar"* del detalle de una factura (§6) y el máximo del formulario, que es
 * `saldo − lo ya informado` (§8). Con una página de ocho, el máximo podría
 * quedar más alto de lo que el backend acepta.
 *
 * Es una constante a nivel de módulo y no un literal en cada hook: en RTK Query
 * el objeto de params **es la clave de cache**, y uno nuevo por render sería una
 * request nueva por render.
 */
export const AVISOS_SIN_RESOLVER: ListarMisAvisosParams = {
  estado: EstadosDeAviso.PENDIENTE,
  limite: 100,
};

// ─────────────────────────────────────────────────────────────
// El formulario de "avisar que pagué" (§8)
// ─────────────────────────────────────────────────────────────
/**
 * El aviso tal como se carga: el monto en pesos y la fecha en día/mes/año.
 *
 * Se validan como **texto** —no como el número ya convertido— para poder marcar
 * el campo exacto que está mal.
 */
const avisoBaseSchema = z.object({
  monto: z.string().refine((texto) => {
    const monto = parseAMonto(texto);
    return monto !== null && monto > 0;
  }, 'El monto tiene que ser mayor que cero, con hasta dos decimales.'),
  medio: medioDePagoSchema,
  /**
   * El día del **movimiento**, no el del aviso: la transferencia pudo salir el
   * viernes y el aviso llegar el lunes. Si se guardara la del aviso, una factura
   * pagada en fecha figuraría pagada tarde.
   */
  fecha: fechaPantallaSchema,
  /**
   * Opcional, pero **es lo único que le permite al negocio encontrar el
   * movimiento**: sin ella, confirmar el aviso obliga a revisar el resumen del
   * banco a ojo.
   */
  referencia: z
    .string()
    .trim()
    .max(MAX_LARGO_REFERENCIA, `Máximo ${MAX_LARGO_REFERENCIA} caracteres`),
  nota: z.string().trim().max(MAX_LARGO_NOTA_AVISO, `Máximo ${MAX_LARGO_NOTA_AVISO} caracteres`),
});

export type InformarPagoFormValues = z.infer<typeof avisoBaseSchema>;

/**
 * El schema del aviso para **una factura concreta**: hacen falta el máximo y el
 * día de emisión, que son los dos topes que dependen de la factura.
 *
 * Es una función y no una constante justamente por eso — el máximo cambia con
 * cada cobro anotado y con cada aviso sin resolver. Validarlo acá evita gastar
 * un request que volvería con ese mismo texto, y además marca el campo.
 *
 * @param maximo `saldo − lo ya informado y sin resolver`.
 * @param fechaEmision el día de la factura, en formato de API. Antes de eso la
 *   factura no existía, así que no se pudo pagar.
 */
export function crearInformarPagoSchema(maximo: number, fechaEmision: string) {
  return avisoBaseSchema
    .refine(
      (valores) => {
        const monto = parseAMonto(valores.monto);
        return monto === null || monto <= maximo;
      },
      {
        path: ['monto'],
        message: `No podés informar más de ${formatMonto(maximo)}.`,
      },
    )
    .refine(
      (valores) => {
        const fecha = parseFechaPantalla(valores.fecha);
        return fecha === null || fecha >= fechaEmision;
      },
      {
        path: ['fecha'],
        // Las fechas de API son `AAAA-MM-DD`, así que se comparan como texto sin
        // pasar por `Date`: el orden alfabético es el cronológico.
        message: 'Esa fecha es anterior a la factura.',
      },
    );
}

/** `POST /api/mi/facturas/:id/informar-pago`. La factura va en la URL. */
export type InformarPagoPayload = {
  facturaId: string;
  datos: {
    monto: number;
    medio: MedioDePago;
    /** `AAAA-MM-DD`. Sin esto, hoy. */
    fecha?: string;
    referencia?: string;
    nota?: string;
  };
};

/**
 * Formulario → cuerpo del POST.
 *
 * ⚠️ **El body no admite campos de más**: la validación corre con
 * `forbidNonWhitelisted`, así que mandar un `clienteId` o un `facturaId` de más
 * es un `400` en inglés (`property clienteId should not exist`), no un campo
 * ignorado en silencio. Por eso el id de la factura queda afuera del body.
 *
 * Los opcionales vacíos **se omiten** en vez de mandarse en blanco.
 *
 * Asume que los valores YA pasaron por `crearInformarPagoSchema`.
 */
export function aInformarPagoPayload(
  facturaId: string,
  valores: InformarPagoFormValues,
): InformarPagoPayload {
  const referencia = valores.referencia.trim();
  const nota = valores.nota.trim();

  return {
    facturaId,
    datos: {
      monto: parseAMonto(valores.monto) ?? 0,
      medio: valores.medio,
      fecha: parseFechaPantalla(valores.fecha) ?? undefined,
      ...(referencia ? { referencia } : {}),
      ...(nota ? { nota } : {}),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Lecturas de conveniencia
// ─────────────────────────────────────────────────────────────
/** `true` si la factura está dada de baja: no se cobra, no vence y no suma. */
export function esMiFacturaAnulada(factura: { anulada: boolean }): boolean {
  return factura.anulada;
}

/**
 * Si se puede avisar un pago de esta factura.
 *
 * Son las tres reglas del backend traídas acá para **no mostrar el botón** en
 * vez de mostrarlo y contestar con un `400` (§8): una anulada no hay que
 * pagarla, una saldada tampoco, y con todo el saldo ya informado no queda nada
 * por informar.
 */
export function puedoAvisarPago(factura: MiFactura, yaInformado: number): boolean {
  return !factura.anulada && factura.saldo > 0 && factura.saldo - yaInformado > 0;
}

/**
 * Qué decir de una factura anulada (§6).
 *
 * ```
 * anulada && aReembolsar > 0 && !reembolsado  → "Te devolvemos $ 21.450"
 * anulada && reembolsado                      → "Ya te lo devolvimos"
 * anulada && aReembolsar === 0                → solo el sello "Anulada"
 * ```
 */
export function textoDeLaAnulada(factura: MiFactura): string | null {
  if (!factura.anulada) {
    return null;
  }
  if (factura.reembolsado) {
    return 'Ya te lo devolvimos';
  }
  if (factura.aReembolsar > 0) {
    return `Te devolvemos ${formatMonto(factura.aReembolsar)}`;
  }
  return null;
}

/**
 * `true` si esta cuenta **todavía no tiene historia**: nunca se le facturó nada.
 *
 * Es distinto de estar al día, y confundirlos es lo que hace que alguien crea
 * que perdió sus facturas: "Estás al día" después de pagar todo, "Todavía no
 * tenés facturas" cuando nunca hubo ninguna (§15).
 */
export function sinFacturas(cuenta: MiCuenta): boolean {
  return cuenta.facturas === 0;
}

/** `true` si nunca compró nada: el vacío de "qué compro". */
export function sinCompras(compras: MisCompras): boolean {
  return compras.especies.length === 0;
}
