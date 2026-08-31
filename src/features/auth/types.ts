import { z } from 'zod';

/**
 * Fuente de verdad de la feature auth: los schemas de Zod.
 * Los tipos se INFIEREN de acá (`z.infer`), nunca se escriben a mano en paralelo.
 *
 * Se usan para dos cosas distintas:
 *  1. Validar los formularios (React Hook Form + zodResolver).
 *  2. Validar las respuestas de la API antes de que entren a la app.
 *
 * Contrato del backend: `docs/flujo_login.md`.
 *
 * ⚠️ **El DNI dejó de ser una forma de entrar.** La cuenta se crea con correo y
 * nada más; el documento se pide después, adentro de la app, y hasta que la
 * persona lo carga su cuenta está **bloqueada** (`estado`). Todo lo que había acá
 * de "entrar con email o con DNI" se fue: mandar `dni` al login o al registro es
 * `400`.
 */

// ─────────────────────────────────────────────────────────────
// El código del correo (`docs/flujo_login.md`)
// ─────────────────────────────────────────────────────────────
/**
 * Los correos de verificación y de recuperación **no traen un enlace: traen un
 * número de 6 dígitos** que la persona lee y escribe en la app.
 *
 * Por qué no un enlace: la app es nativa, y un enlace del correo abre el
 * navegador del teléfono. Volver de ahí necesita deep links en Android y en iOS
 * más una pantalla web que los reciba. Un código no sale de la app, y funciona
 * igual si el mail se abre en la computadora y se usa el teléfono.
 */
export const LARGO_CODIGO = 6;

/**
 * Cuánto hay que esperar entre dos envíos. Lo impone el backend: pedir otro
 * antes contesta *"Recién te mandamos uno"*, así que el botón se apaga ese rato
 * y el mensaje no toma por sorpresa.
 */
export const SEGUNDOS_REENVIO = 60;

/**
 * A partir de cuántos errores la pantalla ofrece pedir otro código.
 *
 * **El código se quema a los 5 intentos**, aunque no haya vencido: a partir de
 * ahí ni el correcto sirve. Como el mensaje de error es siempre el mismo, la app
 * no puede saber cuántos quedan — así que ofrece la salida antes de que la
 * persona se quede golpeando contra un código ya quemado.
 */
export const ERRORES_ANTES_DE_OFRECER_REENVIO = 3;

// ─────────────────────────────────────────────────────────────
// Reglas reutilizables
// ─────────────────────────────────────────────────────────────
/**
 * ⚠️ El orden importa: en Zod v4 `.trim()` es una transformación que corre
 * DESPUÉS de la validación. Con `z.email().trim()`, un "ana@mail.com " (espacio
 * final que agregan los teclados móviles) se rechazaría como inválido.
 * Por eso normalizamos primero y recién ahí validamos, con `.pipe()`.
 */
const email = z
  .string()
  .min(1, 'El email es obligatorio')
  .trim()
  .toLowerCase()
  .pipe(z.email('Ingresá un email válido'));

/**
 * De 8 a 72 caracteres, que es lo que acepta el backend (72 es el límite de
 * bcrypt: a partir de ahí trunca en silencio).
 *
 * Las mayúsculas, minúsculas y números son **regla nuestra**, más estricta que
 * la de la API: el backend acepta cualquier cosa de 8 a 72. Si algún día molesta,
 * se sacan de acá y el registro sigue funcionando igual.
 */
const password = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar los 72 caracteres')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

/**
 * Nombre para mostrar. **Opcional**: si viene vacío, el backend arma el `name`
 * con el usuario del email.
 *
 * Vacío es válido; con algo escrito pedimos al menos 2 caracteres, así una "a"
 * suelta no queda de nombre para siempre.
 */
const displayName = z
  .string()
  .trim()
  .refine((valor) => valor.length === 0 || valor.length >= 2, {
    message: 'El nombre debe tener al menos 2 caracteres',
  })
  .refine((valor) => valor.length <= 100, {
    message: 'El nombre no puede superar los 100 caracteres',
  });

// ─────────────────────────────────────────────────────────────
// Formularios
// ─────────────────────────────────────────────────────────────
/**
 * Entrar: correo y contraseña. Nada más.
 *
 * El email se normaliza en el campo (`.trim().toLowerCase()`), así que lo que
 * llega a `onSubmit` ya está listo para viajar. La validación de formato vive en
 * la regla `email` de arriba, compartida con el registro: pedir cosas distintas
 * en cada pantalla es lo que termina en "me dejó registrarme pero no entrar".
 */
export const loginSchema = z.object({
  email,
  // En login NO se aplican las reglas de fortaleza: solo que no esté vacía.
  // Si no, un usuario viejo con contraseña débil no podría ni intentar entrar.
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

/**
 * Alta de cuenta. El **DNI no se pide acá** a propósito: pedir el documento en
 * el formulario de alta espanta gente, y correo tiene todo el mundo. El
 * documento se pide después, adentro de la app (`@/features/perfil`).
 */
export const registerSchema = z
  .object({
    email,
    displayName,
    password,
    confirmPassword: z.string().min(1, 'Repetí la contraseña'),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'], // el error se muestra en el campo correcto
        message: 'Las contraseñas no coinciden',
      });
    }
  });

/** Recuperar contraseña: es un mail lo que se manda, así que va el email. */
export const forgotPasswordSchema = z.object({ email });

/**
 * El código de 6 dígitos que llega al correo (`docs/flujo_login.md`).
 *
 * ⚠️ **No se limpia antes de mandarlo.** El backend acepta `"482 913"` con
 * espacios o guiones, así que lo que se valida es la cantidad de dígitos y lo
 * que viaja es **lo que escribió la persona**: normalizarlo acá sería cambiarle
 * el valor bajo los dedos mientras tipea, y el backend lo resuelve igual.
 */
const codigo = z
  .string()
  .trim()
  .refine(
    (valor) => valor.replace(/\D/g, '').length === LARGO_CODIGO,
    `El código son ${LARGO_CODIGO} números, como llegó en el correo.`,
  );

/** Verificar el correo: un solo campo, y la cuenta sale del token de sesión. */
export const verificarCorreoSchema = z.object({ codigo });

/**
 * La contraseña nueva, la que se escribe **con el código del correo**
 * (`docs/flujo_login.md`).
 *
 * El email no está acá: viene de la pantalla anterior —la que pidió el código—
 * para no hacérselo tipear dos veces. La repetición se valida **solo en el
 * front** —la API recibe una sola contraseña—, que es justamente por lo que no
 * puede faltar: es la única red contra un error de tipeo en algo que no se ve
 * mientras se escribe.
 */
export const nuevaClaveSchema = z
  .object({
    codigo,
    password,
    confirmPassword: z.string().min(1, 'Repetí la contraseña'),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Las contraseñas no coinciden',
      });
    }
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type NuevaClaveFormValues = z.infer<typeof nuevaClaveSchema>;
export type VerificarCorreoFormValues = z.infer<typeof verificarCorreoSchema>;

// ─────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────
/**
 * Los tres roles del sistema (`docs/s.roles.md`). **Es lo único que decide quién
 * ve qué**: el array `permissions` ya no existe.
 *
 * El rol viene del BACKEND en `user.rol`, en el login, el registro y
 * `/users/me`. Nunca se decide ni se pisa desde el cliente, y **no viaja en el
 * token**: el backend lo lee de la base en cada request, así que la app lo
 * refresca con `/users/me` al abrir (ver `useSyncSession`).
 *
 * Los dos roles de arriba se asignan por seed del backend. Desde la app nadie se
 * asciende: mandar `rol` en el body de un registro es `400`.
 *
 * ⚠️ Esconder una pantalla por rol es UI, no seguridad: la app igual puede pedir
 * un endpoint que no le corresponde y el backend contesta `403`.
 */
export const Roles = {
  /** El dueño del sistema. Ve todas las cuentas. */
  SUPER_ADMIN: 'super_admin',
  /** El que opera el negocio. Ve y busca clientes. */
  ADMINISTRADOR: 'administrador',
  /** Todo el que se registra solo. */
  CLIENTE: 'cliente',
} as const;

export type Rol = (typeof Roles)[keyof typeof Roles];

export const rolSchema = z.enum(Roles);

const ROLES_CONOCIDOS: readonly string[] = Object.values(Roles);

/**
 * Pasa el rol crudo del backend al tipo de la app, o `null` si no lo reconoce.
 *
 * **`null` es el mínimo privilegio**: un rol nuevo que esta versión no conoce no
 * puede terminar abriendo el panel de administración. Tampoco invalida la
 * sesión: se entra igual, con lo que ve cualquiera.
 */
export function toRol(rol: string | null | undefined): Rol | null {
  return rol !== null && rol !== undefined && ROLES_CONOCIDOS.includes(rol) ? (rol as Rol) : null;
}

// ─────────────────────────────────────────────────────────────
// Estado de la cuenta (`docs/flujo_login.md`)
// ─────────────────────────────────────────────────────────────
/**
 * Si la persona puede usar la app o le falta completar su perfil.
 *
 * ⚠️ **Lo calcula el backend y viene en `estado`.** No se deduce del `dni` ni de
 * ningún otro campo: el día que el perfil pida un dato más, el estado cambia del
 * otro lado y la app no se entera de nada.
 *
 * Alcanza a **todos los roles**: un administrador sin DNI tampoco entra al panel
 * —la API le contesta `403` a todo lo que no sea `/users/me`.
 */
export const EstadosAcceso = {
  /** Tiene todo lo que hace falta: puede hacer lo que le permita su rol. */
  ACTIVO: 'activo',
  /** Le falta el DNI. Solo puede ver y completar su perfil. */
  BLOQUEADO: 'bloqueado',
} as const;

export type EstadoAcceso = (typeof EstadosAcceso)[keyof typeof EstadosAcceso];

export const estadoAccesoSchema = z.enum(EstadosAcceso);

/**
 * Pasa el estado crudo del backend al tipo de la app.
 *
 * Lo que no reconoce lo trata como **activo**, al revés del rol —que ante la
 * duda niega—. Acá el error caro es el otro: dejar a alguien mirando un cartel
 * que no puede sacar porque llegó un estado nuevo que esta versión no conoce.
 * Si de verdad está bloqueado, la API le va a contestar `403` igual y el
 * interceptor lo devuelve al cartel; al revés no hay vuelta.
 */
export function toEstadoAcceso(estado: string | null | undefined): EstadoAcceso {
  return estado === EstadosAcceso.BLOQUEADO ? EstadosAcceso.BLOQUEADO : EstadosAcceso.ACTIVO;
}

// ─────────────────────────────────────────────────────────────
// Respuestas de la API
// ─────────────────────────────────────────────────────────────
/**
 * Lo que **puede** llegar en un usuario, según el endpoint. No es el tipo con el
 * que trabaja la app: eso lo arma el `.transform()` de abajo.
 *
 * Los endpoints no devuelven la misma forma y hay que aguantar las dos:
 *
 * | | `POST /auth/login` y `/auth/register` | `GET /users/me` |
 * |---|---|---|
 * | nombre | `name` | `displayName` |
 * | rol | `rol` | `rol` |
 * | extra | — | `googleId`, `createdAt`, `updatedAt`, `lastLoginAt` |
 *
 * ⚠️ Todo es opcional menos el `id`. Un usuario al que le falta un campo se
 * muestra peor, pero **entra**; exigirlo lo dejaba afuera de la app entera.
 */
export const userApiSchema = z.object({
  id: z.string(),

  /** Cómo se llama, según login/registro. */
  name: z.string().nullish(),
  /** Cómo se llama, según `/users/me`. Es el mismo dato con otro nombre. */
  displayName: z.string().nullish(),

  /**
   * Se valida como `z.string()` y no como `z.email()` a propósito: acá el email
   * se muestra, no se valida. Si el backend guardó una dirección con una forma rara, exigir el
   * formato tiraría abajo la respuesta entera y dejaría a esa persona sin poder
   * entrar. El formato se valida en el formulario, que es donde se puede corregir.
   */
  email: z.string().nullish(),

  /**
   * El documento, ya normalizado (sin puntos). **`null` hasta que la persona lo
   * carga**: la cuenta se crea sin él (`docs/flujo_login.md`).
   */
  dni: z.string().nullish(),

  /**
   * El rol, tal como lo manda la API: `"super_admin"`, `"administrador"` o
   * `"cliente"`.
   *
   * ⚠️ Se valida como `string` y no con el enum a propósito: un rol nuevo del
   * backend tiraría abajo TODA la respuesta y dejaría a esa persona sin poder
   * entrar. Lo acota `toRol()`, que devuelve `null` si no lo reconoce — o sea,
   * el mínimo privilegio en vez de un error.
   */
  rol: z.string().nullish(),

  /**
   * `"activo"` o `"bloqueado"` (`docs/flujo_login.md`). Viene en las tres
   * puertas de entrada: login, registro y `/users/me`.
   *
   * Se valida como `string` por el mismo motivo que el rol —un estado nuevo no
   * puede tirar abajo la respuesta— y lo acota `toEstadoAcceso()`. Opcional
   * porque una sesión guardada por una versión anterior de la app no lo tiene.
   */
  estado: z.string().nullish(),
  /** Por qué está bloqueada, ya redactado por el backend. `null` si está activa. */
  motivoBloqueo: z.string().nullish(),
});

/** El último respaldo del nombre: una cuenta sin nombre y sin email. */
const NOMBRE_SIN_CARGAR = 'Tu cuenta';

/**
 * Cómo se llama la persona, con la misma cadena de respaldos que usa el backend:
 * nombre cargado → usuario del email → DNI.
 *
 * Hace falta acá porque `/users/me` **no manda `name`**: manda `displayName`, y
 * puede venir vacío. Sin esto, la app tendría que preguntarse en cada pantalla
 * cuál de los dos campos mirar.
 *
 * ⚠️ El respaldo **pierde el dato de si la persona cargó su nombre**: `name`
 * puede terminar siendo el usuario del email o el DNI, y desde afuera se lee
 * igual que un nombre de verdad. Quien necesite distinguirlo —el bloqueo por
 * perfil incompleto— compara contra los mismos identificadores.
 */
function nombreVisible(user: z.infer<typeof userApiSchema>): string {
  const cargado = user.name?.trim() || user.displayName?.trim();
  if (cargado) {
    return cargado;
  }

  const usuarioDelEmail = user.email?.trim().split('@')[0];
  return usuarioDelEmail || user.dni?.trim() || NOMBRE_SIN_CARGAR;
}

/**
 * El usuario **como lo usa la app**: una sola forma, sin importar de qué
 * endpoint vino. Normalizar acá —y no en cada pantalla— es lo que evita que
 * media app mire `name` y la otra media `displayName`.
 *
 * ⚠️ Es un schema aparte y no un `.transform()` sobre `userApiSchema` porque el
 * `responseSchema` de RTK Query exige que la entrada y la salida sean el mismo
 * tipo. La normalización va en `transformResponse` (ver `authApi.ts`), que es
 * justo el paso que corre entre los dos schemas.
 */
export const userSchema = z.object({
  id: z.string(),
  /** Nunca vacío: lo garantiza `nombreVisible()`. */
  name: z.string(),
  /** `null` solo en una cuenta vieja creada antes de que el email fuera obligatorio. */
  email: z.string().nullable(),
  /** `null` mientras la persona no lo haya cargado. Con `null`, `estado` es `bloqueado`. */
  dni: z.string().nullable(),
  /** Ya acotado a los tres roles conocidos, o `null` si el backend mandó otro. */
  rol: rolSchema.nullable(),
  /** Si puede usar la app o le falta completar el perfil. Nunca `null`. */
  estado: estadoAccesoSchema,
  /** El texto del bloqueo, para mostrarlo tal cual. `null` con la cuenta activa. */
  motivoBloqueo: z.string().nullable(),
});

export type UserApiResponse = z.infer<typeof userApiSchema>;

/** Pasa el usuario crudo de cualquier endpoint a la forma única de la app. */
export function toUser(user: UserApiResponse): User {
  return {
    id: user.id,
    name: nombreVisible(user),
    email: user.email ?? null,
    dni: user.dni ?? null,
    rol: toRol(user.rol),
    estado: toEstadoAcceso(user.estado),
    motivoBloqueo: user.motivoBloqueo ?? null,
  };
}

/**
 * `true` si a esta persona hay que pedirle que complete su perfil antes de
 * dejarla usar la app.
 *
 * Sin sesión es `false`: no hay a quién pedirle nada, y trabar la pantalla de
 * login sería una app que no deja ni entrar.
 */
export function estaBloqueado(user: User | null): boolean {
  return user?.estado === EstadosAcceso.BLOQUEADO;
}

/** Login y registro devuelven lo mismo: el usuario y su token. */
export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string().min(1),
});

/** Lo mismo, pero tal como llega de la API (antes de normalizar el usuario). */
export const authApiResponseSchema = z.object({
  user: userApiSchema,
  token: z.string().min(1),
});

export function toAuthResponse(respuesta: z.infer<typeof authApiResponseSchema>): AuthResponse {
  return { user: toUser(respuesta.user), token: respuesta.token };
}

/**
 * Lo que devuelven los endpoints de correo: **un solo texto, ya redactado**.
 *
 * Lo usan los cuatro —recuperar, confirmar la clave nueva, verificar el correo y
 * reenviar el código— y se muestra tal cual. Ninguno devuelve sesión: después de
 * cambiar la contraseña la persona **vuelve a entrar a mano**, y es a propósito.
 */
export const mensajeRespuestaSchema = z.object({
  message: z.string(),
});

/** @deprecated Usá `mensajeRespuestaSchema`: es el mismo objeto. */
export const forgotPasswordResponseSchema = mensajeRespuestaSchema;

export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type MensajeRespuesta = z.infer<typeof mensajeRespuestaSchema>;
export type ForgotPasswordResponse = MensajeRespuesta;

// ─────────────────────────────────────────────────────────────
// Payloads que viajan a la API
// ─────────────────────────────────────────────────────────────
/** `POST /api/auth/login`. Solo correo: mandar `dni` es `400`. */
export type LoginPayload = {
  email: string;
  password: string;
};

/**
 * `POST /api/auth/register`. `confirmPassword` es solo del formulario y
 * `displayName` se omite si quedó vacío.
 *
 * ⚠️ **Sin `dni`**: si lo mandás, la respuesta es `400 property dni should not
 * exist`.
 */
export type RegisterPayload = {
  email: string;
  password: string;
  displayName?: string;
};

export type ForgotPasswordPayload = ForgotPasswordFormValues;

/**
 * `POST /api/auth/verificar`. **Con sesión**, y por eso el body es solo el
 * código: la cuenta sale del token.
 *
 * El código **sirve una sola vez y vive 30 minutos**. Equivocado, usado, vencido
 * o quemado por intentos dan todos el mismo `400`, y es a propósito: precisar
 * cuál le confirmaría a quien esté probando números que va por buen camino.
 */
export type VerificarCorreoPayload = {
  codigo: string;
};

/**
 * `POST /api/auth/recuperar/confirmar`. **Público** —quien olvidó la contraseña
 * no tiene sesión— y por eso **el email va en el body**: seis dígitos no
 * identifican a nadie por sí solos, hace falta saber de qué cuenta hablamos.
 *
 * El código vive **15 minutos**: es corto porque abre la cuenta. De paso deja el
 * correo verificado —haber recibido el código prueba que la persona llega a esa
 * casilla— y **no devuelve sesión**: se vuelve al login.
 *
 * ⚠️ Un email que no existe y un código equivocado dan **exactamente el mismo
 * `400`**: si "esa cuenta no existe" fuera un error distinto, este endpoint
 * sería un buscador de clientes del negocio.
 */
export type NuevaClavePayload = {
  email: string;
  codigo: string;
  password: string;
};

/**
 * Lo único que viaja a `POST /auth/google`.
 * El backend verifica este idToken contra Google y devuelve un `AuthResponse`
 * normal (nuestro usuario + NUESTRO token). El idToken de Google no se guarda.
 */
export type GoogleLoginPayload = {
  idToken: string;
};
