import type { ComponentType } from 'react';
import FileText from 'lucide-react-native/icons/file-text';
import Files from 'lucide-react-native/icons/files';
import LayoutDashboard from 'lucide-react-native/icons/layout-dashboard';
import LifeBuoy from 'lucide-react-native/icons/life-buoy';
import LogOut from 'lucide-react-native/icons/log-out';
import Send from 'lucide-react-native/icons/send';
import Settings from 'lucide-react-native/icons/settings';
import ShoppingBasket from 'lucide-react-native/icons/shopping-basket';
import User from 'lucide-react-native/icons/user';
import Users from 'lucide-react-native/icons/users';
// Import por la ruta profunda y no por `@/app/navigation`: el barrel arrastra el
// RootNavigator, que importa este panel → ciclo en runtime.
import { RootRoutes, type RootRoute } from '@/app/navigation/routes';
import { Roles, type Rol } from '@/features/auth';

/**
 * Forma mínima que cumple cualquier ícono de lucide. Tipamos lo que usamos en
 * vez de importar el tipo de la librería: el panel no tiene por qué atarse a un
 * paquete de íconos puntual.
 */
export type MenuIconComponent = ComponentType<{ size?: number; color?: string }>;

/**
 * Lo que hace una fila que **no lleva a ninguna pantalla**.
 *
 * Es un dato y no una función a propósito: `MENU_ITEMS` es un catálogo que se
 * puede leer y testear sin montar nada. Quién la ejecuta —y con qué
 * confirmación— lo decide el panel (`MenuSheet`), que es donde vive la UI.
 */
export const MenuAcciones = {
  /** Salir de la cuenta en este dispositivo. */
  LOGOUT: 'logout',
} as const;

export type MenuAccion = (typeof MenuAcciones)[keyof typeof MenuAcciones];

export interface MenuItem {
  /** Clave estable de la fila. No es el label: el texto puede cambiar. */
  id: string;
  label: string;
  /**
   * Texto de apoyo debajo del label: en una línea, dice qué se encuentra ahí
   * adentro. Corto a propósito — si necesita dos renglones, la opción está mal
   * nombrada o hace demasiado.
   */
  description: string;
  icon: MenuIconComponent;
  /**
   * Roles que VEN esta fila. Sin esto la ve cualquier sesión iniciada.
   *
   * **Niega por defecto**: con `roles` declarados, quien no esté en la lista no
   * ve la fila — y sin rol en la sesión, tampoco.
   */
  roles?: readonly Rol[];
  /**
   * A dónde va la fila. Sin ruta, la fila solo se pinta — es el caso de las
   * pantallas que todavía no existen.
   */
  route?: RootRoute;
  /**
   * Qué hace la fila cuando **no navega**: cerrar sesión no abre ninguna
   * pantalla, pero es lo más tocado del panel.
   *
   * Una fila tiene `route` **o** `accion`, nunca las dos: si tuviera las dos, no
   * habría forma de saber qué pasa al tocarla.
   */
  accion?: MenuAccion;
}

/** Atajo para las filas que ve todo el mundo. */
const TODOS = [Roles.SUPER_ADMIN, Roles.ADMINISTRADOR, Roles.CLIENTE] as const;

/** Los dos roles que operan el sistema. Entran a `/api/admin/*`. */
const ADMINISTRACION = [Roles.SUPER_ADMIN, Roles.ADMINISTRADOR] as const;

/**
 * Catálogo del panel "Más", en orden de aparición. Fuente única: agregar una
 * opción es sumar una entrada acá.
 *
 * ⚠️ `roles` es UI, no seguridad: esconder una fila solo evita que se muestre.
 * El acceso real lo valida la API en cada endpoint, con un `403`.
 *
 * 🚧 Las filas **sin `route` ni `accion`** solo se pintan: esas pantallas
 * todavía no existen. Cuando existan, se les suma su ruta del router y pasan a
 * ser tocables.
 */
export const MENU_ITEMS: readonly MenuItem[] = [
  // ── Solo administración ──
  {
    id: 'admin-panel',
    label: 'Panel de administración',
    // Dice lo que hay adentro, no una categoría: "actividad de la app" no le
    // anticipa a nadie que ahí se ve cuánta plata está en la calle.
    description: 'Métricas del negocio y avisos a los clientes',
    icon: LayoutDashboard,
    roles: ADMINISTRACION,
    route: RootRoutes.PANEL_ADMIN,
  },
  {
    id: 'users-management',
    // "Todos" lo distingue del tab Clientes, que muestra únicamente a los que ya
    // tienen facturas. Son dos listas distintas y tienen que sonar distintas.
    label: 'Todos los clientes',
    // Dice lo que la pantalla HACE hoy: listar y abrir la ficha. Prometer
    // "altas y bajas" sería mandar a alguien a buscar botones que no existen.
    description: 'Todas las cuentas, tengan facturas o no',
    icon: Users,
    // Los mismos dos roles que acepta `GET /api/admin/clientes`. El super admin
    // ve además todas las cuentas (`/api/super-admin/usuarios`), no solo las de
    // los clientes.
    roles: ADMINISTRACION,
    route: RootRoutes.USUARIOS,
  },

  // ── Lo mío: la cuenta propia (`docs/user_cliente_flujo.md`) ──
  //
  // Las ve CUALQUIER rol y no solo el cliente, igual que "Mi cuenta": la API no
  // acepta un id de persona —el dueño sale del token—, así que un administrador
  // que entre ve la suya, normalmente vacía. Esconderlas por rol daría a
  // entender que hay un permiso donde no lo hay.
  //
  // La factura y el aviso de pago no están acá porque no se entra a ellos desde
  // el menú: se llega desde una factura concreta.
  {
    id: 'mis-facturas',
    label: 'Mis facturas',
    description: 'Todo lo que te facturamos y cuánto queda por pagar',
    icon: Files,
    roles: TODOS,
    route: RootRoutes.MIS_FACTURAS,
  },
  {
    id: 'mis-avisos',
    label: 'Mis avisos de pago',
    // Dice lo que la pantalla contesta, que es la pregunta con la que se entra:
    // "avisé que pagué, ¿y?".
    description: 'En qué quedó cada pago que avisaste',
    icon: Send,
    roles: TODOS,
    route: RootRoutes.MIS_AVISOS,
  },
  {
    id: 'mis-compras',
    label: 'Qué comprás',
    description: 'Lo que te llevás y cómo viene cambiando',
    icon: ShoppingBasket,
    roles: TODOS,
    route: RootRoutes.MIS_COMPRAS,
  },

  // ── Todos los roles ──
  {
    id: 'account',
    label: 'Mi cuenta',
    description: 'Tus datos y cómo te contactamos',
    icon: User,
    roles: TODOS,
    route: RootRoutes.MI_CUENTA,
  },
  {
    id: 'settings',
    label: 'Configuración',
    // Dice lo que HAY hoy, no lo que va a haber: por ahora es el tema y nada
    // más. Prometer "notificaciones y preferencias" manda a buscar controles
    // que la pantalla todavía no tiene.
    description: 'Cómo se ve la app en tu teléfono',
    icon: Settings,
    roles: TODOS,
    route: RootRoutes.CONFIGURACION,
  },
  {
    id: 'support',
    label: 'Ayuda y soporte',
    description: 'Preguntas frecuentes y contacto',
    icon: LifeBuoy,
    roles: TODOS,
  },
  {
    id: 'terms',
    label: 'Términos y condiciones',
    description: 'Condiciones de uso y privacidad',
    icon: FileText,
    roles: TODOS,
  },
  {
    id: 'logout',
    label: 'Cerrar sesión',
    description: 'Salí de tu cuenta en este dispositivo',
    icon: LogOut,
    roles: TODOS,
    // No navega: termina la sesión y el stack raíz se reemplaza solo. El panel
    // pide confirmación antes — es la única fila del menú que no se deshace con
    // un "atrás".
    accion: MenuAcciones.LOGOUT,
  },
];
