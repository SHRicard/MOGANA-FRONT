import { z } from 'zod';

/**
 * Fuente de verdad del apartado Avisos (`docs/notificaciones.md`).
 *
 * Son los avisos que le llegan a **quien pregunta**: el endpoint nunca lleva un
 * id de persona, sale de la sesión.
 *
 * Hay cinco tipos y **ninguno lo dispara el sistema solo**: la deuda vencida y
 * los anuncios los manda un administrador a mano, y los tres de pago los
 * disparan las dos puntas de un aviso de pago
 * (`docs/user_cliente_flujo.md` §11).
 *
 * ⚠️ **No son notificaciones push.** Esto es la campanita adentro de la app: el
 * teléfono no suena ni muestra nada si la app está cerrada. Para eso hace falta
 * Firebase y es otra funcionalidad.
 */

// ─────────────────────────────────────────────────────────────
// Qué clase de aviso es
// ─────────────────────────────────────────────────────────────
/**
 * Los cinco tipos de aviso (`docs/user_cliente_flujo.md` §11).
 *
 * ⚠️ **No todos son para el cliente**: `pago_informado` le llega al
 * administrador, y es el único aviso que dispara un cliente.
 *
 * El catálogo existe para decidir **a dónde lleva tocar un aviso**, no para
 * dibujarlo: el `titulo` y el `mensaje` ya vienen redactados, así que un tipo
 * que esta versión no conozca se muestra igual y se lee bien — solo no navega.
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

export type Notificacion = z.infer<typeof notificacionSchema>;
export type NotificacionesPagina = z.infer<typeof notificacionesPaginaSchema>;
export type LeerTodasRespuesta = z.infer<typeof leerTodasSchema>;

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
 * Es un **dato y no una navegación**: la feature de avisos no conoce los nombres
 * de las rutas, y la pantalla, que sí, lo traduce en una línea. Así este mapa se
 * lee y se testea sin montar un navigator.
 */
export type DestinoDeAviso =
  | { destino: 'factura'; facturaId: string }
  | { destino: 'facturas-vencidas' };

/**
 * Qué abrir al tocar un aviso (`docs/user_cliente_flujo.md` §11).
 *
 * ⚠️ **Se elige por `tipo`, nunca por qué campos trae `datos`.**
 *
 * Tres no llevan a ningún lado, y cada uno por su motivo:
 *
 * - `anuncio` no habla de nada en particular.
 * - `pago_informado` es el aviso que le llega **al administrador**, y su bandeja
 *   todavía no existe en la app.
 * - Un tipo que esta versión no conoce: el texto ya viene redactado y se lee
 *   igual, pero adivinar un destino sería peor que no moverse.
 */
export function destinoDeAviso(notificacion: Notificacion): DestinoDeAviso | null {
  if (notificacion.tipo === TiposNotificacion.DEUDA_VENCIDA) {
    return { destino: 'facturas-vencidas' };
  }

  if (esPagoResuelto(notificacion)) {
    const datos = datosDePagoDe(notificacion);
    return datos ? { destino: 'factura', facturaId: datos.facturaId } : null;
  }

  return null;
}
