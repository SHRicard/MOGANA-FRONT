import {
  aEstadoDeCuenta,
  aTendencia,
  Tendencias,
  textoDesdeLaUltima,
  DireccionesVariacion,
  direccionVariacion,
  EstadosDeCuenta,
  comoPagaDe,
  facturasEnCurso,
  fichaClienteSchema,
  formatPromedio,
  FormasDePagar,
  textoComoPaga,
  resumenDeAtraso,
  textoAtrasoActual,
  textoVencimientoMasViejo,
  formatDias,
  formatTasa,
  FormatosVariacion,
  magnitudVariacion,
  metricaClienteSchema,
  metricasClientesPaginaSchema,
  metricasSchema,
  textoCantidad,
  textoComparacion,
  textoDelMasViejo,
  textoDemora,
  textoVariacion,
  ticketSchema,
  ticketsMesesSchema,
} from './types';

/** La respuesta del doc, tal cual. Es el caso feliz de referencia. */
const RESPUESTA = {
  hoy: '2026-08-20',
  delMes: {
    mes: '2026-08',
    desde: '2026-08-01',
    hasta: '2026-08-31',
    cobrado: 59622.25,
    cobros: 5,
    facturado: 221060,
    facturas: 5,
  },
  enLaCalle: {
    deuda: 1348655.75,
    vencido: 1121893.25,
    porVencer: 226762.5,
    facturasImpagas: 34,
    facturasVencidas: 27,
    vencimientoMasViejo: '2026-06-05',
    diasDelMasViejo: -76,
  },
  clientes: { total: 15, conFacturas: 14, conDeuda: 12, morosos: 8, sinFiado: 1 },
  cumplimiento: { porClientes: 42.9, porFacturas: 6.9, porPlata: 24.8 },
  global: {
    totalFacturado: 1792728,
    totalCobrado: 444072.25,
    facturas: 36,
    facturasPagadas: 2,
    facturasVencidas: 27,
    facturasAnuladas: 1,
    ticketPromedio: 49798,
    aReembolsar: 73002.5,
  },
  evolucion: [
    { mes: '2026-03', facturado: 0, cobrado: 0 },
    { mes: '2026-08', facturado: 221060, cobrado: 59622.25 },
  ],
};

describe('metricasSchema', () => {
  it('acepta la respuesta del doc', () => {
    expect(metricasSchema.parse(RESPUESTA)).toEqual(RESPUESTA);
  });

  /**
   * El negocio recién abierto: las tres tasas, el ticket promedio y el
   * vencimiento más viejo llegan en `null`. Si el schema los exigiera, la
   * pantalla no se dibujaría justo en el caso en que más se la mira.
   */
  it('acepta los nulos de una cuenta sin movimiento', () => {
    const vacio = {
      ...RESPUESTA,
      enLaCalle: { ...RESPUESTA.enLaCalle, vencimientoMasViejo: null, diasDelMasViejo: null },
      cumplimiento: { porClientes: null, porFacturas: null, porPlata: null },
      global: { ...RESPUESTA.global, ticketPromedio: null },
    };

    expect(() => metricasSchema.parse(vacio)).not.toThrow();
  });

  it('rechaza un mes que no tiene la forma de la API', () => {
    const roto = { ...RESPUESTA, delMes: { ...RESPUESTA.delMes, mes: '2026-8' } };
    expect(() => metricasSchema.parse(roto)).toThrow();
  });

  /**
   * Los meses sin movimiento vienen en cero **a propósito**: sin ellos el
   * gráfico mostraría marzo pegado a agosto como si fueran consecutivos.
   */
  it('no descarta los meses en cero del gráfico', () => {
    const metricas = metricasSchema.parse(RESPUESTA);
    expect(metricas.evolucion).toHaveLength(2);
    expect(metricas.evolucion[0]?.facturado).toBe(0);
  });
});

describe('formatTasa', () => {
  /**
   * La trampa que el doc marca en mayúsculas: `null` no es `0`. Un cero ahí haría
   * que un negocio que todavía no facturó nada se vea fundido.
   */
  it('null sale como raya, nunca como 0 %', () => {
    expect(formatTasa(null)).toBe('—');
    expect(formatTasa(0)).toBe('0,0 %');
  });

  it('un decimal y coma, como el resto de los números de la app', () => {
    expect(formatTasa(42.9)).toBe('42,9 %');
    expect(formatTasa(100)).toBe('100,0 %');
  });
});

describe('textoDelMasViejo', () => {
  it('el signo negativo es "ya venció"', () => {
    expect(textoDelMasViejo(-76)).toBe('La más vieja venció hace 76 días');
    expect(textoDelMasViejo(-1)).toBe('La más vieja venció ayer');
  });

  /** Sin nada vencido no hay nada que reclamar: la línea no se dibuja. */
  it('sin vencidas no dice nada', () => {
    expect(textoDelMasViejo(null)).toBeNull();
    expect(textoDelMasViejo(5)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Métricas por cliente
// ─────────────────────────────────────────────────────────────

/**
 * Un renglón del listado, tal como lo manda la API: **tres números y nada más**.
 *
 * Es una pantalla para barrer y elegir, así que acá no vienen ni la tasa de
 * cumplimiento ni las demoras ni el ritmo de compra: todo eso está en la ficha.
 */
const CLIENTE = {
  clienteId: '8be3bef8-6d66-452c-a8a8-9f8c347f4330',
  nombre: 'Sofía Bentancur',
  dni: '30999003',
  seLeFia: true,
  estado: 'vencida',

  totalFacturado: 337500,
  deuda: 137500,
  vencido: 90000,

  facturas: 15,

  ultimaCompra: '2026-07-15',
  diasSinComprar: 36,
};

describe('metricasClientesPaginaSchema', () => {
  it('acepta la página tal como la manda la API', () => {
    const pagina = { datos: [CLIENTE], total: 14, pagina: 1, limite: 20, paginas: 1 };
    expect(metricasClientesPaginaSchema.parse(pagina)).toEqual(pagina);
  });

  /**
   * El renglón adelgazó cuando apareció la ficha: la tasa, las demoras y el
   * ritmo de compra se fueron adentro. Si el schema volviera a exigirlos, el
   * listado entero dejaría de dibujarse — que es exactamente lo que pasó.
   */
  it('no exige lo que el renglón ya no trae', () => {
    expect(() => metricaClienteSchema.parse(CLIENTE)).not.toThrow();
  });

  /** Un cliente sin DNI cargado sigue siendo un cliente. */
  it('acepta un cliente sin DNI', () => {
    expect(() => metricaClienteSchema.parse({ ...CLIENTE, dni: null })).not.toThrow();
  });

  /** Campos de más no rompen: el día que la API agregue uno, el listado sigue. */
  it('ignora lo que no conoce', () => {
    const conExtra = { ...CLIENTE, algoNuevo: 'lo que sea' };
    expect(metricaClienteSchema.parse(conExtra)).not.toHaveProperty('algoNuevo');
  });
});

describe('formatDias', () => {
  it('null sale como raya: "no hay intervalo" no es "cada cero días"', () => {
    expect(formatDias(null)).toBe('—');
    expect(formatDias(0)).toBe('0 días');
  });

  it('redondea y concuerda en singular', () => {
    expect(formatDias(1)).toBe('1 día');
    expect(formatDias(36)).toBe('36 días');
    expect(formatDias(12.5)).toBe('13 días');
  });
});

describe('textoDemora', () => {
  /**
   * El signo se pierde si se muestra el número pelado: `-5` no es "menos cinco
   * días de demora", es cinco días **antes** de tiempo — ese es el cliente que
   * hay que cuidar.
   */
  it('el signo negativo es que paga antes de tiempo', () => {
    expect(textoDemora(-5)).toBe('5 días antes');
    expect(textoDemora(12.5)).toBe('13 días tarde');
    expect(textoDemora(0)).toBe('El día del vencimiento');
  });

  it('sin pagos no dice nada', () => {
    expect(textoDemora(null)).toBe('—');
  });
});

// ─────────────────────────────────────────────────────────────
// Tickets: la foto de un mes
// ─────────────────────────────────────────────────────────────

/** El listado del doc, más un mes vacío de los que vienen igual. */
const MESES = {
  hoy: '2026-08-21',
  total: 5,
  meses: [
    {
      mes: '2026-08',
      cerrado: false,
      conMovimiento: true,
      facturado: 221060,
      facturas: 5,
      cobrado: 59622.25,
      cobros: 5,
      deudaAlCierre: 1348655.75,
    },
    {
      mes: '2026-07',
      cerrado: true,
      conMovimiento: true,
      facturado: 367407.5,
      facturas: 13,
      cobrado: 22450,
      cobros: 1,
      deudaAlCierre: 1187218,
    },
    {
      mes: '2026-04',
      cerrado: true,
      conMovimiento: false,
      facturado: 0,
      facturas: 0,
      cobrado: 0,
      cobros: 0,
      // La deuda de arrastre: un mes sin movimiento la mantiene igual.
      deudaAlCierre: 595500,
    },
  ],
};

/** El ticket del doc, tal cual. Es el caso feliz de referencia. */
const TICKET = {
  mes: '2026-07',
  desde: '2026-07-01',
  hasta: '2026-07-31',
  cerrado: true,
  generadoEl: '2026-08-21',

  facturacion: {
    facturado: 367407.5,
    facturas: 13,
    ticketPromedio: 28262.12,
    clientes: 10,
    facturaMasAlta: 89000,
    anuladas: 1,
    montoAnulado: 73002.5,
  },

  cobranza: {
    cobrado: 22450,
    cobros: 1,
    clientes: 1,
    cobroPromedio: 22450,
    deEsteMes: 0,
    deMesesAnteriores: 22450,
    enTermino: 22450,
    fueraDeTermino: 0,
    cobradoEnAnuladas: 73002.5,
  },

  alCierre: {
    al: '2026-07-31',
    deuda: 1187218,
    vencido: 819810.5,
    porVencer: 367407.5,
    facturasImpagas: 30,
    facturasVencidas: 17,
    clientesConDeuda: 11,
    morosos: 4,
    vencimientoMasViejo: '2026-06-05',
    diasDelMasViejo: -56,
    variacionEnElMes: 344957.5,
  },

  clientes: { registrados: 0, nuevos: 7, compraron: 10, pagaron: 1 },

  comparacion: {
    mes: '2026-06',
    facturado: 608760.5,
    cobrado: 362000,
    variacionFacturado: -39.6,
    variacionCobrado: -93.8,
  },

  topClientes: [
    {
      clienteId: '76112d24-cdc2-4c91-9edc-b01ff667c83b',
      nombre: 'Mariana Ledesma',
      dni: '30999002',
      facturado: 97000,
      facturas: 2,
      cobrado: 0,
    },
  ],

  topProductos: [{ producto: 'Vestido de fiesta largo', cantidad: 1, monto: 89000, facturas: 1 }],
};

describe('ticketsMesesSchema', () => {
  it('acepta el listado del doc', () => {
    expect(ticketsMesesSchema.parse(MESES)).toEqual(MESES);
  });

  /**
   * Los meses vacíos vienen **a propósito**: si se saltearan, el listado
   * mostraría marzo pegado a junio como si fueran consecutivos. Y su deuda al
   * cierre puede ser alta igual — es la de arrastre.
   */
  it('no descarta los meses sin movimiento', () => {
    const listado = ticketsMesesSchema.parse(MESES);
    expect(listado.meses).toHaveLength(3);
    expect(listado.meses[2]?.conMovimiento).toBe(false);
    expect(listado.meses[2]?.deudaAlCierre).toBe(595500);
  });
});

describe('ticketSchema', () => {
  it('acepta el ticket del doc', () => {
    expect(ticketSchema.parse(TICKET)).toEqual(TICKET);
  });

  /**
   * Un mes sin movimiento: no se emitió ni se cobró nada y el mes anterior fue
   * cero, así que no hay promedio ni porcentaje que calcular. Si el schema los
   * exigiera, el ticket no se dibujaría justo en el mes más fácil de mirar.
   */
  it('acepta los nulos de un mes sin movimiento', () => {
    const vacio = {
      ...TICKET,
      facturacion: { ...TICKET.facturacion, ticketPromedio: null, facturaMasAlta: null },
      cobranza: { ...TICKET.cobranza, cobroPromedio: null },
      alCierre: { ...TICKET.alCierre, vencimientoMasViejo: null, diasDelMasViejo: null },
      comparacion: { ...TICKET.comparacion, variacionFacturado: null, variacionCobrado: null },
      topClientes: [],
      topProductos: [],
    };

    expect(() => ticketSchema.parse(vacio)).not.toThrow();
  });

  /** La deuda puede bajar en el mes: ahí `variacionEnElMes` viene negativa. */
  it('acepta una deuda que bajó en el mes', () => {
    const bajo = {
      ...TICKET,
      alCierre: { ...TICKET.alCierre, variacionEnElMes: -120000 },
    };

    expect(ticketSchema.parse(bajo).alCierre.variacionEnElMes).toBe(-120000);
  });

  it('rechaza un mes que no tiene la forma de la API', () => {
    expect(() => ticketSchema.parse({ ...TICKET, mes: '2026-7' })).toThrow();
  });
});

describe('direccionVariacion', () => {
  /**
   * `null` **no es** "quedó igual": es que no hay con qué comparar. Si los dos
   * cayeran en el mismo caso, un mes sin comparación se leería como un mes
   * planchado.
   */
  it('sin dato no es lo mismo que sin cambios', () => {
    expect(direccionVariacion(null)).toBe(DireccionesVariacion.SIN_DATO);
    expect(direccionVariacion(0)).toBe(DireccionesVariacion.IGUAL);
  });

  it('el signo dice para dónde fue', () => {
    expect(direccionVariacion(12.4)).toBe(DireccionesVariacion.SUBE);
    expect(direccionVariacion(-39.6)).toBe(DireccionesVariacion.BAJA);
  });
});

describe('magnitudVariacion', () => {
  /** El signo lo dice la flecha: repetirlo en el número lo lee dos veces. */
  it('muestra cuánto cambió, sin el signo', () => {
    expect(magnitudVariacion(-39.6, FormatosVariacion.PORCENTAJE)).toBe('39,6 %');
    expect(magnitudVariacion(344957.5, FormatosVariacion.MONTO)).toBe('$344.957,50');
    expect(magnitudVariacion(-120000, FormatosVariacion.MONTO)).toBe('$120.000,00');
  });

  it('sin comparación sale como raya', () => {
    expect(magnitudVariacion(null, FormatosVariacion.PORCENTAJE)).toBe('—');
  });
});

describe('textoVariacion', () => {
  it('dice en palabras lo que la flecha muestra', () => {
    expect(textoVariacion(-39.6, FormatosVariacion.PORCENTAJE)).toBe('39,6 % menos');
    expect(textoVariacion(12.4, FormatosVariacion.PORCENTAJE)).toBe('12,4 % más');
    expect(textoVariacion(344957.5, FormatosVariacion.MONTO)).toBe('$344.957,50 más');
  });

  /**
   * La trampa del §5.3: si el mes anterior fue cero no hay porcentaje que
   * calcular. De cero a un millón no es "un 100 % más".
   */
  it('null es "sin comparación", nunca 0 %', () => {
    expect(textoVariacion(null, FormatosVariacion.PORCENTAJE)).toBe('Sin comparación');
    expect(textoVariacion(0, FormatosVariacion.PORCENTAJE)).toBe('Sin cambios');
  });
});

describe('textoComparacion', () => {
  it('nombra el mes contra el que se compara', () => {
    expect(textoComparacion(-39.6, '2026-06')).toBe('39,6 % menos que en junio');
    expect(textoComparacion(12.4, '2026-06')).toBe('12,4 % más que en junio');
  });

  /** Sin comparación la frase cambia entera: "sin comparación que en junio" no
   * se entiende. */
  it('sin comparación lo dice de otra manera', () => {
    expect(textoComparacion(null, '2026-06')).toBe('Sin comparación con junio');
  });
});

describe('textoCantidad', () => {
  it('concuerda el singular', () => {
    expect(textoCantidad(1)).toBe('1 unidad');
    expect(textoCantidad(2)).toBe('2 unidades');
  });
});

describe('textoDelMasViejo al corte', () => {
  /**
   * En el ticket de julio los días se cuentan contra el 31 de julio, no contra
   * hoy: "venció hace 56 días" se leería en presente y sería otro número.
   */
  it('en una foto vieja no habla en presente', () => {
    expect(textoDelMasViejo(-56, { alCorte: true })).toBe('La más vieja llevaba 56 días vencida');
    expect(textoDelMasViejo(-1, { alCorte: true })).toBe('La más vieja llevaba 1 día vencida');
  });

  it('sin vencidas sigue sin decir nada', () => {
    expect(textoDelMasViejo(null, { alCorte: true })).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// La ficha del cliente
// ─────────────────────────────────────────────────────────────

/**
 * La respuesta del doc, tal cual. Es **el caso de manual**: Ricardo nunca dejó
 * de pagar (`sinPagar: 0`) y aun así cumple 20 %, porque de cinco exigibles
 * pagó cuatro tarde.
 */
const FICHA = {
  hoy: '2026-08-21',

  cliente: {
    id: '6aa10954-cf08-4711-b7c1-643238970a3f',
    nombre: 'Ricardo Ramirez',
    dni: '36452185',
    email: 'ricardo@example.com',
    telefono: null,
    estado: 'activo',
    seLeFia: true,
    motivoSinFiado: null,
  },

  estado: 'pendiente',

  cumplimiento: {
    tasa: 20,
    exigibles: 5,
    enFecha: 1,
    tarde: 4,
    sinPagar: 0,
    demoraPromedio: 11.2,
    demoraCuandoSeAtrasa: 20.5,
    demoraMaxima: 49,
    // Hoy no debe nada vencido, así que no lleva atraso en curso.
    atrasoActual: null,
    comoPaga: 'se_atrasa',
  },

  facturas: { total: 6, activas: 1, vencidas: 0, pagadas: 5, anuladas: 0 },

  plata: {
    facturado: 633000,
    cobrado: 575000,
    deuda: 58000,
    vencido: 0,
    porVencer: 58000,
    ticketPromedio: 105500,
    vencimientoMasViejo: '2026-09-02',
    diasDelMasViejo: 12,
  },

  reembolsos: { hechos: 0, montoDevuelto: 0, pendientes: 0, aReembolsar: 0 },

  compras: {
    primeraCompra: '2026-06-03',
    ultimaCompra: '2026-08-19',
    diasSinComprar: 2,
    diasEntreCompras: 15,
    comprasPorMes: 2.31,
    antiguedadDias: 79,
  },
};

describe('fichaClienteSchema', () => {
  it('acepta la ficha del doc', () => {
    expect(fichaClienteSchema.parse(FICHA)).toEqual(FICHA);
  });

  /** `exigibles = enFecha + tarde + sinPagar`. Si no cierra, es un bug. */
  it('las tres patas suman las exigibles', () => {
    const { enFecha, tarde, sinPagar, exigibles } = fichaClienteSchema.parse(FICHA).cumplimiento;
    expect(enFecha + tarde + sinPagar).toBe(exigibles);
  });

  /**
   * El cliente que existe y **todavía no compró**. No es un `404`: la ficha
   * viene igual, en cero y en `null`. Si el schema exigiera estos campos, la
   * pantalla se rompería justo con el cliente recién creado.
   */
  it('acepta la ficha de un cliente que todavía no compró', () => {
    const nuevo = {
      ...FICHA,
      cliente: { ...FICHA.cliente, dni: null, email: null, estado: 'bloqueado' },
      estado: 'al_dia',
      cumplimiento: {
        tasa: null,
        exigibles: 0,
        enFecha: 0,
        tarde: 0,
        sinPagar: 0,
        demoraPromedio: null,
        demoraCuandoSeAtrasa: null,
        demoraMaxima: null,
        atrasoActual: null,
        comoPaga: 'sin_facturas',
      },
      facturas: { total: 0, activas: 0, vencidas: 0, pagadas: 0, anuladas: 0 },
      plata: {
        ...FICHA.plata,
        facturado: 0,
        cobrado: 0,
        deuda: 0,
        vencido: 0,
        porVencer: 0,
        ticketPromedio: null,
        vencimientoMasViejo: null,
        diasDelMasViejo: null,
      },
      compras: {
        primeraCompra: null,
        ultimaCompra: null,
        diasSinComprar: null,
        diasEntreCompras: null,
        comprasPorMes: null,
        antiguedadDias: null,
      },
    };

    expect(() => fichaClienteSchema.parse(nuevo)).not.toThrow();
  });

  it('rechaza una fecha que no tiene la forma de la API', () => {
    const roto = { ...FICHA, compras: { ...FICHA.compras, primeraCompra: '03/06/2026' } };
    expect(() => fichaClienteSchema.parse(roto)).toThrow();
  });

  /**
   * ⚠️ Un servidor que todavía **no se reinició** no manda los campos nuevos: no
   * llegan en `null`, llegan ausentes. Si el schema los exigiera, la ficha
   * entera dejaría de dibujarse justo durante un deploy.
   */
  it('acepta la respuesta de un servidor que todavía no manda los campos nuevos', () => {
    const { comoPaga: _forma, atrasoActual: _atraso, ...viejo } = FICHA.cumplimiento;
    const anterior = { ...FICHA, cumplimiento: viejo };

    const ficha = fichaClienteSchema.parse(anterior);
    expect(ficha.cumplimiento.atrasoActual ?? null).toBeNull();
    expect(textoAtrasoActual(ficha.cumplimiento.atrasoActual)).toBeNull();
  });
});

describe('comoPagaDe', () => {
  /** Lo que manda es lo que dice el backend: la regla vive de ese lado. */
  it('usa el campo de la API cuando viene', () => {
    expect(comoPagaDe(FICHA.cumplimiento, FICHA.facturas)).toBe(FormasDePagar.SE_ATRASA);
    expect(comoPagaDe(NUNCA_PAGO, FACTURAS_COLGADO)).toBe(FormasDePagar.NUNCA_PAGO);
  });

  /**
   * ⚠️ Un servidor que todavía no se reinició manda el campo **ausente**, no en
   * `null`. La ficha tiene que seguir dibujándose, y con el mismo orden de
   * preguntas que el backend: primero si hay algo que medir, después si pagó
   * alguna, y recién al final si las pagó tarde.
   */
  it('lo deduce igual si el campo todavía no llega', () => {
    const { comoPaga: _ignorado, ...sinCampo } = NUNCA_PAGO;
    expect(comoPagaDe(sinCampo, FACTURAS_COLGADO)).toBe(FormasDePagar.NUNCA_PAGO);

    const sinFacturas = { ...sinCampo, exigibles: 0, sinPagar: 0, tasa: null };
    expect(
      comoPagaDe(sinFacturas, { total: 0, activas: 0, vencidas: 0, pagadas: 0, anuladas: 0 }),
    ).toBe(FormasDePagar.SIN_FACTURAS);

    const sinVencer = { ...sinCampo, exigibles: 0, sinPagar: 0, tasa: null };
    expect(
      comoPagaDe(sinVencer, { total: 2, activas: 2, vencidas: 0, pagadas: 0, anuladas: 0 }),
    ).toBe(FormasDePagar.SIN_VENCIMIENTOS);
  });

  /**
   * El orden importa: preguntar por los atrasos antes que por los pagos es
   * exactamente el error que hacía ver impecable al que no pagó nunca.
   */
  it('sin pagos nunca dice que paga en fecha', () => {
    const { comoPaga: _ignorado, ...sinCampo } = NUNCA_PAGO;
    expect(comoPagaDe(sinCampo, FACTURAS_COLGADO)).not.toBe(FormasDePagar.SIEMPRE_EN_FECHA);
  });

  /** Una forma que esta versión no conoce no puede dejar la ficha en blanco. */
  it('una forma desconocida cae en el cálculo local', () => {
    const rara = { ...FICHA.cumplimiento, comoPaga: 'paga_en_especie' };
    expect(comoPagaDe(rara, FICHA.facturas)).toBe(FormasDePagar.SE_ATRASA);
  });
});

describe('textoComoPaga', () => {
  it('solo nombra los días en la rama que los tiene', () => {
    expect(textoComoPaga(FICHA.cumplimiento, FICHA.facturas)).toBe('Se atrasa 21 días');
    expect(textoComoPaga(NUNCA_PAGO, FACTURAS_COLGADO)).toBe('Nunca pagó una factura');
  });

  /** Ningún `NaN`: la cuenta nunca toca un campo que puede no estar. */
  it('nunca sale un NaN', () => {
    const sinDemora = { ...FICHA.cumplimiento, demoraCuandoSeAtrasa: null };
    expect(textoComoPaga(sinDemora, FICHA.facturas)).not.toContain('NaN');
    expect(resumenDeAtraso(sinDemora, FICHA.facturas)).not.toContain('NaN');
  });
});

describe('facturasEnCurso', () => {
  /**
   * Las que todavía están en fecha no entran en la tasa. Sin este número, la
   * cuenta no cierra contra las facturas que se ven en la cuenta corriente.
   */
  it('son las que tuvo menos las exigibles', () => {
    expect(facturasEnCurso(FICHA.cumplimiento, FICHA.facturas)).toBe(1);
  });

  it('nunca da negativo', () => {
    const raro = { ...FICHA.facturas, total: 3 };
    expect(facturasEnCurso(FICHA.cumplimiento, raro)).toBe(0);
  });
});

/**
 * El cliente del §5: **nunca pagó nada** y debe una factura que venció hace 45
 * días. Las tres demoras del historial le vienen en `null` igual que al cliente
 * impecable, y ahí está la trampa.
 */
const NUNCA_PAGO = {
  tasa: 0,
  exigibles: 1,
  enFecha: 0,
  tarde: 0,
  sinPagar: 1,
  demoraPromedio: null,
  demoraCuandoSeAtrasa: null,
  demoraMaxima: null,
  atrasoActual: 45,
  comoPaga: 'nunca_pago',
};

/** Sus facturas: una sola, vencida y sin pagar. */
const FACTURAS_COLGADO = { total: 1, activas: 1, vencidas: 1, pagadas: 0, anuladas: 0 };

describe('fichaClienteSchema · el atraso de hoy', () => {
  it('acepta la ficha del que nunca pagó y debe hace 45 días', () => {
    const colgado = {
      ...FICHA,
      estado: 'vencida',
      cumplimiento: NUNCA_PAGO,
      facturas: FACTURAS_COLGADO,
    };

    const ficha = fichaClienteSchema.parse(colgado);
    expect(ficha.cumplimiento.atrasoActual).toBe(45);
  });

  /** Es `plata.diasDelMasViejo` dado vuelta: allá falta, acá atraso. */
  it('el atraso se cuenta para arriba', () => {
    const ficha = fichaClienteSchema.parse(FICHA);
    // Sin nada vencido no hay atraso en curso, aunque falten días para vencer.
    expect(ficha.cumplimiento.atrasoActual).toBeNull();
    expect(ficha.plata.diasDelMasViejo).toBe(12);
  });
});

describe('resumenDeAtraso', () => {
  /**
   * ⚠️ El error que el doc marca en mayúsculas: **`null` no es "siempre en
   * fecha"**. El que nunca pagó nada tampoco tiene demoras que promediar, y
   * confundirlos deja al peor cliente posible mejor parado que a uno que se
   * atrasa dos días. Por eso el texto sale de `comoPaga`.
   */
  it('el que nunca pagó no queda como el que paga puntual', () => {
    expect(resumenDeAtraso(NUNCA_PAGO, FACTURAS_COLGADO)).toBe('Nunca pagó');

    const puntual = {
      ...FICHA.cumplimiento,
      comoPaga: 'siempre_en_fecha',
      demoraCuandoSeAtrasa: null,
      demoraMaxima: null,
    };
    expect(resumenDeAtraso(puntual, FICHA.facturas)).toBe('Nunca');
  });

  it('con atrasos dice cuánto', () => {
    expect(resumenDeAtraso(FICHA.cumplimiento, FICHA.facturas)).toBe('21 días');
  });
});

describe('textoAtrasoActual', () => {
  /**
   * Va **siempre que exista**, y aparte del historial: un cliente que siempre
   * pagó en fecha y esta vez se colgó tiene las dos cosas, y no se contradicen.
   */
  it('dice hace cuánto que está colgada', () => {
    expect(textoAtrasoActual(45)).toBe('Debe hace 45 días');
    expect(textoAtrasoActual(1)).toBe('Debe hace 1 día');
  });

  it('sin vencidas hoy no dice nada', () => {
    expect(textoAtrasoActual(null)).toBeNull();
  });
});

describe('textoVencimientoMasViejo', () => {
  /** Acá el número puede ser positivo: debe, pero todavía está en fecha. */
  it('dice si falta o si ya pasó', () => {
    expect(textoVencimientoMasViejo(12)).toBe('Vence en 12 días');
    expect(textoVencimientoMasViejo(1)).toBe('Vence mañana');
    expect(textoVencimientoMasViejo(0)).toBe('Vence hoy');
    expect(textoVencimientoMasViejo(-45)).toBe('Venció hace 45 días');
    expect(textoVencimientoMasViejo(-1)).toBe('Venció ayer');
  });

  it('sin deuda no dice nada', () => {
    expect(textoVencimientoMasViejo(null)).toBeNull();
  });
});

describe('aEstadoDeCuenta', () => {
  it('reconoce los cuatro estados de la cuenta corriente', () => {
    expect(aEstadoDeCuenta('vencida')).toBe(EstadosDeCuenta.VENCIDA);
    expect(aEstadoDeCuenta('al_dia')).toBe(EstadosDeCuenta.AL_DIA);
  });

  /** Un estado nuevo no rompe la pantalla ni inventa un color: no se dibuja. */
  it('lo que no conoce no lo pinta', () => {
    expect(aEstadoDeCuenta('incobrable')).toBeNull();
  });
});

describe('formatPromedio', () => {
  it('un decimal y coma', () => {
    expect(formatPromedio(2.31)).toBe('2,3');
    expect(formatPromedio(0)).toBe('0,0');
  });

  it('null sale como raya: no hay datos suficientes', () => {
    expect(formatPromedio(null)).toBe('—');
  });
});

// ─────────────────────────────────────────────────────────────
// La mercadería: qué se lleva cada cliente y qué se vendió en el mes
// ─────────────────────────────────────────────────────────────

describe('aTendencia', () => {
  it('reconoce las cinco del catálogo', () => {
    expect(aTendencia('parada')).toBe(Tendencias.PARADA);
    expect(aTendencia('nueva')).toBe(Tendencias.NUEVA);
  });

  /** Una tendencia nueva del backend no puede dejar la lista sin renglones. */
  it('lo que no conoce no lo pinta', () => {
    expect(aTendencia('explotando')).toBeNull();
  });
});

describe('textoDesdeLaUltima', () => {
  /**
   * ⚠️ Es hace cuánto que no lleva **esta especie**, no hace cuánto que no
   * compra: alguien puede haber comprado ayer y hace ocho meses que no lleva
   * vestidos.
   */
  it('concuerda el singular', () => {
    expect(textoDesdeLaUltima(0)).toBe('Hoy');
    expect(textoDesdeLaUltima(1)).toBe('Ayer');
    expect(textoDesdeLaUltima(90)).toBe('Hace 90 días');
  });
});

describe('la ficha con lo que se lleva', () => {
  const ESPECIE = {
    especieId: '8d01',
    nombre: 'Vestidos',
    cantidad: 4,
    monto: 214000,
    facturas: 4,
    participacion: 62.5,
    ultimaCompra: '2026-08-03',
    diasSinComprar: 18,
    reciente: { cantidad: 4, monto: 214000 },
    previo: { cantidad: 0, monto: 0 },
    variacionCantidad: null,
    variacionMonto: null,
    tendencia: 'nueva',
  };

  it('acepta el bloque de especies del cliente', () => {
    const conEspecies = { ...FICHA, especies: [ESPECIE] };
    expect(fichaClienteSchema.parse(conEspecies).especies).toHaveLength(1);
  });

  /** Un backend que todavía no lo manda no puede romper la ficha entera. */
  it('sigue andando sin el bloque', () => {
    expect(fichaClienteSchema.parse(FICHA).especies ?? []).toEqual([]);
  });
});

describe('el ticket con el ranking por especie', () => {
  const ESPECIE = {
    especieId: '24a1',
    nombre: 'Vestidos',
    cantidad: 4,
    monto: 214000,
    facturas: 4,
    clientes: 3,
  };

  it('acepta topEspecies', () => {
    const conEspecies = { ...TICKET, topEspecies: [ESPECIE] };
    expect(ticketSchema.parse(conEspecies).topEspecies).toHaveLength(1);
  });

  /** Es un ranking más, no la mitad del ticket: sin él, el ticket se dibuja. */
  it('sigue andando sin él', () => {
    expect(ticketSchema.parse(TICKET).topEspecies ?? []).toEqual([]);
  });
});
