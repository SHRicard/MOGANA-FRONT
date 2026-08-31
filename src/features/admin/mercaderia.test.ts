import {
  productosGlobalesSchema,
  tendenciaDeCompraSchema,
  textoDiasSinVenderse,
  textoEstacionalidad,
  textoParaLaMitad,
  textoUnidades,
} from './mercaderia';

/** La respuesta del doc (§5.1), tal cual. */
const TENDENCIA = {
  hoy: '2026-08-21',
  mes: '2026-08',
  desde: '2026-08-01',
  hasta: '2026-08-31',
  cerrado: false,
  mesAnterior: '2026-07',
  meses: ['2026-05', '2026-06', '2026-07', '2026-08'],

  totales: { cantidad: 49, monto: 239740, especies: 5, facturas: 6, clientes: 4 },

  especies: [
    {
      especieId: '8d01',
      nombre: 'Soda',
      cantidad: 24,
      monto: 21360,
      facturas: 1,
      clientes: 1,
      participacion: 8.9,
      precioPromedio: 890,
      anterior: { cantidad: 12, monto: 10680 },
      variacionCantidad: 100,
      variacionMonto: 100,
      tendencia: 'sube',
      serie: [
        { mes: '2026-05', cantidad: 0, monto: 0 },
        { mes: '2026-06', cantidad: 0, monto: 0 },
        { mes: '2026-07', cantidad: 12, monto: 10680 },
        { mes: '2026-08', cantidad: 24, monto: 21360 },
      ],
    },
    {
      especieId: 'fd2e',
      nombre: 'Alquiler',
      cantidad: 0,
      monto: 0,
      facturas: 0,
      clientes: 0,
      participacion: 0,
      precioPromedio: null,
      anterior: { cantidad: 2, monto: 25000 },
      variacionCantidad: -100,
      variacionMonto: -100,
      tendencia: 'parada',
      serie: [
        { mes: '2026-05', cantidad: 0, monto: 0 },
        { mes: '2026-06', cantidad: 0, monto: 0 },
        { mes: '2026-07', cantidad: 2, monto: 25000 },
        { mes: '2026-08', cantidad: 0, monto: 0 },
      ],
    },
  ],
};

describe('tendenciaDeCompraSchema', () => {
  it('acepta la respuesta del doc', () => {
    expect(tendenciaDeCompraSchema.parse(TENDENCIA)).toEqual(TENDENCIA);
  });

  /**
   * ⚠️ La lista **no es "lo que se vendió este mes"**: trae todo lo que se movió
   * en la ventana. La especie que se frenó viene en cero y con `parada`, y ese
   * renglón es justamente el dato que la pantalla existe para dar.
   */
  it('no descarta la especie que dejó de venderse', () => {
    const datos = tendenciaDeCompraSchema.parse(TENDENCIA);
    const parada = datos.especies[1];

    expect(datos.especies).toHaveLength(2);
    expect(parada?.tendencia).toBe('parada');
    expect(parada?.cantidad).toBe(0);
    // Sin ventas no hay precio promedio: `null`, no cero.
    expect(parada?.precioPromedio).toBeNull();
  });

  /** Todas las series traen los mismos meses del eje, rellenados con cero. */
  it('las series tienen el largo del eje', () => {
    const datos = tendenciaDeCompraSchema.parse(TENDENCIA);
    for (const especie of datos.especies) {
      expect(especie.serie).toHaveLength(datos.meses.length);
    }
  });

  it('rechaza un mes que no tiene la forma de la API', () => {
    expect(() => tendenciaDeCompraSchema.parse({ ...TENDENCIA, mes: '2026-8' })).toThrow();
  });
});

/** La respuesta del doc (§6.2), con una especie que nunca se vendió. */
const PRODUCTOS = {
  hoy: '2026-08-21',
  desde: '2025-09',
  hasta: '2026-08',
  meses: 12,

  totales: {
    cantidad: 2378,
    monto: 7610800,
    facturas: 174,
    clientes: 15,
    especies: 12,
    especiesConVenta: 11,
    productos: 19,
  },

  concentracion: { primera: 37.4, tresPrimeras: 72.7, paraLaMitad: 2, sinVenta: 1 },

  especies: [
    {
      especieId: 'dd14',
      nombre: 'Agua',
      puesto: 1,
      cantidad: 921,
      monto: 2843250,
      facturas: 112,
      clientes: 14,
      productosDistintos: 3,
      participacion: 37.4,
      participacionAcumulada: 37.4,
      precioPromedio: 3087.13,
      primeraVenta: '2025-09-11',
      ultimaVenta: '2026-08-20',
      diasSinVenderse: 1,
      mesesConVenta: 12,
      mejorMes: { mes: '2026-07', cantidad: 116, monto: 394850 },
      estacionalidad: 1.5,
      reciente: { cantidad: 307, monto: 1081200 },
      previo: { cantidad: 230, monto: 739600 },
      variacionCantidad: 33.5,
      variacionMonto: 46.2,
      tendencia: 'sube',
      productos: [
        {
          producto: 'Bidón 20L',
          cantidad: 625,
          monto: 2071000,
          facturas: 69,
          participacion: 72.8,
        },
      ],
    },
    {
      especieId: '24a1',
      nombre: 'Cerveza',
      puesto: 12,
      cantidad: 0,
      monto: 0,
      facturas: 0,
      clientes: 0,
      productosDistintos: 0,
      participacion: 0,
      participacionAcumulada: 100,
      precioPromedio: null,
      primeraVenta: null,
      ultimaVenta: null,
      diasSinVenderse: null,
      mesesConVenta: 0,
      mejorMes: null,
      estacionalidad: null,
      reciente: { cantidad: 0, monto: 0 },
      previo: { cantidad: 0, monto: 0 },
      variacionCantidad: null,
      variacionMonto: null,
      tendencia: 'parada',
      productos: [],
    },
  ],
};

describe('productosGlobalesSchema', () => {
  it('acepta la respuesta del doc', () => {
    expect(productosGlobalesSchema.parse(PRODUCTOS)).toEqual(PRODUCTOS);
  });

  /**
   * ⚠️ La consulta arranca en el **catálogo**, no en las ventas: el catálogo
   * muerto —lo que se cargó y nadie compró— es justamente lo que hay que dejar
   * de comprarle al proveedor, y no aparece en ninguna otra pantalla. Si el
   * schema exigiera sus fechas, ese renglón tiraría abajo la lista entera.
   */
  it('acepta una especie que no se vendió nunca', () => {
    const nunca = productosGlobalesSchema.parse(PRODUCTOS).especies[1];

    expect(nunca?.primeraVenta).toBeNull();
    expect(nunca?.mejorMes).toBeNull();
    expect(nunca?.diasSinVenderse).toBeNull();
    expect(nunca?.productos).toHaveLength(0);
  });

  it('rechaza un período que no tiene la forma de la API', () => {
    expect(() => productosGlobalesSchema.parse({ ...PRODUCTOS, desde: '2025-9' })).toThrow();
  });
});

describe('textoDiasSinVenderse', () => {
  /** `null` es "nunca se vendió", **no** "recién": son opuestos. */
  it('null no es "recién"', () => {
    expect(textoDiasSinVenderse(null)).toBe('Nunca se vendió');
    expect(textoDiasSinVenderse(0)).toBe('Se vendió hoy');
  });

  it('concuerda el singular', () => {
    expect(textoDiasSinVenderse(1)).toBe('Ayer');
    expect(textoDiasSinVenderse(45)).toBe('Hace 45 días');
  });
});

describe('textoParaLaMitad', () => {
  it('dice de cuántas etiquetas vive la mitad del negocio', () => {
    expect(textoParaLaMitad(1)).toBe('1 especie');
    expect(textoParaLaMitad(2)).toBe('2 especies');
  });

  it('sin ventas no inventa un número', () => {
    expect(textoParaLaMitad(null)).toBe('—');
  });
});

describe('textoEstacionalidad', () => {
  it('un decimal y coma', () => {
    expect(textoEstacionalidad(1.5)).toBe('1,5 ×');
    expect(textoEstacionalidad(8.72)).toBe('8,7 ×');
  });

  it('sin ventas sale como raya', () => {
    expect(textoEstacionalidad(null)).toBe('—');
  });
});

describe('textoUnidades', () => {
  /** No se inventan decimales: no todo se vende por unidad entera. */
  it('muestra la cantidad tal cual', () => {
    expect(textoUnidades(24)).toBe('24 u');
    expect(textoUnidades(0)).toBe('0 u');
    expect(textoUnidades(1.5)).toBe('1.5 u');
  });
});
