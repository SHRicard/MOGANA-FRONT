import { Fonts, FONT_LABEL } from '@/theme';
import { OPCIONES_TEMA, OPCIONES_TIPOGRAFIA, resumenTema } from './types';

describe('OPCIONES_TEMA', () => {
  /**
   * El catálogo se evalúa a nivel de módulo. Si alguna vez faltara una de las
   * tres, la persona quedaría sin forma de volver a la preferencia que tenía —y
   * el `ThemeProvider` la seguiría respetando, así que ni siquiera se vería como
   * un error.
   */
  it('ofrece las tres preferencias del theme, sin repetir ninguna', () => {
    expect(OPCIONES_TEMA.map((opcion) => opcion.valor)).toEqual(['system', 'light', 'dark']);
  });

  /**
   * Automático es con lo que arranca la app cuando no hay nada guardado: la
   * lista tiene que empezar por lo que la persona ya tiene puesto.
   */
  it('empieza por Automático', () => {
    expect(OPCIONES_TEMA[0]?.valor).toBe('system');
  });

  it('todas se pueden leer: label y descripción con texto', () => {
    for (const opcion of OPCIONES_TEMA) {
      expect(opcion.label.length).toBeGreaterThan(0);
      expect(opcion.descripcion.length).toBeGreaterThan(0);
    }
  });
});

describe('OPCIONES_TIPOGRAFIA', () => {
  it('ofrece las dos tipografías del theme, con Inter primera', () => {
    // Inter va primera por lo mismo que Automático en el tema: es con la que
    // arranca la app si no hay nada guardado.
    expect(OPCIONES_TIPOGRAFIA.map((opcion) => opcion.valor)).toEqual([Fonts.INTER, Fonts.SYSTEM]);
  });

  /**
   * Los nombres no se escriben en el catálogo de la pantalla: salen de
   * `FONT_LABEL`. Copiarlos haría que renombrar una fuente en el theme dejara
   * esta lista diciendo el nombre viejo, sin que nada falle.
   */
  it('los nombres salen del catálogo del theme', () => {
    for (const opcion of OPCIONES_TIPOGRAFIA) {
      expect(opcion.label).toBe(FONT_LABEL[opcion.valor]);
    }
  });

  it('todas se pueden leer: label y descripción con texto', () => {
    for (const opcion of OPCIONES_TIPOGRAFIA) {
      expect(opcion.label.length).toBeGreaterThan(0);
      expect(opcion.descripcion.length).toBeGreaterThan(0);
    }
  });
});

describe('resumenTema', () => {
  /**
   * El caso que justifica la función: con "Automático" decide el teléfono, así
   * que lo elegido y lo que se ve no son lo mismo y hay que decir las dos cosas.
   */
  it('con Automático aclara cómo se está viendo ahora', () => {
    expect(resumenTema('system', 'dark')).toBe('Automático: ahora, oscuro');
    expect(resumenTema('system', 'light')).toBe('Automático: ahora, claro');
  });

  /**
   * Con una preferencia fija, el modo resuelto es siempre igual a lo elegido. El
   * `mode` que llega acá no puede contradecirla: si lo hiciera, mandaría lo
   * elegido, que es lo que la persona tildó en la lista.
   */
  it('con claro u oscuro no habla de automático', () => {
    expect(resumenTema('dark', 'dark')).toBe('Estás en modo oscuro');
    expect(resumenTema('light', 'light')).toBe('Estás en modo claro');
  });
});
