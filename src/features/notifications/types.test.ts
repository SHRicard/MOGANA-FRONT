import {
  datosDePagoDe,
  destinoDeAviso,
  esPagoResuelto,
  llevaAAlgunLado,
  notificacionesPaginaSchema,
  PantallasDeAviso,
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
  destino: {
    pantalla: 'una_factura',
    id: 'ce5f8070-0000-4000-8000-000000000000',
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
  /**
   * ⚠️ **Sale del `destino` que manda el backend, no del `tipo`.** Antes se
   * deducía acá con un `switch` y el doc pide expresamente que no: duplicado del
   * lado de la app, ese mapeo se desactualiza el día que se agrega un tipo nuevo
   * y nadie se entera hasta que un clic no lleva a ningún lado.
   */
  it('devuelve el destino que mandó el backend', () => {
    const aviso = notificacionSchema.parse(avisoDePago);
    expect(destinoDeAviso(aviso)).toEqual({
      pantalla: PantallasDeAviso.UNA_FACTURA,
      id: avisoDePago.datos.facturaId,
    });
  });

  /**
   * La prueba de que NO se mira el tipo: el mismo payload con otro `tipo` sigue
   * llevando a donde dice `destino`.
   */
  it('no mira el tipo del aviso', () => {
    const raro = notificacionSchema.parse({ ...avisoDePago, tipo: 'promocion' });
    expect(destinoDeAviso(raro)?.pantalla).toBe(PantallasDeAviso.UNA_FACTURA);
  });

  /** El aviso del store lleva al panel del almacenamiento. */
  it('el aviso de store lleno lleva al panel del store', () => {
    const lleno = notificacionSchema.parse({
      ...avisoDePago,
      tipo: TiposNotificacion.STORE_LLENO,
      destino: { pantalla: PantallasDeAviso.STORE_DE_COMPROBANTES, id: null },
    });

    expect(destinoDeAviso(lleno)).toEqual({
      pantalla: PantallasDeAviso.STORE_DE_COMPROBANTES,
      id: null,
    });
  });

  /** Un anuncio es texto y nada más: no hay nada que abrir. */
  it('sin destino no lleva a ningún lado', () => {
    const anuncio = notificacionSchema.parse({
      ...avisoDePago,
      tipo: TiposNotificacion.ANUNCIO,
      datos: null,
      destino: null,
    });

    expect(destinoDeAviso(anuncio)).toBeNull();
  });

  /**
   * ⚠️ Los avisos guardados **antes de que este campo existiera** llegan sin
   * `destino`. Se leen igual, solo no navegan.
   */
  it('un aviso viejo sin el campo no rompe', () => {
    const { destino: _, ...viejo } = avisoDePago;
    expect(destinoDeAviso(notificacionSchema.parse(viejo))).toBeNull();
  });

  /**
   * ⚠️ **`pantalla` se valida como texto libre.** Una versión más nueva del
   * backend puede mandar una que esta build no conoce, y eso no puede tirar
   * abajo la lista: el aviso se lee igual y la pantalla no navega.
   */
  it('una pantalla que la app no conoce se lee sin romperse', () => {
    const futuro = notificacionSchema.parse({
      ...avisoDePago,
      destino: { pantalla: 'mis_puntos', id: null },
    });

    expect(destinoDeAviso(futuro)?.pantalla).toBe('mis_puntos');
  });
});

describe('llevaAAlgunLado', () => {
  /**
   * Es lo que decide si la fila se dibuja **tocable**: un aviso que parece un
   * botón y no hace nada se siente roto.
   */
  it('con destino, sí', () => {
    expect(llevaAAlgunLado(notificacionSchema.parse(avisoDePago))).toBe(true);
  });

  it('sin destino, no', () => {
    const anuncio = notificacionSchema.parse({ ...avisoDePago, destino: null });
    expect(llevaAAlgunLado(anuncio)).toBe(false);
  });
});
