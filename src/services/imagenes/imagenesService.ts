import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
  type OptionsCommon,
} from 'react-native-image-picker';
import type { ImagenElegida } from './types';

/**
 * Única puerta a `react-native-image-picker`.
 * ❌ Nunca importes la librería directo desde una feature.
 *
 * Existe por lo mismo que `services/share`: la feature habla de *comprobantes*,
 * no de assets, códigos de error ni `mediaType`. Acá adentro se traduce todo eso
 * a un `ImagenElegida` y, el día que haya que cambiar de librería, no se toca
 * ninguna pantalla.
 *
 * **Comprime al elegir** (`docs/README_FRONT_COMPROBANTES.md` §4): ahorra datos
 * del cliente y evita el `413`. El backend igual la vuelve a achicar al
 * guardarla, así que perder calidad acá no cuesta nada — un comprobante se lee
 * igual.
 *
 * ⚠️ **No declaramos el permiso `CAMERA`** en el manifest, y no es un olvido:
 * la librería usa `ACTION_IMAGE_CAPTURE`, que delega en la app de cámara del
 * teléfono y no necesita el permiso. Declararlo sin pedirlo hace que Android
 * tire un `SecurityException` justo al abrir la cámara.
 */

/** Ancho o alto máximo de la copia. Un comprobante se lee de sobra con esto. */
const LADO_MAXIMO = 2000;

/**
 * `0.7` es el valor que propone el doc. Es lo que baja de golpe el peso de una
 * captura sin que se pierda el número de operación, que es lo único que hay que
 * poder leer.
 */
const CALIDAD = 0.7;

const OPCIONES: OptionsCommon = {
  /**
   * ⚠️ **`photo` es la primera barrera contra el video**, y la que mejor se
   * siente: el selector del sistema directamente no muestra los videos, así que
   * no hay nada que elegir y después rechazar. Las otras dos barreras están
   * igual, porque esta sola no alcanza —hay galerías de terceros que devuelven
   * lo que quieren—: el tipo se revisa acá abajo y el backend mira los primeros
   * bytes del archivo.
   */
  mediaType: 'photo',
  quality: CALIDAD,
  maxWidth: LADO_MAXIMO,
  maxHeight: LADO_MAXIMO,
  // El peso viene acá: sin esto no se puede cortar la que se pasa del tope.
  includeExtra: true,
};

const MIME_POR_DEFECTO = 'image/jpeg';

/**
 * Las extensiones de los formatos que acepta el backend
 * (`docs/README_FRONT_COMPROBANTES.md` §1). El `heic` de iPhone incluido: llega
 * igual desde una galería compartida.
 */
const EXTENSION_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heic',
};

/**
 * El nombre del archivo, **siempre con la extensión que le corresponde al tipo**
 * (§3, trampa 3).
 *
 * El picker casi siempre trae uno, pero puede venir sin extensión —o sin nombre,
 * si la imagen salió de un proveedor raro—, y eso hace que algunos servidores no
 * adivinen el tipo.
 *
 * ⚠️ **La extensión que traiga el proveedor no se respeta: se reemplaza.** El
 * nombre y el contenido de un archivo no tienen por qué coincidir —el picker
 * recomprime, así que un `captura.png` que salió reescalado ya es un JPEG—, y el
 * `name` del `FormData` es de donde el servidor saca el tipo cuando el mime no
 * le alcanza. Que diga otra cosa que el `type` es pedirle que adivine mal.
 */
function nombreDe(asset: Asset, mimeType: string): string {
  const extension = EXTENSION_POR_MIME[normalizar(mimeType)] ?? 'jpg';
  const propuesto = asset.fileName?.trim();

  if (!propuesto) {
    return `comprobante.${extension}`;
  }
  // Se corta por el ÚLTIMO punto: un nombre puede tener varios
  // (`pago.2026.03.png`) y quedarnos con el primero renombraría el archivo.
  const punto = propuesto.lastIndexOf('.');
  const base = punto > 0 ? propuesto.slice(0, punto) : propuesto;

  return `${base}.${extension}`;
}

/** El mime, sin mayúsculas ni los parámetros que algunos proveedores pegan. */
function normalizar(mimeType: string): string {
  return mimeType.split(';')[0].trim().toLowerCase();
}

/** Traduce la respuesta del picker al resultado que entiende la feature. */
function aResultado(respuesta: ImagePickerResponse, regla: OpcionesDeElegir): ImagenElegida {
  if (respuesta.didCancel) {
    return { estado: 'cancelada' };
  }
  if (respuesta.errorCode === 'permission') {
    return { estado: 'sin_permiso' };
  }
  if (respuesta.errorCode) {
    return { estado: 'error' };
  }

  const asset = respuesta.assets?.[0];
  // Sin `uri` no hay nada que subir. Pasa con un archivo que el proveedor no
  // pudo abrir: la respuesta llega "bien" pero vacía.
  if (!asset?.uri) {
    return { estado: 'error' };
  }

  /*
    El tipo, antes que el peso: si lo que eligieron ni siquiera es un formato que
    el backend guarde, "pesa más de 8 MB" manda a achicar un archivo que igual
    iba a ser rechazado. Primero se dice QUÉ está mal.

    Sin `type` se asume JPEG y se sigue: es lo que devuelve la cámara en varios
    teléfonos, y rechazar la foto recién sacada por un campo que el proveedor no
    completó sería romper el camino más usado de todos.
  */
  const mimeType = asset.type ?? MIME_POR_DEFECTO;
  if (!regla.tiposAceptados.includes(normalizar(mimeType))) {
    return { estado: 'formato_no_valido', mimeType };
  }

  /*
    El tope es del backend y el `413` no se puede corregir desde el formulario,
    así que se corta acá — ya comprimida, que es cuando el peso es el real.

    ⚠️ Sin `fileSize` **se deja pasar**, y es a propósito: el picker recomprime a
    2000 px con calidad 0.7, así que lo que sale de acá pesa cientos de kB y el
    caso de un archivo grande sin peso informado es casi teórico. Cortar por las
    dudas sería rechazar fotos buenas por un dato que faltó; la red que queda es
    el error del backend, que sí sabe cuánto pesó.
  */
  if (asset.fileSize !== undefined && asset.fileSize > regla.maxBytes) {
    return { estado: 'muy_pesada', maxBytes: regla.maxBytes };
  }

  return {
    estado: 'elegida',
    imagen: {
      archivo: asset.uri,
      mimeType,
      nombre: nombreDe(asset, mimeType),
      bytes: asset.fileSize,
    },
  };
}

export interface OpcionesDeElegir {
  /** `true` abre la cámara; `false`, la galería. */
  desdeCamara: boolean;
  /** El tope que acepta el backend. Lo pone quien llama: es una regla suya. */
  maxBytes: number;
  /**
   * Los mime que el backend guarda. También los pone quien llama, por lo mismo
   * que el tope: **este servicio no conoce el contrato**, solo lo aplica. El día
   * que el backend acepte uno más se cambia en la feature y acá no se toca nada.
   *
   * Van normalizados en minúscula: es contra eso que se compara.
   */
  tiposAceptados: readonly string[];
}

export const imagenesService = {
  /**
   * Abre la galería o la cámara y devuelve la imagen ya copiada al disco de la
   * app, comprimida y con nombre.
   *
   * Nunca rechaza: todo lo que puede salir mal —cancelar, negar el permiso,
   * pasarse de peso, elegir algo que no es una foto— es un caso del resultado,
   * no una excepción.
   */
  async elegir(opciones: OpcionesDeElegir): Promise<ImagenElegida> {
    try {
      const respuesta = opciones.desdeCamara
        ? await launchCamera({ ...OPCIONES, saveToPhotos: false })
        : await launchImageLibrary({ ...OPCIONES, selectionLimit: 1 });

      return aResultado(respuesta, opciones);
    } catch (error) {
      if (__DEV__) {
        console.warn('[imagenes] No se pudo elegir la imagen:', error);
      }
      return { estado: 'error' };
    }
  },
};
