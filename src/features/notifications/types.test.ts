import {
  datosDePagoDe,
  destinoDeAviso,
  esPagoResuelto,
  notificacionesPaginaSchema,
  notificacionSchema,
  sinLeer,
  TiposNotificacion,
  type Notificacion,
} from './types';

/** La respuesta tal cual la documenta `docs/notificaciones.md`. */
const respuesta = {
  datos: [
    {
      id: 'fbbbd6c2-0000-4000-8000-000000000000',
      tipo: 'deuda_vencida',
      titulo: 'Tenés 2 facturas vencidas',
      mensaje:
        'Sumás $ 105.002,50 sin pagar. La más antigua venció hace 20 días, el 30/07/2026. Acercate al local y lo arreglamos: si ahora no podés con todo, se puede ir en partes.',
      datos: {
        deuda: 105002.5,
        facturasVencidas: 2,
        vencimientoMasViejo: '2026-07-30',
        facturas: [
          { numero: 72, fechaFin: '2026-08-10', saldo: 32000 },
          { numero: 71, fechaFin: '2026-07-30', saldo: 73002.5 },
        ],
      },
      leidaEn: null,
      createdAt: '2026-08-19T21:04:24.301Z',
    },
  ],
  total: 1,
  noLeidas: 1,
  pagina: 1,
  limite: 20,
  paginas: 1,
};

describe('notificacionesPaginaSchema', () => {
  it('valida la respuesta real de la API', () => {
    expect(notificacionesPaginaSchema.safeParse(respuesta).success).toBe(true);
  });

  it('acepta la cuenta sin ningún aviso: es un 200 con lista vacía, no un 404', () => {
    const vacia = { datos: [], total: 0, noLeidas: 0, pagina: 1, limite: 20, paginas: 0 };
    expect(notificacionesPaginaSchema.safeParse(vacia).success).toBe(true);
  });
});

describe('notificacionSchema', () => {
  const aviso = respuesta.datos[0];

  /**
   * `datos` cambia de forma según el `tipo` —acá viene el de deuda, con un array
   * de facturas adentro—, así que el schema lo deja pasar sin forma y son los
   * lectores los que eligen por tipo. Validarlo con una forma fija tiraría abajo
   * la lista entera cuando llega un tipo con otro payload.
   */
  it('acepta `datos` de cualquier forma: cambia según el tipo', () => {
    const parsed = notificacionSchema.parse(aviso);
    expect(parsed.datos).toEqual(aviso.datos);
    expect(parsed.mensaje).toBe(aviso.mensaje);
  });

  it('acepta un aviso sin `datos`: un anuncio no lleva ninguno', () => {
    const anuncio = {
      ...aviso,
      tipo: TiposNotificacion.ANUNCIO,
      datos: null,
    };
    expect(notificacionSchema.safeParse(anuncio).success).toBe(true);
  });

  /**
   * Un tipo nuevo del backend no puede dejar a la persona sin ver ningún aviso.
   * Como el texto ya viene redactado, se muestra igual y se lee bien.
   */
  it('un tipo que la app no conoce se muestra igual', () => {
    const nuevo = { ...aviso, tipo: 'promocion' };
    expect(notificacionSchema.safeParse(nuevo).success).toBe(true);
  });

  it('exige lo que la pantalla necesita para dibujarse', () => {
    const { titulo: _titulo, ...sinTitulo } = aviso;
    expect(notificacionSchema.safeParse(sinTitulo).success).toBe(false);
  });
});

describe('sinLeer', () => {
  const base = notificacionSchema.parse(respuesta.datos[0]);

  it('sin leer mientras no haya fecha de lectura', () => {
    expect(sinLeer(base)).toBe(true);
    expect(sinLeer({ ...base, leidaEn: undefined } as Notificacion)).toBe(true);
  });

  it('con fecha ya está leído', () => {
    expect(sinLeer({ ...base, leidaEn: '2026-08-19T22:00:00.000Z' })).toBe(false);
  });
});

/** Los tres avisos de pago traen el mismo payload (`docs/user_cliente_flujo.md` §11). */
const avisoDePago = {
  id: 'a2f0b4c1-0000-4000-8000-000000000000',
  tipo: TiposNotificacion.PAGO_CONFIRMADO,
  titulo: 'Tomamos tu pago',
  mensaje: 'Anotamos $ 28.500,00 en la factura #1070.',
  datos: {
    pagoInformadoId: '3bd79309-0000-4000-8000-000000000000',
    facturaId: 'ce5f8070-0000-4000-8000-000000000000',
    facturaNumero: 1070,
    monto: 28500,
    fecha: '2026-08-21',
  },
  leidaEn: null,
  createdAt: '2026-08-21T20:29:12.920Z',
};

describe('datosDePagoDe', () => {
  it('lee el payload de un aviso de pago', () => {
    const aviso = notificacionSchema.parse(avisoDePago);
    expect(datosDePagoDe(aviso)?.facturaId).toBe(avisoDePago.datos.facturaId);
  });

  /**
   * ⚠️ Se elige por `tipo`, **nunca por qué campos vinieron**. El de deuda
   * también trae un objeto en `datos`, y confundirlos mandaría a abrir una
   * factura que no existe.
   */
  it('no lee el payload de un aviso que no es de pago', () => {
    const deuda = notificacionSchema.parse(respuesta.datos[0]);
    expect(datosDePagoDe(deuda)).toBeNull();
  });

  it('un payload que no encaja no rompe nada: devuelve null', () => {
    const roto = notificacionSchema.parse({ ...avisoDePago, datos: { facturaId: 42 } });
    expect(datosDePagoDe(roto)).toBeNull();
  });
});

describe('esPagoResuelto', () => {
  it('solo el confirmado y el rechazado: son los que cambian la cuenta', () => {
    const tomado = notificacionSchema.parse(avisoDePago);
    const noTomado = notificacionSchema.parse({
      ...avisoDePago,
      tipo: TiposNotificacion.PAGO_RECHAZADO,
    });
    // El que dispara el cliente **no** resuelve nada: solo deja el aviso.
    const informado = notificacionSchema.parse({
      ...avisoDePago,
      tipo: TiposNotificacion.PAGO_INFORMADO,
    });

    expect(esPagoResuelto(tomado)).toBe(true);
    expect(esPagoResuelto(noTomado)).toBe(true);
    expect(esPagoResuelto(informado)).toBe(false);
  });
});

describe('destinoDeAviso', () => {
  it('los de pago resuelto llevan a la factura de la que hablan', () => {
    const aviso = notificacionSchema.parse(avisoDePago);
    expect(destinoDeAviso(aviso)).toEqual({
      destino: 'factura',
      facturaId: avisoDePago.datos.facturaId,
    });
  });

  it('el de deuda lleva a las vencidas', () => {
    const deuda = notificacionSchema.parse(respuesta.datos[0]);
    expect(destinoDeAviso(deuda)).toEqual({ destino: 'facturas-vencidas' });
  });

  /**
   * Tres no llevan a ningún lado, y cada uno por su motivo: un anuncio no habla
   * de nada en particular, `pago_informado` es del administrador —cuya bandeja
   * todavía no existe en la app— y un tipo desconocido se lee igual, pero
   * adivinarle un destino sería peor que no moverse.
   */
  it('el anuncio, el aviso del administrador y un tipo desconocido no llevan a nada', () => {
    const anuncio = notificacionSchema.parse({
      ...avisoDePago,
      tipo: TiposNotificacion.ANUNCIO,
      datos: null,
    });
    const delAdministrador = notificacionSchema.parse({
      ...avisoDePago,
      tipo: TiposNotificacion.PAGO_INFORMADO,
    });
    const desconocido = notificacionSchema.parse({ ...avisoDePago, tipo: 'promocion' });

    expect(destinoDeAviso(anuncio)).toBeNull();
    expect(destinoDeAviso(delAdministrador)).toBeNull();
    expect(destinoDeAviso(desconocido)).toBeNull();
  });
});
