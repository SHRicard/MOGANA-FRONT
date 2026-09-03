import type { NavigatorScreenParams } from '@react-navigation/native';
// Ruta profunda y no el barrel `@/features/facturas`: ese barrel exporta también
// las pantallas, que importan este archivo para tipar sus params. Por el barrel
// sería un ciclo.
import type { EstadoFactura } from '@/features/facturas/types';
import type { ContextoDeMensaje } from '@/features/mensajes/types';
import { AppRoutes, AuthRoutes, RootRoutes } from './routes';

/**
 * Params de cada ruta (`undefined` = sin params).
 *
 * Las CLAVES salen de las constantes de `routes.ts`, no de strings sueltos: es
 * lo que garantiza que el router y el tipado no se separen nunca. Si agregás una
 * ruta allá y no la tipás acá, el navigator no la deja registrar.
 */

/** Stack para usuarios NO autenticados. */
export type AuthStackParamList = {
  [AuthRoutes.LOGIN]: undefined;
  [AuthRoutes.REGISTER]: undefined;
  [AuthRoutes.FORGOT_PASSWORD]: undefined;
  /**
   * El email es **obligatorio**: el endpoint de la contraseña nueva lo pide en
   * el body —seis dígitos no identifican a nadie— y viaja desde la pantalla
   * anterior para que nadie lo tipee dos veces.
   *
   * El `mensaje` es el que devolvió la API al pedir el código, para mostrarlo
   * tal cual: dice "si esa dirección tiene una cuenta…" y no "te lo mandamos",
   * a propósito.
   */
  [AuthRoutes.NUEVA_CLAVE]: { email: string; mensaje?: string };
};

/**
 * Tabs para usuarios autenticados. Son hermanos, no un stack: no hay "atrás"
 * entre ellos, se conmutan desde la barra de abajo.
 */
export type AppTabParamList = {
  [AppRoutes.HOME]: undefined;
  [AppRoutes.FACTURADOS]: undefined;
  [AppRoutes.NOTIFICATIONS]: undefined;
  [AppRoutes.MENU]: undefined;
  [AppRoutes.OFFERS]: undefined;
};

/**
 * Stack raíz. Contiene UNO de los dos stacks según el estado de sesión, más las
 * rutas globales que tienen que ser alcanzables desde cualquier lado.
 */
export type RootStackParamList = {
  [RootRoutes.AUTH]: NavigatorScreenParams<AuthStackParamList> | undefined;
  [RootRoutes.APP]: NavigatorScreenParams<AppTabParamList> | undefined;
  /** El panel de administración. Sin params: es un índice de dos secciones. */
  [RootRoutes.PANEL_ADMIN]: undefined;
  /** El panel del sistema. Sin params: es un índice de secciones. */
  [RootRoutes.PANEL_SUPER_ADMIN]: undefined;
  /** El tablero del sistema. Sin params: es la foto de ahora, sin filtros. */
  [RootRoutes.SISTEMA]: undefined;
  /**
   * De quién es la ficha del sistema. El id es obligatorio y el nombre viaja al
   * lado para que el encabezado tenga qué mostrar mientras la cuenta se está
   * trayendo: el renglón del listado ya lo tiene.
   */
  [RootRoutes.CUENTA_DEL_SISTEMA]: { cuentaId: string; cuentaNombre: string };
  /**
   * El historial. Sin params son todos los cambios; con `objetivoId` es el de
   * **una cuenta**, que es de donde sale la mitad del valor de la pantalla — la
   * lista completa sin filtrar se mira una vez por mes.
   *
   * El nombre viaja al lado por lo mismo que en la ficha: el encabezado tiene
   * que poder decir de quién es el historial desde el primer frame, y los
   * renglones pueden venir con la cuenta ya borrada.
   */
  [RootRoutes.AUDITORIA]: { objetivoId?: string; objetivoNombre?: string } | undefined;
  /**
   * Las métricas. Sin params: el mes se elige adentro y arranca en el actual,
   * que es lo que la API devuelve sin `mes`.
   */
  [RootRoutes.METRICAS]: undefined;
  /** Las métricas por cliente. Sin params: la búsqueda y el orden viven adentro. */
  [RootRoutes.METRICAS_CLIENTES]: undefined;
  /**
   * De quién es la ficha de métricas. El id es obligatorio —no existe "la
   * ficha" sin cliente— y el nombre viaja al lado para que el encabezado tenga
   * qué mostrar mientras la ficha se está trayendo: el renglón del listado ya
   * lo tiene.
   */
  [RootRoutes.FICHA_CLIENTE]: { clienteId: string; clienteNombre: string };
  /** La tendencia de compra. Sin params: el mes y el orden viven adentro. */
  [RootRoutes.TENDENCIA]: undefined;
  /** La métrica global de productos. Sin params: el período vive adentro. */
  [RootRoutes.PRODUCTOS]: undefined;
  /** El índice de tickets. Sin params: son todos los meses, sin filtro. */
  [RootRoutes.TICKETS]: undefined;
  /** La bandeja de avisos de pago del panel. Se entra sin filtro: los pendientes. */
  [RootRoutes.AVISOS_DE_PAGO]: undefined;
  /** El panel del store: cuánto ocupan los comprobantes y qué se puede liberar. */
  [RootRoutes.STORE_COMPROBANTES]: undefined;
  /** El listado del store, uno por uno. Se entra sin filtros. */
  [RootRoutes.COMPROBANTES_DEL_STORE]: undefined;
  /** La bandeja de mensajes del panel. Sin params: los filtros viven adentro. */
  [RootRoutes.BANDEJA_MENSAJES]: undefined;
  /**
   * El hilo de un cliente. **`clienteId` es obligatorio**: no existe "el hilo"
   * sin saber de quién, y es lo mismo que pide la API, donde va en la URL.
   */
  [RootRoutes.HILO_DEL_CLIENTE]: { clienteId: string };
  /**
   * Qué mes se está mirando, como `AAAA-MM`. **Es obligatorio**: no existe "el
   * ticket" sin mes, y es lo mismo que pide la API, donde el mes va en la URL.
   *
   * Viaja solo el mes y no el renglón entero del índice: el ticket es otra
   * consulta —siete agregados en una transacción— y los cuatro números de la
   * lista no alcanzarían ni para el encabezado.
   */
  [RootRoutes.TICKET_MES]: { mes: string };
  /** El catálogo de especies. Sin params: la búsqueda vive adentro. */
  [RootRoutes.ESPECIES]: undefined;
  /**
   * Mis facturas. **Ningún id de persona**: el dueño sale del token
   * (`docs/user_cliente_flujo.md` §1.5).
   *
   * El único param es con qué filtro abre, y existe por un solo camino: el aviso
   * de deuda vencida de la campanita lleva directo a lo que ya venció (§11).
   * Entrando desde el menú o desde el inicio no viaja nada y se ven todas.
   */
  [RootRoutes.MIS_FACTURAS]: { estado?: EstadoFactura } | undefined;
  /**
   * Qué factura mía se está mirando. Solo el id: el detalle se pide a la API,
   * que es la única que sabe el estado de hoy (`estado` se calcula en cada
   * request, no se guarda).
   *
   * ⚠️ Una factura que no es mía da **404**, el mismo que una que no existe: un
   * `403` confirmaría que ese id existe y es de alguien.
   */
  [RootRoutes.MI_FACTURA]: { facturaId: string };
  /**
   * De qué factura se está avisando el pago. El número viaja al lado para que el
   * encabezado tenga qué mostrar mientras la factura se está trayendo: la
   * pantalla anterior ya lo tiene.
   *
   * El monto máximo y el día de emisión **no** viajan: los recalcula el hook con
   * la factura y los avisos sin resolver, que es la única forma de que el tope
   * sea el de ahora y no el de cuando se tocó el botón.
   */
  [RootRoutes.INFORMAR_PAGO]: { facturaId: string; numero: number };
  /**
   * Elegir a qué factura corresponde el comprobante compartido. **Sin params**,
   * y a propósito: la imagen llega por la hoja de compartir de Android mucho
   * antes de que exista una navegación —puede llegar con la app cerrada—, así
   * que vive en el store y la pantalla la lee de ahí.
   *
   * Pasarla como param sería, además, meter una ruta de archivo en el estado de
   * navegación, que React Navigation serializa y persiste.
   */
  [RootRoutes.ELEGIR_FACTURA]: undefined;
  /** Mis avisos de pago. Sin params: el filtro vive adentro. */
  [RootRoutes.MIS_AVISOS]: undefined;
  /** Qué compro. Sin params: es todo mi historial, sin filtro. */
  [RootRoutes.MIS_COMPRAS]: undefined;
  /**
   * Mi hilo con el local. **Ningún id**: el hilo es la persona y sale del token.
   *
   * `sobre` es opcional y sirve para entrar preguntando por algo concreto —una
   * factura, un aviso de pago—. Lleva la `etiqueta` ya redactada porque el chip
   * la muestra tal cual, igual que hace el backend con los mensajes que ya
   * tienen contexto.
   *
   * ⚠️ Tiene que ser **de quien escribe**: mandar la factura de otro es un `400`.
   * Por eso solo se pasa desde una pantalla que ya estaba mostrando algo suyo,
   * nunca desde un campo que se tipea.
   */
  [RootRoutes.MIS_MENSAJES]:
    | { sobre?: { tipo: ContextoDeMensaje; id: string; etiqueta: string } }
    | undefined;
  /** La cuenta propia. Sin params: el usuario sale del token, nunca de la URL. */
  [RootRoutes.MI_CUENTA]: undefined;
  /**
   * Eliminar mi cuenta. Sin params: qué va a pasar lo contesta la API —es el
   * aviso que la política obliga a mostrar— y la persona sale del token.
   */
  [RootRoutes.ELIMINAR_CUENTA]: undefined;
  /** Ajustes de la app. Sin params: lo que se muestra sale del ThemeProvider. */
  [RootRoutes.CONFIGURACION]: undefined;
  /** Verificar el correo. Sin params: el código lo escribe la persona. */
  [RootRoutes.VERIFICAR_CORREO]: undefined;
  /**
   * Perfil incompleto. Sin params: lo que hay que cargar y por qué salen de la
   * sesión, que ya está en el store.
   */
  [RootRoutes.PERFIL_BLOQUEADO]: undefined;
  /** Listado de clientes de la app. Se abre desde el panel "Más". */
  [RootRoutes.USUARIOS]: undefined;
  /**
   * La ficha de un cliente. El id es obligatorio —no existe "la ficha" sin
   * cliente— y el nombre viaja al lado para que el encabezado tenga qué mostrar
   * mientras la cuenta se está trayendo de la API.
   */
  [RootRoutes.CLIENTE]: { clienteId: string; clienteNombre: string };
  /**
   * A quién se le factura. **El id es obligatorio**: no existe "una factura"
   * sin cliente, y tiparlo así hace que no se pueda navegar acá sin decir a
   * cuál (que es lo mismo que pide la API, donde el cliente va en la URL y
   * nunca en el body).
   *
   * El nombre viaja como param y no se vuelve a pedir a la API: la fila del
   * listado ya lo tiene, y es solo para que el encabezado pueda decir a quién
   * se le está facturando.
   */
  [RootRoutes.NUEVA_FACTURA]: {
    clienteId: string;
    clienteNombre: string;
    /**
     * Si a esa persona **no se le fía** (`docs/bloquear_fiado.md`), para avisarlo
     * fuerte antes de emitirle algo a plazo.
     *
     * Viaja como param en vez de pedir la ficha otra vez: las dos pantallas
     * desde las que se llega —la ficha y la cuenta— ya lo tienen a la vista, y
     * el dato no puede cambiar entre que se toca el botón y se abre el
     * formulario. El backend igual la va a aceptar: esto es un aviso, no una
     * traba.
     */
    sinFiado?: boolean;
    motivoSinFiado?: string;
  };
  /**
   * De quién es la cuenta que se está mirando. El nombre viaja al lado para que
   * el encabezado tenga qué mostrar mientras la cuenta se está trayendo: el
   * renglón del tablero ya lo tiene.
   */
  [RootRoutes.CUENTA]: { clienteId: string; clienteNombre: string };
  /**
   * Qué factura se está mirando. Solo el id: el detalle se pide a la API, que es
   * la única que sabe el estado de hoy (`estado` se calcula en cada request, no
   * se guarda).
   */
  [RootRoutes.FACTURA]: { facturaId: string };
  /** Catálogo del design system. Solo se registra con `__DEV__`. */
  [RootRoutes.DESIGN_SYSTEM]: undefined;
};

/**
 * Habilita el tipado global de `useNavigation()` en toda la app.
 * Es la unión de los tres: desde una screen se puede navegar a una hermana
 * (misma lista) o a una ruta del stack raíz (React Navigation la propaga hacia arriba).
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList, AuthStackParamList, AppTabParamList {}
  }
}
