/**
 * API pública de la feature perfil. Importar SOLO desde acá.
 *
 * Son las dos pantallas de la cuenta propia, sobre los mismos dos endpoints
 * (`/api/users/me`), y sirven para cualquier rol:
 *
 *  - **el bloqueo** (`docs/flujo_login.md`): la pared que pide el DNI antes de
 *    dejar usar la app;
 *  - **Mi cuenta** (`docs/flujo_mi_cuenta.md`): la de después, donde la persona
 *    ve y corrige sus datos.
 */
export { PerfilBloqueadoScreen } from './screens/PerfilBloqueadoScreen';

/** Ver y corregir los datos propios (`docs/flujo_mi_cuenta.md`). */
export { MiCuentaScreen } from './screens/MiCuentaScreen';

/**
 * **Eliminar mi cuenta** (`docs/README_FRONT_BAJA_DE_CUENTA.md`). Existe porque
 * Google Play lo exige: si la app deja crear una cuenta, tiene que dejar
 * borrarla. Se abre desde Mi cuenta y también desde el cartel del DNI — los dos
 * endpoints responden con la cuenta bloqueada.
 */
export { EliminarCuentaScreen } from './screens/EliminarCuentaScreen';

export { useCompletarPerfil, useMiCuenta, useBajaDeCuenta } from './hooks';
export type { CompletarPerfil, MiCuenta, BajaDeCuenta } from './hooks';

export { completarPerfilSchema, aActualizarPerfilPayload, esCallejonSinSalida } from './types';
export { perfilSchema, miCuentaSchema, aCambiosDePerfil, aValoresDeFormulario } from './types';
export { motivoCampoFijo, CamposDelPerfil, esTelefonoValido } from './types';
export type { CompletarPerfilFormValues, ActualizarPerfilPayload } from './types';
export type { Perfil, CampoFijo, CampoDelPerfil, MiCuentaFormValues } from './types';

export { vistaPreviaDeBajaSchema, bajaHechaSchema, datoRetenidoSchema } from './types';
export { CaminosDeBaja, confirmacionCoincide, quedanDatos } from './types';
export type {
  BajaHecha,
  CaminoDeBaja,
  DarDeBajaPayload,
  DatoRetenido,
  VistaPreviaDeBaja,
} from './types';
