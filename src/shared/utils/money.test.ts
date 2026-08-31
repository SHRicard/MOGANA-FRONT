import {
  calcularSubtotal,
  cantidadSchema,
  formatMonto,
  montoSchema,
  parseAMonto,
  parseCantidad,
  sumarMontos,
} from './money';

describe('formatMonto', () => {
  it('muestra siempre dos decimales', () => {
    // La columna de importes se lee de un vistazo solo si todos los renglones
    // tienen la misma cantidad de decimales.
    expect(formatMonto(70.07)).toBe('$70,07');
    expect(formatMonto(19.99)).toBe('$19,99');
    expect(formatMonto(10.1)).toBe('$10,10');
    // El doc del tablero es explícito: `215` se muestra como `$215,00`.
    expect(formatMonto(215)).toBe('$215,00');
    expect(formatMonto(0)).toBe('$0,00');
  });

  it('separa los miles', () => {
    expect(formatMonto(18500.5)).toBe('$18.500,50');
    expect(formatMonto(1234567.89)).toBe('$1.234.567,89');
  });

  it('no arrastra el error de flotante', () => {
    // 8.29 * 100 da 828.9999999999999: sin pasar por centavos enteros, esto
    // terminaría mostrando $8,28.
    expect(formatMonto(8.29)).toBe('$8,29');
    expect(formatMonto(0.1 + 0.2)).toBe('$0,30');
  });

  it('deja sacar el símbolo', () => {
    expect(formatMonto(18500.5, { conSimbolo: false })).toBe('18.500,50');
  });
});

describe('parseAMonto', () => {
  it('acepta coma y punto como decimal', () => {
    // En un teclado numérico de celular no siempre hay coma.
    expect(parseAMonto('19,99')).toBe(19.99);
    expect(parseAMonto('19.99')).toBe(19.99);
  });

  it('entiende el punto de miles', () => {
    expect(parseAMonto('1.850')).toBe(1850);
    expect(parseAMonto('18.500,50')).toBe(18500.5);
  });

  it('acepta el cero: la API admite precio 0', () => {
    expect(parseAMonto('0')).toBe(0);
    expect(parseAMonto('0,07')).toBe(0.07);
  });

  it('con tres dígitos manda la regla de los miles', () => {
    // `"19.999"` es como se escribe un precio acá: mil novecientos... no, casi
    // veinte mil. Los separadores de miles siempre agrupan de a tres, y vale
    // para los dos símbolos porque el teclado del celular no siempre tiene coma.
    expect(parseAMonto('19.999')).toBe(19999);
    expect(parseAMonto('19,999')).toBe(19999);
  });

  it('rechaza más de dos decimales en vez de redondear en silencio', () => {
    // La API contesta "El precio admite hasta dos decimales.": mejor decirlo en
    // el campo que gastar el request.
    expect(parseAMonto('19,9999')).toBeNull();
    expect(parseAMonto('0,075')).toBeNull();
  });

  it('devuelve null con lo que no es un importe', () => {
    expect(parseAMonto('')).toBeNull();
    expect(parseAMonto('   ')).toBeNull();
    expect(parseAMonto('abc')).toBeNull();
    expect(parseAMonto('1,2,3')).toBeNull();
  });

  it('es la inversa de formatMonto', () => {
    const montos = [0, 0.07, 19.99, 18500.5, 1234567.89];
    montos.forEach((monto) => {
      expect(parseAMonto(formatMonto(monto, { conSimbolo: false }))).toBe(monto);
    });
  });
});

describe('parseCantidad', () => {
  it('acepta enteros de 1 para arriba', () => {
    expect(parseCantidad('1')).toBe(1);
    expect(parseCantidad('3')).toBe(3);
    expect(parseCantidad(' 12 ')).toBe(12);
  });

  it('rechaza el cero, los negativos y los decimales', () => {
    // La API pide entero y 1 o más: "La cantidad mínima es 1.".
    expect(parseCantidad('0')).toBeNull();
    expect(parseCantidad('-1')).toBeNull();
    expect(parseCantidad('1,5')).toBeNull();
    expect(parseCantidad('')).toBeNull();
    expect(parseCantidad('tres')).toBeNull();
  });
});

describe('calcularSubtotal', () => {
  it('multiplica sin arrastrar el error de flotante', () => {
    // 19.99 * 3 en flotante da 59.970000000000006.
    expect(calcularSubtotal(3, 19.99)).toBe(59.97);
    expect(calcularSubtotal(1, 10.1)).toBe(10.1);
  });
});

describe('sumarMontos', () => {
  it('suma en centavos: es la misma cuenta que hace el backend', () => {
    expect(sumarMontos([59.97, 10.1])).toBe(70.07);
    expect(sumarMontos([0.1, 0.2])).toBe(0.3);
    expect(sumarMontos([])).toBe(0);
  });
});

describe('schemas de la API', () => {
  it('montoSchema acepta importes en pesos y rechaza negativos', () => {
    expect(montoSchema.safeParse(70.07).success).toBe(true);
    expect(montoSchema.safeParse(0).success).toBe(true);
    expect(montoSchema.safeParse(-1).success).toBe(false);
  });

  it('cantidadSchema exige entero de 1 para arriba', () => {
    expect(cantidadSchema.safeParse(3).success).toBe(true);
    expect(cantidadSchema.safeParse(0).success).toBe(false);
    expect(cantidadSchema.safeParse(1.5).success).toBe(false);
  });
});
