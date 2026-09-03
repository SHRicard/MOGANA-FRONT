import {
  COMPROBANTES_DEL_STORE_LIMITE,
  consumoDelStoreSchema,
  MAX_SELECCION,
  estaBorrado,
  huerfanos,
  limpiezaHechaSchema,
  listaDeComprobantesSchema,
  MESES_DEL_TRAMO,
  NIVEL_DE_USO_LABEL,
  nivelDeUso,
  NivelesDeUso,
  noHayNadaQueBorrar,
  porcentajeUsable,
  sePuedeBorrar,
  USO_CRITICO,
  USO_QUE_PIDE_ATENCION,
  vistaPreviaDeLimpiezaSchema,
  type ComprobanteEnElStore,
} from './types';

/**
 * Los payloads son los de `MORGANA-BACK/docs/flujo_comprobantes.md` §5,
 * copiados tal cual: si el backend cambia una forma, el test tiene que romper
 * acá y no en producción.
 */
const consumo = {
  propio: {
    comprobantes: 312,
    bytes: 88080384,
    masViejo: '2026-02-11T13:02:55.000Z',
    porAntiguedad: [
      { tramo: 'este_mes', comprobantes: 87, bytes: 19922944, borrables: 0, bytesBorrables: 0 },
      {
        tramo: 'un_mes',
        comprobantes: 82,
        bytes: 18874368,
        borrables: 79,
        bytesBorrables: 18000000,
      },
      { tramo: 'dos_meses', comprobantes: 0, bytes: 0, borrables: 0, bytesBorrables: 0 },
      {
        tramo: 'mas_de_dos_meses',
        comprobantes: 143,
        bytes: 49283072,
        borrables: 140,
        bytesBorrables: 48000000,
      },
    ],
    porEstado: [
      { estado: 'pendiente', comprobantes: 6, bytes: 1258291 },
      { estado: 'confirmado', comprobantes: 281, bytes: 79691776 },
      { estado: 'rechazado', comprobantes: 25, bytes: 7130316 },
    ],
    borrados: { comprobantes: 240, bytes: 130023424 },
  },
  cuenta: {
    plan: 'Cloudinary',
    creditosUsados: 3.42,
    creditosDelPlan: 25,
    porcentajeUsado: 13.7,
    almacenamientoBytes: 231736115,
    anchoDeBandaBytes: 1288490188,
    recursos: 655,
    medidoEn: '2026-08-31T18:00:00.000Z',
  },
};

describe('consumoDelStoreSchema', () => {
  it('acepta el payload del backend tal cual', () => {
    const leido = consumoDelStoreSchema.parse(consumo);
    expect(leido.propio.comprobantes).toBe(312);
    expect(leido.cuenta?.porcentajeUsado).toBe(13.7);
  });

  /**
   * ⚠️ **`cuenta` puede venir en `null`** —el store sin configurar, o su API que
   * no contestó— y el panel tiene que seguir mostrando `propio` igual: no puede
   * caerse porque un tercero esté lento.
   */
  it('acepta la cuenta en null sin romperse', () => {
    const leido = consumoDelStoreSchema.parse({ ...consumo, cuenta: null });
    expect(leido.cuenta).toBeNull();
    expect(leido.propio.bytes).toBe(88080384);
  });

  /** Los cuatro tramos vienen siempre, rellenados en cero. */
  it('trae los cuatro tramos aunque alguno esté vacío', () => {
    const leido = consumoDelStoreSchema.parse(consumo);
    expect(leido.propio.porAntiguedad).toHaveLength(4);
    expect(leido.propio.porAntiguedad[2].comprobantes).toBe(0);
  });

  /**
   * ⚠️ **`borrables` no es `comprobantes`**: descuenta los pendientes, que están
   * protegidos. Es el número que va en el botón — con el otro, alguien aprieta
   * esperando liberar 49 MB y libera 47.
   */
  it('borrables es menor que comprobantes cuando hay pendientes', () => {
    const leido = consumoDelStoreSchema.parse(consumo);
    const viejos = leido.propio.porAntiguedad[3];
    expect(viejos.borrables).toBeLessThan(viejos.comprobantes);
    expect(viejos.bytesBorrables).toBeLessThan(viejos.bytes);
  });
});

describe('huerfanos', () => {
  /** Lo que hay en la cuenta y ningún aviso explica: bytes pagos que no sirven. */
  it('son la diferencia entre lo que ve Cloudinary y lo que subió la app', () => {
    expect(huerfanos(consumoDelStoreSchema.parse(consumo))).toBe(655 - 312);
  });

  /** Sin cuenta no hay con qué comparar. */
  it('sin cuenta da cero', () => {
    expect(huerfanos(consumoDelStoreSchema.parse({ ...consumo, cuenta: null }))).toBe(0);
  });

  /**
   * Un `propio` mayor que `recursos` significa que Cloudinary está midiendo
   * viejo, no que sobren archivos del otro lado: nunca un negativo en pantalla.
   */
  it('nunca da negativo', () => {
    const midiendoViejo = consumoDelStoreSchema.parse({
      ...consumo,
      cuenta: { ...consumo.cuenta, recursos: 10 },
    });
    expect(huerfanos(midiendoViejo)).toBe(0);
  });
});

describe('MESES_DEL_TRAMO', () => {
  /**
   * ⚠️ **"De este mes" no se puede limpiar.** El backend exige treinta días de
   * antigüedad —es la guarda contra el error de tipeo—, así que ofrecer el botón
   * sería ofrecer un `400`.
   */
  it('el tramo de este mes no tiene criterio de limpieza', () => {
    expect(MESES_DEL_TRAMO.este_mes).toBeNull();
  });

  it('los demás sí', () => {
    expect(MESES_DEL_TRAMO.un_mes).toBe(1);
    expect(MESES_DEL_TRAMO.dos_meses).toBe(2);
    expect(MESES_DEL_TRAMO.mas_de_dos_meses).toBe(2);
  });
});

describe('listaDeComprobantesSchema', () => {
  const uno = {
    avisoId: 'a1',
    estadoDelAviso: 'confirmado',
    informadoEn: '2026-02-11T13:02:55.000Z',
    cliente: { id: 'c1', displayName: 'Ricardo Ramirez' },
    facturaNumero: 1070,
    monto: 8810.5,
    bytes: 344000,
    formato: 'jpg',
    subidoEn: '2026-02-11T13:02:55.000Z',
    borradoEn: null,
    borradoPor: null,
    url: 'https://res.cloudinary.com/x.jpg?__cld_token__=abc',
    miniatura: 'https://res.cloudinary.com/c_limit,w_400/x.jpg?__cld_token__=abc',
  };

  /**
   * `bytes` es el total **del filtro entero**, no de la página: es con lo que se
   * decide, y no puede cambiar al pasar de página.
   */
  it('los bytes son del filtro, no de la página', () => {
    const pagina = listaDeComprobantesSchema.parse({
      datos: [uno],
      total: 143,
      pagina: 1,
      limite: 20,
      paginas: 8,
      bytes: 49283072,
    });
    expect(pagina.datos).toHaveLength(1);
    expect(pagina.bytes).toBe(49283072);
  });

  describe('sePuedeBorrar', () => {
    const parseUno = (extra: Partial<ComprobanteEnElStore> = {}) =>
      listaDeComprobantesSchema.parse({
        datos: [{ ...uno, ...extra }],
        total: 1,
        pagina: 1,
        limite: 20,
        paginas: 1,
        bytes: 1,
      }).datos[0];

    it('un confirmado con imagen sí', () => {
      expect(sePuedeBorrar(parseUno())).toBe(true);
    });

    /**
     * ⚠️ **El de un aviso pendiente no**: su imagen es la única evidencia con la
     * que todavía hay que decidir. El camino para sacarla es rechazar el aviso,
     * que además le explica al cliente por qué.
     */
    it('el de un aviso pendiente no', () => {
      expect(sePuedeBorrar(parseUno({ estadoDelAviso: 'pendiente' }))).toBe(false);
    });

    /** Uno ya soltado no tiene nada que borrar. */
    it('uno ya borrado tampoco', () => {
      const ya = parseUno({ borradoEn: '2026-08-12T10:00:00.000Z', borradoPor: 'antiguedad' });
      expect(estaBorrado(ya)).toBe(true);
      expect(sePuedeBorrar(ya)).toBe(false);
    });
  });
});

describe('vistaPreviaDeLimpiezaSchema', () => {
  const previa = {
    comprobantes: 143,
    bytes: 49283072,
    desde: '2026-02-11T13:02:55.000Z',
    hasta: '2026-06-30T21:44:10.000Z',
    clientes: 38,
    porEstado: [
      { estado: 'confirmado', comprobantes: 131, bytes: 45000000 },
      { estado: 'rechazado', comprobantes: 12, bytes: 4283072 },
    ],
    protegidos: { pendientes: 4, bytes: 2100000 },
    muestra: [
      {
        avisoId: 'a1',
        facturaNumero: 1070,
        cliente: 'Ricardo Ramirez',
        informadoEn: '2026-02-11T13:02:55.000Z',
        bytes: 344000,
      },
    ],
  };

  it('acepta el payload del backend tal cual', () => {
    const leida = vistaPreviaDeLimpiezaSchema.parse(previa);
    expect(leida.comprobantes).toBe(143);
    expect(leida.protegidos.pendientes).toBe(4);
    expect(leida.muestra).toHaveLength(1);
  });

  /** Un criterio que no agarra nada no es un error: no hay botón que apretar. */
  it('reconoce cuando no hay nada que borrar', () => {
    const vacia = vistaPreviaDeLimpiezaSchema.parse({
      ...previa,
      comprobantes: 0,
      bytes: 0,
      desde: null,
      hasta: null,
      clientes: 0,
      porEstado: [],
      muestra: [],
    });
    expect(noHayNadaQueBorrar(vacia)).toBe(true);
    expect(noHayNadaQueBorrar(vistaPreviaDeLimpiezaSchema.parse(previa))).toBe(false);
  });
});

describe('limpiezaHechaSchema', () => {
  /**
   * ⚠️ Se lleva **hasta 500 por pasada**: mientras `restan` sea mayor que cero,
   * se aprieta de nuevo. Es idempotente, así que repetir no borra de más.
   */
  it('trae cuántos quedaron para la próxima pasada', () => {
    const hecho = limpiezaHechaSchema.parse({
      pedidos: 500,
      borrados: 498,
      fallados: 2,
      bytesLiberados: 48932000,
      lotes: 2,
      restan: 143,
      detalle: ['morgana/comprobantes/2026-06/8be3bef8'],
    });
    expect(hecho.restan).toBe(143);
    expect(hecho.detalle).toHaveLength(2 - 1);
  });
});

// ─────────────────────────────────────────────────────────────
// Qué tan lleno está
// ─────────────────────────────────────────────────────────────
describe('porcentajeUsable', () => {
  /**
   * ⚠️ **Se recorta a 0–100.** Los créditos se pueden pasar del plan, así que un
   * `103` es un valor posible del backend — y una barra que pinta fuera del riel
   * no lo es.
   */
  it('recorta lo que se pasa del 100', () => {
    expect(porcentajeUsable(103)).toBe(100);
  });

  it('no dibuja hacia atrás', () => {
    expect(porcentajeUsable(-5)).toBe(0);
  });

  it('deja pasar lo que está en rango', () => {
    expect(porcentajeUsable(13.7)).toBe(13.7);
    expect(porcentajeUsable(0)).toBe(0);
    expect(porcentajeUsable(100)).toBe(100);
  });

  /** Un `NaN` pinta la barra entera si no se ataja. */
  it('un valor que no es número queda en cero', () => {
    expect(porcentajeUsable(Number.NaN)).toBe(0);
  });
});

describe('nivelDeUso', () => {
  /**
   * Los dos cortes son decisiones de negocio: **75%** es cuando conviene mirar
   * el panel de vez en cuando, y **90%** cuando queda alrededor de un mes de
   * subidas antes de que el store empiece a rechazar.
   */
  it.each([
    [0, NivelesDeUso.HOLGADO],
    [13.7, NivelesDeUso.HOLGADO],
    [74.9, NivelesDeUso.HOLGADO],
    [USO_QUE_PIDE_ATENCION, NivelesDeUso.ATENCION],
    [89.9, NivelesDeUso.ATENCION],
    [USO_CRITICO, NivelesDeUso.CRITICO],
    [100, NivelesDeUso.CRITICO],
  ])('con %s%% está %s', (porcentaje, esperado) => {
    expect(nivelDeUso(porcentaje)).toBe(esperado);
  });

  /** Pasarse del plan es lo más crítico que hay, no un valor sin zona. */
  it('pasarse del 100 sigue siendo crítico', () => {
    expect(nivelDeUso(140)).toBe(NivelesDeUso.CRITICO);
  });

  /** ⚠️ El color no puede ser lo único que lo diga: cada zona tiene su texto. */
  it('cada nivel tiene algo escrito', () => {
    for (const nivel of Object.values(NivelesDeUso)) {
      expect(NIVEL_DE_USO_LABEL[nivel].length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// Borrar por selección (§5.5)
// ─────────────────────────────────────────────────────────────
describe('MAX_SELECCION', () => {
  /**
   * ⚠️ **Es el tope del backend**, no un número de pantalla: pasarse es un
   * `400`. Está puesto en 100 porque es lo que entra en una página del listado,
   * así que "tildar todo lo que veo" siempre entra en un pedido.
   */
  it('son 100, el tope que acepta el backend', () => {
    expect(MAX_SELECCION).toBe(100);
  });

  /**
   * Una página tiene que caber entera en una selección: si no, "tildar los de
   * esta página" dejaría algunos afuera sin explicación.
   */
  it('una página entera entra en una selección', () => {
    expect(COMPROBANTES_DEL_STORE_LIMITE).toBeLessThanOrEqual(MAX_SELECCION);
  });
});

describe('sePuedeBorrar, para la selección', () => {
  const enLista = (extra: Record<string, unknown>) =>
    listaDeComprobantesSchema.parse({
      datos: [
        {
          avisoId: 'a1',
          estadoDelAviso: 'confirmado',
          informadoEn: '2026-02-11T13:02:55.000Z',
          cliente: { id: 'c1', displayName: 'Ricardo' },
          facturaNumero: 1070,
          monto: 100,
          bytes: 1000,
          formato: 'jpg',
          subidoEn: '2026-02-11T13:02:55.000Z',
          borradoEn: null,
          borradoPor: null,
          url: 'https://x/a.jpg',
          miniatura: 'https://x/a.jpg',
          ...extra,
        },
      ],
      total: 1,
      pagina: 1,
      limite: 20,
      paginas: 1,
      bytes: 1000,
    }).datos[0];

  /**
   * ⚠️ Es la misma regla que filtra qué se puede tildar. Si un pendiente entrara
   * en la selección, el backend **falla la operación entera sin borrar nada** —a
   * propósito, para no dejar a alguien viendo "borrados: 9 de 12" sin saber
   * cuáles quedaron—. Cortarlo acá evita ese viaje.
   */
  it('un pendiente nunca se puede tildar', () => {
    expect(sePuedeBorrar(enLista({ estadoDelAviso: 'pendiente' }))).toBe(false);
  });

  it('un confirmado y un rechazado sí', () => {
    expect(sePuedeBorrar(enLista({ estadoDelAviso: 'confirmado' }))).toBe(true);
    expect(sePuedeBorrar(enLista({ estadoDelAviso: 'rechazado' }))).toBe(true);
  });
});
