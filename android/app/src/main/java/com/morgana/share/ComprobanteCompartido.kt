package com.morgana.share

/**
 * Una imagen que llegó por la hoja de compartir, **ya copiada a un archivo
 * nuestro** (`docs/compartir_comprobante.md` §2.3).
 *
 * `archivo` es una ruta del disco de la app, nunca el `content://` original: ese
 * URI vive lo que vive el intent, y para cuando el cliente termina de loguearse
 * y de elegir la factura puede haber dejado de servir.
 */
data class ComprobanteCompartido(
  /** `file://…` a la copia, dentro de la caché de la app. */
  val archivo: String,
  /** El tipo real que declaró el proveedor, no el que dijo la app que compartió. */
  val mimeType: String,
  /** El nombre que se le muestra a la persona. Puede ser el que inventamos. */
  val nombre: String,
  /**
   * Lo que pesa el archivo que quedó en disco, medido acá.
   *
   * No es lo que declaró el proveedor: es `File.length()` sobre la copia, ya
   * convertida si hubo que convertirla. Cruza el puente para que JS pueda
   * volver a revisar el tope sin abrir el archivo — el módulo nativo puede
   * quedar de un APK viejo mientras Metro sirve JS nuevo.
   */
  val bytes: Long,
  /** Instante en que se recibió, en milisegundos. Lo usa el vencimiento de 24 h. */
  val recibidoEn: Long,
)
