/**
 * El `FormData` de React Native.
 *
 * Hace falta declararlo a mano por dos motivos que se suman: la app no incluye
 * la lib `dom` en el `tsconfig` —no es un navegador— y React Native instala su
 * `FormData` como un global en runtime, sin publicar tipos de TypeScript para
 * él (su polyfill está tipado en Flow).
 *
 * ⚠️ **No es el `FormData` del navegador**, y la diferencia es justo la que hace
 * fallar la subida del comprobante (`docs/compartir_comprobante.md` §4):
 *
 * - un archivo **no es un `Blob` ni un `File`**, es el objeto de tres campos
 *   `{ uri, type, name }` que declara `ArchivoDeFormData`;
 * - `name` tiene que traer **extensión**: sin ella algunos servidores no
 *   adivinan el tipo;
 * - el `type` que se manda **no decide nada**: el backend verifica el formato
 *   real por los primeros bytes del archivo.
 *
 * Y la trampa que no se ve acá pero rompe igual: **nunca pongas el
 * `Content-Type` a mano**. El runtime tiene que escribirlo él para incluir el
 * `boundary`; forzándolo, el backend no encuentra el archivo y contesta que
 * falta el comprobante.
 *
 * La firma es la del polyfill real
 * (`react-native/Libraries/Network/FormData.js`).
 */
interface ArchivoDeFormData {
  /** `file://…` o `content://…`. Nunca una ruta pelada. */
  uri: string;
  /** El mime declarado. Orientativo: el backend mira los bytes. */
  type?: string;
  /** El nombre del archivo, **con extensión**. */
  name?: string;
}

type ValorDeFormData = string | ArchivoDeFormData;

declare class FormData {
  append(key: string, value: ValorDeFormData): void;
  getAll(key: string): ValorDeFormData[];
}
