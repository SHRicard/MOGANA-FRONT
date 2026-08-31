import { z } from 'zod';
import { esDniValido, MAX_DIGITOS_DNI, MIN_DIGITOS_DNI, normalizarDni } from '@/shared/utils';

/**
 * Fuente de verdad de **la cuenta propia**. Son dos pantallas sobre los mismos
 * dos endpoints:
 *
 * | | |
 * |---|---|
 * | **El bloqueo** (`docs/flujo_login.md`) | la pared que pide el DNI antes de dejar usar la app |
 * | **Mi cuenta** (`docs/flujo_mi_cuenta.md`) | la pantalla de después: ver y corregir los datos |
 *
 * | Endpoint | Qué hace |
 * |---|---|
 * | `GET /api/users/me` | la cuenta propia, para cualquier rol |
 * | `PATCH /api/users/me` | guarda lo que cambió, y devuelve el perfil entero |
 *
 * Nunca llevan un `:id` y no lo van a llevar: el usuario sale del token, así que
 * no hay forma de tocar la cuenta de otro.
 *
 * **La regla, en una frase: se edita todo menos lo que te identifica.** El DNI y
 * el correo son con lo que se encuentra a alguien que puede deber plata y con lo
 * que esa persona entra a su cuenta; moverlos desde la app sería la forma más
 * fácil de desaparecer del buscador o de quedarse afuera. Se cambian en el local.
 *
 * ⚠️ **El estado lo decide el backend**, y la app no lo deduce del `dni` (ver
 * `EstadosAcceso` en `@/features/auth`). El día que el perfil pida un dato más,
 * el bloqueo sigue funcionando sin tocar nada de acá.
 *
 * ⚠️ El bloqueo alcanza a **todos los roles**: un administrador sin DNI tampoco
 * entra al panel. Las cuentas del seed no lo tienen, así que si al probar el
 * panel aparece ese cartel en vez del tablero, es esto y no un bug.
 */

// ─────────────────────────────────────────────────────────────
// El perfil, como lo devuelve la API
// ─────────────────────────────────────────────────────────────
/**
 * Un campo que **no se puede editar desde la app**, con el texto que explica por
 * qué. Lo manda el backend en `camposFijos`.
 *
 * `campo` se valida como `string` y no con un enum a propósito: el día que se
 * fije uno nuevo, la pantalla lo deshabilita sin que haya que tocar la app.
 */
export const campoFijoSchema = z.object({
  campo: z.string(),
  /** Ya redactado y con la salida adentro ("acercate al local"). Se muestra tal cual. */
  motivo: z.string(),
});

/**
 * El perfil completo: lo que devuelven **el `GET` y el `PATCH`**, que mandan
 * exactamente lo mismo.
 *
 * Es más ancho que el `User` de la sesión (`@/features/auth`), que solo guarda
 * lo que decide qué se ve: acá viven además el contacto y las reglas de edición,
 * que son de esta pantalla y no tienen por qué persistirse con la sesión.
 */
export const perfilSchema = z.object({
  id: z.string(),
  /** Para mostrar. **Nunca viene vacío**: sin nombre cargado, sale del correo. */
  name: z.string().nullish(),
  /** Lo que cargó la persona. Es el que va en el input, y puede ser `null`. */
  displayName: z.string().nullish(),
  email: z.string().nullish(),
  /** Si confirmó el correo. **No bloquea nada**: entra igual y usa la app igual. */
  emailVerificado: z.boolean().nullish(),
  dni: z.string().nullish(),
  /** `null` mientras no lo cargue. **Nadie está obligado** a tenerlo. */
  telefono: z.string().nullish(),
  direccion: z.string().nullish(),
  /**
   * Qué inputs van deshabilitados y con qué texto al lado. Viene siempre y
   * cambia solo: `email` está siempre; `dni` **aparece recién cuando ya está
   * cargado**.
   *
   * Es lo que evita que la app replique la regla de cuándo el DNI se puede
   * tocar: se recorre esta lista y listo. El día que la regla cambie, la
   * pantalla se entera sola.
   *
   * Opcional por las dudas: si un día no llegara, los campos quedan editables y
   * el backend rechaza igual lo que no corresponde —con su mensaje, que es el
   * mismo que se mostraría acá.
   */
  camposFijos: z.array(campoFijoSchema).nullish(),
  rol: z.string().nullish(),
  estado: z.string().nullish(),
  motivoBloqueo: z.string().nullish(),
  tieneGoogle: z.boolean().nullish(),
  tienePassword: z.boolean().nullish(),
});

export type CampoFijo = z.infer<typeof campoFijoSchema>;
export type Perfil = z.infer<typeof perfilSchema>;

/** Los dos campos que el backend puede fijar. */
export const CamposDelPerfil = {
  EMAIL: 'email',
  DNI: 'dni',
} as const;

export type CampoDelPerfil = (typeof CamposDelPerfil)[keyof typeof CamposDelPerfil];

/**
 * El motivo por el que ese campo no se puede editar, o `null` si sí se puede.
 *
 * Devuelve el texto y no un booleano porque la pantalla necesita las dos cosas
 * —deshabilitar el input y decir por qué— y así no se pueden separar: un campo
 * bloqueado sin explicación es lo que hace que alguien toque diez veces.
 */
export function motivoCampoFijo(perfil: Perfil, campo: CampoDelPerfil): string | null {
  return perfil.camposFijos?.find((fijo) => fijo.campo === campo)?.motivo ?? null;
}

// ─────────────────────────────────────────────────────────────
// Mi cuenta — el formulario (`docs/flujo_mi_cuenta.md`)
// ─────────────────────────────────────────────────────────────
/** Largos que acepta el backend. */
export const MAX_LARGO_NOMBRE = 100;
export const MAX_LARGO_DIRECCION = 200;

/** El teléfono: de 6 a 15 **dígitos**, sin contar separadores ni el `+`. */
export const MIN_DIGITOS_TELEFONO = 6;
export const MAX_DIGITOS_TELEFONO = 15;

/**
 * Cuántos dígitos tiene lo tipeado. `"(381) 456-7890"` → 10.
 *
 * Se cuentan los dígitos en vez de validar una forma porque la gente escribe el
 * teléfono de mil maneras —con paréntesis, con guiones, con el `+54` adelante— y
 * todas son la misma. **El backend lo limpia**, así que acá alcanza con saber si
 * hay un número adentro.
 */
function digitosDe(valor: string): number {
  return valor.replace(/\D/g, '').length;
}

/**
 * `true` si eso puede ser un teléfono. Vacío también: **nadie está obligado a
 * tener uno**, y vaciar el campo es la forma de borrarlo.
 */
export function esTelefonoValido(valor: string): boolean {
  const limpio = valor.trim();
  if (limpio.length === 0) {
    return true;
  }
  const digitos = digitosDe(limpio);
  return digitos >= MIN_DIGITOS_TELEFONO && digitos <= MAX_DIGITOS_TELEFONO;
}

/**
 * Lo que se puede editar de la cuenta propia.
 *
 * ⚠️ **El teléfono no se transforma**: viaja tal como lo escribió la persona. El
 * backend lo guarda limpio (`(381) 456-7890` → `3814567890`), así que
 * normalizarlo acá sería hacer dos veces el mismo trabajo — y encima cambiaría
 * bajo los dedos lo que se está tipeando.
 *
 * El `dni` entra en el formulario porque **se puede cargar desde acá si todavía
 * está vacío**; con uno cargado, el backend lo manda en `camposFijos` y la
 * pantalla deshabilita el input.
 */
export const miCuentaSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'El nombre no puede quedar vacío')
    .max(MAX_LARGO_NOMBRE, `El nombre no puede superar los ${MAX_LARGO_NOMBRE} caracteres`),
  telefono: z
    .string()
    .refine(
      esTelefonoValido,
      `El teléfono son ${MIN_DIGITOS_TELEFONO} a ${MAX_DIGITOS_TELEFONO} dígitos, con el código de área. Ej: 3814567890.`,
    ),
  direccion: z
    .string()
    .trim()
    .max(MAX_LARGO_DIRECCION, `La dirección no puede pasar de ${MAX_LARGO_DIRECCION} caracteres`),
  /** Vacío es válido: significa "no lo cargo ahora", no "borralo". */
  dni: z
    .string()
    .trim()
    .refine(
      (valor) => valor.length === 0 || esDniValido(valor),
      `El DNI tiene que tener entre ${MIN_DIGITOS_DNI} y ${MAX_DIGITOS_DNI} dígitos`,
    ),
});

export type MiCuentaFormValues = z.infer<typeof miCuentaSchema>;

/** Con qué valores abre el formulario. Los `null` del perfil van como vacíos. */
export function aValoresDeFormulario(perfil: Perfil): MiCuentaFormValues {
  return {
    displayName: perfil.displayName ?? '',
    telefono: perfil.telefono ?? '',
    direccion: perfil.direccion ?? '',
    dni: perfil.dni ?? '',
  };
}

/**
 * Qué mandar en el `PATCH`: **solo lo que cambió**, o `null` si no cambió nada.
 *
 * Los dos motivos por los que se compara en vez de mandar todo:
 *
 *  - el body vacío es `400` (*"No mandaste nada para cambiar"*), así que hay que
 *    saber si hay algo antes de salir a la red;
 *  - mandar `dni: ""` en una cuenta sin documento sería pedirle al backend que
 *    borre algo que no se puede borrar. El DNI viaja **solo si se escribió uno**.
 *
 * El teléfono y la dirección sí viajan vacíos: `""` es exactamente cómo se
 * borran, y es lo que sale solo del formulario cuando alguien limpia el input.
 */
export function aCambiosDePerfil(
  valores: MiCuentaFormValues,
  perfil: Perfil,
): ActualizarPerfilPayload | null {
  const original = aValoresDeFormulario(perfil);
  const cambios: ActualizarPerfilPayload = {};

  if (valores.displayName !== original.displayName) {
    cambios.displayName = valores.displayName;
  }
  if (valores.telefono !== original.telefono) {
    cambios.telefono = valores.telefono;
  }
  if (valores.direccion !== original.direccion) {
    cambios.direccion = valores.direccion;
  }
  // Solo si se escribió uno: vaciarlo no es una operación que exista.
  if (valores.dni.length > 0 && valores.dni !== original.dni) {
    cambios.dni = valores.dni;
  }

  return Object.keys(cambios).length > 0 ? cambios : null;
}

// ─────────────────────────────────────────────────────────────
// El bloqueo — el formulario del DNI
// ─────────────────────────────────────────────────────────────
/**
 * Un solo campo: el documento.
 *
 * Se normaliza antes de validar —la gente lo escribe con puntos y el teclado
 * numérico de iOS los ofrece—, así que lo que llega a `onSubmit` ya viaja limpio.
 * El backend también acepta los puntos; validar acá es para no gastar una request
 * en un documento de cinco dígitos.
 */
export const completarPerfilSchema = z.object({
  dni: z
    .string()
    .trim()
    .transform(normalizarDni)
    .refine(
      esDniValido,
      `El DNI tiene que tener entre ${MIN_DIGITOS_DNI} y ${MAX_DIGITOS_DNI} dígitos`,
    ),
});

export type CompletarPerfilFormValues = z.infer<typeof completarPerfilSchema>;

// ─────────────────────────────────────────────────────────────
// Lo que viaja a la API
// ─────────────────────────────────────────────────────────────
/**
 * Cuerpo de `PATCH /api/users/me`. **Solo lo que cambió**: lo que no viaja, no
 * se toca, y el body vacío es `400`.
 *
 * `email` no está y no es un olvido: mandarlo es `400`. Se cambia en el local.
 */
export type ActualizarPerfilPayload = {
  displayName?: string;
  /** `""` lo borra. No hace falta convertirlo a `null`. */
  telefono?: string;
  /** `""` la borra. */
  direccion?: string;
  /** Solo mientras esté vacío; con uno cargado, el backend contesta `409`. */
  dni?: string;
};

/** Formulario → cuerpo del PATCH. Asume que ya pasó por el schema. */
export function aActualizarPerfilPayload(
  valores: CompletarPerfilFormValues,
): ActualizarPerfilPayload {
  return { dni: valores.dni };
}

// ─────────────────────────────────────────────────────────────
// Cuando no hay nada más que hacer
// ─────────────────────────────────────────────────────────────
/**
 * `true` si el error deja a la persona **sin salida por su cuenta**: son los dos
 * `409` del documento (`docs/flujo_login.md`).
 *
 * | Qué pasó | |
 * |---|---|
 * | ya tiene un DNI cargado y mandó otro | *"Si está mal, pedile al administrador que lo corrija"* |
 * | ese DNI ya figura en otra cuenta | *"Acercate al local para que lo resuelvan"* |
 *
 * Es a propósito que sean un callejón: cambiar el documento con el que se
 * identifica a alguien es cosa del mostrador, no de la app. Sirve para que la
 * pantalla deje de ofrecer "reintentar" —no va a andar— y muestre la salida.
 */
export function esCallejonSinSalida(status: number | null): boolean {
  return status === 409;
}
