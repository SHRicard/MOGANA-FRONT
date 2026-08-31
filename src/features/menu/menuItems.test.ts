import { RootRoutes } from '@/app/navigation/routes';
import { Roles } from '@/features/auth';
import { MENU_ITEMS, MenuAcciones } from './menuItems';

describe('MENU_ITEMS', () => {
  /**
   * El catálogo se evalúa a nivel de módulo y usa `RootRoutes`, que llega por una
   * cadena larga de imports. Si esa cadena se vuelve circular, `RootRoutes` queda
   * `undefined` en este punto y la fila apunta a ninguna parte **sin fallar en
   * compilación**. Este test es el que lo agarra.
   */
  it('la fila de clientes apunta al apartado y es solo de administración', () => {
    const clientes = MENU_ITEMS.find((item) => item.id === 'users-management');

    expect(clientes?.route).toBe(RootRoutes.USUARIOS);
    expect(clientes?.roles).toEqual([Roles.SUPER_ADMIN, Roles.ADMINISTRADOR]);
  });

  it('ningún cliente ve las filas de administración', () => {
    const deAdministracion = MENU_ITEMS.filter(
      (item) => item.roles !== undefined && !item.roles.includes(Roles.CLIENTE),
    );
    expect(deAdministracion.map((item) => item.id)).toEqual(['admin-panel', 'users-management']);
  });

  it('ninguna fila promete una pantalla que no existe', () => {
    // Las que navegan hoy: las dos de administración, las tres de la cuenta
    // propia, la cuenta y los ajustes. Las demás se pintan sin `route` a
    // propósito, porque sus pantallas todavía no están.
    const conRuta = MENU_ITEMS.filter((item) => item.route !== undefined);
    expect(conRuta.map((item) => item.id)).toEqual([
      'admin-panel',
      'users-management',
      'mis-facturas',
      'mis-avisos',
      'mis-compras',
      'account',
      'settings',
    ]);
  });

  /**
   * `/mi` no acepta un id de persona: el dueño sale del token. Esconder estas
   * filas de los administradores daría a entender que hay un permiso donde no lo
   * hay — lo que ven es su propia cuenta, normalmente vacía.
   */
  it('las filas de la cuenta propia las ven los tres roles', () => {
    const mias = MENU_ITEMS.filter((item) => item.id.startsWith('mis-'));

    expect(mias.map((item) => item.id)).toEqual(['mis-facturas', 'mis-avisos', 'mis-compras']);
    expect(mias.map((item) => item.route)).toEqual([
      RootRoutes.MIS_FACTURAS,
      RootRoutes.MIS_AVISOS,
      RootRoutes.MIS_COMPRAS,
    ]);
    mias.forEach((item) => {
      expect(item.roles).toEqual([Roles.SUPER_ADMIN, Roles.ADMINISTRADOR, Roles.CLIENTE]);
    });
  });

  it('configuración la ven los tres roles: el tema es de cualquiera', () => {
    const ajustes = MENU_ITEMS.find((item) => item.id === 'settings');

    expect(ajustes?.route).toBe(RootRoutes.CONFIGURACION);
    expect(ajustes?.roles).toEqual([Roles.SUPER_ADMIN, Roles.ADMINISTRADOR, Roles.CLIENTE]);
  });

  it('mi cuenta la ven los tres roles: cada uno edita la suya', () => {
    const cuenta = MENU_ITEMS.find((item) => item.id === 'account');

    expect(cuenta?.route).toBe(RootRoutes.MI_CUENTA);
    expect(cuenta?.roles).toEqual([Roles.SUPER_ADMIN, Roles.ADMINISTRADOR, Roles.CLIENTE]);
  });

  it('el panel de administración no lo ve un cliente', () => {
    const panel = MENU_ITEMS.find((item) => item.id === 'admin-panel');

    expect(panel?.route).toBe(RootRoutes.PANEL_ADMIN);
    expect(panel?.roles).toEqual([Roles.SUPER_ADMIN, Roles.ADMINISTRADOR]);
  });

  it('cerrar sesión hace algo: es la única fila con acción y la ven todos', () => {
    const conAccion = MENU_ITEMS.filter((item) => item.accion !== undefined);

    expect(conAccion.map((item) => item.id)).toEqual(['logout']);
    expect(conAccion[0].accion).toBe(MenuAcciones.LOGOUT);
    expect(conAccion[0].roles).toContain(Roles.CLIENTE);
  });

  /**
   * Una fila con las dos cosas no tendría forma de saber qué pasa al tocarla, y
   * el panel elegiría una por el orden del `if`.
   */
  it('ninguna fila tiene ruta y acción a la vez', () => {
    const ambiguas = MENU_ITEMS.filter(
      (item) => item.route !== undefined && item.accion !== undefined,
    );
    expect(ambiguas).toEqual([]);
  });
});
