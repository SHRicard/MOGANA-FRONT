import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { imagenesService } from './imagenesService';

/**
 * Lo que se prueba acá es **la traducción**: qué le devuelve el picker y en qué
 * lo convertimos. Nada de esto llama a Android — abrir la galería de verdad es
 * una prueba manual, y las formas de la respuesta son las que declara la
 * librería (`react-native-image-picker/lib/typescript/types.d.ts`).
 */
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

const abrirGaleria = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const abrirCamara = launchCamera as jest.MockedFunction<typeof launchCamera>;

/** Los 8 MB del contrato del backend, que es quien pone el tope. */
const MAX_BYTES = 8 * 1024 * 1024;

/** Los formatos del contrato, tal cual se los pasa la feature. */
const TIPOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const REGLA = { maxBytes: MAX_BYTES, tiposAceptados: TIPOS };

function responde(respuesta: ImagePickerResponse) {
  abrirGaleria.mockResolvedValue(respuesta);
  abrirCamara.mockResolvedValue(respuesta);
}

const elegir = () => imagenesService.elegir({ desdeCamara: false, ...REGLA });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('imagenesService.elegir', () => {
  it('devuelve la imagen con lo que necesita el FormData', async () => {
    responde({
      assets: [
        {
          uri: 'file:///data/user/0/com.morgana/cache/rn_image_picker/captura.jpg',
          type: 'image/jpeg',
          fileName: 'captura.jpg',
          fileSize: 240_000,
        },
      ],
    });

    await expect(elegir()).resolves.toEqual({
      estado: 'elegida',
      imagen: {
        archivo: 'file:///data/user/0/com.morgana/cache/rn_image_picker/captura.jpg',
        mimeType: 'image/jpeg',
        nombre: 'captura.jpg',
        bytes: 240_000,
      },
    });
  });

  /** Cerrar el picker sin elegir es lo normal: no es un error ni se dice nada. */
  it('cancelar no es un error', async () => {
    responde({ didCancel: true });
    await expect(elegir()).resolves.toEqual({ estado: 'cancelada' });
  });

  it('distingue el permiso negado del resto de las fallas', async () => {
    responde({ errorCode: 'permission' });
    await expect(elegir()).resolves.toEqual({ estado: 'sin_permiso' });

    responde({ errorCode: 'camera_unavailable' });
    await expect(elegir()).resolves.toEqual({ estado: 'error' });
  });

  /**
   * ⚠️ El tope se corta **acá y no al mandar**: un `413` no se arregla desde el
   * formulario, hay que elegir otra imagen.
   */
  it('corta la que se pasa de 8 MB', async () => {
    responde({
      assets: [{ uri: 'file:///cache/enorme.png', type: 'image/png', fileSize: MAX_BYTES + 1 }],
    });

    await expect(elegir()).resolves.toEqual({ estado: 'muy_pesada', maxBytes: MAX_BYTES });
  });

  it('deja pasar la que da justo en el tope', async () => {
    responde({
      assets: [{ uri: 'file:///cache/justa.jpg', type: 'image/jpeg', fileSize: MAX_BYTES }],
    });

    await expect(elegir()).resolves.toMatchObject({ estado: 'elegida' });
  });

  /**
   * ⚠️ **El `name` tiene que llevar extensión** (§3, trampa 3): sin ella algunos
   * servidores no adivinan el tipo. El picker casi siempre la trae, pero un
   * proveedor raro puede devolver un nombre pelado o ninguno.
   */
  it('le pone la extensión al nombre cuando no la trae', async () => {
    responde({
      assets: [{ uri: 'file:///cache/a', type: 'image/png', fileName: 'IMG_0042' }],
    });

    await expect(elegir()).resolves.toMatchObject({
      imagen: { nombre: 'IMG_0042.png' },
    });
  });

  /**
   * ⚠️ La extensión sale del `type`, **no del nombre del proveedor**. El picker
   * recomprime, así que lo que se llamaba `.png` puede ser un JPEG — y el `name`
   * del `FormData` es de donde el servidor saca el tipo cuando el mime no le
   * alcanza. Que los dos digan cosas distintas es pedirle que adivine mal.
   */
  it('corrige la extensión del nombre para que coincida con el tipo', async () => {
    responde({
      assets: [{ uri: 'file:///cache/c', type: 'image/jpeg', fileName: 'captura.png' }],
    });

    await expect(elegir()).resolves.toMatchObject({
      imagen: { nombre: 'captura.jpg', mimeType: 'image/jpeg' },
    });
  });

  /** Un nombre con varios puntos se corta por el último, no por el primero. */
  it('no destroza un nombre con puntos en el medio', async () => {
    responde({
      assets: [{ uri: 'file:///cache/d', type: 'image/png', fileName: 'pago.2026.03.jpeg' }],
    });

    await expect(elegir()).resolves.toMatchObject({
      imagen: { nombre: 'pago.2026.03.png' },
    });
  });

  it('inventa un nombre cuando no viene ninguno', async () => {
    responde({ assets: [{ uri: 'file:///cache/b', type: 'image/webp' }] });

    await expect(elegir()).resolves.toMatchObject({
      imagen: { nombre: 'comprobante.webp', mimeType: 'image/webp' },
    });
  });

  /**
   * La segunda barrera contra "algo raro". La primera es `mediaType: 'photo'`,
   * que hace que el selector del sistema ni muestre los videos; esta cubre lo
   * que igual puede llegar: una galería de terceros, un archivo del explorador,
   * un formato que Android muestra como imagen pero el backend no guarda.
   */
  it('rechaza lo que no es un formato que el backend guarde', async () => {
    for (const tipo of ['image/gif', 'image/bmp', 'video/mp4', 'application/pdf', 'text/plain']) {
      responde({ assets: [{ uri: 'file:///cache/raro', type: tipo, fileSize: 1000 }] });

      await expect(elegir()).resolves.toEqual({ estado: 'formato_no_valido', mimeType: tipo });
    }
  });

  it('acepta los cuatro formatos del contrato', async () => {
    for (const tipo of ['image/jpeg', 'image/png', 'image/webp', 'image/heic']) {
      responde({ assets: [{ uri: 'file:///cache/ok', type: tipo, fileSize: 1000 }] });

      await expect(elegir()).resolves.toMatchObject({ estado: 'elegida' });
    }
  });

  /**
   * Un proveedor puede declarar el mime en mayúsculas o pegarle parámetros.
   * Comparar crudo rechazaría una foto perfectamente válida.
   */
  it('no se pierde con el mime en mayúsculas o con parámetros', async () => {
    responde({
      assets: [{ uri: 'file:///cache/e', type: 'IMAGE/JPEG; charset=binary', fileSize: 1000 }],
    });

    await expect(elegir()).resolves.toMatchObject({ estado: 'elegida' });
  });

  /**
   * ⚠️ El formato se revisa **antes** que el peso: decirle "pesa más de 8 MB" a
   * quien eligió un video lo manda a achicar un archivo que igual se iba a
   * rechazar. Primero se dice QUÉ está mal.
   */
  it('un video pesado se rechaza por lo que es, no por lo que pesa', async () => {
    responde({
      assets: [{ uri: 'file:///cache/video.mp4', type: 'video/mp4', fileSize: MAX_BYTES + 1 }],
    });

    await expect(elegir()).resolves.toEqual({ estado: 'formato_no_valido', mimeType: 'video/mp4' });
  });

  /**
   * La cámara de varios teléfonos no completa el `type`. Rechazar ahí sería
   * romper el camino más usado de todos por un campo que faltó.
   */
  it('sin tipo asume una foto en vez de rechazarla', async () => {
    responde({ assets: [{ uri: 'file:///cache/foto', fileName: 'foto', fileSize: 1000 }] });

    await expect(elegir()).resolves.toMatchObject({
      estado: 'elegida',
      imagen: { mimeType: 'image/jpeg', nombre: 'foto.jpg' },
    });
  });

  /** Sin `uri` no hay nada que subir, por más que la respuesta venga sin error. */
  it('trata como error la respuesta vacía', async () => {
    responde({ assets: [] });
    await expect(elegir()).resolves.toEqual({ estado: 'error' });

    responde({ assets: [{ fileName: 'sin-uri.jpg' }] });
    await expect(elegir()).resolves.toEqual({ estado: 'error' });
  });

  /** Que el picker explote no puede tumbar la pantalla del formulario. */
  it('no propaga la excepción del picker', async () => {
    abrirGaleria.mockRejectedValue(new Error('boom'));
    await expect(elegir()).resolves.toEqual({ estado: 'error' });
  });

  it('abre la cámara o la galería según se le pida', async () => {
    responde({ didCancel: true });

    await imagenesService.elegir({ desdeCamara: false, ...REGLA });
    expect(abrirGaleria).toHaveBeenCalledTimes(1);
    expect(abrirCamara).not.toHaveBeenCalled();

    await imagenesService.elegir({ desdeCamara: true, ...REGLA });
    expect(abrirCamara).toHaveBeenCalledTimes(1);
  });

  /**
   * Comprimir al elegir ahorra datos del cliente y evita el `413` (§4). El
   * backend igual la vuelve a achicar, así que perder calidad acá no cuesta
   * nada.
   */
  it('comprime y pide una sola foto', async () => {
    responde({ didCancel: true });
    await elegir();

    expect(abrirGaleria).toHaveBeenCalledWith(
      expect.objectContaining({ mediaType: 'photo', quality: 0.7, selectionLimit: 1 }),
    );
  });
});
