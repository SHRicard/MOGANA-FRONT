import { esDniValido, formatearDni, normalizarDni } from './dni';

describe('normalizarDni', () => {
  it('saca puntos y espacios: es como lo escribe una persona', () => {
    expect(normalizarDni('38.180.903')).toBe('38180903');
    expect(normalizarDni(' 38 180 903 ')).toBe('38180903');
  });

  it('no saca lo que no sea punto ni espacio: un error de tipeo tiene que verse', () => {
    expect(normalizarDni('38a180903')).toBe('38a180903');
    expect(esDniValido('38a180903')).toBe(false);
  });
});

describe('esDniValido', () => {
  it('acepta de 7 a 9 dígitos, con o sin puntos', () => {
    expect(esDniValido('1234567')).toBe(true);
    expect(esDniValido('38180903')).toBe(true);
    expect(esDniValido('38.180.903')).toBe(true);
    expect(esDniValido('123456789')).toBe(true);
  });

  it('rechaza lo que el backend rechazaría', () => {
    expect(esDniValido('123456')).toBe(false);
    expect(esDniValido('1234567890')).toBe(false);
    expect(esDniValido('')).toBe(false);
  });
});

describe('formatearDni', () => {
  it('agrupa de a tres desde la derecha, como se escribe un número', () => {
    expect(formatearDni('38180903')).toBe('38.180.903');
    // De 7 dígitos: `1.234.567`, no `123.456.7`.
    expect(formatearDni('1234567')).toBe('1.234.567');
    expect(formatearDni('123456789')).toBe('123.456.789');
  });

  it('no se rompe con uno que ya venía con puntos', () => {
    expect(formatearDni('38.180.903')).toBe('38.180.903');
  });
});
