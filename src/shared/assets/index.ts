/**
 * Punto único de acceso a los assets compartidos de la app.
 *
 * ❌ No importes archivos sueltos con rutas relativas largas
 *    (`../../../shared/assets/logo/logo-morgana.svg`).
 * ✅ Importá desde acá: `import { LogoMorgana } from '@/shared/assets'`.
 *
 * Así, si mañana renombrás o movés un archivo, se toca un solo lugar.
 */

/**
 * Imagotipo de Morgana (símbolo + nombre). SVG → es un COMPONENTE, no un <Image>.
 *
 * ⚠️ Trae 57 violetas propios: NO se puede recolorear con la prop `color`.
 * Se consume vía el atom `Logo`, que ya le da el tamaño correcto.
 */
export { default as LogoMorgana } from './logo/logo-morgana.svg';

/** Proporción del imagotipo (viewBox 1451x530). Se usa para no deformarlo. */
export const LOGO_ASPECT_RATIO = 1451 / 530;
