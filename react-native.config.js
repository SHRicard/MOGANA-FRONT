/**
 * Configuración del CLI de React Native.
 *
 * `assets` es la lista de carpetas con **recursos nativos**: fuentes. No son
 * assets de JS —Metro no las ve— sino archivos que el sistema operativo tiene
 * que tener instalados antes de que exista un solo componente.
 *
 * Quien las instala es `npx react-native-asset`, que hay que correr **una vez
 * por cada archivo nuevo** que se sume a la carpeta:
 *
 *   - Android: las copia a `android/app/src/main/assets/fonts/`
 *   - iOS: las suma al target de Xcode y las declara en `UIAppFonts` del Info.plist
 *
 * Después hay que **recompilar** (`run-android` / `run-ios`). Recargar Metro con
 * la `r` no alcanza: la fuente no está del lado de JS.
 *
 * ⚠️ El nombre del archivo importa y no es cosmético: Android busca la fuente
 * por el nombre del ARCHIVO y iOS por el nombre PostScript que viene adentro.
 * Ver `src/shared/assets/README.md`.
 */
module.exports = {
  project: { ios: {}, android: {} },
  assets: ['./src/shared/assets/fonts'],
};
