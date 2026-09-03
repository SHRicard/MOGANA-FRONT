import { NativeModules, Platform } from 'react-native';
import type { ComprobanteCompartido } from './types';

/**
 * Única puerta al módulo nativo de compartir (`ShareIntentModule.kt`).
 * ❌ Nunca toques `NativeModules.ShareIntent` directo desde una feature.
 *
 * **Entrega y borra en el mismo paso**: el nativo saca el comprobante de su cola
 * al devolverlo. Es lo que hace que preguntar de más sea gratis —y por eso la
 * app pregunta al montar *y* cada vez que vuelve a primer plano, que son los dos
 * momentos en que puede haber algo esperando (§2.2)—, sin riesgo de procesar el
 * mismo comprobante dos veces.
 *
 * ⚠️ **Solo Android.** En iOS compartir a una app necesita una Share Extension,
 * que es un target aparte del proyecto de Xcode; mientras no exista, esto
 * devuelve `null` en vez de romper.
 */

interface ShareIntentNativeModule {
  tomarComprobante(): Promise<unknown>;
}

/**
 * La regla del archivo, la misma que se le pasa al picker. La pone quien llama:
 * **este servicio no conoce el contrato del backend**, solo lo aplica.
 */
export interface ReglaDelComprobante {
  maxBytes: number;
  tiposAceptados: readonly string[];
}

const nativo: ShareIntentNativeModule | undefined =
  Platform.OS === 'android'
    ? (NativeModules.ShareIntent as ShareIntentNativeModule | undefined)
    : undefined;

/**
 * Valida lo que cruzó el puente.
 *
 * No es paranoia: el módulo nativo puede quedar de una versión vieja del APK
 * mientras Metro sirve JS nuevo, y ahí lo que llega no tiene por qué tener la
 * forma que este archivo espera. Un campo faltante tiene que ser "no había
 * nada", no un `undefined` que revienta tres pantallas más adelante.
 */
function aComprobante(valor: unknown, regla: ReglaDelComprobante): ComprobanteCompartido | null {
  if (typeof valor !== 'object' || valor === null) {
    return null;
  }
  const { archivo, mimeType, nombre, bytes, recibidoEn } = valor as Record<string, unknown>;

  if (typeof archivo !== 'string' || archivo.length === 0) {
    return null;
  }

  const tipo = typeof mimeType === 'string' && mimeType ? mimeType : 'image/jpeg';
  const peso = typeof bytes === 'number' ? bytes : undefined;

  /*
    ⚠️ **La misma revisión que ya hizo el nativo, otra vez.** No es desconfianza
    del código de al lado: es que el módulo nativo vive en el APK y este archivo
    en el bundle, y los dos se actualizan por caminos distintos. Un APK viejo con
    JS nuevo es el estado normal de una sesión de desarrollo, y es exactamente el
    caso en que el nativo todavía no filtra nada.

    Descarta en silencio y no avisa: quien compartió un video ve la app abrirse
    en el inicio. Plantarle un cartel de error a alguien que ni siquiera estaba
    intentando mandar un comprobante es peor que no decir nada.
  */
  if (!regla.tiposAceptados.includes(tipo.split(';')[0].trim().toLowerCase())) {
    if (__DEV__) {
      console.warn(`[share] Lo compartido no es un formato que se pueda subir (${tipo})`);
    }
    return null;
  }
  if (peso !== undefined && peso > regla.maxBytes) {
    if (__DEV__) {
      console.warn(`[share] Lo compartido pesa ${peso} bytes y el tope es ${regla.maxBytes}`);
    }
    return null;
  }

  return {
    archivo,
    mimeType: tipo,
    nombre: typeof nombre === 'string' && nombre ? nombre : 'comprobante.jpg',
    bytes: peso,
    recibidoEn: typeof recibidoEn === 'number' ? recibidoEn : Date.now(),
  };
}

export const shareIntentService = {
  /** `true` si esta plataforma puede recibir comprobantes compartidos. */
  disponible(): boolean {
    return nativo !== undefined;
  },

  /**
   * El comprobante que esté esperando, o `null`. Lo saca de la cola nativa.
   *
   * Nunca rechaza: que no haya nada compartido es la respuesta normal —es lo que
   * pasa en cada arranque común de la app—, no un error. Lo que llegó y no sirve
   * —un formato que el backend no guarda, algo que se pasa del tope— también es
   * `null`: no hay comprobante que ofrecer.
   */
  async tomarComprobante(regla: ReglaDelComprobante): Promise<ComprobanteCompartido | null> {
    if (!nativo) {
      return null;
    }
    try {
      return aComprobante(await nativo.tomarComprobante(), regla);
    } catch (error) {
      if (__DEV__) {
        console.warn('[share] No se pudo leer lo compartido:', error);
      }
      return null;
    }
  },
};
