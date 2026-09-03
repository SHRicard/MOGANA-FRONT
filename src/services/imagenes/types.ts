/**
 * Una imagen que ya vive en el disco de la app y está lista para subir.
 *
 * Es el mínimo que necesita el `FormData` de React Native
 * (`src/types/formData.d.ts`), y lo comparten **las dos formas** de conseguir un
 * comprobante: elegirlo de la galería o la cámara desde adentro de la app
 * (`docs/README_FRONT_COMPROBANTES.md` §4) y recibirlo por la hoja de compartir
 * de Android (`docs/compartir_comprobante.md`).
 *
 * ⚠️ **`archivo` es siempre una copia nuestra**, nunca el `content://` que
 * entregó el proveedor. Ese URI vive lo que vive el intent, y entre que la
 * imagen llega y se manda el aviso puede pasar un rato largo.
 */
export interface ImagenLocal {
  /** `file://…` a la copia. Sirve igual para el `<Image>` y para el `FormData`. */
  archivo: string;
  /** El mime declarado. Orientativo: el backend mira los primeros bytes. */
  mimeType: string;
  /** Con extensión. Es el `name` que viaja en el `FormData`. */
  nombre: string;
  /**
   * Lo que pesa, **cuando se pudo saber**.
   *
   * Es opcional porque no siempre hay quien lo diga: el picker lo trae casi
   * siempre y el puente de compartir mide el archivo que copió, pero un
   * proveedor raro puede no informar nada. Sirve para cortar antes de subir —y
   * para poder decir cuánto pesaba lo que se rechazó.
   */
  bytes?: number;
}

/**
 * En qué terminó abrir la galería o la cámara.
 *
 * Es un resultado y no una excepción porque **cancelar es lo normal**: se abre
 * la galería, se mira, se cierra. Un `throw` obligaría a envolver en `try/catch`
 * el caso más común de todos.
 *
 * Cada caso trae lo justo para escribir su cartel, y ninguno trae un texto ya
 * redactado: quién muestra qué es de la pantalla, no del servicio.
 */
export type ImagenElegida =
  | { estado: 'elegida'; imagen: ImagenLocal }
  /** Se cerró el picker sin elegir nada. No se dice nada: fue a propósito. */
  | { estado: 'cancelada' }
  /** Se negó el permiso de la cámara o de las fotos. */
  | { estado: 'sin_permiso' }
  /** Pasa el tope que aceptamos, ya comprimida. Trae el tope para poder decirlo. */
  | { estado: 'muy_pesada'; maxBytes: number }
  /**
   * No es de un formato que el backend guarde: un GIF, un BMP, un archivo
   * renombrado. Trae el tipo para poder escribirlo en el cartel — *"eso es un
   * GIF"* le dice a la persona qué elegir la próxima vez; *"formato no válido"*
   * la deja adivinando.
   */
  | { estado: 'formato_no_valido'; mimeType: string }
  /** Cualquier otra: no hay cámara, el proveedor falló, el archivo no se leyó. */
  | { estado: 'error' };
