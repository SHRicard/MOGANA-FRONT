import { z } from 'zod';

/**
 * Fuente de verdad del apartado Avisos (`docs/notificaciones.md`).
 *
 * Son los avisos que le llegan a **quien pregunta**: el endpoint nunca lleva un
 * id de persona, sale de la sesión.
 *
 * Hay ocho tipos. Siete los dispara una persona —la deuda vencida y los anuncios
 * los manda un administrador a mano, los tres de pago los disparan las dos
 * puntas de un aviso de pago, y los dos de mensajes, las dos puntas del chat—;
 * el octavo, `store_lleno`, lo publica un cron cuando el almacenamiento se
 * acerca al límite.
 *
 * ⚠️ **No son notificaciones push.** Esto es la campanita adentro de la app: el
 * teléfono no suena ni muestra nada si la app está cerrada. Para eso hace falta
 * Firebase y es otra funcionalidad.
 */

// ─────────────────────────────────────────────────────────────
// Qué clase de aviso es
// ─────────────────────────────────────────────────────────────
/**
 * Los ocho tipos de aviso (`docs/notificaciones.md`).
 *
 * ⚠️ **No todos son para el cliente**: `pago_informado` le llega al
 * administrador —y es el único que dispara un cliente—, y `store_lleno` es del
 * administrador y de nadie más.
 *
 * ⚠️ **El catálogo ya NO decide a dónde lleva tocar un aviso.** Eso lo resuelve
 * el backend y viaja en `destino` (ver `notificacionSchema`). Los tipos quedan
 * para lo poco que sigue dependiendo de qué clase de aviso es: qué cache
 * invalidar al leerlo. Duplicar el mapeo acá es exactamente lo que `destino`
 * vino a evitar — se desactualiza el día que se agrega un tipo, y nadie se
 * entera hasta que un clic no lleva a ningún lado.
 */
export const TiposNotificacion = {
  /** Al cliente: un administrador apretó "avisar deuda". */
  DEUDA_VENCIDA: 'deuda_vencida',
  /** A todos los clientes: el negocio publicó algo. No lleva a ningún lado. */
  ANUNCIO: 'anuncio',
  /** **Al administrador**: un cliente avisó que pagó. */
  PAGO_INFORMADO: 'pago_informado',
  /** Al cliente: se le tomó el pago. */
  PAGO_CONFIRMADO: 'pago_confirmado',
  /** Al cliente: no se le tomó, con el motivo en el `mensaje`. */
  PAGO_RECHAZADO: 'pago_rechazado',
  /**
   * **Al administrador**: se está llenando el lugar para comprobantes.
   *
   * Es el único que **ningún cliente puede recibir** —el otro lado, el
   * `pago_informado`, sí lo dispara un cliente— y el único que manda el sistema
   * solo: lo publica un cron cuando el store se acerca al límite.
   *
   * ⚠️ **Vuelve al día siguiente si el problema sigue**, aunque se lo borre. Es a
   * propósito: el almacenamiento no se arregla descartando el aviso, y callarse
   * una semana sobre algo urgente porque alguien lo descartó sería peor.
   */
  STORE_LLENO: 'store_lleno',
  /**
   * **Al administrador**: un cliente escribió al negocio.
   *
   * Le llega a **todos** los administradores, como el aviso de pago: quién
   * atiende la bandeja depende del día. El aviso **pisa en vez de apilarse** —
   * hay uno vivo por cliente que escribió—, así que diez mensajes seguidos de la
   * misma persona son un aviso que dice "(10)", no diez avisos.
   */
  MENSAJE_DEL_CLIENTE: 'mensaje_del_cliente',
  /** Al cliente: el local le escribió, contestando o empezando. */
  MENSAJE_DEL_NEGOCIO: 'mensaje_del_negocio',
} as const;

export type TipoNotificacion = (typeof TiposNotificacion)[keyof typeof TiposNotificacion];

/**
 * Los datos que viajan en los **tres avisos de pago**.
 *
 * Alcanzan para que tocar el aviso lleve directo a la factura sin leer el texto.
 *
 * ⚠️ En `pago_confirmado`, `monto` es **lo que se anotó**, no lo que se informó.
 * Pueden no coincidir, y esa diferencia es justamente lo que explica por qué el
 * saldo no bajó lo esperado.
 */
export const datosDePagoSchema = z.object({
  pagoInformadoId: z.string(),
  facturaId: z.string(),
  facturaNumero: z.number(),
  monto: z.number(),
  fecha: z.string(),
});

export type DatosDePago = z.infer<typeof datosDePagoSchema>;

// ─────────────────────────────────────────────────────────────
// Constantes del listado
// ─────────────────────────────────────────────────────────────
/**
 * Avisos por página. Ocho, como el resto de los listados de la app: una página
 * se recorre de un vistazo y el paginador queda fijo abajo.
 *
 * La API acepta de 1 a 100 y usa 20 si no se manda.
 */
export const NOTIFICACIONES_LIMITE = 8;

/**
 * Lo que pide la campanita: una sola fila.
 *
 * No se traen los ocho avisos para mostrar un número — `noLeidas` viene en la
 * respuesta y cuenta **todas** las sin leer de la cuenta, no las de esta página.
 * Con `limite: 1` la request es mínima y el globito no depende de que alguien
 * haya abierto la pantalla.
 */
export const PARAMS_GLOBITO = { pagina: 1, limite: 1 } as const;

// ─────────────────────────────────────────────────────────────
// Respuestas de la API
// ─────────────────────────────────────────────────────────────
/**
 * **A dónde lleva tocar un aviso**, resuelto por el backend
 * (`docs/notificaciones.md`).
 *
 * | `pantalla` | Es de | Qué abre | `id` |
 * |---|---|---|---|
 * | `mis_facturas` | cliente | La lista de sus facturas | siempre `null` |
 * | `una_factura` | cliente | Una factura | el id de la **factura** |
 * | `bandeja_de_pagos` | administrador | La bandeja de avisos de pago | el id del **aviso** |
 * | `store_de_comprobantes` | administrador | El panel del almacenamiento | siempre `null` |
 * | `mis_mensajes` | cliente | Su hilo con el local | siempre `null` |
 * | `bandeja_de_mensajes` | administrador | El hilo de un cliente | el id del **cliente** |
 *
 * ⚠️ **`pantalla` se valida como texto libre, no como enum.** Una versión más
 * nueva del backend puede mandar una pantalla que esta build no conoce, y eso no
 * puede tirar abajo la lista entera: el aviso se lee igual, solo no navega.
 *
 * ⚠️ **`id` puede venir `null` en una pantalla que normalmente lo lleva**: son
 * los avisos guardados antes de que `datos` trajera ese campo. Ahí se cae en la
 * pantalla sin nada abierto —la lista de facturas, la bandeja completa— en vez
 * de romper.
 */
export const PantallasDeAviso = {
  MIS_FACTURAS: 'mis_facturas',
  UNA_FACTURA: 'una_factura',
  BANDEJA_DE_PAGOS: 'bandeja_de_pagos',
  STORE_DE_COMPROBANTES: 'store_de_comprobantes',
  /** El chat del cliente con el negocio. **Es uno solo: nunca lleva id.** */
  MIS_MENSAJES: 'mis_mensajes',
  /** La bandeja de mensajes del panel: el `id` es **el cliente**, no el mensaje. */
  BANDEJA_DE_MENSAJES: 'bandeja_de_mensajes',
} as const;

export type PantallaDeAviso = (typeof PantallasDeAviso)[keyof typeof PantallasDeAviso];

export const destinoSchema = z.object({
  pantalla: z.string(),
  id: z.string().nullish(),
});

export type DestinoDeAviso = z.infer<typeof destinoSchema>;

/** Un aviso. */
export const notificacionSchema = z.object({
  id: z.string(),
  /**
   * Qué clase de aviso es (ver `TiposNotificacion`).
   *
   * Se valida como `string` y no con un enum a propósito: un tipo nuevo del
   * backend tiraría abajo la lista entera y dejaría a la persona sin ver
   * ninguno. Como el texto ya viene redactado, un aviso de un tipo que la app no
   * conoce **se muestra igual y se lee bien** — lo único que no hace es llevar a
   * ninguna pantalla.
   */
  tipo: z.string(),
  /** Ya redactados por el backend: se muestran tal cual. Son el mismo texto del correo. */
  titulo: z.string(),
  mensaje: z.string(),
  /** `null` = sin leer. */
  leidaEn: z.string().nullish(),
  createdAt: z.string(),

  /**
   * El payload del aviso. **Tiene una forma distinta según el `tipo`**, así que
   * se valida sin forma y se lee con `datosDePagoDe`, que elige por tipo.
   *
   * ⚠️ **No se muestra, se usa para navegar.** Es *una foto del momento*, no la
   * deuda de ahora: si el cliente pagó después, el aviso viejo sigue diciendo lo
   * de antes. Pintar ese número en grande sería mostrar un saldo falso al lado
   * de una pantalla que dice otro. El `mensaje` ya cuenta lo mismo en palabras y
   * fechado; de acá sale el id de la factura, y nada más.
   */
  datos: z.unknown().nullish(),

  /**
   * **A dónde lleva el clic.** `null` es un aviso que no abre nada —un anuncio
   * es texto y nada más—.
   *
   * ⚠️ Lo resuelve **el backend**, y por eso la app no mira el `tipo` para
   * navegar: duplicar ese mapeo acá se desactualiza el día que se agrega un tipo
   * nuevo, y nadie se entera hasta que un clic no lleva a ningún lado.
   *
   * ⚠️ Es `nullish` y no obligatorio también por los avisos viejos, anteriores a
   * que este campo existiera: se leen igual, solo no navegan.
   */
  destino: destinoSchema.nullish(),
});

/**
 * Una página de avisos, **del más nuevo al más viejo**. Sin ninguno llega `200`
 * con `datos: []`, no un 404.
 */
export const notificacionesPaginaSchema = z.object({
  datos: z.array(notificacionSchema),
  total: z.number(),
  /**
   * El número del globito. Cuenta **todas** las sin leer de la cuenta, no las de
   * esta página ni las del filtro.
   */
  noLeidas: z.number(),
  pagina: z.number(),
  limite: z.number(),
  /** Cantidad de páginas. Con `<= 1` la paginación no se dibuja. */
  paginas: z.number(),
});

/** Lo que devuelve "marcar todas": cuántas marcó. */
export const leerTodasSchema = z.object({
  leidas: z.number(),
});

/** Lo que devuelve borrar uno. Idempotente: borrarlo dos veces dice lo mismo. */
export const borradaSchema = z.object({
  borrada: z.boolean(),
});

/** Lo que devuelve vaciar la campanita: cuántas se fueron. */
export const borradasSchema = z.object({
  borradas: z.number(),
});

export type Notificacion = z.infer<typeof notificacionSchema>;
export type NotificacionesPagina = z.infer<typeof notificacionesPaginaSchema>;
export type LeerTodasRespuesta = z.infer<typeof leerTodasSchema>;
export type BorradaRespuesta = z.infer<typeof borradaSchema>;
export type BorradasRespuesta = z.infer<typeof borradasSchema>;

// ─────────────────────────────────────────────────────────────
// Params que viajan a la API
// ─────────────────────────────────────────────────────────────
/** Query de `GET /api/notificaciones`. Todo opcional: sin nada, la primera página. */
export type ListarNotificacionesParams = {
  /** `true` deja solo las nuevas: es la pestaña "Sin leer". */
  soloNoLeidas?: boolean;
  /** Desde 1. */
  pagina?: number;
  /** De 1 a 100. La API usa 20 si no se manda. */
  limite?: number;
};

// ─────────────────────────────────────────────────────────────
// Cómo se lee un aviso
// ─────────────────────────────────────────────────────────────
/**
 * `true` si todavía no lo leyó.
 *
 * Se pregunta por `leidaEn` y no por un booleano porque es lo que manda la API:
 * la fecha de la primera lectura. Marcar dos veces no la cambia.
 */
export function sinLeer(notificacion: Notificacion): boolean {
  return notificacion.leidaEn === null || notificacion.leidaEn === undefined;
}

/**
 * Los datos de un aviso **de pago**, o `null` si este aviso no es de esos.
 *
 * ⚠️ **Se elige por `tipo`, nunca por qué campos vinieron**: `datos` tiene una
 * forma distinta según el tipo, y un `deuda_vencida` también trae un objeto.
 *
 * Si el payload no encaja no se rompe nada: devuelve `null` y el aviso queda
 * como uno que no lleva a ningún lado. El texto sigue diciendo lo mismo.
 */
export function datosDePagoDe(notificacion: Notificacion): DatosDePago | null {
  const deLosDePago: readonly string[] = [
    TiposNotificacion.PAGO_INFORMADO,
    TiposNotificacion.PAGO_CONFIRMADO,
    TiposNotificacion.PAGO_RECHAZADO,
  ];
  if (!deLosDePago.includes(notificacion.tipo)) {
    return null;
  }

  const leido = datosDePagoSchema.safeParse(notificacion.datos);
  return leido.success ? leido.data : null;
}

/**
 * `true` si el aviso dice que **se resolvió** un pago informado: se tomó o no se
 * tomó.
 *
 * Es el único momento en que la cuenta del cliente cambia sin que él haga nada,
 * así que leer uno de estos es lo que dispara refrescar lo suyo
 * (`docs/user_cliente_flujo.md` §12).
 */
export function esPagoResuelto(notificacion: Notificacion): boolean {
  return (
    notificacion.tipo === TiposNotificacion.PAGO_CONFIRMADO ||
    notificacion.tipo === TiposNotificacion.PAGO_RECHAZADO
  );
}

/**
 * A dónde lleva tocar un aviso, o `null` si no lleva a ningún lado.
 *
 * ⚠️ **Sale del `destino` que manda el backend**, no del `tipo`. Antes se
 * deducía acá con un `switch`, y el doc pide expresamente que no: duplicado del
 * lado de la app, ese mapeo se desactualiza el día que se agrega un tipo nuevo
 * —`store_lleno` fue justamente ese día— y nadie se entera hasta que un clic no
 * lleva a ningún lado.
 *
 * Sigue siendo un **dato y no una navegación**: esta feature no conoce los
 * nombres de las rutas, y la pantalla, que sí, traduce `pantalla` a ruta en un
 * solo mapa.
 */
export function destinoDeAviso(notificacion: Notificacion): DestinoDeAviso | null {
  return notificacion.destino ?? null;
}

/**
 * `true` si tocarlo abre algo.
 *
 * Es lo que decide si la fila se dibuja como **tocable**: un aviso que parece un
 * botón y no hace nada se siente roto, y un anuncio que se ve como texto, no.
 */
export function llevaAAlgunLado(notificacion: Notificacion): boolean {
  return Boolean(notificacion.destino?.pantalla);
}
