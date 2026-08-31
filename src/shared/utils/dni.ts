/**
 * El documento de identidad, que es con lo que el mostrador identifica a una
 * persona (`docs/flujo_login.md`).
 *
 * Vive en `shared/` porque lo piden **dos features**: el perfil, donde la
 * persona carga el suyo para destrabar la app, y el panel del administrador,
 * que puede cargárselo o corregírselo con el cliente enfrente. Las dos tienen
 * que aceptar exactamente lo mismo.
 *
 * ⚠️ Ya **no** es una forma de entrar a la app: la cuenta se crea con correo y
 * el DNI se pide después, adentro.
 */

/** Lo que acepta el backend: de 7 a 9 dígitos. */
export const MIN_DIGITOS_DNI = 7;
export const MAX_DIGITOS_DNI = 9;

/**
 * 9 dígitos + 2 puntos: el techo de lo que puede llegar a tipear una persona.
 * Es el `maxLength` del input.
 */
export const MAX_LARGO_DNI_TIPEADO = 11;

const DNI_REGEX = new RegExp(`^\\d{${MIN_DIGITOS_DNI},${MAX_DIGITOS_DNI}}$`);

/**
 * Saca los puntos y espacios: `"38.180.903"` → `"38180903"`.
 *
 * La gente escribe el documento con puntos y el teclado numérico de iOS los
 * ofrece, así que rechazarlos sería pelearse con el usuario. El backend también
 * normaliza —acepta `38.180.903`—, pero acá hace falta igual para poder validar
 * los dígitos antes de mandarlo.
 *
 * ⚠️ Solo puntos y espacios: sacar TODO lo que no sea dígito haría pasar un
 * `"38a180903"` como válido, y eso es un error de tipeo que conviene mostrar.
 */
export function normalizarDni(valor: string): string {
  return valor.replace(/[.\s]/g, '');
}

/** `true` si, ya normalizado, es un documento que el backend va a aceptar. */
export function esDniValido(valor: string): boolean {
  return DNI_REGEX.test(normalizarDni(valor));
}

/**
 * Con puntos, como se lee de un documento: `"38180903"` → `"38.180.903"`.
 *
 * Se agrupa de a tres **desde la derecha**, que es como se escribe un número en
 * castellano: un DNI de 7 dígitos queda `1.234.567` y no `123.456.7`.
 */
export function formatearDni(valor: string): string {
  const limpio = normalizarDni(valor);
  return limpio.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
