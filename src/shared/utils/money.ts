/**
 * Plata: conversión entre lo que viaja por la API y lo que se muestra.
 *
 * ⚠️ REGLA ÚNICA: **la API habla en pesos, con hasta dos decimales**
 * (`docs/flujo_pagos.md`). $70,07 viaja como `70.07`, no como `7007`.
 *
 * Los `number` de JavaScript son de punto flotante, así que sumar pesos arrastra
 * errores de redondeo (`0.1 + 0.2 !== 0.3`, y `19.99 * 3` da
 * `59.970000000000006`). Por eso **toda cuenta de esta app pasa por centavos
 * enteros** —`aCentavos` / `aMonto`, acá adentro— y recién al final vuelve a
 * pesos. Es lo que evita el clásico `$80.17000000000002` en pantalla.
 *
 * ⚠️ Los importes que **vienen de la API** (`subtotal`, `total`) se muestran tal
 * cual: ya los calculó el backend con decimales exactos. Lo de acá sirve para el
 * total en vivo del formulario, mientras la factura todavía no existe.
 *
 * El formateo es manual y no usa `Intl`/`toLocaleString`: en Android el
 * resultado depende del locale del dispositivo, así que el mismo importe se
 * vería distinto en dos celulares. Con plata eso no es aceptable.
 */

import { z } from 'zod';

/** Separadores del formato es-AR: miles con punto, decimales con coma. */
const MILES = '.';
const DECIMALES = ',';
const SIMBOLO = '$';

/** Cuántos centavos entran en un peso. Nombrado para que no quede un 100 suelto. */
const CENTAVOS_POR_PESO = 100;

/**
 * Regla de Zod para cualquier importe de la API: un número en pesos, sin signo.
 *
 * Todos los importes del dominio son positivos: `subtotal`, `total`, el `monto`
 * de un pago y el `saldo`, que es una resta que el backend nunca deja pasar de
 * cero —un pago no puede superar el saldo de su factura—. No hay notas de
 * crédito ni saldo a favor (`docs/flujo_pagos.md`, §11).
 */
export const montoSchema = z.number().nonnegative('Los importes no pueden ser negativos');

/**
 * Cantidad de un renglón, tal como la valida la API: **entero, 1 o más**. No hay
 * medias unidades: un renglón es "3 × Bidón 20L".
 */
export const cantidadSchema = z.number().int('La cantidad va en unidades enteras').min(1);

/** Pesos → centavos enteros, para poder operar sin error de flotante. */
function aCentavos(monto: number): number {
  return Math.round(monto * CENTAVOS_POR_PESO);
}

/** Centavos enteros → pesos. Es la vuelta de `aCentavos`. */
function aMonto(centavos: number): number {
  return centavos / CENTAVOS_POR_PESO;
}

/**
 * Formatea un importe para mostrar: `70.07` → `"$70,07"`.
 *
 * Los dos decimales van SIEMPRE, incluso en montos redondos: una columna de
 * importes con distinta cantidad de decimales no se puede leer de un vistazo.
 */
export function formatMonto(monto: number, opciones?: { conSimbolo?: boolean }): string {
  const conSimbolo = opciones?.conSimbolo ?? true;

  const centavos = aCentavos(monto);
  const enteros = Math.trunc(Math.abs(centavos) / CENTAVOS_POR_PESO);
  const resto = Math.abs(centavos) % CENTAVOS_POR_PESO;

  // El signo va antes del símbolo (`-$750,00`), que es como se lee en castellano.
  const signo = centavos < 0 ? '-' : '';
  const prefijo = conSimbolo ? SIMBOLO : '';
  const decimales = String(resto).padStart(2, '0');

  return `${signo}${prefijo}${separarMiles(enteros)}${DECIMALES}${decimales}`;
}

/** `18500` → `"18.500"`. Se aplica solo a la parte entera. */
function separarMiles(entero: number): string {
  return String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, MILES);
}

/**
 * Convierte lo que tipeó una persona a un importe: `"18.500,50"` → `18500.5`.
 * Devuelve `null` si el texto no es un monto válido — quien llama decide si eso
 * es un error de formulario o simplemente un campo a medio escribir.
 *
 * Acepta las dos convenciones porque en un teclado numérico de celular no
 * siempre hay coma: `"1850,50"` y `"1850.50"` valen lo mismo. La ambigüedad
 * real (¿`"1.850"` son mil ochocientos cincuenta o uno con ochenta y cinco?) se
 * resuelve mirando la cantidad de dígitos que siguen al separador: los
 * separadores de miles siempre agrupan de a tres.
 *
 * Con **1 o 2 dígitos** después del separador, es un decimal (`"19,99"` →
 * `19.99`). Con **exactamente 3**, es de miles (`"19.999"` → `19999`, que es
 * como se escribe un precio acá). Con **4 o más** devuelve `null` en vez de
 * redondear en silencio: la API rechaza tres decimales con `El precio admite
 * hasta dos decimales.` y es mejor decirlo en el campo que gastar un request
 * para enterarse.
 */
export function parseAMonto(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, '');
  if (!limpio) {
    return null;
  }

  // Un separador seguido de exactamente 3 dígitos es de miles, no decimal. El
  // primer grupo no puede arrancar en cero: nadie escribe 75 como "0,075", así
  // que eso es un intento de tres decimales y tiene que caer como inválido.
  const esSeparadorDeMiles = /^-?[1-9]\d{0,2}([.,]\d{3})+$/.test(limpio);

  const normalizado = esSeparadorDeMiles
    ? limpio.replace(/[.,]/g, '')
    : limpio.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');

  if (!/^-?\d+([.]\d{1,2})?$/.test(normalizado)) {
    return null;
  }

  // Se pasa por centavos enteros para que `"0.07"` no quede en `0.07000000001`.
  return aMonto(aCentavos(Number(normalizado)));
}

/**
 * Cantidad de un renglón: `"3"` → `3`. Devuelve `null` si no es válida.
 *
 * La API pide **entero y 1 o más** (`La cantidad mínima es 1.`): ni decimales ni
 * cero. Un renglón de "0 bidones" no es un renglón.
 */
export function parseCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, '');
  if (!/^\d+$/.test(limpio)) {
    return null;
  }

  const cantidad = Number(limpio);
  return cantidad >= 1 ? cantidad : null;
}

/**
 * Subtotal de un renglón: `3 × 19.99` → `59.97`.
 *
 * ⚠️ Existe **solo para el formulario**, para poder mostrar el total mientras se
 * cargan los renglones. El subtotal y el total que valen son los que devuelve la
 * API: no se recalculan al mostrarlos (`docs/flujo_pagos.md`).
 */
export function calcularSubtotal(cantidad: number, precioUnitario: number): number {
  return aMonto(Math.round(cantidad * aCentavos(precioUnitario)));
}

/**
 * Suma importes sin arrastrar error de flotante: `[19.99, 10.1]` → `30.09` y no
 * `30.090000000000003`. Es la misma cuenta que hace el backend para el `total`.
 */
export function sumarMontos(montos: readonly number[]): number {
  return aMonto(montos.reduce((total, monto) => total + aCentavos(monto), 0));
}
