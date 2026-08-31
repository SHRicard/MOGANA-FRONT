// Ruta profunda y no el barrel `@/features/auth`: ese barrel exporta también las
// pantallas, y dos de ellas —las que abren los enlaces de los correos— importan
// este archivo para saber su ruta. Por el barrel sería un ciclo, y se manifiesta
// como un `Roles` en `undefined` al arrancar, no como un error de compilación.
import { Roles, type Rol } from '@/features/auth/types';

/**
 * Router de la app: el mapa COMPLETO de rutas, en un solo lugar.
 *
 * Es la única fuente de los nombres de ruta. Ni los navegadores ni las screens
 * escriben el string a mano: importan de acá. Un nombre mal tipeado en un
 * `navigate('Ofertas')` no falla en compilación pero sí en producción; con estas
 * constantes, TypeScript lo corta antes.
 *
 * Los params de cada ruta viven en `types.ts`, que arma sus ParamList con estas
 * mismas constantes como claves: agregar una ruta acá y olvidarse de tipar sus
 * params rompe el build.
 *
 * ⚠️ Esto NO son URLs de la API (esas viven en `services/api` y en el `api/` de
 * cada feature). Son las rutas de navegación de la app.
 */

// ─────────────────────────────────────────────────────────────
// Nombres de ruta
// ─────────────────────────────────────────────────────────────

/** Stack raíz: lo que se conmuta según haya sesión o no. */
export const RootRoutes = {
  /** Stack de usuarios SIN sesión. */
  AUTH: 'Auth',
  /** Tabs de usuarios CON sesión. */
  APP: 'App',
  /**
   * Apartado Administrador: el listado de clientes de la app.
   *
   * Vive en el stack RAÍZ y no en un tab porque se abre desde el panel "Más",
   * que es hermano del navegador de tabs. Se muestra según el permiso
   * rol de administración (ver `MENU_ITEMS`).
   */
  USUARIOS: 'Usuarios',
  /**
   * La ficha de un cliente: quién es, y las acciones que se le pueden hacer.
   * Es el paso del medio del flujo —listado → ficha → facturar—, para que el
   * listado se pueda leer de un vistazo y las acciones vivan adentro de la
   * persona y no repartidas por la lista.
   */
  CLIENTE: 'Cliente',
  /**
   * Emitirle una factura al cliente elegido en ese listado
   * (`docs/flujo_pagos.md`). Vive en el mismo stack que el listado y la ficha:
   * el flujo es continuo —Más → Clientes → ficha → facturar— y el "atrás" tiene
   * que devolver a la ficha de esa persona.
   */
  NUEVA_FACTURA: 'NuevaFactura',
  /**
   * La cuenta de un cliente: cuánto debe en total y todas sus facturas
   * (`docs/flujo_pagos.md` §4). Es a donde lleva tocar un renglón del tablero.
   *
   * Es el paso del medio del flujo de cobranza —tablero → cuenta → factura—:
   * el tablero dice a quién cobrarle, la cuenta de qué está hecha esa deuda, y
   * el cobro se anota adentro de una factura.
   */
  CUENTA: 'CuentaCliente',
  /**
   * Una factura emitida, con su detalle, su saldo y sus cobros. Se llega desde
   * la cuenta del cliente, y es donde se registran los pagos — lo único que se
   * le puede agregar a una factura ya emitida (`docs/flujo_pagos.md`).
   */
  FACTURA: 'Factura',
  /**
   * El panel de administración: la puerta a las herramientas del negocio
   * (métricas y avisos masivos). Se abre desde el panel "Más" y **solo la ve
   * administración**, igual que el listado de clientes.
   */
  PANEL_ADMIN: 'PanelAdmin',
  /**
   * Las métricas del negocio (`docs/flujo_metricas.md`): cuánta plata hay en la
   * calle, qué entró en el mes y quién no paga.
   *
   * Cuelga del panel y no del menú: el "atrás" tiene que devolver al panel, que
   * es desde donde se entra.
   */
  METRICAS: 'Metricas',
  /**
   * Las métricas **uno por uno** (`docs/flujo_metricas.md` §4): quién compra,
   * quién paga y quién se está yendo.
   *
   * Es una pantalla aparte de las del negocio y no una sección adentro: es un
   * listado buscable y paginado, y meterlo al pie de un tablero que ya scrollea
   * dejaría el selector de orden —que es lo que la vuelve útil— enterrado.
   */
  METRICAS_CLIENTES: 'MetricasClientes',
  /**
   * La ficha de métricas de **un** cliente
   * (`docs/flujo_metricas_cliente.md`): cómo paga, cuánto tarda, cuánto debe y
   * hace cuánto que no compra. Es a donde lleva tocar un renglón del listado.
   *
   * ⚠️ No es la ficha de la persona (`CLIENTE`), que es donde están las
   * acciones: acá se lee para decidir, allá se hace. Las dos se enlazan.
   */
  FICHA_CLIENTE: 'FichaCliente',
  /**
   * **Qué se llevan**: la tendencia de compra por especie, mes a mes
   * (`docs/flujo_metricas.md` §5). La única pantalla del panel que mira la
   * mercadería y no la plata.
   */
  TENDENCIA: 'Tendencia',
  /**
   * **Qué se vende**: el acumulado de todo el período, de lo que más manda a lo
   * que no se vendió nunca (`docs/flujo_metricas.md` §6).
   *
   * Es la única de las tres de mercadería que no está atada al calendario: una
   * especie que vende mucho pero cada tres meses se ve chica en las otras dos.
   */
  PRODUCTOS: 'Productos',
  /**
   * El índice de tickets (`docs/flujo_metricas.md` §5): todos los meses desde
   * que existe el negocio, con lo que se facturó, lo que entró y con cuánta
   * deuda cerró cada uno.
   *
   * ⚠️ Va como una **pantalla aparte** de las métricas y no como una sección
   * adentro: en el tablero la deuda es la de hoy y acá la del cierre del mes.
   * Mezclarlas es lo único de este apartado que confunde de verdad.
   */
  TICKETS: 'Tickets',
  /**
   * El ticket de un mes: la foto completa de ese período
   * (`docs/flujo_metricas.md` §5.2). Se llega tocando un mes del índice, y el
   * "atrás" devuelve ahí.
   */
  TICKET_MES: 'TicketMes',
  /**
   * El catálogo de especies (`docs/flujo_especies.md`): con qué etiqueta se
   * agrupa lo que se vende.
   *
   * Cuelga del panel de administración, igual que las métricas. Es la pantalla
   * de mantenimiento del catálogo; la otra forma de crear una especie —sin
   * salir de la factura— no navega a ningún lado: viaja en el renglón.
   */
  ESPECIES: 'Especies',
  /**
   * **Mis facturas**: el listado propio, con filtros por estado y por fecha de
   * emisión (`docs/user_cliente_flujo.md` §5).
   *
   * Es la vista del CLIENTE sobre lo suyo, no el tablero de cobranza: acá no
   * hay ningún id de persona en la URL — el dueño sale del token.
   *
   * Cuelga del panel "Más" y del "ver todas" del inicio, y por eso vive en el
   * stack raíz: el "atrás" devuelve al lugar desde el que se entró.
   */
  MIS_FACTURAS: 'MisFacturas',
  /**
   * Una factura mía, con lo que me llevé, los pagos anotados y el botón de
   * avisar que pagué (`docs/user_cliente_flujo.md` §6).
   *
   * ⚠️ No es `FACTURA`, que es la del panel: aquella trae quién la emitió y el
   * motivo de una anulación, y se cobra desde adentro. Esta es la misma factura
   * **recortada** para su dueño (§13, el muro).
   */
  MI_FACTURA: 'MiFactura',
  /**
   * **Avisar que pagué** una factura mía (`docs/user_cliente_flujo.md` §8).
   *
   * Va como pantalla y no como formulario en línea porque termina en un estado
   * que hay que explicar: el aviso quedó, **pero la deuda no cambió**. Eso
   * necesita su propio lugar, no un cartel al pie de una lista.
   */
  INFORMAR_PAGO: 'InformarPago',
  /**
   * **Mis avisos de pago**: en qué quedó cada uno
   * (`docs/user_cliente_flujo.md` §9).
   *
   * Es la pantalla que contesta "avisé que pagué, ¿y?", y la única que puede
   * explicar por qué alguien avisó y le sigue figurando la deuda.
   */
  MIS_AVISOS: 'MisAvisos',
  /**
   * **Qué compro**: mi historial por especie (`docs/user_cliente_flujo.md` §10).
   *
   * Es la única métrica que el cliente ve de sí mismo, y va sin nada de cómo
   * paga: la tasa de cumplimiento y las demoras son el juicio que el negocio
   * hace sobre él, y se quedan del lado del panel.
   */
  MIS_COMPRAS: 'MisCompras',
  /**
   * La cuenta propia: ver y corregir los datos (`docs/flujo_mi_cuenta.md`).
   *
   * Vive en el stack RAÍZ y no en un tab porque se abre desde el panel "Más",
   * que es hermano del navegador de tabs. La ve **cualquier rol**: cada uno
   * edita la suya.
   */
  MI_CUENTA: 'MiCuenta',
  /**
   * Ajustes de la app: cómo se ve en este teléfono.
   *
   * Vive en el stack RAÍZ y no en un tab porque se abre desde el panel "Más".
   * La ve **cualquier rol**: no hay nada acá que dependa de permisos, y tampoco
   * de la API — lo que se elige queda guardado en el teléfono.
   */
  CONFIGURACION: 'Configuracion',
  /**
   * El portero: la única pantalla que ve una cuenta **bloqueada** por perfil
   * incompleto (`docs/flujo_login.md`).
   *
   * No convive con las de arriba: mientras el `estado` sea `bloqueado`, es lo
   * ÚNICO que el stack registra. Por eso el bloqueo no se puede saltear
   * navegando —no hay adónde ir— y no hace falta ningún guard por pantalla.
   */
  PERFIL_BLOQUEADO: 'PerfilBloqueado',
  /**
   * Escribir el código que llegó al correo para verificarlo
   * (`docs/flujo_login.md`).
   *
   * Va con las de sesión iniciada porque el endpoint **pide sesión**: el body es
   * solo el código y la cuenta sale del token. Se llega desde Mi cuenta.
   *
   * ⚠️ La otra pantalla de código —la de la contraseña nueva— NO está acá: esa
   * es pública y vive en el stack de auth, porque quien olvidó la contraseña
   * justamente no puede entrar.
   */
  VERIFICAR_CORREO: 'VerificarCorreo',
  /** Catálogo del design system. Solo existe con `__DEV__`. */
  DESIGN_SYSTEM: 'DesignSystem',
} as const;

/** Rutas de la sesión cerrada. */
export const AuthRoutes = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  /**
   * El código que llegó al correo y la contraseña nueva
   * (`docs/flujo_login.md`).
   *
   * Vive en este stack y no en el raíz porque es **pública**: quien olvidó la
   * contraseña no tiene sesión. Se llega desde "¿Olvidaste tu contraseña?", que
   * es la pantalla que pidió el código.
   */
  NUEVA_CLAVE: 'NuevaClave',
} as const;

/**
 * Rutas de la sesión iniciada. **No todas están en la barra**: cuáles se ven y
 * en qué orden lo definen `TAB_ORDER` y `TabRoles`, más abajo.
 */
export const AppRoutes = {
  HOME: 'Home',
  /**
   * Tablero de facturación: **quién debe, cuánto y desde cuándo**
   * (`docs/flujo_pagos.md` §3). Un renglón por cliente con su cuenta entera. Es
   * la pantalla de entrada del apartado y por eso está en la barra: se abre
   * varias veces por día.
   *
   * ⚠️ No es el listado completo de clientes —los que no tienen ninguna factura
   * no aparecen—; ese vive en "Más → Todos los clientes".
   */
  FACTURADOS: 'ClientesFacturados',
  NOTIFICATIONS: 'Notifications',
  /**
   * Caso especial: este tab NO navega. Abre el panel `MenuSheet` (ver
   * `AppNavigator`). La ruta existe igual porque el navigator exige un
   * componente por tab y deja el destino disponible para un deep link.
   */
  MENU: 'Menu',

  /**
   * 🚧 Fuera de la barra: todavía no tiene backend detrás. Se conserva
   * declarada y con pantalla — volver a mostrarla es sumarla a `TAB_ORDER`.
   *
   * El tab de compras que la acompañaba ya no está: lo que prometía —el
   * historial de lo que se lleva— existe de verdad en `MIS_COMPRAS`, que cuelga
   * del panel "Más" (`docs/user_cliente_flujo.md` §10). Dejar las dos habría
   * sido tener un placeholder al lado de la pantalla que lo reemplaza.
   */
  OFFERS: 'Offers',
} as const;

/** Todas las rutas juntas, para cuando no importa a qué stack pertenecen. */
export const Routes = {
  ...RootRoutes,
  ...AuthRoutes,
  ...AppRoutes,
} as const;

export type RootRoute = (typeof RootRoutes)[keyof typeof RootRoutes];
export type AuthRoute = (typeof AuthRoutes)[keyof typeof AuthRoutes];
export type AppRoute = (typeof AppRoutes)[keyof typeof AppRoutes];
export type Route = (typeof Routes)[keyof typeof Routes];

// ─────────────────────────────────────────────────────────────
// Acceso por permiso
// ─────────────────────────────────────────────────────────────

/**
 * Orden en que aparecen los tabs en la barra. Es una lista y no un objeto
 * porque acá lo único que importa es la secuencia.
 */
export const TAB_ORDER: readonly AppRoute[] = [
  AppRoutes.HOME,
  AppRoutes.FACTURADOS,
  AppRoutes.NOTIFICATIONS,
  AppRoutes.MENU,
] as const;

/**
 * Qué roles ven cada tab, o `null` si lo ve cualquier sesión iniciada.
 *
 * Se gatea por **rol**: el array `permissions` ya no existe (`docs/s.roles.md`).
 * La facturación es de quien opera el negocio: un `cliente` que entra a la app
 * no tiene nada que hacer en ese tablero, y la API le contestaría `403`.
 *
 * Al ser un `Record<AppRoute, ...>`, una ruta nueva en el router obliga a
 * declarar acá quién la ve. No se puede agregar un tab y olvidarse.
 */
export const TabRoles: Record<AppRoute, readonly Rol[] | null> = {
  [AppRoutes.HOME]: null,
  [AppRoutes.FACTURADOS]: [Roles.SUPER_ADMIN, Roles.ADMINISTRADOR],
  [AppRoutes.NOTIFICATIONS]: null,
  [AppRoutes.MENU]: null,

  // Fuera de la barra: no se evalúa, pero el `Record` la exige declarada.
  [AppRoutes.OFFERS]: [Roles.CLIENTE],
};

/**
 * Los tabs que le corresponden a este rol, en orden de barra.
 *
 * **Niega por defecto**: sin rol —sesión recién abierta, o un rol que la app no
 * conoce— solo quedan los tabs que no piden ninguno. La app arranca usable en
 * vez de vacía, y nadie ve de más.
 */
export function getVisibleTabs(rol: Rol | null): readonly AppRoute[] {
  return TAB_ORDER.filter((tab) => {
    const permitidos = TabRoles[tab];
    return permitidos === null || (rol !== null && permitidos.includes(rol));
  });
}
