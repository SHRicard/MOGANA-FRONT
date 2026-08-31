import { buildFonts, Fonts, FONT_LABEL } from './fonts';
import { fontWeight } from './typography';

const PESOS = Object.keys(fontWeight) as (keyof typeof fontWeight)[];

describe('buildFonts — la fuente del sistema', () => {
  const fuentes = buildFonts(Fonts.SYSTEM);

  it('pide el peso con fontWeight y sin fontFamily', () => {
    for (const peso of PESOS) {
      expect(fuentes[peso]).toEqual({ fontWeight: fontWeight[peso] });
    }
  });
});

describe('buildFonts — Inter', () => {
  const fuentes = buildFonts(Fonts.INTER);

  /**
   * La regla que rompe la app en Android si se olvida: con una fuente propia, un
   * `fontWeight: '700'` hace que el sistema busque `Inter18pt-Bold_bold.ttf`, no
   * lo encuentre, y termine dibujando Roboto con una negrita sintética.
   */
  it('pide el peso con fontFamily y NUNCA con fontWeight', () => {
    for (const peso of PESOS) {
      expect(fuentes[peso].fontFamily).toEqual(expect.any(String));
      expect(fuentes[peso].fontWeight).toBeUndefined();
    }
  });

  it('usa un archivo distinto para cada peso', () => {
    const familias = PESOS.map((peso) => fuentes[peso].fontFamily);
    expect(new Set(familias).size).toBe(PESOS.length);
  });

  /**
   * El error más silencioso de todos: bajar los `.ttf` de Google Fonts —que
   * vienen como `Inter_18pt-Bold.ttf`— y copiar ESE nombre acá. El guión bajo no
   * está en el nombre PostScript del archivo, así que iOS no encuentra la fuente
   * y se cae a la del sistema sin ningún error.
   *
   * Este test cubre el lado del theme. El lado del archivo —que el `.ttf` exista
   * y se llame igual— se comprueba a mano, porque leer el disco desde un test
   * pediría abrirle los tipos de Node a toda la app:
   *
   *     ls src/shared/assets/fonts/
   *     fc-scan --format "%{postscriptname}\n" src/shared/assets/fonts/*.ttf
   */
  it('ningún nombre tiene el guión bajo con el que vienen de Google Fonts', () => {
    for (const peso of PESOS) {
      expect(fuentes[peso].fontFamily).not.toContain('_');
    }
  });
});

describe('el catálogo de tipografías', () => {
  it('todas tienen nombre para mostrar', () => {
    for (const fuente of Object.values(Fonts)) {
      expect(FONT_LABEL[fuente]).toBeTruthy();
    }
  });
});
