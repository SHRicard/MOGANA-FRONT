import {
  abreUnDia,
  conversacionSchema,
  esDelNegocio,
  escribirMensajeSchema,
  fusionarMensajes,
  LadosDelMensaje,
  LARGO_MAXIMO_DEL_MENSAJE,
  miHiloSchema,
  miMensajeSchema,
  nombreDelCliente,
} from './types';

// ─────────────────────────────────────────────────────────────
// De qué lado se dibuja
// ─────────────────────────────────────────────────────────────
describe('esDelNegocio', () => {
  it('distingue los dos lados del mostrador', () => {
    expect(esDelNegocio({ lado: LadosDelMensaje.NEGOCIO })).toBe(true);
    expect(esDelNegocio({ lado: LadosDelMensaje.CLIENTE })).toBe(false);
  });

  /**
   * ⚠️ Un lado que esta build no conoce **cae del lado del cliente**, y esa es la
   * dirección correcta del error: un mensaje ajeno pintado como propio se lee
   * como si uno lo hubiera escrito, que es mucho peor que uno propio mal
   * alineado.
   */
  it('un lado desconocido no se hace pasar por el negocio', () => {
    expect(esDelNegocio({ lado: 'proveedor' })).toBe(false);
    expect(esDelNegocio({ lado: '' })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Juntar las páginas del hilo
// ─────────────────────────────────────────────────────────────
describe('fusionarMensajes', () => {
  const m = (id: string, createdAt: string) => ({ id, createdAt });

  it('ordena del más nuevo al más viejo', () => {
    const juntos = fusionarMensajes([[m('b', '2026-09-01T10:00:00Z'), m('a', '2026-08-30T10:00:00Z')]]);

    expect(juntos.map((uno) => uno.id)).toEqual(['b', 'a']);
  });

  /**
   * El caso que hace falta que exista: entre que se pidió la página 1 y la 2
   * entró un mensaje nuevo, **las páginas se corrieron** y el último de la 1
   * volvió a aparecer como primero de la 2. Sin juntar por id, se vería dos
   * veces.
   */
  it('no repite el mensaje que quedó en las dos páginas', () => {
    const pagina1 = [m('nuevo', '2026-09-01T12:00:00Z'), m('cruce', '2026-09-01T11:00:00Z')];
    const pagina2 = [m('cruce', '2026-09-01T11:00:00Z'), m('viejo', '2026-08-31T09:00:00Z')];

    const juntos = fusionarMensajes([pagina1, pagina2]);

    expect(juntos.map((uno) => uno.id)).toEqual(['nuevo', 'cruce', 'viejo']);
  });

  /**
   * Dos mensajes pueden compartir el milisegundo. Sin un segundo criterio el
   * orden cambiaría entre renders y la lista saltaría sola.
   */
  it('desempata por id cuando la fecha es la misma', () => {
    const juntos = fusionarMensajes([[m('a', '2026-09-01T10:00:00Z'), m('z', '2026-09-01T10:00:00Z')]]);

    expect(juntos.map((uno) => uno.id)).toEqual(['z', 'a']);
    // Y el orden es estable: dos llamadas dan lo mismo.
    expect(fusionarMensajes([[m('z', '2026-09-01T10:00:00Z'), m('a', '2026-09-01T10:00:00Z')]])).toEqual(
      juntos,
    );
  });

  it('sin páginas devuelve una lista vacía', () => {
    expect(fusionarMensajes([])).toEqual([]);
    expect(fusionarMensajes([[], []])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// El separador de días
// ─────────────────────────────────────────────────────────────
describe('abreUnDia', () => {
  /**
   * La lista viene **del más nuevo al más viejo**, así que el separador va sobre
   * el ÚLTIMO mensaje de cada día dentro del arreglo. Se compara contra el
   * siguiente, no contra el anterior.
   */
  const hilo = [
    { createdAt: '2026-09-01T18:00:00Z' }, // hoy, el más nuevo
    { createdAt: '2026-09-01T09:00:00Z' }, // hoy, el primero del día
    { createdAt: '2026-08-31T20:00:00Z' }, // ayer
  ];

  it('marca el primer mensaje de cada día', () => {
    expect(abreUnDia(hilo, 0)).toBe(false);
    expect(abreUnDia(hilo, 1)).toBe(true);
    expect(abreUnDia(hilo, 2)).toBe(true);
  });

  /** El más viejo de todos siempre abre: no hay nada antes de él. */
  it('el último del arreglo siempre abre un día', () => {
    expect(abreUnDia([{ createdAt: '2026-09-01T10:00:00Z' }], 0)).toBe(true);
  });

  it('un índice que no existe no rompe', () => {
    expect(abreUnDia(hilo, 99)).toBe(false);
    expect(abreUnDia([], 0)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Cómo se llama el cliente
// ─────────────────────────────────────────────────────────────
describe('nombreDelCliente', () => {
  it('usa el nombre cuando lo hay', () => {
    expect(nombreDelCliente({ id: '1', displayName: 'Ana Ruiz' })).toBe('Ana Ruiz');
  });

  /** Una cuenta creada con DNI puede no tener nombre ni correo. */
  it('cae al correo y después al documento', () => {
    expect(nombreDelCliente({ id: '1', displayName: null, email: 'ana@x.com' })).toBe('ana@x.com');
    expect(nombreDelCliente({ id: '1', displayName: '  ', email: null, dni: '30111222' })).toBe(
      'DNI 30111222',
    );
    expect(nombreDelCliente({ id: '1' })).toBe('Cliente sin nombre');
  });
});

// ─────────────────────────────────────────────────────────────
// Lo que se escribe
// ─────────────────────────────────────────────────────────────
describe('escribirMensajeSchema', () => {
  it('acepta un mensaje normal', () => {
    expect(escribirMensajeSchema.safeParse({ texto: '¿Abren el sábado?' }).success).toBe(true);
  });

  /** Puros espacios es un mensaje vacío: se corta acá y no se gasta el viaje. */
  it('rechaza el vacío y el que es todo espacios', () => {
    expect(escribirMensajeSchema.safeParse({ texto: '' }).success).toBe(false);
    expect(escribirMensajeSchema.safeParse({ texto: '   \n  ' }).success).toBe(false);
  });

  it('corta en el mismo tope que el backend', () => {
    expect(escribirMensajeSchema.safeParse({ texto: 'a'.repeat(LARGO_MAXIMO_DEL_MENSAJE) }).success).toBe(
      true,
    );
    expect(
      escribirMensajeSchema.safeParse({ texto: 'a'.repeat(LARGO_MAXIMO_DEL_MENSAJE + 1) }).success,
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Lo que llega de la API
// ─────────────────────────────────────────────────────────────
describe('miMensajeSchema', () => {
  const base = {
    id: 'm-1',
    lado: 'negocio',
    texto: 'Lo vemos y te avisamos.',
    createdAt: '2026-09-01T10:00:00Z',
  };

  it('acepta un mensaje suelto, sin contexto', () => {
    expect(miMensajeSchema.safeParse(base).success).toBe(true);
    expect(miMensajeSchema.safeParse({ ...base, sobre: null }).success).toBe(true);
  });

  it('acepta el que cuelga de una factura', () => {
    const parsed = miMensajeSchema.safeParse({
      ...base,
      sobre: { tipo: 'factura', id: 'f-1', etiqueta: 'Factura #1070' },
    });

    expect(parsed.success).toBe(true);
  });

  /**
   * ⚠️ Un contexto nuevo del backend **no puede tirar abajo el hilo entero**. Lo
   * peor que pasa es que el chip no sepa a dónde llevar.
   */
  it('no se rompe con un contexto que esta build no conoce', () => {
    const parsed = miMensajeSchema.safeParse({
      ...base,
      sobre: { tipo: 'remito', id: 'r-1', etiqueta: 'Remito #4' },
    });

    expect(parsed.success).toBe(true);
  });
});

describe('miHiloSchema', () => {
  it('acepta el hilo vacío', () => {
    const parsed = miHiloSchema.safeParse({
      datos: [],
      total: 0,
      pagina: 1,
      limite: 30,
      paginas: 0,
      sinLeer: 0,
      silenciada: false,
    });

    expect(parsed.success).toBe(true);
  });

  /** `silenciada` decide si se dibuja el campo de escribir: no puede faltar. */
  it('exige saber si el canal está cortado', () => {
    const parsed = miHiloSchema.safeParse({
      datos: [],
      total: 0,
      pagina: 1,
      limite: 30,
      paginas: 0,
      sinLeer: 0,
    });

    expect(parsed.success).toBe(false);
  });
});

describe('conversacionSchema', () => {
  const base = {
    clienteId: 'c-1',
    cliente: { id: 'c-1', displayName: 'Ana Ruiz', email: null, dni: null },
    sinLeer: 2,
    silenciada: false,
  };

  /** Un hilo recién creado desde el panel todavía no tiene ningún mensaje. */
  it('acepta el hilo sin mensajes', () => {
    const parsed = conversacionSchema.safeParse({
      ...base,
      adelanto: null,
      ultimoMensajeEn: null,
      ultimoLado: null,
      leidoPor: null,
    });

    expect(parsed.success).toBe(true);
  });

  it('acepta el renglón completo, con quién lo miró', () => {
    const parsed = conversacionSchema.safeParse({
      ...base,
      adelanto: 'Te pagué el viernes',
      ultimoMensajeEn: '2026-09-01T10:00:00Z',
      ultimoLado: 'cliente',
      leidoPor: { id: 'a-1', displayName: 'Beto' },
    });

    expect(parsed.success).toBe(true);
  });
});
