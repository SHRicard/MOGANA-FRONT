import { RootRoutes } from '@/app/navigation/routes';
import { PANEL_SISTEMA_ITEMS } from './panelSistemaItems';

describe('PANEL_SISTEMA_ITEMS', () => {
  /**
   * El catálogo se evalúa a nivel de módulo y usa `RootRoutes`, que llega por una
   * cadena larga de imports. Si esa cadena se vuelve circular, `RootRoutes` queda
   * `undefined` acá y la fila apunta a ninguna parte **sin fallar en
   * compilación** (ya pasó una vez con el menú).
   */
  it('cada sección apunta a su pantalla', () => {
    expect(PANEL_SISTEMA_ITEMS.map((item) => [item.id, item.route])).toEqual([
      ['sistema', RootRoutes.SISTEMA],
      ['cuentas', RootRoutes.USUARIOS],
      ['auditoria', RootRoutes.AUDITORIA],
      ['negocio', RootRoutes.PANEL_ADMIN],
    ]);
  });

  /**
   * Acá no hay pantallas por hacer: las cuatro existen. Una fila sin ruta se
   * pintaría tocable y no llevaría a ningún lado.
   */
  it('ninguna fila queda sin ruta', () => {
    PANEL_SISTEMA_ITEMS.forEach((item) => {
      expect(item.route).toBeDefined();
    });
  });

  /**
   * El listado de cuentas es **el mismo** del apartado del administrador, con el
   * rol en cada fila. Dos tablas de lo mismo terminan mostrando cosas distintas
   * de la misma persona.
   */
  it('las cuentas reusan el listado del administrador, no una pantalla propia', () => {
    const cuentas = PANEL_SISTEMA_ITEMS.find((item) => item.id === 'cuentas');
    expect(cuentas?.route).toBe(RootRoutes.USUARIOS);
  });

  /**
   * El super admin ve **dos** cosas: el sistema y todo el panel del negocio. Sin
   * esta fila, este panel se leería como si fuera todo lo que tiene.
   */
  it('el panel del negocio está, y va último', () => {
    expect(PANEL_SISTEMA_ITEMS[PANEL_SISTEMA_ITEMS.length - 1].route).toBe(
      RootRoutes.PANEL_ADMIN,
    );
  });

  /** Dos filas que se describen igual se leen como un duplicado. */
  it('ninguna fila se describe igual que otra', () => {
    const descripciones = PANEL_SISTEMA_ITEMS.map((item) => item.description);
    expect(new Set(descripciones).size).toBe(PANEL_SISTEMA_ITEMS.length);
  });
});
