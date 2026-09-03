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
    expect(deAdministracion.map((item) => item.id)).toEqual([
      'system-panel',
      'admin-panel',
      'users-management',
    ]);
  });

  /**
   * El espejo del test de arriba, y el que agarra el descuido más fácil: sumar
   * una fila de cliente con `roles: TODOS` copiando la de al lado. El menú del
   * administrador es donde busca sus herramientas — cada fila que nunca va a
   * tener nada adentro tapa una que sí.
   */
  it('ningún administrador ve las filas de la cuenta propia como cliente', () => {
    const sinElAdministrador = MENU_ITEMS.filter(
      (item) => item.roles !== undefined && !item.roles.includes(Roles.ADMINISTRADOR),
    );
    // El panel del sistema también se le esconde, pero por lo contrario: ahí no
    // hay nada vacío esperándolo, hay cosas que su rol no puede tocar.
    expect(sinElAdministrador.map((item) => item.id)).toEqual([
      'system-panel',
      'mis-facturas',
      'mis-avisos',
      'mis-mensajes',
      'mis-compras',
    ]);

    const soloDelCliente = sinElAdministrador.filter((item) => item.id !== 'system-panel');
    // Y tampoco el super admin: es el mismo dueño con más permisos, no un
    // cliente con otro nombre.
    soloDelCliente.forEach((item) => {
      expect(item.roles).toEqual([Roles.CLIENTE]);
    });
  });

  /**
   * La única fila que el administrador no ve por permiso y no por orden: los
   * cinco endpoints de ese panel le contestan `403`.
   */
  it('el panel del sistema es solo del super admin', () => {
    const sistema = MENU_ITEMS.find((item) => item.id === 'system-panel');

    expect(sistema?.route).toBe(RootRoutes.PANEL_SUPER_ADMIN);
    expect(sistema?.roles).toEqual([Roles.SUPER_ADMIN]);
  });

  it('ninguna fila promete una pantalla que no existe', () => {
    // Las que navegan hoy: las dos de administración, las tres de la cuenta
    // propia, la cuenta y los ajustes. Las demás se pintan sin `route` a
    // propósito, porque sus pantallas todavía no están.
    const conRuta = MENU_ITEMS.filter((item) => item.route !== undefined);
    expect(conRuta.map((item) => item.id)).toEqual([
      'system-panel',
      'admin-panel',
      'users-management',
      'mis-facturas',
      'mis-avisos',
      'mis-mensajes',
      'mis-compras',
      'account',
      'settings',
    ]);
  });

  /**
   * Siguen apuntando a donde tienen que apuntar. Que el administrador no las vea
   * no las desconecta: son las mismas pantallas, y un aviso que apunte ahí las
   * sigue abriendo.
   */
  it('las filas de la cuenta propia son del cliente y llevan a sus pantallas', () => {
    const mias = MENU_ITEMS.filter((item) => item.id.startsWith('mis-'));

    expect(mias.map((item) => item.id)).toEqual([
      'mis-facturas',
      'mis-avisos',
      'mis-mensajes',
      'mis-compras',
    ]);
    expect(mias.map((item) => item.route)).toEqual([
      RootRoutes.MIS_FACTURAS,
      RootRoutes.MIS_AVISOS,
      RootRoutes.MIS_MENSAJES,
      RootRoutes.MIS_COMPRAS,
    ]);
    mias.forEach((item) => {
      expect(item.roles).toEqual([Roles.CLIENTE]);
    });
  });

  /**
   * Lo que le queda al dueño en "Más". Es el test que hace visible el cambio del
   * día que alguien vuelva a sumar una fila de cliente al menú de todos.
   */
  it('el administrador ve solo sus herramientas y lo que es de cualquiera', () => {
    const delAdministrador = MENU_ITEMS.filter((item) =>
      item.roles?.includes(Roles.ADMINISTRADOR),
    );

    expect(delAdministrador.map((item) => item.id)).toEqual([
      'admin-panel',
      'users-management',
      'account',
      'settings',
      'support',
      'terms',
      'logout',
    ]);
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
