import { enAniosPantalla, enDiasPantalla, hoyPantalla } from '@/shared/utils';
import {
  aNuevaFacturaPayload,
  aNuevoPagoPayload,
  clientesFacturadosPaginaSchema,
  crearNuevoPagoSchema,
  aAnularFacturaPayload,
  anularFacturaSchema,
  cuentaClienteSchema,
  esFacturaAnulada,
  EstadosCuenta,
  EstadosFactura,
  facturaSchema,
  nombreDeCliente,
  nombreDeEmisor,
  nuevaFacturaSchema,
  textoImpagas,
  textoVencimiento,
  type NuevaFacturaFormValues,
  type NuevoPagoFormValues,
} from './types';

/**
 * Un formulario válido, del que cada test cambia solo lo que le interesa.
 *
 * La fecha se calcula desde hoy y no se escribe fija: la regla del backend es
 * "hoy o más adelante", así que una fecha hardcodeada haría que el test empiece
 * a fallar solo el día que se la pase.
 */
const FORM: NuevaFacturaFormValues = {
  fechaFin: enDiasPantalla(30),
  notas: '',
  items: [
    // El caso normal: la especie se eligió del catálogo.
    {
      producto: 'Bidón 20L',
      cantidad: '3',
      precioUnitario: '19,99',
      especieId: '81c9a47e-6b26-425a-9b63-97c7d7bca19e',
      especieNombre: '',
    },
    // Y el otro: una que no existe todavía, escrita en el renglón.
    {
      producto: 'Alquiler dispenser',
      cantidad: '1',
      precioUnitario: '10,10',
      especieId: '',
      especieNombre: 'Alquiler',
    },
  ],
};

/** Un renglón válido suelto, del que cada caso cambia solo lo que le interesa. */
const ITEM = {
  producto: 'Bidón 20L',
  cantidad: '1',
  precioUnitario: '10',
  especieId: '81c9a47e-6b26-425a-9b63-97c7d7bca19e',
  especieNombre: '',
};

describe('nuevaFacturaSchema', () => {
  it('acepta una factura bien cargada', () => {
    expect(nuevaFacturaSchema.safeParse(FORM).success).toBe(true);
  });

  it('no deja que la factura nazca vencida', () => {
    // Es el mismo chequeo que hace el backend; validarlo acá ahorra el request y
    // marca el campo exacto.
    const resultado = nuevaFacturaSchema.safeParse({ ...FORM, fechaFin: enDiasPantalla(-1) });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(['fechaFin']);
  });

  it('acepta que venza hoy', () => {
    // El día del fin todavía se puede pagar: la regla es "hoy o más adelante".
    expect(nuevaFacturaSchema.safeParse({ ...FORM, fechaFin: enDiasPantalla(0) }).success).toBe(
      true,
    );
  });

  it('rechaza una fecha que no existe', () => {
    const resultado = nuevaFacturaSchema.safeParse({ ...FORM, fechaFin: '30/02/2099' });
    expect(resultado.success).toBe(false);
  });

  it('no deja estirar el vencimiento más de un año', () => {
    // Es la otra regla del backend, y casi siempre se choca por escribir mal el
    // año: `17/09/2036` en vez de `17/09/2026`.
    const resultado = nuevaFacturaSchema.safeParse({ ...FORM, fechaFin: enDiasPantalla(400) });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(['fechaFin']);
  });

  it('acepta justo el último día del año', () => {
    // El tope es inclusivo: "a lo sumo dentro de un año" incluye ese día.
    expect(nuevaFacturaSchema.safeParse({ ...FORM, fechaFin: enAniosPantalla(1) }).success).toBe(
      true,
    );
  });

  it('exige al menos un renglón', () => {
    expect(nuevaFacturaSchema.safeParse({ ...FORM, items: [] }).success).toBe(false);
  });

  it('exige producto, cantidad entera y precio con hasta dos decimales', () => {
    const sinProducto = { ...ITEM, producto: '  ' };
    const cantidadCero = { ...ITEM, cantidad: '0' };
    const cantidadDecimal = { ...ITEM, cantidad: '1,5' };
    const precioLargo = { ...ITEM, precioUnitario: '19,9999' };

    [sinProducto, cantidadCero, cantidadDecimal, precioLargo].forEach((item) => {
      expect(nuevaFacturaSchema.safeParse({ ...FORM, items: [item] }).success).toBe(false);
    });
  });

  it('acepta precio cero: la API admite 0 o más', () => {
    const gratis = { ...ITEM, producto: 'Bonificación', precioUnitario: '0' };
    expect(nuevaFacturaSchema.safeParse({ ...FORM, items: [gratis] }).success).toBe(true);
  });

  /**
   * La especie es **obligatoria y una sola** (`docs/flujo_especies.md` §5). Se
   * valida acá y no solo en el backend para marcar el renglón exacto en vez de
   * gastar un request que volvería con este mismo texto.
   */
  it('cada renglón necesita una especie', () => {
    const sinEspecie = { ...ITEM, especieId: '', especieNombre: '' };
    const resultado = nuevaFacturaSchema.safeParse({ ...FORM, items: [sinEspecie] });

    expect(resultado.success).toBe(false);
    // El error se cuelga del selector, que es donde se arregla.
    expect(resultado.error?.issues[0]?.path).toEqual(['items', 0, 'especieId']);
  });

  it('no deja mandar las dos formas juntas', () => {
    const dosEspecies = { ...ITEM, especieNombre: 'Gaseosa' };
    expect(nuevaFacturaSchema.safeParse({ ...FORM, items: [dosEspecies] }).success).toBe(false);
  });

  it('acepta una especie nueva escrita en el renglón', () => {
    const nueva = { ...ITEM, especieId: '', especieNombre: 'Cerveza' };
    expect(nuevaFacturaSchema.safeParse({ ...FORM, items: [nueva] }).success).toBe(true);
  });

  it('rechaza el nombre de una especie demasiado corto', () => {
    const corta = { ...ITEM, especieId: '', especieNombre: 'a' };
    expect(nuevaFacturaSchema.safeParse({ ...FORM, items: [corta] }).success).toBe(false);
  });
});

describe('aNuevaFacturaPayload', () => {
  it('manda el cliente en la URL y nunca en el body', () => {
    const payload = aNuevaFacturaPayload('cliente-1', FORM);

    expect(payload.clienteId).toBe('cliente-1');
    expect(payload.datos).not.toHaveProperty('clienteId');
  });

  it('convierte la fecha de pantalla al formato de la API', () => {
    const payload = aNuevaFacturaPayload('cliente-1', { ...FORM, fechaFin: '17/09/2099' });

    expect(payload.datos.fechaFin).toBe('2099-09-17');
  });

  it('convierte cada renglón a números', () => {
    const payload = aNuevaFacturaPayload('cliente-1', FORM);

    expect(payload.datos.items).toEqual([
      {
        producto: 'Bidón 20L',
        cantidad: 3,
        precioUnitario: 19.99,
        especieId: '81c9a47e-6b26-425a-9b63-97c7d7bca19e',
      },
      { producto: 'Alquiler dispenser', cantidad: 1, precioUnitario: 10.1, especie: 'Alquiler' },
    ]);
  });

  /**
   * ⚠️ **Una y solo una de las dos** (`docs/flujo_especies.md` §5). Mandar las
   * dos es un `400`: es un renglón que dice dos cosas distintas.
   */
  it('cada renglón manda una sola especie', () => {
    const payload = aNuevaFacturaPayload('cliente-1', FORM);

    expect(payload.datos.items[0]).not.toHaveProperty('especie');
    expect(payload.datos.items[1]).not.toHaveProperty('especieId');
  });

  it('NO manda subtotal, total ni fechaEmision: un campo de más es un 400', () => {
    const payload = aNuevaFacturaPayload('cliente-1', FORM);

    expect(payload.datos).not.toHaveProperty('total');
    // La emisión la pone el servidor, y los nombres viejos ya no existen.
    expect(payload.datos).not.toHaveProperty('fechaEmision');
    expect(payload.datos).not.toHaveProperty('periodoInicio');
    expect(payload.datos).not.toHaveProperty('periodoFin');
    payload.datos.items.forEach((item) => {
      expect(item).not.toHaveProperty('subtotal');
    });
  });

  it('omite las notas vacías en vez de mandarlas en blanco', () => {
    expect(aNuevaFacturaPayload('cliente-1', FORM).datos).not.toHaveProperty('notas');

    const conNotas = aNuevaFacturaPayload('cliente-1', { ...FORM, notas: '  Primera factura  ' });
    expect(conNotas.datos.notas).toBe('Primera factura');
  });

  it('respeta el orden de los renglones y deja repetir un producto', () => {
    const repetido = {
      ...FORM,
      items: [
        {
          producto: 'Bidón 20L',
          cantidad: '3',
          precioUnitario: '19,99',
          especieId: '81c9a47e-6b26-425a-9b63-97c7d7bca19e',
          especieNombre: '',
        },
        {
          producto: 'Bidón 20L',
          cantidad: '1',
          precioUnitario: '21,00',
          especieId: '81c9a47e-6b26-425a-9b63-97c7d7bca19e',
          especieNombre: '',
        },
      ],
    };

    const items = aNuevaFacturaPayload('cliente-1', repetido).datos.items;
    expect(items).toHaveLength(2);
    expect(items[0]?.precioUnitario).toBe(19.99);
    expect(items[1]?.precioUnitario).toBe(21);
  });
});

describe('facturaSchema', () => {
  /** La respuesta tal cual la documenta `docs/flujo_pagos.md` §4. */
  const RESPUESTA = {
    id: '87f9e23d-40f0-4be3-8f9c-d8868be72135',
    numero: 1,
    cliente: {
      id: '6aa10954-cf08-4711-b7c1-643238970a3f',
      displayName: 'Ana Pérez',
      email: 'ana@mail.com',
      dni: null,
    },
    fechaEmision: '2026-08-18',
    fechaFin: '2026-09-17',
    items: [
      {
        id: '9db8c31e-0de6-4f77-926b-582a0dae0126',
        producto: 'Bidón 20L',
        cantidad: 3,
        precioUnitario: 19.99,
        subtotal: 59.97,
      },
      {
        id: '4faae402-379d-4671-8e77-d4e27a3d153c',
        producto: 'Alquiler dispenser',
        cantidad: 1,
        precioUnitario: 10.1,
        subtotal: 10.1,
      },
    ],
    total: 70.07,
    pagado: 0,
    saldo: 70.07,
    pagos: [],
    estado: 'pendiente',
    pagadaEn: null,
    diasParaVencer: 30,
    aReembolsar: 0,
    reembolsadoEn: null,
    reembolsadoPor: null,
    notas: 'Primera factura',
    creadaPor: {
      id: 'a3eae1b4-8073-4d9c-9663-e76c70e3a382',
      displayName: 'Administrador',
      email: 'admin@mail.com',
    },
    createdAt: '2026-08-18T13:44:13.049Z',
  };

  it('valida la respuesta del 201', () => {
    const resultado = facturaSchema.safeParse(RESPUESTA);
    expect(resultado.success).toBe(true);
    expect(resultado.data?.total).toBe(70.07);
  });

  it('lee los cobros con su nota y quién los anotó', () => {
    const conPagos = {
      ...RESPUESTA,
      pagado: 500,
      saldo: 500,
      total: 1000,
      estado: 'vencida',
      diasParaVencer: -1,
      pagos: [
        {
          id: '9c1f0a2e-6d1b-4a0c-91d2-3f0a5b8c7d6e',
          monto: 500,
          fecha: '2026-09-05',
          nota: 'En efectivo',
          registradoPor: {
            id: 'a3eae1b4-8073-4d9c-9663-e76c70e3a382',
            displayName: 'Administrador',
            email: 'admin@mail.com',
          },
        },
      ],
    };
    const resultado = facturaSchema.safeParse(conPagos);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.pagos[0]?.monto).toBe(500);
    expect(resultado.data?.saldo).toBe(500);
  });

  it('exige estado, saldo y días: vienen en TODA factura', () => {
    // Ya no son opcionales: el doc de pagos los documenta en las cinco
    // respuestas que devuelven una factura. Si dejaran de llegar, es un cambio
    // de contrato y tiene que romper acá y no en la pantalla.
    const { estado, ...sinEstado } = RESPUESTA;
    const { saldo, ...sinSaldo } = RESPUESTA;

    expect(facturaSchema.safeParse(sinEstado).success).toBe(false);
    expect(facturaSchema.safeParse(sinSaldo).success).toBe(false);
  });

  it('lee una factura anulada con su motivo, quién y cuándo', () => {
    const anulada = {
      ...RESPUESTA,
      estado: 'anulada',
      saldo: 0,
      anuladaEn: '2026-08-19T14:52:03.118Z',
      motivoAnulacion: 'Precio mal tipeado: un cero de más',
      anuladaPor: { id: 'a-1', displayName: 'Administrador', email: 'admin@mail.com' },
    };
    const resultado = facturaSchema.safeParse(anulada);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.estado).toBe(EstadosFactura.ANULADA);
    expect(resultado.data?.motivoAnulacion).toBe('Precio mal tipeado: un cero de más');
  });

  it('lee una anulada que ya estaba cobrada: la plata queda para devolver', () => {
    // Se anula igual —el error se descubrió después de cobrar— y los cobros se
    // quedan anotados: esa plata entró de verdad. Lo que cambia es que deja de
    // contar y pasa a ser una devolución.
    const cobradaYAnulada = {
      ...RESPUESTA,
      estado: 'anulada',
      total: 15000,
      pagado: 15000,
      saldo: 0,
      aReembolsar: 15000,
      motivoAnulacion: 'Cliente equivocado',
      pagos: [{ id: 'p-1', monto: 15000, fecha: '2026-08-20', nota: null, registradoPor: null }],
    };
    const resultado = facturaSchema.safeParse(cobradaYAnulada);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.aReembolsar).toBe(15000);
    // Los cobros no se borran: son el registro de lo que hay que devolver.
    expect(resultado.data?.pagos).toHaveLength(1);
  });

  it('lee la marca de que la plata ya se devolvió', () => {
    const devuelta = {
      ...RESPUESTA,
      estado: 'anulada',
      aReembolsar: 0,
      reembolsadoEn: '2026-08-21T10:00:00.000Z',
      reembolsadoPor: { id: 'a-1', displayName: 'Administrador', email: 'admin@mail.com' },
    };
    const resultado = facturaSchema.safeParse(devuelta);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.aReembolsar).toBe(0);
    expect(resultado.data?.reembolsadoPor?.displayName).toBe('Administrador');
  });

  it('exige aReembolsar: llega en toda factura, en cero cuando no hay nada', () => {
    const { aReembolsar, ...sinCampo } = RESPUESTA;
    expect(facturaSchema.safeParse(sinCampo).success).toBe(false);
  });

  it('no exige los datos de la baja en una factura vigente', () => {
    // Solo llegan en las anuladas: pedirlos rompería toda factura normal.
    const resultado = facturaSchema.safeParse(RESPUESTA);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.motivoAnulacion).toBeUndefined();
  });

  it('acepta un pago sin nota y sin quién lo anotó', () => {
    // La nota es opcional y `registradoPor` queda null si esa cuenta se borró.
    const conPagoPelado = {
      ...RESPUESTA,
      pagos: [{ id: 'p-1', monto: 70.07, fecha: '2026-08-20', nota: null, registradoPor: null }],
      pagado: 70.07,
      saldo: 0,
      estado: 'pagada',
      pagadaEn: '2026-08-20',
    };

    expect(facturaSchema.safeParse(conPagoPelado).success).toBe(true);
  });

  it('tolera que no se sepa quién la emitió', () => {
    // `creadaPor` queda null si esa cuenta se borró.
    expect(facturaSchema.safeParse({ ...RESPUESTA, creadaPor: null }).success).toBe(true);
  });

  it('rechaza una fecha imposible', () => {
    expect(facturaSchema.safeParse({ ...RESPUESTA, fechaFin: '2026-02-30' }).success).toBe(false);
  });
});

describe('nombreDeCliente', () => {
  it('usa el nombre, y si no hay, lo que identifica a la cuenta', () => {
    const base = { id: 'c-1', displayName: null, email: null, dni: null };

    expect(nombreDeCliente({ ...base, displayName: 'Ana Pérez' })).toBe('Ana Pérez');
    expect(nombreDeCliente({ ...base, email: 'ana@mail.com' })).toBe('ana@mail.com');
    expect(nombreDeCliente({ ...base, dni: '38180903' })).toBe('38180903');
    expect(nombreDeCliente(base)).toBe('Sin nombre');
  });
});

describe('clientesFacturadosPaginaSchema', () => {
  /** La respuesta tal cual la documenta `docs/flujo_pagos.md` §3. */
  const PAGINA = {
    datos: [
      {
        clienteId: '6aa10954-cf08-4711-b7c1-643238970a3f',
        nombre: 'Elena Ruiz',
        dni: '30111005',
        deuda: 30000,
        totalFacturado: 58200,
        totalPagado: 28200,
        facturas: 3,
        facturasImpagas: 2,
        vencimientoMasViejo: '2026-09-23',
        diasParaVencer: 36,
        estado: 'pendiente',
      },
    ],
    total: 11,
    pagina: 1,
    limite: 20,
    paginas: 1,
    totales: { deuda: 117415.75, vencido: 28862.75, porVencer: 88553 },
  };

  it('valida el tablero documentado', () => {
    const resultado = clientesFacturadosPaginaSchema.safeParse(PAGINA);

    expect(resultado.success).toBe(true);
    // Ojo con los dos `total`: el de afuera son clientes, la `deuda` es plata.
    expect(resultado.data?.total).toBe(11);
    expect(resultado.data?.datos[0]?.deuda).toBe(30000);
    expect(resultado.data?.datos[0]?.estado).toBe(EstadosCuenta.PENDIENTE);
  });

  it('lee los totales del filtro entero, que es lo que va en el encabezado', () => {
    // No se suman los renglones de la página: serían solo los ocho que se ven.
    const resultado = clientesFacturadosPaginaSchema.safeParse(PAGINA);

    expect(resultado.data?.totales.deuda).toBe(117415.75);
    expect(resultado.data?.totales.vencido).toBe(28862.75);
  });

  it('exige los totales: sin ellos el encabezado mentiría', () => {
    const { totales, ...sinTotales } = PAGINA;
    expect(clientesFacturadosPaginaSchema.safeParse(sinTotales).success).toBe(false);
  });

  it('acepta al cliente al día: sin deuda no hay vencimiento que contar', () => {
    const alDia = {
      ...PAGINA,
      datos: [
        {
          ...PAGINA.datos[0],
          deuda: 0,
          facturasImpagas: 0,
          vencimientoMasViejo: null,
          diasParaVencer: null,
          estado: 'al_dia',
        },
      ],
    };
    const resultado = clientesFacturadosPaginaSchema.safeParse(alDia);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.datos[0]?.estado).toBe(EstadosCuenta.AL_DIA);
  });

  it('rechaza "pagada": una persona no está pagada, está al día', () => {
    // Es el estado de una FACTURA. Mandarlo en el query param del tablero es un
    // `400`, así que tampoco puede entrar por la respuesta.
    const raro = { ...PAGINA, datos: [{ ...PAGINA.datos[0], estado: 'pagada' }] };
    expect(clientesFacturadosPaginaSchema.safeParse(raro).success).toBe(false);
  });

  it('rechaza un estado que la app no conoce', () => {
    // Acá sí conviene ser estricto: el `estado` decide qué chip se pinta y qué
    // valor se manda en el filtro. Un slug nuevo tiene que romper en la
    // validación y no dibujarse como una etiqueta vacía.
    const raro = { ...PAGINA, datos: [{ ...PAGINA.datos[0], estado: 'anulada' }] };
    expect(clientesFacturadosPaginaSchema.safeParse(raro).success).toBe(false);
  });

  it('acepta el cliente sin DNI', () => {
    // Las cuentas de Google o de email no tienen documento.
    const sinDni = { ...PAGINA, datos: [{ ...PAGINA.datos[0], dni: null }] };
    expect(clientesFacturadosPaginaSchema.safeParse(sinDni).success).toBe(true);
  });

  it('acepta el tablero vacío: sin facturas es un 200, no un 404', () => {
    const vacio = {
      datos: [],
      total: 0,
      pagina: 1,
      limite: 20,
      paginas: 0,
      totales: { deuda: 0, vencido: 0, porVencer: 0 },
    };
    expect(clientesFacturadosPaginaSchema.safeParse(vacio).success).toBe(true);
  });
});

describe('textoVencimiento', () => {
  it('traduce los días que manda el backend', () => {
    // Se usa `diasParaVencer` y no la fecha del dispositivo: el estado lo calcula
    // el servidor con SU reloj, y un celular con la fecha corrida diría "vence
    // mañana" al lado de un chip que dice "vencida".
    expect(textoVencimiento(EstadosFactura.PENDIENTE, 8)).toBe('Vence en 8 días');
    expect(textoVencimiento(EstadosFactura.PROXIMA_A_VENCER, 1)).toBe('Vence mañana');
    expect(textoVencimiento(EstadosFactura.PROXIMA_A_VENCER, 0)).toBe('Vence hoy');
    expect(textoVencimiento(EstadosFactura.VENCIDA, -1)).toBe('Venció ayer');
    expect(textoVencimiento(EstadosFactura.VENCIDA, -18)).toBe('Venció hace 18 días');
  });

  it('en una pagada no dice nada: el vencimiento ya no es un aviso', () => {
    expect(textoVencimiento(EstadosFactura.PAGADA, -30)).toBeNull();
  });

  it('sirve igual para la cuenta de un cliente', () => {
    // La cuenta muestra el vencimiento de su factura impaga más urgente: es el
    // mismo cartel, así que es la misma función.
    expect(textoVencimiento(EstadosCuenta.VENCIDA, -45)).toBe('Venció hace 45 días');
    expect(textoVencimiento(EstadosCuenta.PENDIENTE, 36)).toBe('Vence en 36 días');
  });

  it('un cliente al día no tiene vencimiento que contar', () => {
    // Sin nada impago, `vencimientoMasViejo` y `diasParaVencer` llegan en `null`.
    expect(textoVencimiento(EstadosCuenta.AL_DIA, null)).toBeNull();
    expect(textoVencimiento(EstadosCuenta.PENDIENTE, null)).toBeNull();
    expect(textoVencimiento(EstadosCuenta.PENDIENTE, undefined)).toBeNull();
  });
});

describe('crearNuevoPagoSchema', () => {
  const PAGO: NuevoPagoFormValues = { monto: '500', fecha: hoyPantalla(), nota: 'En efectivo' };

  it('acepta un cobro bien cargado', () => {
    expect(crearNuevoPagoSchema(1000).safeParse(PAGO).success).toBe(true);
  });

  it('acepta cobrar exactamente el saldo: es el caso normal', () => {
    expect(crearNuevoPagoSchema(500).safeParse(PAGO).success).toBe(true);
  });

  it('no deja que un pago supere el saldo de su factura', () => {
    // Si el cliente trae plata para tres facturas, son tres pagos: a qué factura
    // se imputó cada peso es un dato que después nadie puede reconstruir.
    const resultado = crearNuevoPagoSchema(300).safeParse(PAGO);

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.path).toEqual(['monto']);
  });

  it('rechaza el cero y los negativos: eso no es un cobro', () => {
    expect(crearNuevoPagoSchema(1000).safeParse({ ...PAGO, monto: '0' }).success).toBe(false);
    expect(crearNuevoPagoSchema(1000).safeParse({ ...PAGO, monto: '-50' }).success).toBe(false);
  });

  it('rechaza más de dos decimales en vez de redondear en silencio', () => {
    // La API contesta `El monto admite hasta dos decimales.`; mejor decirlo en el
    // campo que gastar un request para enterarse.
    expect(crearNuevoPagoSchema(1000).safeParse({ ...PAGO, monto: '10,5555' }).success).toBe(false);
  });

  it('deja la nota vacía: es opcional', () => {
    expect(crearNuevoPagoSchema(1000).safeParse({ ...PAGO, nota: '' }).success).toBe(true);
  });

  it('rechaza una fecha de cobro que no existe', () => {
    expect(crearNuevoPagoSchema(1000).safeParse({ ...PAGO, fecha: '30/02/2026' }).success).toBe(
      false,
    );
  });
});

describe('aNuevoPagoPayload', () => {
  it('manda la factura en la URL y el monto como número', () => {
    const payload = aNuevoPagoPayload('f-1', {
      monto: '1.000,50',
      fecha: '05/09/2026',
      nota: 'En efectivo',
    });

    expect(payload.facturaId).toBe('f-1');
    expect(payload.datos).toEqual({ monto: 1000.5, fecha: '2026-09-05', nota: 'En efectivo' });
  });

  it('omite la nota vacía en vez de mandarla en blanco', () => {
    const payload = aNuevoPagoPayload('f-1', { monto: '500', fecha: '05/09/2026', nota: '   ' });

    expect(payload.datos.nota).toBeUndefined();
  });
});

describe('nombreDeEmisor', () => {
  it('tolera no saber quién fue: la cuenta se pudo borrar', () => {
    expect(nombreDeEmisor({ id: 'a-1', displayName: 'Administrador', email: 'a@mail.com' })).toBe(
      'Administrador',
    );
    expect(nombreDeEmisor({ id: 'a-1', displayName: null, email: 'a@mail.com' })).toBe(
      'a@mail.com',
    );
    expect(nombreDeEmisor(null)).toBe('Cuenta eliminada');
  });
});

describe('cuentaClienteSchema', () => {
  /**
   * Un renglón de la lista, tal como lo documenta `docs/flujo_pagos.md` §4.
   *
   * ⚠️ Es **liviano**: `items` y `pagos` son CUÁNTOS tiene, no las listas, y
   * `detalle` es la línea para reconocer la factura. Sobre las mismas facturas
   * pesa un 66% menos que devolverlas enteras.
   */
  const RENGLON = {
    id: '87f9e23d-40f0-4be3-8f9c-d8868be72135',
    numero: 25,
    fechaEmision: '2026-08-19',
    fechaFin: '2026-09-18',
    estado: 'pendiente',
    diasParaVencer: 30,
    total: 30000,
    pagado: 0,
    saldo: 30000,
    items: 1,
    pagos: 0,
    detalle: '1× Alfajor Guaymallén x34',
  };

  const CUENTA = {
    cliente: {
      id: 'c-1',
      nombre: 'Elena Ruiz',
      displayName: 'Elena Ruiz',
      email: 'elena.ruiz@mail.com',
      dni: '30111005',
    },
    resumen: {
      facturas: 5,
      facturasAnuladas: 1,
      facturasImpagas: 3,
      totalFacturado: 113200,
      totalPagado: 53200,
      deuda: 60000,
      aReembolsar: 73002.5,
      vencimientoMasViejo: '2026-09-18',
      diasParaVencer: 30,
      estado: 'pendiente',
    },
    facturas: [RENGLON],
    total: 5,
    pagina: 1,
    limite: 20,
    paginas: 1,
  };

  it('valida la cuenta documentada', () => {
    const resultado = cuentaClienteSchema.safeParse(CUENTA);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.resumen.deuda).toBe(60000);
    expect(resultado.data?.cliente.nombre).toBe('Elena Ruiz');
  });

  it('lee el renglón liviano: los conteos son números, no listas', () => {
    // Si el backend volviera a mandar los arrays, esto rompe acá y no en la
    // pantalla, que es donde se querría `factura.items.length`.
    const resultado = cuentaClienteSchema.safeParse(CUENTA);

    expect(resultado.data?.facturas[0]?.items).toBe(1);
    expect(resultado.data?.facturas[0]?.pagos).toBe(0);
    expect(resultado.data?.facturas[0]?.detalle).toBe('1× Alfajor Guaymallén x34');
  });

  it('rechaza el renglón con los arrays de la versión anterior', () => {
    const viejo = {
      ...CUENTA,
      facturas: [{ ...RENGLON, items: [{ producto: 'Bidón' }], pagos: [] }],
    };
    expect(cuentaClienteSchema.safeParse(viejo).success).toBe(false);
  });

  it('lee el renglón anulado: trae el motivo y el saldo en cero', () => {
    // Se sigue mostrando en la lista —anular no es borrar— pero apagado y sin
    // deuda: dejó de contar.
    const conAnulada = {
      ...CUENTA,
      facturas: [
        {
          ...RENGLON,
          estado: 'anulada',
          saldo: 0,
          motivoAnulacion: 'Cliente equivocado',
        },
      ],
    };
    const resultado = cuentaClienteSchema.safeParse(conAnulada);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.facturas[0]?.motivoAnulacion).toBe('Cliente equivocado');
    expect(resultado.data?.facturas[0]?.saldo).toBe(0);
  });

  it('suma en el resumen lo que hay que devolverle al cliente', () => {
    // Va para el otro lado que la deuda: es lo que VOS le debés, de facturas que
    // se anularon después de cobradas.
    const resultado = cuentaClienteSchema.safeParse(CUENTA);

    expect(resultado.data?.resumen.aReembolsar).toBe(73002.5);
  });

  it('acepta el renglón con y sin `aReembolsar`', () => {
    // El doc lo describe en prosa pero no está en el ejemplo del renglón: si un
    // día no llega, la lista se dibuja igual.
    const conDevolucion = {
      ...CUENTA,
      facturas: [{ ...RENGLON, estado: 'anulada', saldo: 0, aReembolsar: 15000 }],
    };

    expect(cuentaClienteSchema.safeParse(conDevolucion).success).toBe(true);
    expect(cuentaClienteSchema.safeParse(CUENTA).success).toBe(true);
  });

  it('cuenta las anuladas aparte de las vigentes', () => {
    // "5 facturas, 1 anulada": los números tienen que cerrar con la lista, y las
    // anuladas no suman a lo facturado ni a la deuda.
    const resultado = cuentaClienteSchema.safeParse(CUENTA);

    expect(resultado.data?.resumen.facturas).toBe(5);
    expect(resultado.data?.resumen.facturasAnuladas).toBe(1);
  });

  it('el resumen es de la cuenta entera, aunque la lista venga filtrada', () => {
    // Cinco facturas en la cuenta y una sola en esta página: la deuda de arriba
    // sigue siendo la de todo. Filtrar no puede cambiar cuánto debe el cliente.
    const resultado = cuentaClienteSchema.safeParse(CUENTA);

    expect(resultado.data?.total).toBe(5);
    expect(resultado.data?.facturas).toHaveLength(1);
    expect(resultado.data?.resumen.facturas).toBe(5);
  });

  it('acepta la cuenta al día: sin deuda no hay vencimiento', () => {
    const alDia = {
      ...CUENTA,
      resumen: {
        ...CUENTA.resumen,
        deuda: 0,
        facturasImpagas: 0,
        vencimientoMasViejo: null,
        diasParaVencer: null,
        estado: 'al_dia',
      },
    };

    expect(cuentaClienteSchema.safeParse(alDia).success).toBe(true);
  });

  it('acepta la página vacía: un filtro sin resultados es un 200', () => {
    const vacia = { ...CUENTA, facturas: [], total: 0, paginas: 0 };
    expect(cuentaClienteSchema.safeParse(vacia).success).toBe(true);
  });
});

describe('textoImpagas', () => {
  it('dice cuántas faltan sobre el total: "2 impagas" solo no ubica', () => {
    expect(textoImpagas({ facturas: 3, facturasImpagas: 2 })).toBe('2 de 3 impagas');
    expect(textoImpagas({ facturas: 1, facturasImpagas: 1 })).toBe('1 de 1 impagas');
  });

  it('sin impagas no habla de deuda', () => {
    expect(textoImpagas({ facturas: 3, facturasImpagas: 0 })).toBe('3 facturas, saldadas');
    expect(textoImpagas({ facturas: 1, facturasImpagas: 0 })).toBe('1 factura, saldada');
  });

  it('suma las anuladas para que los números cierren con la lista', () => {
    expect(textoImpagas({ facturas: 5, facturasImpagas: 3, facturasAnuladas: 1 })).toBe(
      '3 de 5 impagas, 1 anulada',
    );
    expect(textoImpagas({ facturas: 2, facturasImpagas: 0, facturasAnuladas: 2 })).toBe(
      '2 facturas, saldadas, 2 anuladas',
    );
    // Sin anuladas no se menciona: un ", 0 anuladas" es ruido.
    expect(textoImpagas({ facturas: 5, facturasImpagas: 3, facturasAnuladas: 0 })).toBe(
      '3 de 5 impagas',
    );
  });
});

describe('anulación', () => {
  it('exige un motivo de verdad: es lo que explica el número que falta', () => {
    // El backend contesta `Contá en una línea por qué se anula.`; validarlo acá
    // ahorra el request y marca el campo.
    expect(anularFacturaSchema.safeParse({ motivo: '' }).success).toBe(false);
    expect(anularFacturaSchema.safeParse({ motivo: 'ab' }).success).toBe(false);
    expect(anularFacturaSchema.safeParse({ motivo: '   x   ' }).success).toBe(false);
    expect(anularFacturaSchema.safeParse({ motivo: 'Precio mal tipeado' }).success).toBe(true);
  });

  it('corta en 300 caracteres', () => {
    expect(anularFacturaSchema.safeParse({ motivo: 'x'.repeat(300) }).success).toBe(true);
    expect(anularFacturaSchema.safeParse({ motivo: 'x'.repeat(301) }).success).toBe(false);
  });

  it('manda la factura en la URL y el motivo sin espacios de los costados', () => {
    const payload = aAnularFacturaPayload('f-1', { motivo: '  Cliente equivocado  ' });

    expect(payload).toEqual({ facturaId: 'f-1', motivo: 'Cliente equivocado' });
  });

  it('una anulada no vence: el cartel de vencimiento no dice nada', () => {
    // No se cobra y no vence, así que "venció hace 3 días" sería un aviso falso.
    expect(textoVencimiento(EstadosFactura.ANULADA, -3)).toBeNull();
    expect(textoVencimiento(EstadosFactura.ANULADA, 10)).toBeNull();
  });

  it('esFacturaAnulada reconoce el quinto estado', () => {
    expect(esFacturaAnulada({ estado: EstadosFactura.ANULADA })).toBe(true);
    expect(esFacturaAnulada({ estado: EstadosFactura.VENCIDA })).toBe(false);
  });
});
