import { z } from 'zod';

/**
 * **Las especies** (`docs/flujo_especies.md`): la etiqueta con la que se agrupa
 * lo que se vende.
 *
 * ```
 * 12 Coca de 500ml     → especie: Gaseosa
 * 12 Quilmes de 1lt    → especie: Cerveza
 * Envío a domicilio    → especie: Envío
 * ```
 *
 * El producto lo escribe el mostrador y cambia de forma cada vez —"12 Coca
 * 500ml", "Coca 500", "coca-cola 500cc"—, así que sumar por ese texto no dice
 * nada. La especie sí: es lo que va a permitir contestar *"¿cuánta gaseosa
 * vendí en julio?"*.
 *
 * **El catálogo arranca vacío y lo escribe el administrador**: las especies de
 * una distribuidora de agua no son las de una tienda de ropa.
 */

/** Lo más corto que puede ser una especie sin ser un error de tipeo. */
export const MIN_LARGO_ESPECIE = 2;
export const MAX_LARGO_ESPECIE = 60;

/** Una especie del catálogo. */
export const especieSchema = z.object({
  id: z.string(),
  /** Como se escribió: `Gaseosa`. Es lo que se muestra. */
  nombre: z.string(),
  /**
   * **En cuántos renglones de factura se usó.** Dice si la especie sirve o
   * quedó de un experimento, y es lo que decide si se puede borrar.
   */
  usos: z.number().int(),
  /** ISO completo, no `AAAA-MM-DD`: es un instante, no un día del calendario. */
  createdAt: z.string(),
});

/**
 * El catálogo entero. **Alfabético y sin paginado**: es lo que llena el selector
 * de la factura, y pedirlo de a páginas mientras alguien tipea sería una
 * consulta por tecla.
 */
export const catalogoEspeciesSchema = z.object({
  datos: z.array(especieSchema),
  total: z.number().int(),
});

/**
 * La especie **tal como viene adentro de un renglón de factura**: solo el id y
 * el nombre. Los usos no tienen sentido ahí — son del catálogo, no de la venta.
 */
export const especieDeItemSchema = z.object({
  id: z.string(),
  nombre: z.string(),
});

export type Especie = z.infer<typeof especieSchema>;
export type CatalogoEspecies = z.infer<typeof catalogoEspeciesSchema>;
export type EspecieDeItem = z.infer<typeof especieDeItemSchema>;

/** Params de `GET /api/admin/especies`. */
export interface ListarEspeciesParams {
  q?: string;
}

/** Payload de crear y de renombrar: los dos llevan lo mismo. */
export interface NombreDeEspeciePayload {
  nombre: string;
}

export interface RenombrarEspeciePayload extends NombreDeEspeciePayload {
  id: string;
}

// ─────────────────────────────────────────────────────────────
// Formulario
// ─────────────────────────────────────────────────────────────

/**
 * El nombre de una especie, tal como se tipea.
 *
 * Los topes son los del backend, para marcar el campo en vez de gastar un
 * request que volvería con este mismo texto.
 *
 * ⚠️ **Acá no se valida que no esté repetida**: eso lo decide la base con el
 * nombre normalizado y vuelve como `409`. El front puede avisar antes (ver
 * `yaExisteEspecie`), pero no puede decidirlo — entre que se abre el diálogo y
 * se guarda, otra persona pudo haberla creado.
 */
export const nombreDeEspecieSchema = z
  .string()
  .trim()
  .min(MIN_LARGO_ESPECIE, `El nombre necesita al menos ${MIN_LARGO_ESPECIE} letras`)
  .max(MAX_LARGO_ESPECIE, `Máximo ${MAX_LARGO_ESPECIE} caracteres`);

export const especieFormSchema = z.object({ nombre: nombreDeEspecieSchema });

export type EspecieFormValues = z.infer<typeof especieFormSchema>;

// ─────────────────────────────────────────────────────────────
// Comparar y buscar
// ─────────────────────────────────────────────────────────────

/**
 * El nombre **normalizado**: minúsculas, sin tildes y sin espacios de más.
 *
 * Es la misma regla que usa la base para decidir si dos especies son la misma
 * ("Gaseosa", "gaseosa " y "Gaséosa" son una sola), copiada acá para dos cosas
 * que pasan **antes** de cualquier request: filtrar el catálogo mientras se
 * tipea, y avisar que el nombre ya existe sin esperar el `409`.
 *
 * ⚠️ **No toca los plurales**: `gaseosa` y `gaseosas` son dos especies
 * distintas, igual que del otro lado. Adivinar eso uniría cosas que no van
 * juntas.
 *
 * ⚠️ Es una **copia** de la regla del backend, no la fuente: quien decide si hay
 * choque es la base. Si allá cambia, acá se ajusta — pero el peor caso es un
 * aviso de más o de menos, nunca un dato mal guardado.
 */
export function claveDeEspecie(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * El catálogo filtrado por lo que se está tipeando, **sin distinguir mayúsculas
 * ni tildes**: `limon` encuentra a `Limón`.
 *
 * Se filtra en memoria y no con `?q=`: el catálogo viene entero de una sola vez,
 * así que buscar del lado del servidor sería una consulta por tecla para
 * recortar una lista que ya está en el teléfono.
 */
export function filtrarEspecies(especies: readonly Especie[], texto: string): readonly Especie[] {
  const clave = claveDeEspecie(texto);
  if (clave.length === 0) {
    return especies;
  }
  return especies.filter((especie) => claveDeEspecie(especie.nombre).includes(clave));
}

/**
 * La especie del catálogo que **es la misma** que ese nombre, si está.
 *
 * Sirve para las dos puntas: no ofrecer "crear Gaseosa" cuando ya existe
 * `gaseosa`, y avisar del duplicado antes de mandar el alta.
 */
export function buscarEspeciePorNombre(
  especies: readonly Especie[],
  nombre: string,
): Especie | undefined {
  const clave = claveDeEspecie(nombre);
  if (clave.length === 0) {
    return undefined;
  }
  return especies.find((especie) => claveDeEspecie(especie.nombre) === clave);
}

/**
 * `true` si ese nombre ya está en el catálogo, **ignorando la especie que se
 * está editando**: cambiarle solo las mayúsculas a la misma especie —"gaseosa"
 * → "Gaseosa"— no es un choque consigo misma y tiene que poder hacerse.
 */
export function yaExisteEspecie(
  especies: readonly Especie[],
  nombre: string,
  exceptoId?: string,
): boolean {
  const encontrada = buscarEspeciePorNombre(especies, nombre);
  return encontrada !== undefined && encontrada.id !== exceptoId;
}

/**
 * Se puede borrar solo la que **no se usó nunca**: es la salida para la que se
 * creó por error, no una forma de limpiar el catálogo. Borrar una en uso
 * dejaría renglones sin clasificar y facturas que ya no se pueden explicar.
 *
 * El dato ya viene en el listado, así que el botón se apaga sin pedir nada.
 */
export function sePuedeBorrar(especie: Especie): boolean {
  return especie.usos === 0;
}

/** En cuántos renglones se usó, en palabras. */
export function textoUsos(usos: number): string {
  if (usos === 0) {
    return 'Sin usar';
  }
  return usos === 1 ? 'En 1 renglón' : `En ${usos} renglones`;
}
