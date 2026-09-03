import type { ImagenLocal } from '@/services/imagenes';

/**
 * Lo que llega por la **hoja de compartir** de Android
 * (`docs/compartir_comprobante.md`).
 *
 * Es una `ImagenLocal` como la que devuelve el picker de la galería —el mismo
 * `{ archivo, mimeType, nombre }` que necesita el `FormData`— más **cuándo
 * llegó**, que es lo único que este camino tiene y el otro no: una imagen
 * compartida puede quedar esperando días a que alguien se loguee, y una elegida
 * a mano se manda en el mismo minuto.
 *
 * ⚠️ `archivo` es **una copia nuestra**, no el `content://` que entregó Android.
 * El módulo nativo la hace apenas entra el intent, que es el único momento en
 * que el permiso de lectura del proveedor todavía vale (§2.3). Desde ahí en
 * adelante sobrevive al login, a que la app pase a segundo plano y a que el
 * cliente tarde en elegir la factura.
 */
export interface ComprobanteCompartido extends ImagenLocal {
  /** Cuándo llegó, en milisegundos. Lo usa el vencimiento de 24 h del pendiente. */
  recibidoEn: number;
}
