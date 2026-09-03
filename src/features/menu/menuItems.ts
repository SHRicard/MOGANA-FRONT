import type { ComponentType } from 'react';
import FileText from 'lucide-react-native/icons/file-text';
import Files from 'lucide-react-native/icons/files';
import LayoutDashboard from 'lucide-react-native/icons/layout-dashboard';
import LifeBuoy from 'lucide-react-native/icons/life-buoy';
import LogOut from 'lucide-react-native/icons/log-out';
import MessageSquare from 'lucide-react-native/icons/message-square';
import Send from 'lucide-react-native/icons/send';
import Settings from 'lucide-react-native/icons/settings';
import ServerCog from 'lucide-react-native/icons/server-cog';
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
 * Solo el cliente. Es para las filas de **la cuenta propia como cliente**: sus
 * facturas, sus avisos de pago, lo que compra.
 *
 * ⚠️ No es un permiso: la API contesta esas rutas para cualquier rol —el dueño
 * sale del token, no hay id de persona— y un administrador que entre ve la suya,
 * vacía. Están escondidas porque **el negocio no se factura a sí mismo**: tres
 * filas que para el dueño siempre van a estar vacías son ruido en el único menú
 * donde busca sus herramientas.
 */
const SOLO_CLIENTE = [Roles.CLIENTE] as const;

/**
 * Solo el dueño del sistema. Es para lo que **no** ve el administrador: las
 * cuentas de administración, los cambios de rol y el estado de la instalación
 * (`docs/README_FRONT_SUPER_ADMIN.md`).
 *
 * Acá sí es un permiso y no solo orden: los cinco endpoints de ese panel piden
 * rol `super_admin` y le contestan `403` a cualquier otro.
 */
const SOLO_SUPER_ADMIN = [Roles.SUPER_ADMIN] as const;

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
    id: 'system-panel',
    // "Del sistema" y no "de super admin": dice de QUÉ habla la pantalla, no
    // quién entra. El rol ya lo filtra la fila.
    label: 'Panel del sistema',
    // La distinción con la fila de abajo está en el texto: una mira el sistema
    // y la otra el negocio. Sin eso, dos filas que empiezan con "Panel" se leen
    // como la misma cosa dos veces.
    description: 'Cuentas, roles y estado de la instalación',
    icon: ServerCog,
    roles: SOLO_SUPER_ADMIN,
    route: RootRoutes.PANEL_SUPER_ADMIN,
  },
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

  // ── Lo mío: la cuenta propia como cliente (`docs/user_cliente_flujo.md`) ──
  //
  // Solo el cliente, y acá se separan de "Mi cuenta", que sí ven todos: los
  // datos de contacto los tiene cualquiera, pero **el negocio no se factura a
  // sí mismo**. Para el dueño estas tres pantallas están vacías por definición,
  // y una fila que siempre lleva a un vacío no informa nada — tapa las que sí.
  //
  // ⚠️ Esconderlas es una decisión de menú, no un permiso: las rutas siguen
  // registradas y la API contesta igual para cualquier rol (el dueño sale del
  // token, no hay id de persona). Un aviso viejo que apunte ahí sigue abriendo.
  //
  // La factura y el aviso de pago no están acá porque no se entra a ellos desde
  // el menú: se llega desde una factura concreta.
  {
    id: 'mis-facturas',
    label: 'Mis facturas',
    description: 'Todo lo que te facturamos y cuánto queda por pagar',
    icon: Files,
    roles: SOLO_CLIENTE,
    route: RootRoutes.MIS_FACTURAS,
  },
  {
    id: 'mis-avisos',
    label: 'Mis avisos de pago',
    // Dice lo que la pantalla contesta, que es la pregunta con la que se entra:
    // "avisé que pagué, ¿y?".
    description: 'En qué quedó cada pago que avisaste',
    icon: Send,
    roles: SOLO_CLIENTE,
    route: RootRoutes.MIS_AVISOS,
  },
  {
    id: 'mis-mensajes',
    // "Con el local" y no "Chat": dice CON QUIÉN se habla, que es la pregunta
    // que uno se hace antes de entrar. Un chat con nadie en particular podría
    // ser soporte técnico, y no lo es.
    label: 'Mensajes con el local',
    description: 'Preguntá por una factura o por un pago',
    icon: MessageSquare,
    roles: SOLO_CLIENTE,
    route: RootRoutes.MIS_MENSAJES,
  },
  {
    id: 'mis-compras',
    label: 'Qué comprás',
    description: 'Lo que te llevás y cómo viene cambiando',
    icon: ShoppingBasket,
    roles: SOLO_CLIENTE,
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
