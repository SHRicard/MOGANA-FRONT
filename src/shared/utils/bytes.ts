/**
 * Tamaños de archivo, para mostrar.
 *
 * El formateo es manual y no usa `Intl`/`toLocaleString` por lo mismo que en
 * `money.ts`: en Android el resultado depende del locale del dispositivo, así
 * que el mismo número se vería distinto en dos celulares.
 *
 * ⚠️ **Se usan múltiplos de 1024, no de 1000.** Es lo que cuenta Cloudinary y lo
 * que dice el sistema operativo: si acá dividiéramos por 1000, el panel diría
 * "88 MB" donde la consola del store dice "84 MB" y no habría forma de saber
 * cuál de los dos miente.
 */

/** Los saltos, del más chico al más grande. `B` no lleva decimales. */
const UNIDADES = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

const POR_UNIDAD = 1024;

/** Separador decimal es-AR, igual que en los importes. */
const DECIMALES = ',';

/**
 * Cuántos bytes, escrito para leer: `88 MB`, `1,4 GB`, `344 KB`.
 *
 * Un decimal y no dos: es una magnitud para decidir —"¿me conviene limpiar
 * esto?"—, no un importe. `47,3 MB` y `47,28 MB` responden la misma pregunta, y
 * el segundo se lee peor.
 *
 * @param bytes puede venir en cero, y ahí dice `0 B` en vez de una cadena vacía:
 *   un tramo sin nada tiene que decir que no tiene nada.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  let valor = bytes;
  let unidad = 0;

  while (valor >= POR_UNIDAD && unidad < UNIDADES.length - 1) {
    valor /= POR_UNIDAD;
    unidad += 1;
  }

  // Los bytes pelados no llevan decimales: "344,0 B" no le dice nada a nadie.
  if (unidad === 0) {
    return `${Math.round(valor)} ${UNIDADES[unidad]}`;
  }

  const redondeado = Math.round(valor * 10) / 10;
  // Sin el ",0" cuando da redondo: "2 MB" se lee mejor que "2,0 MB".
  const texto = Number.isInteger(redondeado)
    ? String(redondeado)
    : String(redondeado).replace('.', DECIMALES);

  return `${texto} ${UNIDADES[unidad]}`;
}
