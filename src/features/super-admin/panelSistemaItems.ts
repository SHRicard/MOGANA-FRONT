import type { ComponentType } from 'react';
import LayoutDashboard from 'lucide-react-native/icons/layout-dashboard';
import ScrollText from 'lucide-react-native/icons/scroll-text';
import ServerCog from 'lucide-react-native/icons/server-cog';
import UsersRound from 'lucide-react-native/icons/users-round';
// Import por la ruta profunda y no por `@/app/navigation`: el barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes, type RootRoute } from '@/app/navigation/routes';

/**
 * Forma mínima que cumple cualquier ícono de lucide. Mismo criterio que
 * `PANEL_ITEMS` y `MENU_ITEMS`: la pantalla no se ata a un paquete de íconos
 * puntual.
 */
export type PanelSistemaIconComponent = ComponentType<{ size?: number; color?: string }>;

export interface PanelSistemaItem {
  /** Clave estable de la fila. No es el label: el texto puede cambiar. */
  id: string;
  label: string;
  /** En una línea, qué se encuentra ahí adentro. */
  description: string;
  icon: PanelSistemaIconComponent;
  route: RootRoute;
}

/**
 * Las secciones del panel del sistema, en orden
 * (`docs/README_FRONT_SUPER_ADMIN.md` §8).
 *
 * Es un catálogo —un dato, no un componente— para que se pueda leer y testear
 * sin montar nada, igual que `PANEL_ITEMS`.
 *
 * ⚠️ **La última fila es el panel del negocio, y no está de más.** El super
 * admin ve dos cosas: el sistema (esto) y todo el panel del administrador, con
 * su mismo token. Sin esa fila, este panel se leería como si fuera todo lo que
 * tiene, y la mitad de su trabajo —la facturación— quedaría escondida en otro
 * lugar del menú.
 *
 * ⚠️ Quién ve el panel entero lo decide el menú "Más" (`MENU_ITEMS`), que ya lo
 * muestra solo al super admin. Acá no se vuelve a gatear por rol: la API igual
 * contesta `403` si alguien llega por otro camino.
 */
export const PANEL_SISTEMA_ITEMS: readonly PanelSistemaItem[] = [
  {
    id: 'sistema',
    label: 'Estado del sistema',
    // Va primero: es la pregunta con la que se entra a este panel. Y dice lo que
    // hay adentro, no una categoría — "el sistema" no le anticipa a nadie que
    // ahí se ve si el servidor tiene la hora corrida.
    description: 'Cuentas, entradas, store y servidor',
    icon: ServerCog,
    route: RootRoutes.SISTEMA,
  },
  {
    id: 'cuentas',
    label: 'Todas las cuentas',
    // Es el mismo listado que ve el administrador con una columna más —el rol—,
    // y por eso es la misma pantalla: dos tablas de lo mismo terminan mostrando
    // cosas distintas de la misma persona.
    description: 'Las tres clases de cuenta, no solo los clientes',
    icon: UsersRound,
    route: RootRoutes.USUARIOS,
  },
  {
    id: 'auditoria',
    label: 'Historial de cambios de rol',
    description: 'Quién movió a quién, cuándo y por qué',
    icon: ScrollText,
    route: RootRoutes.AUDITORIA,
  },
  {
    id: 'negocio',
    label: 'Panel del negocio',
    // La otra mitad de lo que ve el dueño. Va última porque este panel es el del
    // sistema: la fila está para que no haya que salir al menú a buscarla.
    description: 'Facturación, métricas y mensajes',
    icon: LayoutDashboard,
    route: RootRoutes.PANEL_ADMIN,
  },
];
