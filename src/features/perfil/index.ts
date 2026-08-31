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

export { useCompletarPerfil, useMiCuenta } from './hooks';
export type { CompletarPerfil, MiCuenta } from './hooks';

export { completarPerfilSchema, aActualizarPerfilPayload, esCallejonSinSalida } from './types';
export { perfilSchema, miCuentaSchema, aCambiosDePerfil, aValoresDeFormulario } from './types';
export { motivoCampoFijo, CamposDelPerfil, esTelefonoValido } from './types';
export type { CompletarPerfilFormValues, ActualizarPerfilPayload } from './types';
export type { Perfil, CampoFijo, CampoDelPerfil, MiCuentaFormValues } from './types';
