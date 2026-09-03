import { formatBytes } from './bytes';

describe('formatBytes', () => {
  /** Un tramo sin nada tiene que decir que no tiene nada. */
  it('el vacío dice 0 B', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });

  it('los bytes pelados van sin decimales', () => {
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(999)).toBe('999 B');
  });

  /**
   * ⚠️ **1024 y no 1000.** Es lo que cuenta Cloudinary: dividiendo por 1000 el
   * panel diría "88 MB" donde la consola del store dice "84 MB".
   */
  it('salta de unidad cada 1024', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  /** Los del payload del backend, para que el panel diga lo mismo que el doc. */
  it('formatea los tamaños reales del store', () => {
    expect(formatBytes(88080384)).toBe('84 MB');
    expect(formatBytes(49283072)).toBe('47 MB');
    expect(formatBytes(344000)).toBe('335,9 KB');
  });

  /** Un decimal, con coma: es una magnitud para decidir, no un importe. */
  it('usa un decimal y coma', () => {
    expect(formatBytes(1024 * 1024 * 1.45)).toBe('1,5 MB');
    expect(formatBytes(1536)).toBe('1,5 KB');
  });

  /** Sin el ",0" cuando da redondo: "2 MB" se lee mejor que "2,0 MB". */
  it('no deja un decimal en cero colgando', () => {
    expect(formatBytes(1024 * 1024 * 2)).toBe('2 MB');
  });

  /** No se pasa de la unidad más grande que conoce. */
  it('corta en TB', () => {
    expect(formatBytes(POR_TB * 2048)).toContain('TB');
  });
});

const POR_TB = 1024 ** 4;
