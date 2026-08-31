import { z } from 'zod';
import { estadoAccesoSchema, EstadosAcceso, Roles, type Rol } from '@/features/auth';
import { esDniValido, MAX_DIGITOS_DNI, MIN_DIGITOS_DNI, normalizarDni } from '@/shared/utils';

/**
 * Fuente de verdad del apartado Administrador. Ver `docs/s.roles.md`.
 *
 * ⚠️ "Usuario" acá es **quien tiene cuenta en la app**. Los que tienen rol
 * `cliente` son a los que se les puede facturar (`@/features/facturas`); las
 * cuentas de administración aparecen solo en el listado del super admin, y
 * pedirlas por id en `/admin/clientes/:id` da `404`.
 *
 * Son **dos endpoints con la misma respuesta**, y cuál se usa lo decide el rol:
 *
 * | | Endpoint | Qué devuelve |
 * |---|---|---|
 * | `administrador` | `GET /api/admin/clientes` | solo cuentas de clientes |
 * | `super_admin` | `GET /api/super-admin/usuarios` | todas, y filtra por rol |
 */

// ─────────────────────────────────────────────────────────────
// Constantes del listado
// ─────────────────────────────────────────────────────────────
/**
 * Filas por página.
 *
 * Ocho y no las veinte que la API usa por defecto, igual que el tablero: la idea
 * es que una página se recorra de un vistazo y se pase de página, no que haya
 * que scrollear un rato largo hasta el final. Con el paginador fijo abajo,
 * pasar de página es un toque.
 *
 * La API acepta de 1 a 100.
 */
export const USUARIOS_LIMITE = 8;

/** Espera antes de llamar a la API mientras la persona tipea (doc: ~300 ms). */
export const USUARIOS_DEBOUNCE_MS = 300;

/** Largo máximo del motivo por el que se le corta el fiado. */
export const MAX_LARGO_MOTIVO_SIN_FIADO = 300;

/** Largo máximo del motivo con el que se carga o corrige un DNI. */
export const MAX_LARGO_MOTIVO_DNI = 300;

/**
 * Texto de cada rol.
 *
 * Hace falta escribirlo acá porque el filtro se dibuja **antes** de tener
 * resultados: no hay ningún rol de dónde sacarlo todavía. Y porque la API manda
 * el slug (`super_admin`), no un texto para mostrar.
 */
export const ROL_LABEL: Record<Rol, string> = {
  [Roles.SUPER_ADMIN]: 'Super admin',
  [Roles.ADMINISTRADOR]: 'Administrador',
  [Roles.CLIENTE]: 'Cliente',
};

/**
 * El texto de un rol, o el slug crudo si la app no lo conoce. Mostrar
 * `"contador"` es peor que mostrar "Contador", pero **mucho** mejor que una fila
 * en blanco.
 */
export function rolLabel(rol: string): string {
  return ROL_LABEL[rol as Rol] ?? rol;
}

// ─────────────────────────────────────────────────────────────
// Respuestas de la API
// ─────────────────────────────────────────────────────────────
/** Una fila del listado. */
export const usuarioSchema = z.object({
  id: z.string(),
  /**
   * Se valida como texto y no con `z.email()` a propósito: en un LISTADO, una
   * dirección con una forma rara tiraría abajo la página entera y dejaría al
   * encargado sin ver a nadie. El email acá se muestra, no se usa para decidir.
   *
   * `null` en una cuenta creada con DNI (`docs/s.auth.md`).
   */
  email: z.string().nullish(),
  /** El documento. `null` en una cuenta creada con email o con Google. */
  dni: z.string().nullish(),
  /** `null` cuando la cuenta no tiene nombre cargado: ahí se muestra el email o el DNI. */
  displayName: z.string().nullish(),

  /**
   * Cómo contactar a esta persona (`docs/flujo_mi_cuenta.md`). `null` mientras
   * no los haya cargado: **nadie está obligado** a tenerlos.
   *
   * ⚠️ El panel los **muestra y no los edita**: son datos de la persona y los
   * carga ella desde su Mi cuenta. Si están mal, se los pide. Lo único que el
   * administrador corrige es el DNI, y con motivo obligatorio.
   */
  telefono: z.string().nullish(),
  direccion: z.string().nullish(),
  /**
   * Se valida como `string` y no con el enum de roles: un rol nuevo del backend
   * no puede dejar al encargado sin listado. Para mostrarlo va `rolLabel()`.
   */
  rol: z.string(),
  /** Cómo entra. Pueden ser los dos `true`. */
  tieneGoogle: z.boolean(),
  tienePassword: z.boolean(),
  createdAt: z.string(),
  /** `null` = nunca entró. */
  lastLoginAt: z.string().nullish(),

  /**
   * Si se le fía: **una marca del mostrador** para saber a quién no dejarle
   * llevar mercadería a cuenta (`docs/bloquear_fiado.md`).
   *
   * ⚠️ **El backend no frena nada con esto**: a un cliente bloqueado se le puede
   * facturar igual, a plazo y todo. Quien decide si le cobra en el momento es la
   * persona que atiende; el sistema se ocupa de que no se le pase por alto.
   *
   * Va opcional a propósito: el mismo schema lee el listado del super admin
   * (`/super-admin/usuarios`), que el doc no menciona entre los endpoints que lo
   * devuelven. Sin el campo, `sinFiado()` responde que sí se le fía, que es como
   * arranca todo el mundo.
   */
  seLeFia: z.boolean().nullish(),
  /** Por qué se le cortó. `null` cuando se le fía. */
  motivoSinFiado: z.string().nullish(),

  /**
   * Si la persona puede usar **la app** (`docs/flujo_login.md`). Una cuenta sin
   * DNI cargado está `bloqueado` y no puede entrar a nada.
   *
   * ⚠️ **No tiene nada que ver con el fiado.** El bloqueo es de la app; al
   * mostrador se le factura, se le cobra y se le anula igual. Son dos marcas
   * distintas y se pueden dar juntas.
   *
   * Opcional porque el listado del super admin comparte este schema y el doc no
   * lo nombra entre los que lo devuelven; sin el campo, `faltaDni()` responde
   * que no falta nada, que es lo que no molesta a nadie.
   */
  estado: estadoAccesoSchema.nullish(),
  motivoBloqueo: z.string().nullish(),
});

/**
 * Una página del listado. Sin resultados llega `200` con `datos: []` y
 * `total: 0`, no un 404.
 */
export const usuariosPaginaSchema = z.object({
  datos: z.array(usuarioSchema),
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
  /** Cantidad de páginas. Con `<= 1` la paginación no se dibuja. */
  paginas: z.number(),
});

export type Usuario = z.infer<typeof usuarioSchema>;
export type UsuariosPagina = z.infer<typeof usuariosPaginaSchema>;

// ─────────────────────────────────────────────────────────────
// Params que viajan a la API
// ─────────────────────────────────────────────────────────────
/** Query de `GET /api/admin/clientes`. Todo opcional: sin nada, la primera página. */
export type ListarClientesParams = {
  /** Email, nombre o DNI. No distingue mayúsculas, pero **no iguala tildes**. */
  q?: string;
  /** Desde 1. */
  pagina?: number;
  /** De 1 a 100. La API usa 20 si no se manda. */
  limite?: number;
};

/**
 * Query de `GET /api/super-admin/usuarios`: lo mismo más el filtro por rol, que
 * es lo único que este endpoint agrega (el de admin lo ignora, porque ahí todas
 * las filas son clientes).
 */
export type ListarUsuariosParams = ListarClientesParams & { rol?: Rol };

// ─────────────────────────────────────────────────────────────
// Cómo se lee una cuenta
// ─────────────────────────────────────────────────────────────
/**
 * Con qué dato se identifica la cuenta cuando no tiene nombre: el email, o el
 * DNI si se creó con documento (`docs/s.auth.md`). Vacío si no tiene ninguno.
 */
export function identificadorUsuario(usuario: Usuario): string {
  return usuario.email || usuario.dni || '';
}

/**
 * Cómo se nombra a una cuenta en pantalla. Sin `displayName` hace de nombre el
 * identificador: una fila en blanco no le sirve a nadie.
 *
 * Vive acá y no en la fila porque lo usan dos lugares —la tarjeta del listado y
 * el encabezado de la factura— y los dos tienen que decir lo mismo.
 */
export function nombreUsuario(usuario: Usuario): string {
  return usuario.displayName?.trim() || identificadorUsuario(usuario) || 'Sin nombre';
}

/**
 * `true` si a esta cuenta se le puede facturar: **solo los clientes**.
 *
 * El listado del super admin trae también cuentas de administración, y
 * facturarle a una da `404` (`docs/flujo_pagos.md`). Esconder el botón evita
 * mandar a alguien a un error que no puede resolver.
 */
export function esFacturable(usuario: Usuario): boolean {
  return usuario.rol === Roles.CLIENTE;
}

// ─────────────────────────────────────────────────────────────
// Fiado (`docs/bloquear_fiado.md`)
// ─────────────────────────────────────────────────────────────
/**
 * `true` si a esta cuenta **no** se le fía.
 *
 * Se pregunta por el negativo porque **todos arrancan con fiado**: sin el campo
 * —una cuenta vieja, un endpoint que todavía no lo manda— la respuesta es que sí
 * se le fía, que es el default del sistema.
 */
export function sinFiado(usuario: { seLeFia?: boolean | null }): boolean {
  return usuario.seLeFia === false;
}

// ─────────────────────────────────────────────────────────────
// Documento (`docs/flujo_login.md`)
// ─────────────────────────────────────────────────────────────
/**
 * `true` si a esta cuenta le falta el DNI y por eso no puede usar la app.
 *
 * Se pregunta por el `estado` y **no por el `dni`**: el día que el perfil pida
 * un dato más, el backend cambia el estado y esto sigue andando sin tocarse.
 *
 * Se muestra como **dato faltante y no como castigo**: ámbar, no rojo. El rojo
 * ya es el de "no se le fía" (`docs/bloquear_fiado.md`), que es otra cosa y se
 * puede dar junto con esta.
 */
export function faltaDni(usuario: { estado?: string | null }): boolean {
  return usuario.estado === EstadosAcceso.BLOQUEADO;
}

/**
 * Cargar o corregir el documento **con la persona enfrente**
 * (`PATCH /api/admin/clientes/:id/dni`).
 *
 * Es la única forma de arreglar un DNI mal tipeado —desde la app, la persona no
 * puede cambiarlo— y también sirve para completarle la ficha al cliente que
 * nunca abrió la app.
 *
 * El **motivo es obligatorio** y no es burocracia: queda guardado con quién lo
 * hizo y cuándo. Cambiar el documento con el que se identifica a alguien tiene
 * que dejar rastro.
 */
export const cargarDniSchema = z.object({
  dni: z
    .string()
    .trim()
    .transform(normalizarDni)
    .refine(
      esDniValido,
      `El DNI tiene que tener entre ${MIN_DIGITOS_DNI} y ${MAX_DIGITOS_DNI} dígitos`,
    ),
  motivo: z
    .string()
    .trim()
    .min(1, 'Contá en una línea por qué lo cargás o lo corregís')
    .max(MAX_LARGO_MOTIVO_DNI, `Máximo ${MAX_LARGO_MOTIVO_DNI} caracteres`),
});

export type CargarDniFormValues = z.infer<typeof cargarDniSchema>;

/** Cuerpo de `PATCH /api/admin/clientes/:id/dni`. Devuelve la ficha ya activa. */
export type CargarDniPayload = {
  clienteId: string;
  dni: string;
  motivo: string;
};

/** Formulario → cuerpo del PATCH. Asume que ya pasó por `cargarDniSchema`. */
export function aCargarDniPayload(
  clienteId: string,
  valores: CargarDniFormValues,
): CargarDniPayload {
  return { clienteId, dni: valores.dni, motivo: valores.motivo.trim() };
}

/**
 * El formulario del bloqueo: **solo el motivo**, y es obligatorio.
 *
 * Es lo que va a leer el que atiende cuando el cliente vuelva al mostrador, así
 * que sin eso el bloqueo no dice nada: "no se le fía" sin razón es una traba que
 * nadie sabe si sigue valiendo.
 */
export const bloquearFiadoSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, 'Contá en una línea por qué se le corta el fiado')
    .max(MAX_LARGO_MOTIVO_SIN_FIADO, `Máximo ${MAX_LARGO_MOTIVO_SIN_FIADO} caracteres`),
});

export type BloquearFiadoFormValues = z.infer<typeof bloquearFiadoSchema>;

/**
 * `PATCH /api/admin/clientes/:id/fiado`. Responde `200` con el cliente entero,
 * igual que el `GET` de la ficha.
 *
 * `motivo` viaja **solo al bloquear**: al devolver el fiado el backend lo ignora
 * y borra el que había.
 */
export type CambiarFiadoPayload = {
  clienteId: string;
  /** `false` bloquea, `true` devuelve el fiado. */
  seLeFia: boolean;
  motivo?: string;
};

/** Formulario → cuerpo del PATCH. Asume que ya pasó por `bloquearFiadoSchema`. */
export function aBloquearFiadoPayload(
  clienteId: string,
  valores: BloquearFiadoFormValues,
): CambiarFiadoPayload {
  return { clienteId, seLeFia: false, motivo: valores.motivo.trim() };
}
