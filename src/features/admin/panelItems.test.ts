import { RootRoutes } from '@/app/navigation/routes';
import { PANEL_ITEMS } from './panelItems';

describe('PANEL_ITEMS', () => {
  /**
   * El catálogo se evalúa a nivel de módulo y usa `RootRoutes`, que llega por una
   * cadena larga de imports. Si esa cadena se vuelve circular, `RootRoutes` queda
   * `undefined` acá y la fila apunta a ninguna parte **sin fallar en
   * compilación** (ya pasó una vez con el menú).
   */
  it('cada métrica apunta a su pantalla', () => {
    const metricas = PANEL_ITEMS.find((item) => item.id === 'metricas');
    expect(metricas?.route).toBe(RootRoutes.METRICAS);

    const porCliente = PANEL_ITEMS.find((item) => item.id === 'metricas-clientes');
    expect(porCliente?.route).toBe(RootRoutes.METRICAS_CLIENTES);

    const tickets = PANEL_ITEMS.find((item) => item.id === 'tickets');
    expect(tickets?.route).toBe(RootRoutes.TICKETS);

    const especies = PANEL_ITEMS.find((item) => item.id === 'especies');
    expect(especies?.route).toBe(RootRoutes.ESPECIES);

    const tendencia = PANEL_ITEMS.find((item) => item.id === 'tendencia');
    expect(tendencia?.route).toBe(RootRoutes.TENDENCIA);

    const productos = PANEL_ITEMS.find((item) => item.id === 'productos');
    expect(productos?.route).toBe(RootRoutes.PRODUCTOS);
  });

  /**
   * Son dos pantallas distintas y **tienen que sonar distinto**: dos filas que
   * empiezan con "Métricas" y describen lo mismo se leen como un duplicado.
   */
  it('las dos métricas no se describen igual', () => {
    const descripciones = PANEL_ITEMS.map((item) => item.description);
    expect(new Set(descripciones).size).toBe(PANEL_ITEMS.length);
  });

  /**
   * La sección de avisos masivos todavía no tiene pantalla. Se pinta apagada, y
   * el día que exista se le suma la ruta: si alguien le pone una que no está
   * registrada, tocarla no haría nada.
   */
  it('ninguna fila promete una pantalla que no existe', () => {
    const conRuta = PANEL_ITEMS.filter((item) => item.route !== undefined);
    expect(conRuta.map((item) => item.id)).toEqual([
      'metricas',
      'metricas-clientes',
      'tendencia',
      'productos',
      'tickets',
      'especies',
    ]);
  });

  it('todas se pueden leer: label y descripción con texto', () => {
    for (const item of PANEL_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.description.length).toBeGreaterThan(0);
    }
  });
});
