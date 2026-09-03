/**
 * API pública del panel del sistema (`docs/README_FRONT_SUPER_ADMIN.md`).
 * Importar SOLO desde acá.
 *
 * ⚠️ **No es el panel del negocio.** El super admin puede todo lo que puede el
 * administrador —facturación, métricas, mensajes— y eso vive en
 * `@/features/admin`. Acá está lo otro: el estado del sistema, la ficha de
 * cualquier cuenta, los cambios de rol y su historial.
 *
 * El listado de todas las cuentas no está en esta feature: es el mismo de
 * `@/features/usuarios`, que ya elige el endpoint según el rol de quien mira.
 */
export { PanelSuperAdminScreen } from './screens/PanelSuperAdminScreen';
export { SistemaScreen } from './screens/SistemaScreen';
export { CuentaDelSistemaScreen } from './screens/CuentaDelSistemaScreen';
export { AuditoriaScreen } from './screens/AuditoriaScreen';

export { PANEL_SISTEMA_ITEMS } from './panelSistemaItems';
export type { PanelSistemaItem } from './panelSistemaItems';

export {
  auditoriaPaginaSchema,
  cuentaDelSistemaSchema,
  resumenDelSistemaSchema,
  rastroSchema,
} from './types';
export { AUDITORIA_LIMITE, MAX_LARGO_MOTIVO_DE_ROL } from './types';
export {
  accionLabel,
  consecuenciaDelCambio,
  desfaseDeReloj,
  formatUptime,
  hayRastro,
  nombreEnElRastro,
  opcionesDeRol,
  quienLoHizo,
  relojCorrido,
  resumenDeFacturas,
  semaforoDelStore,
} from './types';
export { NivelesDelStore, SemaforosDelStore, SEMAFORO_DEL_STORE_LABEL } from './types';

export type {
  AuditoriaPagina,
  CuentaDelSistema,
  ListarAuditoriaParams,
  OpcionDeRol,
  Rastro,
  RenglonDeAuditoria,
  ResumenDelSistema,
  SemaforoDelStore,
  StoreDelSistema,
} from './types';

export { useAuditoria, useCambiarRol, useCuentaDelSistema, useResumenDelSistema } from './hooks';
export type {
  FichaDelSistema,
  HistorialDelSistema,
  CambioDeRol,
  TableroDelSistema,
} from './hooks';

export {
  superAdminApi,
  useGetResumenDelSistemaQuery,
  useGetCuentaDelSistemaQuery,
  useCambiarRolMutation,
  useListarAuditoriaQuery,
} from './api';
