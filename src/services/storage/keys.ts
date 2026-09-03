/** Claves del storage. Centralizadas para evitar strings sueltos por la app. */
export const StorageKeys = {
  /** Preferencia de tema del usuario: 'light' | 'dark' | 'system'. */
  THEME_MODE: 'theme_mode',
  /** Tipografía elegida: 'system' | 'inter'. */
  FONT_FAMILY: 'font_family',
  /** Datos NO sensibles del usuario logueado (el token va aparte, encriptado). */
  USER: 'user',
  /**
   * El comprobante que llegó por la hoja de compartir y todavía no se subió
   * (`docs/compartir_comprobante.md` §5.1).
   *
   * Va al storage y no solo a Redux porque tiene que sobrevivir a que la app se
   * cierre: el caso más común de todos es compartir con la sesión vencida, y si
   * la imagen se pierde en el login el cliente tiene que volver a Mercado Pago y
   * compartir de nuevo.
   */
  COMPROBANTE_PENDIENTE: 'comprobante_pendiente',
  /**
   * El último medio de pago que se eligió al avisar
   * (`docs/compartir_comprobante.md` §3).
   *
   * Android manda la imagen, no de dónde salió, así que el medio hay que
   * preguntarlo siempre. Recordar el anterior hace que en el caso normal —el
   * mismo cliente pagando siempre igual— alcance con no tocar nada.
   */
  ULTIMO_MEDIO_DE_PAGO: 'ultimo_medio_de_pago',
} as const;

/** Claves del storage seguro (encriptado). */
export const SecureStorageKeys = {
  AUTH_TOKEN: 'auth_token',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
export type SecureStorageKey = (typeof SecureStorageKeys)[keyof typeof SecureStorageKeys];
