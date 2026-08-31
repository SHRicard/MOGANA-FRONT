/**
 * API pública de la feature usuarios (apartado Administrador). Importar SOLO
 * desde acá.
 *
 * "Usuario" = quien tiene cuenta en la app. Desde el listado de clientes se
 * entra a facturar (`@/features/facturas`).
 */
export { UsuariosScreen } from './screens/UsuariosScreen';
export { ClienteScreen } from './screens/ClienteScreen';

export { usuarioSchema, usuariosPaginaSchema } from './types';
export { ROL_LABEL, rolLabel, USUARIOS_LIMITE, USUARIOS_DEBOUNCE_MS } from './types';
export { esFacturable, identificadorUsuario, nombreUsuario, sinFiado } from './types';
export { bloquearFiadoSchema, aBloquearFiadoPayload, MAX_LARGO_MOTIVO_SIN_FIADO } from './types';

export type { Usuario, UsuariosPagina, ListarClientesParams, ListarUsuariosParams } from './types';
export type { BloquearFiadoFormValues, CambiarFiadoPayload } from './types';

export { useListadoUsuarios, useCliente, useFiado } from './hooks';
export type { ListadoUsuarios, FichaCliente, ControlDeFiado } from './hooks';

export {
  useListarClientesQuery,
  useGetClienteQuery,
  useListarUsuariosQuery,
  useCambiarFiadoMutation,
} from './api';
