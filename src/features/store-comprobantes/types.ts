import { z } from 'zod';
import { fechaApiSchema, montoSchema } from '@/shared/utils';

/**
 * **El panel del store de comprobantes**
 * (`MORGANA-BACK/docs/flujo_comprobantes.md` §5).
 *
 * ⚠️ Nada de esto lo ve el cliente. Que su comprobante se haya borrado sí lo ve
 * —en su propio aviso, con el motivo—, pero cuánto ocupa el store y quién lo
 * limpia es del negocio.
 *
 * ⚠️ **No hay limpieza automática.** Nada se borra solo por el paso del tiempo:
 * es siempre alguien apretando un botón con el número delante. Es la misma
 * decisión que ya tomó el aviso de deuda —*el sistema no manda avisos solo*— y
 * por lo mismo: la retención es una decisión de negocio que cambia, y un cron
 * que ya borró no deja arrepentirse.
 */

// ─────────────────────────────────────────────────────────────
// Cuánto ocupa (§5.1)
// ─────────────────────────────────────────────────────────────
/**
 * Los cuatro tramos de antigüedad.
 *
 * Cuatro y no más: es la escala con la que se piensa "esto ya no me sirve". El
 * corte real del negocio está en los dos meses, y por eso `mas_de_dos_meses` es
 * un tramo abierto y no una serie que crecería para siempre.
 */
export const TramosDeAntiguedad = {
  ESTE_MES: 'este_mes',
  UN_MES: 'un_mes',
  DOS_MESES: 'dos_meses',
  MAS_DE_DOS_MESES: 'mas_de_dos_meses',
} as const;

export const tramoDeAntiguedadSchema = z.enum(TramosDeAntiguedad);
export type TramoDeAntiguedad = z.infer<typeof tramoDeAntiguedadSchema>;

/** Cómo se lee cada tramo. */
export const TRAMO_LABEL: Record<TramoDeAntiguedad, string> = {
  este_mes: 'De este mes',
  un_mes: 'De hace un mes',
  dos_meses: 'De hace dos meses',
  mas_de_dos_meses: 'De más de dos meses',
};

/** Cuántos meses de antigüedad representa cada tramo, para el criterio de limpieza. */
export const MESES_DEL_TRAMO: Record<TramoDeAntiguedad, number | null> = {
  // ⚠️ `null`: **este tramo no se puede limpiar**. El mínimo del backend son 30
  // días, así que ofrecer el botón acá sería ofrecer un `400`.
  este_mes: null,
  un_mes: 1,
  dos_meses: 2,
  mas_de_dos_meses: 2,
};

export const estadoDeAvisoSchema = z.enum(['pendiente', 'confirmado', 'rechazado']);
export type EstadoDeAviso = z.infer<typeof estadoDeAvisoSchema>;

export const ESTADO_DE_AVISO_LABEL: Record<EstadoDeAviso, string> = {
  pendiente: 'Sin resolver',
  confirmado: 'Confirmados',
  rechazado: 'Rechazados',
};

export const tramoDelStoreSchema = z.object({
  tramo: tramoDeAntiguedadSchema,
  comprobantes: z.number(),
  bytes: z.number(),
  /**
   * ⚠️ **`borrables` NO es lo mismo que `comprobantes`.** Es lo que una limpieza
   * se llevaría de verdad: descuenta los pendientes, que están protegidos.
   *
   * Es el número que va en el botón. Con el otro, el administrador aprieta
   * esperando liberar 49 MB, libera 47, y esa diferencia no tiene explicación en
   * ninguna parte de la pantalla.
   */
  borrables: z.number(),
  bytesBorrables: z.number(),
});

export type TramoDelStore = z.infer<typeof tramoDelStoreSchema>;

/**
 * El estado real de la cuenta de Cloudinary: los créditos, que son los que la
 * suspenden.
 */
export const cuentaDeCloudinarySchema = z.object({
  plan: z.string(),
  creditosUsados: z.number(),
  creditosDelPlan: z.number(),
  porcentajeUsado: z.number(),
  almacenamientoBytes: z.number(),
  anchoDeBandaBytes: z.number(),
  /** Cuántos archivos hay en la cuenta, los que esta app no explica incluidos. */
  recursos: z.number(),
  /** Cuándo se leyó de Cloudinary: puede ser de hasta diez minutos atrás. */
  medidoEn: z.string(),
});

export type CuentaDeCloudinary = z.infer<typeof cuentaDeCloudinarySchema>;

export const consumoDelStoreSchema = z.object({
  /**
   * Lo que subió **esta app**, que es lo único que se puede limpiar desde acá.
   *
   * Es exacto, instantáneo y el único que sabe cortar por estado del aviso
   * —Cloudinary no tiene idea de qué es un aviso "pendiente"—. **Es el número
   * con el que se decide qué borrar.**
   */
  propio: z.object({
    comprobantes: z.number(),
    bytes: z.number(),
    masViejo: z.string().nullish(),
    porAntiguedad: z.array(tramoDelStoreSchema),
    porEstado: z.array(
      z.object({ estado: estadoDeAvisoSchema, comprobantes: z.number(), bytes: z.number() }),
    ),
    /** Los que ya se soltaron: cuántos eran y cuánta cuota liberaron. */
    borrados: z.object({ comprobantes: z.number(), bytes: z.number() }),
  }),
  /**
   * ⚠️ **Puede venir en `null`**: el store sin configurar, o la API de Cloudinary
   * que no contestó. La pantalla tiene que seguir mostrando `propio` igual — no
   * puede caerse porque un tercero esté lento.
   */
  cuenta: cuentaDeCloudinarySchema.nullish(),
});

export type ConsumoDelStore = z.infer<typeof consumoDelStoreSchema>;

/**
 * Archivos que hay en la cuenta y que **ningún aviso explica**.
 *
 * Es la diferencia entre lo que ve Cloudinary y lo que esta app sabe que subió.
 * Vale mostrarla cuando es grande: son bytes pagos que no le sirven a nadie y
 * que hoy solo se limpian a mano desde la consola de Cloudinary.
 *
 * Devuelve `0` sin `cuenta` —no hay con qué comparar— y nunca un negativo: un
 * `propio` mayor que `recursos` significa que Cloudinary está midiendo viejo, no
 * que sobren archivos del otro lado.
 */
export function huerfanos(consumo: ConsumoDelStore): number {
  if (!consumo.cuenta) {
    return 0;
  }
  return Math.max(0, consumo.cuenta.recursos - consumo.propio.comprobantes);
}

// ─────────────────────────────────────────────────────────────
// La lista (§5.2)
// ─────────────────────────────────────────────────────────────
export const comprobanteEnElStoreSchema = z.object({
  avisoId: z.string(),
  estadoDelAviso: estadoDeAvisoSchema,
  informadoEn: z.string(),
  cliente: z.object({ id: z.string(), displayName: z.string().nullish() }),
  facturaNumero: z.number(),
  monto: montoSchema,
  bytes: z.number(),
  formato: z.string(),
  subidoEn: z.string(),
  borradoEn: z.string().nullish(),
  borradoPor: z.string().nullish(),
  /** Firmada y de una hora. `null` si la imagen ya se borró. */
  url: z.string().nullish(),
  miniatura: z.string().nullish(),
});

export type ComprobanteEnElStore = z.infer<typeof comprobanteEnElStoreSchema>;

export const listaDeComprobantesSchema = z.object({
  datos: z.array(comprobanteEnElStoreSchema),
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
  paginas: z.number(),
  /**
   * Los bytes **del filtro entero**, no de la página: es con lo que se decide, y
   * no puede cambiar al pasar de página.
   */
  bytes: z.number(),
});

export type ListaDeComprobantes = z.infer<typeof listaDeComprobantesSchema>;

/** `true` si el archivo ya se soltó del store. */
export function estaBorrado(comprobante: ComprobanteEnElStore): boolean {
  return Boolean(comprobante.borradoEn);
}

/**
 * Si este comprobante se puede borrar de a uno.
 *
 * ⚠️ **Los de un aviso pendiente, no**: su imagen es la única evidencia con la
 * que todavía hay que decidir. Si el cliente subió algo que no corresponde, el
 * camino es **rechazar el aviso** —que borra la imagen y de paso le explica por
 * qué—, no borrarla por atrás.
 */
export function sePuedeBorrar(comprobante: ComprobanteEnElStore): boolean {
  return !estaBorrado(comprobante) && comprobante.estadoDelAviso !== 'pendiente';
}

export type ListarComprobantesParams = {
  antiguedad?: TramoDeAntiguedad;
  /** `AAAA-MM-DD`. */
  anterioresA?: string;
  estado?: EstadoDeAviso;
  /** `true` para ver también los ya soltados. Por defecto solo lo que ocupa. */
  incluirBorrados?: boolean;
  pagina?: number;
  /** De 1 a 100. */
  limite?: number;
};

/** Cuántos por página en el listado del store. */
export const COMPROBANTES_DEL_STORE_LIMITE = 20;

// ─────────────────────────────────────────────────────────────
// Limpiar (§5.3 y §5.4)
// ─────────────────────────────────────────────────────────────
/**
 * Los estados que **se pueden** limpiar.
 *
 * ⚠️ `pendiente` no está, y no es un olvido: su comprobante es la única
 * evidencia con la que se va a decidir, y borrarlo convierte un aviso resoluble
 * en uno que ya no se puede resolver. El backend tampoco lo acepta pidiéndolo a
 * propósito.
 */
export const ESTADOS_QUE_SE_LIMPIAN: readonly EstadoDeAviso[] = ['confirmado', 'rechazado'];

/**
 * Cuánto tiene que haber pasado para que un comprobante se pueda barrer en masa.
 *
 * Es la guarda contra el error de tipeo: escribir `2026-08-30` donde iba
 * `2026-06-30` es un mes entero de comprobantes que ya no vuelven. Con esto, ese
 * error se convierte en un mensaje.
 */
export const DIAS_MINIMOS_PARA_LIMPIAR = 30;

/**
 * **El criterio de la limpieza.** El mismo objeto va a la vista previa y al
 * borrado, y eso es a propósito: así no hay forma de que el cartel diga una cosa
 * y el borrado haga otra.
 */
export type CriterioDeLimpieza = {
  /** Borrar lo anterior a tantos meses. Es la forma en que se piensa el criterio. */
  meses?: number;
  /** O la fecha exacta, `AAAA-MM-DD`. Excluyente con `meses`. */
  anterioresA?: string;
  /** Qué estados se llevan. Sin esto, los dos que se pueden. */
  estados?: EstadoDeAviso[];
};

/** Lo que se manda al borrado: el criterio más las dos guardas. */
export type LimpiezaPayload = CriterioDeLimpieza & {
  /** El "no lo apreté sin querer". Obligatorio: sin esto el backend contesta 400. */
  confirmo: true;
  /**
   * Cuántos decía la vista previa.
   *
   * **Se manda siempre.** Es lo que hace que la vista previa sea vinculante y no
   * decorativa: entre que se abre el cartel y se aprieta el botón puede haberse
   * resuelto un aviso, y ahí el número que se confirmó ya no es el que se va a
   * borrar. Si no coincide, el backend contesta `409` y hay que volver a mirar.
   */
  comprobantesEsperados: number;
};

export const vistaPreviaDeLimpiezaSchema = z.object({
  comprobantes: z.number(),
  bytes: z.number(),
  /** El más viejo y el más nuevo que entran, para reconocer el rango de un vistazo. */
  desde: z.string().nullish(),
  hasta: z.string().nullish(),
  clientes: z.number(),
  porEstado: z.array(z.object({ estado: z.string(), comprobantes: z.number(), bytes: z.number() })),
  /**
   * Lo que el criterio agarró pero la guarda está frenando.
   *
   * ⚠️ **Se dice en voz alta.** Un número que aparece sin explicación se lee como
   * un bug, y quien mira va a pensar que la limpieza no funcionó.
   */
  protegidos: z.object({ pendientes: z.number(), bytes: z.number() }),
  /**
   * Los cinco más viejos y los cinco más nuevos que se irían.
   *
   * Es lo que permite darse cuenta de que el filtro no es el que se quiso
   * **antes** de apretar, y no después.
   */
  muestra: z.array(
    z.object({
      avisoId: z.string(),
      facturaNumero: z.number(),
      cliente: z.string().nullish(),
      informadoEn: z.string(),
      bytes: z.number(),
    }),
  ),
});

export type VistaPreviaDeLimpieza = z.infer<typeof vistaPreviaDeLimpiezaSchema>;

/**
 * **Cuántos se pueden tildar de una vez.**
 *
 * Es el tope del backend, y no está puesto al azar: es lo que entra en una
 * página del listado del panel, así que *"seleccionar todo lo que veo"* siempre
 * entra en un pedido. Más que eso ya no es una selección a mano — es un
 * criterio, y para eso está la limpieza por antigüedad.
 */
export const MAX_SELECCION = 100;

/** `POST /admin/comprobantes/borrar`. Los ids de los AVISOS, no de las imágenes. */
export type BorrarSeleccionPayload = {
  /**
   * El comprobante vive adentro del aviso y no tiene id propio, así que lo que
   * se manda son ids de avisos.
   */
  avisoIds: string[];
};

export const limpiezaHechaSchema = z.object({
  pedidos: z.number(),
  borrados: z.number(),
  fallados: z.number(),
  bytesLiberados: z.number(),
  lotes: z.number(),
  /**
   * Cuántos quedaron sin tocar por el tope de la pasada (500).
   *
   * Mientras sea mayor que cero, se aprieta de nuevo. Es idempotente: correrlo
   * dos veces con el mismo criterio da `borrados: 0` la segunda.
   */
  restan: z.number(),
  /** Los `publicId` que no se pudieron borrar. Sin esto, las fallas son un misterio. */
  detalle: z.array(z.string()),
});

export type LimpiezaHecha = z.infer<typeof limpiezaHechaSchema>;

/** `true` si la vista previa no encontró nada: no hay botón que apretar. */
export function noHayNadaQueBorrar(previa: VistaPreviaDeLimpieza): boolean {
  return previa.comprobantes === 0;
}

// ─────────────────────────────────────────────────────────────
// Qué tan lleno está
// ─────────────────────────────────────────────────────────────
/**
 * Dónde empieza a preocupar el consumo de la cuenta.
 *
 * No son porcentajes elegidos a ojo: **75%** es cuando conviene mirar el panel
 * de vez en cuando, y **90%** es cuando queda alrededor de un mes de subidas
 * antes de que el store empiece a rechazar. Son los dos momentos en los que hay
 * que hacer algo distinto, así que son los dos cortes.
 *
 * Viven acá y no en el componente porque **es una decisión de negocio**: el día
 * que el plan cambie, lo que se mueve es esto, no un dibujo.
 */
export const USO_QUE_PIDE_ATENCION = 75;
export const USO_CRITICO = 90;

/** En qué zona está el consumo. */
export const NivelesDeUso = {
  HOLGADO: 'holgado',
  ATENCION: 'atencion',
  CRITICO: 'critico',
} as const;

export type NivelDeUso = (typeof NivelesDeUso)[keyof typeof NivelesDeUso];

/**
 * Qué tan lleno está, en las tres zonas que cambian lo que hay que hacer.
 *
 * ⚠️ **Recorta el valor a 0–100.** Un backend que devuelva 103 —los créditos se
 * pueden pasar del plan— no puede pintar fuera del riel, y un negativo no puede
 * dibujar hacia atrás.
 */
export function nivelDeUso(porcentaje: number): NivelDeUso {
  const usado = porcentajeUsable(porcentaje);

  if (usado >= USO_CRITICO) {
    return NivelesDeUso.CRITICO;
  }
  if (usado >= USO_QUE_PIDE_ATENCION) {
    return NivelesDeUso.ATENCION;
  }
  return NivelesDeUso.HOLGADO;
}

/** El porcentaje ya recortado a 0–100, listo para dibujar. */
export function porcentajeUsable(porcentaje: number): number {
  if (!Number.isFinite(porcentaje)) {
    return 0;
  }
  return Math.min(100, Math.max(0, porcentaje));
}

/** Qué decir de cada zona. El color no puede ser lo único que lo diga. */
export const NIVEL_DE_USO_LABEL: Record<NivelDeUso, string> = {
  holgado: 'Tenés lugar de sobra',
  atencion: 'Conviene ir liberando',
  critico: 'Te estás quedando sin lugar',
};

/** El fechaApiSchema se re-exporta para tenerlo a mano al armar criterios. */
export { fechaApiSchema };
