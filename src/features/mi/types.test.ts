import {
  aInformarPagoPayload,
  aTendencia,
  crearInformarPagoSchema,
  cuandoVence,
  esMiFacturaAnulada,
  ESTADO_DE_MI_CUENTA,
  formatParticipacion,
  formatVariacion,
  miAvisoDePagoSchema,
  miCuentaSchema,
  miFacturaSchema,
  misComprasSchema,
  misFacturasPaginaSchema,
  puedoAvisarPago,
  seAnotoDistinto,
  sinCompras,
  sinFacturas,
  textoDeLaAnulada,
  textoDesdeLaUltima,
  Tendencias,
  yaInformadoDe,
  type InformarPagoFormValues,
  type MiAvisoDePago,
  type MiFactura,
} from './types';

/**
 * Los payloads son los del `docs/user_cliente_flujo.md`, copiados tal cual: si
 * el backend cambia una forma, el test tiene que romper acá y no en producción.
 */

// ─────────────────────────────────────────────────────────────
// GET /mi/cuenta (§4)
// ─────────────────────────────────────────────────────────────
const cuenta = {
  facturas: 23,
  facturasImpagas: 5,
  totalFacturado: 1610300,
  totalPagado: 1357850,
  deuda: 252450,
  vencido: 67550,
  porVencer: 184900,
  aReembolsar: 0,
  proximoVencimiento: '2026-08-07',
  diasParaVencer: -14,
  estado: 'vencida',
};

describe('miCuentaSchema', () => {
  it('valida la respuesta real de la API', () => {
    expect(miCuentaSchema.safeParse(cuenta).success).toBe(true);
  });

  /**
   * ⚠️ `null` **no es cero**: es "no hay nada que vencer". La cuenta al día
   * llega con los dos campos en `null`, y la pantalla lee "estás al día" en vez
   * de mostrar una fecha vacía.
   */
  it('acepta la cuenta al día: sin vencimiento y sin días', () => {
    const alDia = {
      ...cuenta,
      facturasImpagas: 0,
      deuda: 0,
      vencido: 0,
      porVencer: 0,
      proximoVencimiento: null,
      diasParaVencer: null,
      estado: 'al_dia',
    };
    expect(miCuentaSchema.safeParse(alDia).success).toBe(true);
  });

  it('rechaza un estado que no está en el catálogo', () => {
    expect(miCuentaSchema.safeParse({ ...cuenta, estado: 'moroso' }).success).toBe(false);
  });

  /**
   * Es la invariante que el doc pide chequear (§14). No se recalcula en pantalla
   * —la resta la hace el servidor— pero acá se verifica que el payload de
   * referencia cierre.
   */
  it('vencido + porVencer = deuda', () => {
    const leida = miCuentaSchema.parse(cuenta);
    expect(leida.vencido + leida.porVencer).toBe(leida.deuda);
  });
});

describe('sinFacturas', () => {
  /**
   * "Estás al día" y "todavía no tenés facturas" son dos vacíos distintos, y
   * confundirlos hace creer que se perdieron las facturas (§15).
   */
  it('separa la cuenta sin historia de la cuenta al día', () => {
    const alDia = miCuentaSchema.parse({ ...cuenta, deuda: 0, estado: 'al_dia' });
    const nueva = miCuentaSchema.parse({
      ...cuenta,
      facturas: 0,
      facturasImpagas: 0,
      deuda: 0,
      proximoVencimiento: null,
      diasParaVencer: null,
      estado: 'al_dia',
    });

    expect(sinFacturas(alDia)).toBe(false);
    expect(sinFacturas(nueva)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /mi/facturas (§5)
// ─────────────────────────────────────────────────────────────
const pagina = {
  datos: [
    {
      id: 'ce5f8070-9329-4367-a9db-aee0d5b743f8',
      numero: 1070,
      fechaEmision: '2026-08-05',
      fechaFin: '2026-09-04',
      estado: 'pendiente',
      diasParaVencer: 14,
      total: 69200,
      pagado: 28500,
      saldo: 40700,
      anulada: false,
      aReembolsar: 0,
      items: 3,
      pagos: 1,
      detalle: '4× Pack 6 gaseosas 500ml +2',
    },
  ],
  total: 3,
  pagina: 1,
  limite: 20,
  paginas: 1,
};

describe('misFacturasPaginaSchema', () => {
  it('valida la respuesta real de la API', () => {
    expect(misFacturasPaginaSchema.safeParse(pagina).success).toBe(true);
  });

  /**
   * ⚠️ Sin resultados llega `paginas: 0`, **no 1**: no hay ninguna página que
   * mostrar. Es un `200`, no un `404`.
   */
  it('acepta la lista vacía con paginas en cero', () => {
    const vacia = { datos: [], total: 0, pagina: 1, limite: 20, paginas: 0 };
    expect(misFacturasPaginaSchema.safeParse(vacia).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /mi/facturas/:id (§6)
// ─────────────────────────────────────────────────────────────
const factura = {
  id: '571ced0b-6010-4612-b4e6-f71c6381229d',
  numero: 1069,
  fechaEmision: '2026-07-08',
  fechaFin: '2026-08-07',
  estado: 'pagada',
  diasParaVencer: -14,
  total: 68650,
  pagado: 68650,
  saldo: 0,
  pagadaEn: '2026-08-12',
  anulada: false,
  anuladaEn: null,
  aReembolsar: 0,
  reembolsado: false,
  notas: 'Entregar por la mañana',
  items: [
    {
      id: 'ebcb3400-7d75-4111-b7f1-acd6e1fc6bbb',
      producto: 'Bidón 20L',
      cantidad: 12,
      precioUnitario: 3250,
      subtotal: 39000,
      especie: { id: 'dd1436d7-0000-4000-8000-000000000000', nombre: 'Agua' },
    },
  ],
  pagos: [{ id: '2c860d73-0000-4000-8000-000000000000', monto: 68650, fecha: '2026-08-12' }],
};

describe('miFacturaSchema', () => {
  it('valida la respuesta real de la API', () => {
    expect(miFacturaSchema.safeParse(factura).success).toBe(true);
  });

  /**
   * La especie es la etiqueta con la que se agrupa el producto, y es la misma de
   * "qué compro": sin ella no se puede leer una pantalla con la otra.
   */
  it('cada renglón trae su especie', () => {
    const leida = miFacturaSchema.parse(factura);
    expect(leida.items[0].especie.nombre).toBe('Agua');
  });

  it('acepta la factura sin notas y sin pagos', () => {
    const pelada = { ...factura, notas: null, pagos: [], pagado: 0, saldo: 68650 };
    expect(miFacturaSchema.safeParse(pelada).success).toBe(true);
  });

  /**
   * ⚠️ El motivo de la anulación **no viene, y no es un olvido**: es una nota
   * escrita para adentro (§13). Si algún día aparece, Zod lo descarta.
   */
  it('descarta lo que el muro deja del otro lado', () => {
    const filtrado = miFacturaSchema.parse({
      ...factura,
      motivoAnulacion: 'le facturé al cliente equivocado',
      creadaPor: { email: 'admin@negocio.com' },
    });
    expect('motivoAnulacion' in filtrado).toBe(false);
    expect('creadaPor' in filtrado).toBe(false);
  });
});

/** Una anulada que ya se había cobrado: el caso que hay que contar bien. */
const anulada: MiFactura = miFacturaSchema.parse({
  ...factura,
  estado: 'anulada',
  saldo: 0,
  anulada: true,
  anuladaEn: '2026-08-15T10:00:00.000Z',
  aReembolsar: 21450,
  reembolsado: false,
});

describe('textoDeLaAnulada', () => {
  /**
   * ⚠️ Lo cobrado de una anulada es plata **a favor**: se muestra como que se
   * devuelve, nunca restando de la deuda.
   */
  it('con plata sin devolver dice cuánto te devuelven', () => {
    expect(textoDeLaAnulada(anulada)).toBe('Te devolvemos $21.450,00');
  });

  it('ya devuelta lo dice y no repite el número', () => {
    expect(textoDeLaAnulada({ ...anulada, aReembolsar: 0, reembolsado: true })).toBe(
      'Ya te lo devolvimos',
    );
  });

  it('sin cobros no dice nada: alcanza con el sello', () => {
    expect(textoDeLaAnulada({ ...anulada, aReembolsar: 0 })).toBeNull();
  });

  it('una factura viva no tiene texto de anulada', () => {
    expect(textoDeLaAnulada(miFacturaSchema.parse(factura))).toBeNull();
    expect(esMiFacturaAnulada(anulada)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// Los avisos de pago (§8 y §9)
// ─────────────────────────────────────────────────────────────
const aviso = {
  id: '3bd79309-7dda-458b-b938-d79a2b287ffb',
  estado: 'pendiente',
  monto: 30000,
  fecha: '2026-08-21',
  medio: 'transferencia',
  referencia: 'OP-88213345',
  nota: 'Pagué la mitad ahora',
  informadoEn: '2026-08-21T20:28:51.407Z',
  resueltoEn: null,
  motivoRechazo: null,
  montoCobrado: null,
  factura: {
    id: 'ce5f8070-9329-4367-a9db-aee0d5b743f8',
    numero: 1070,
    total: 69200,
    saldo: 69200,
    fechaFin: '2026-09-04',
  },
};

describe('miAvisoDePagoSchema', () => {
  it('valida la respuesta real del 201', () => {
    expect(miAvisoDePagoSchema.safeParse(aviso).success).toBe(true);
  });

  /**
   * ⚠️ `factura.saldo` sigue siendo el de antes: **el aviso no lo movió**. Es la
   * confirmación de que la pantalla no tiene que descontar nada.
   */
  it('el aviso llega con el saldo sin tocar', () => {
    const leido = miAvisoDePagoSchema.parse(aviso);
    expect(leido.factura.saldo).toBe(69200);
  });

  it('rechaza un medio que no está en el catálogo', () => {
    expect(miAvisoDePagoSchema.safeParse({ ...aviso, medio: 'bitcoin' }).success).toBe(false);
  });

  it('acepta el rechazado con su motivo', () => {
    const rechazado = {
      ...aviso,
      estado: 'rechazado',
      referencia: 'MP-99999',
      nota: null,
      resueltoEn: '2026-08-21T20:30:29.642Z',
      motivoRechazo: 'No figura ningún movimiento con esa referencia en Mercado Pago.',
    };
    expect(miAvisoDePagoSchema.safeParse(rechazado).success).toBe(true);
  });
});

describe('seAnotoDistinto', () => {
  /**
   * Dijo $30.000 y entraron $28.500: la diferencia es justamente lo que explica
   * por qué el saldo no bajó lo esperado, así que se muestran los dos.
   */
  it('avisa cuando lo anotado no es lo informado', () => {
    const confirmado = miAvisoDePagoSchema.parse({
      ...aviso,
      estado: 'confirmado',
      montoCobrado: 28500,
    });
    expect(seAnotoDistinto(confirmado)).toBe(true);
  });

  it('coincidiendo no hay nada que explicar', () => {
    const igual = miAvisoDePagoSchema.parse({
      ...aviso,
      estado: 'confirmado',
      montoCobrado: 30000,
    });
    expect(seAnotoDistinto(igual)).toBe(false);
  });

  it('sin resolver no se compara nada: `montoCobrado` es null', () => {
    expect(seAnotoDistinto(miAvisoDePagoSchema.parse(aviso))).toBe(false);
  });
});

describe('yaInformadoDe', () => {
  const otraFactura = { ...aviso.factura, id: 'otra-factura' };
  const avisos: MiAvisoDePago[] = [
    miAvisoDePagoSchema.parse(aviso),
    miAvisoDePagoSchema.parse({ ...aviso, id: 'b', monto: 5000 }),
    // Ya resuelto: no frena nada, la plata ya se anotó (o no).
    miAvisoDePagoSchema.parse({
      ...aviso,
      id: 'c',
      monto: 9999,
      estado: 'confirmado',
      montoCobrado: 9999,
    }),
    // De otra factura: no tiene nada que ver con esta.
    miAvisoDePagoSchema.parse({ ...aviso, id: 'd', monto: 7777, factura: otraFactura }),
  ];

  /**
   * ⚠️ **Lo informado y sin resolver cuenta como si estuviera cobrado.** Sin esa
   * regla, avisar tres veces el saldo entero pasaría las tres, y del otro lado
   * quedaría una bandeja con tres avisos de los que solo uno puede ser cierto.
   */
  it('suma solo los pendientes de esa factura', () => {
    expect(yaInformadoDe(avisos, aviso.factura.id)).toBe(35000);
  });

  it('sin avisos no hay nada informado', () => {
    expect(yaInformadoDe([], aviso.factura.id)).toBe(0);
  });
});

describe('puedoAvisarPago', () => {
  const impaga = miFacturaSchema.parse({ ...factura, saldo: 40700, pagado: 28500 });

  it('se puede con saldo y sin nada informado', () => {
    expect(puedoAvisarPago(impaga, 0)).toBe(true);
  });

  /** Las tres reglas del backend, traídas acá para no mostrar el botón. */
  it('no se puede en una anulada: no hay nada que pagar', () => {
    expect(puedoAvisarPago(anulada, 0)).toBe(false);
  });

  it('no se puede en una saldada', () => {
    expect(puedoAvisarPago(miFacturaSchema.parse(factura), 0)).toBe(false);
  });

  it('no se puede con todo el saldo ya informado', () => {
    expect(puedoAvisarPago(impaga, 40700)).toBe(false);
    expect(puedoAvisarPago(impaga, 30000)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// El formulario (§8)
// ─────────────────────────────────────────────────────────────
describe('crearInformarPagoSchema', () => {
  const schema = crearInformarPagoSchema(40700, '2026-07-08');
  const valores: InformarPagoFormValues = {
    monto: '40.700,00',
    medio: 'transferencia',
    fecha: '21/08/2026',
    referencia: 'OP-88213345',
    nota: '',
  };

  it('acepta el caso normal', () => {
    expect(schema.safeParse(valores).success).toBe(true);
  });

  it('rechaza más que el máximo: es `saldo − lo ya informado`', () => {
    const resultado = schema.safeParse({ ...valores, monto: '50.000,00' });
    expect(resultado.success).toBe(false);
  });

  it('rechaza el cero: un pago de nada no es un pago', () => {
    expect(schema.safeParse({ ...valores, monto: '0' }).success).toBe(false);
  });

  /**
   * La fecha es la del movimiento y la factura no existía antes de emitirse, así
   * que ese es el piso. El tope de hoy lo pone el calendario, que apaga los días
   * de más adelante.
   */
  it('rechaza una fecha anterior a la factura', () => {
    expect(schema.safeParse({ ...valores, fecha: '01/07/2026' }).success).toBe(false);
  });

  it('acepta el mismo día de la emisión', () => {
    expect(schema.safeParse({ ...valores, fecha: '08/07/2026' }).success).toBe(true);
  });

  it('rechaza un medio que no está en el catálogo', () => {
    expect(schema.safeParse({ ...valores, medio: 'bitcoin' }).success).toBe(false);
  });

  it('la referencia es opcional: se puede no tenerla', () => {
    expect(schema.safeParse({ ...valores, referencia: '' }).success).toBe(true);
  });
});

describe('aInformarPagoPayload', () => {
  const valores: InformarPagoFormValues = {
    monto: '30.000,00',
    medio: 'transferencia',
    fecha: '21/08/2026',
    referencia: 'OP-88213345',
    nota: 'Pagué la mitad ahora',
  };

  it('convierte el monto a número y la fecha a formato de API', () => {
    const { facturaId, datos } = aInformarPagoPayload('una-factura', valores);
    expect(facturaId).toBe('una-factura');
    expect(datos.monto).toBe(30000);
    expect(datos.fecha).toBe('2026-08-21');
  });

  /**
   * ⚠️ El body corre con `forbidNonWhitelisted`: **un campo de más es un `400`**,
   * no algo que se ignore en silencio. Por eso el id de la factura queda afuera
   * del body —va en la URL— y los opcionales vacíos se omiten en vez de viajar
   * en blanco.
   */
  it('no manda campos de más ni opcionales vacíos', () => {
    const { datos } = aInformarPagoPayload('una-factura', {
      ...valores,
      referencia: '   ',
      nota: '',
    });
    expect(Object.keys(datos).sort()).toEqual(['fecha', 'medio', 'monto']);
  });

  it('recorta los espacios de la referencia y la nota', () => {
    const { datos } = aInformarPagoPayload('una-factura', {
      ...valores,
      referencia: '  OP-1  ',
      nota: '  algo  ',
    });
    expect(datos.referencia).toBe('OP-1');
    expect(datos.nota).toBe('algo');
  });
});

// ─────────────────────────────────────────────────────────────
// GET /mi/compras (§10)
// ─────────────────────────────────────────────────────────────
const compras = {
  hoy: '2026-08-21',
  ventanaDias: 90,
  facturado: 1610300,
  compras: {
    primeraCompra: '2025-11-03',
    ultimaCompra: '2026-08-18',
    diasSinComprar: 3,
    diasEntreCompras: 13,
    comprasPorMes: 2.41,
    antiguedadDias: 291,
  },
  especies: [
    {
      especieId: '81c99a47-0000-4000-8000-000000000000',
      nombre: 'Gaseosa',
      cantidad: 131,
      monto: 460150,
      facturas: 8,
      participacion: 28.6,
      ultimaCompra: '2026-08-05',
      diasSinComprar: 16,
      reciente: { cantidad: 10, monto: 54700 },
      previo: { cantidad: 0, monto: 0 },
      variacionCantidad: null,
      variacionMonto: null,
      tendencia: 'sube',
    },
  ],
};

describe('misComprasSchema', () => {
  it('valida la respuesta real de la API', () => {
    expect(misComprasSchema.safeParse(compras).success).toBe(true);
  });

  /**
   * Cada `null` de `compras` significa algo distinto y ninguno es cero: una sola
   * factura no tiene intervalo que promediar, y menos de un mes de historia no
   * tiene "compras por mes".
   */
  it('acepta el historial con todo en null: recién empieza', () => {
    const nuevo = {
      ...compras,
      facturado: 0,
      compras: {
        primeraCompra: null,
        ultimaCompra: null,
        diasSinComprar: null,
        diasEntreCompras: null,
        comprasPorMes: null,
        antiguedadDias: null,
      },
      especies: [],
    };
    expect(misComprasSchema.safeParse(nuevo).success).toBe(true);
    expect(sinCompras(misComprasSchema.parse(nuevo))).toBe(true);
  });

  /**
   * ⚠️ La lista trae también **lo que dejó de llevar**, en cero y con `parada`.
   * Filtrarlo sería quedarse justo sin la mitad de para qué sirve la pantalla.
   */
  it('acepta una especie parada, en cero', () => {
    const parada = {
      ...compras,
      especies: [
        {
          ...compras.especies[0],
          reciente: { cantidad: 0, monto: 0 },
          previo: { cantidad: 12, monto: 30000 },
          variacionCantidad: -100,
          variacionMonto: -100,
          tendencia: 'parada',
        },
      ],
    };
    expect(misComprasSchema.safeParse(parada).success).toBe(true);
  });

  /**
   * Una tendencia nueva del backend no puede tirar abajo la lista: por eso viaja
   * como `string` y el chip se resuelve al dibujar.
   */
  it('una tendencia desconocida no rompe la lista, solo se queda sin chip', () => {
    const rara = {
      ...compras,
      especies: [{ ...compras.especies[0], tendencia: 'explota' }],
    };
    expect(misComprasSchema.safeParse(rara).success).toBe(true);
    expect(aTendencia('explota')).toBeNull();
    expect(aTendencia('parada')).toBe(Tendencias.PARADA);
  });
});

// ─────────────────────────────────────────────────────────────
// Cómo se lee cada número
// ─────────────────────────────────────────────────────────────
describe('cuandoVence', () => {
  /**
   * ⚠️ **Los días llevan signo y negativo ya venció.** Un `-14` que se lee
   * "quedan −14 días" es el error que el doc marca primero.
   */
  it('en negativo dice hace cuánto venció', () => {
    expect(cuandoVence(-14)).toBe('venció hace 14 días');
    expect(cuandoVence(-1)).toBe('venció hace 1 día');
  });

  it('el cero es el día de pagar, no un vencido', () => {
    expect(cuandoVence(0)).toBe('vence hoy');
  });

  it('en positivo dice cuánto falta', () => {
    expect(cuandoVence(3)).toBe('en 3 días');
    expect(cuandoVence(1)).toBe('en 1 día');
  });
});

describe('formatVariacion', () => {
  /**
   * ⚠️ **`null` no es 0 %**: es que en la ventana anterior no llevó ninguna, así
   * que no hay contra qué comparar. Para ese caso está el chip `nueva`, y pintar
   * un `0 %` o un `∞` ahí es un bug.
   */
  it('en null no devuelve nada, ni cero ni infinito', () => {
    expect(formatVariacion(null)).toBeNull();
  });

  it('lleva el signo adelante', () => {
    expect(formatVariacion(12.5)).toBe('+12,5 %');
    expect(formatVariacion(-8)).toBe('−8,0 %');
    expect(formatVariacion(0)).toBe('0,0 %');
  });
});

describe('formatParticipacion', () => {
  it('en null va una raya: no se puede calcular', () => {
    expect(formatParticipacion(null)).toBe('—');
  });

  it('con un decimal y coma', () => {
    expect(formatParticipacion(28.6)).toBe('28,6 %');
  });
});

describe('textoDesdeLaUltima', () => {
  it('habla en días, y el 0 y el 1 tienen su palabra', () => {
    expect(textoDesdeLaUltima(0)).toBe('Hoy');
    expect(textoDesdeLaUltima(1)).toBe('Ayer');
    expect(textoDesdeLaUltima(16)).toBe('Hace 16 días');
  });
});

describe('ESTADO_DE_MI_CUENTA', () => {
  /**
   * Es el mismo `estado` que ve el panel, dicho en segunda persona: el
   * encabezado del inicio es una frase, no una etiqueta de tablero.
   */
  it('le habla a quien debe', () => {
    expect(ESTADO_DE_MI_CUENTA.al_dia).toBe('Estás al día');
    expect(ESTADO_DE_MI_CUENTA.vencida).toBe('Tenés algo vencido');
  });
});
