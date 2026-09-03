import {
  aConfirmarAvisoPayload,
  avisoDePagoSchema,
  avisosDePagoPaginaSchema,
  crearConfirmarAvisoSchema,
  hayImagen,
  nombreDelCliente,
  rechazarAvisoSchema,
  seAnotoDistinto,
  textoDelBorrado,
  type AvisoDePago,
  type ConfirmarAvisoFormValues,
} from './types';

/**
 * Los payloads son los de `MORGANA-BACK/src/admin/dto/pago-informado.dto.ts`,
 * copiados de la forma que arma `aPagoInformadoDto`: si el backend cambia una
 * forma, el test tiene que romper acá y no en producción.
 */
const avisoPendiente = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  estado: 'pendiente',
  monto: 8810.5,
  fecha: '2026-08-31',
  medio: 'transferencia',
  referencia: 'OP-88213345',
  nota: 'Pagué la mitad ahora',
  informadoEn: '2026-08-31T13:04:11.000Z',
  cliente: {
    id: 'c1',
    displayName: 'Ana Pérez',
    email: 'ana@ejemplo.com',
    dni: '30111222',
  },
  factura: {
    id: 'f1',
    numero: 1070,
    total: 30000,
    saldo: 30000,
    fechaFin: '2026-09-04',
  },
  entraEnElSaldo: true,
  resueltoEn: null,
  resueltoPor: null,
  motivoRechazo: null,
  pagoId: null,
  montoCobrado: null,
  fechaCobrada: null,
  comprobante: {
    estado: 'disponible',
    bytes: 204800,
    formato: 'jpg',
    subidoEn: '2026-08-31T13:04:11.000Z',
    url: 'https://res.cloudinary.com/x/comprobante.jpg?__cld_token__=abc',
    miniatura: 'https://res.cloudinary.com/x/c_limit,w_400/comprobante.jpg?__cld_token__=abc',
    borradoEn: null,
    borradoPor: null,
  },
};

describe('avisoDePagoSchema', () => {
  it('acepta el payload del backend tal cual', () => {
    const aviso = avisoDePagoSchema.parse(avisoPendiente);
    expect(aviso.monto).toBe(8810.5);
    expect(aviso.factura.numero).toBe(1070);
    expect(aviso.comprobante?.url).toContain('__cld_token__');
  });

  /**
   * Un aviso **sin comprobante** es normal: se avisa un pago en efectivo sin
   * adjuntar nada, y los avisos viejos son anteriores a que esto existiera.
   */
  it('acepta un aviso sin comprobante', () => {
    const aviso = avisoDePagoSchema.parse({ ...avisoPendiente, comprobante: null });
    expect(aviso.comprobante).toBeNull();
  });

  /**
   * ⚠️ `estado` del comprobante es texto libre a propósito: la pantalla ramifica
   * por si hay `url`, no por el texto, y un valor nuevo del backend no tiene por
   * qué tirar abajo la bandeja entera.
   */
  it('no se rompe con un estado de comprobante que no conoce', () => {
    const aviso = avisoDePagoSchema.parse({
      ...avisoPendiente,
      comprobante: { ...avisoPendiente.comprobante, estado: 'en_cola' },
    });
    expect(aviso.comprobante?.estado).toBe('en_cola');
  });

  it('rechaza un estado de aviso que no existe', () => {
    expect(() => avisoDePagoSchema.parse({ ...avisoPendiente, estado: 'en_revision' })).toThrow();
  });
});

describe('avisosDePagoPaginaSchema', () => {
  /**
   * `pendientes` es el globito y viene del **filtro entero**, no de la página:
   * sigue diciendo cuántos esperan aunque se esté mirando el archivo.
   */
  it('trae el contador de pendientes aparte del total', () => {
    const pagina = avisosDePagoPaginaSchema.parse({
      datos: [avisoPendiente],
      total: 12,
      pagina: 2,
      limite: 10,
      paginas: 2,
      pendientes: 3,
    });
    expect(pagina.total).toBe(12);
    expect(pagina.pendientes).toBe(3);
  });
});

describe('hayImagen', () => {
  it('sin comprobante no hay nada que mostrar', () => {
    expect(hayImagen(null)).toBe(false);
    expect(hayImagen(undefined)).toBe(false);
  });

  it('con url o miniatura, sí', () => {
    expect(hayImagen({ estado: 'disponible', url: 'https://x/a.jpg' })).toBe(true);
    expect(hayImagen({ estado: 'disponible', miniatura: 'https://x/a.jpg' })).toBe(true);
  });

  /** Borrado: hubo imagen y ya no está. Los links vienen en `null`. */
  it('borrado no tiene imagen', () => {
    expect(
      hayImagen({ estado: 'borrado', url: null, miniatura: null, borradoPor: 'antiguedad' }),
    ).toBe(false);
  });
});

describe('textoDelBorrado', () => {
  /**
   * El motivo importa: "se borró al rechazar el aviso" y "lo borraron desde el
   * panel" no se leen igual, y quien mira el archivo tiene que poder saber cuál
   * fue.
   */
  it.each([
    ['rechazo', 'se borró al rechazar el aviso'],
    ['antiguedad', 'se borró por antigüedad'],
    ['manual', 'lo borraron desde el panel'],
  ])('con motivo %s lo explica', (motivo, esperado) => {
    expect(textoDelBorrado({ estado: 'borrado', borradoPor: motivo })).toContain(esperado);
  });

  /** Un motivo nuevo del backend no puede dejar el cartel vacío. */
  it('con un motivo que no conoce dice algo igual', () => {
    const texto = textoDelBorrado({ estado: 'borrado', borradoPor: 'cuota_excedida' });
    expect(texto).toContain('ya no está disponible');
  });
});

describe('seAnotoDistinto', () => {
  const base = avisoDePagoSchema.parse(avisoPendiente);

  it('en un pendiente no hay nada anotado todavía', () => {
    expect(seAnotoDistinto(base)).toBe(false);
  });

  it('confirmado por lo mismo que informó no es "distinto"', () => {
    expect(seAnotoDistinto({ ...base, montoCobrado: base.monto })).toBe(false);
  });

  /**
   * Dijo $8.810,50 y entraron $8.000. Los DOS números tienen que quedar a la
   * vista: el aviso guarda lo que dijo el cliente y el cobro lo que vio el
   * negocio, y esa diferencia es lo que después hay que poder explicar.
   */
  it('confirmado por otro monto sí', () => {
    expect(seAnotoDistinto({ ...base, montoCobrado: 8000 })).toBe(true);
  });
});

describe('nombreDelCliente', () => {
  const base = avisoDePagoSchema.parse(avisoPendiente);

  it('usa el nombre cuando lo hay', () => {
    expect(nombreDelCliente(base)).toBe('Ana Pérez');
  });

  /** Sin nombre cargado, el email identifica igual. */
  it('cae al email', () => {
    const sinNombre: AvisoDePago = {
      ...base,
      cliente: { ...base.cliente, displayName: null },
    };
    expect(nombreDelCliente(sinNombre)).toBe('ana@ejemplo.com');
  });

  /** Nunca vacío: una tarjeta sin nombre no se puede leer. */
  it('siempre dice algo', () => {
    const anonimo: AvisoDePago = {
      ...base,
      cliente: { id: 'c1', displayName: '   ', email: null, dni: null },
    };
    expect(nombreDelCliente(anonimo)).toBe('Cliente sin nombre');
  });
});

describe('crearConfirmarAvisoSchema', () => {
  const valido: ConfirmarAvisoFormValues = {
    monto: '8.810,50',
    fecha: '31/08/2026',
    nota: '',
  };

  it('acepta lo que informó el cliente', () => {
    expect(crearConfirmarAvisoSchema(30000).safeParse(valido).success).toBe(true);
  });

  /**
   * ⚠️ **El tope es el saldo de la factura**, no lo que dijo el cliente: se puede
   * anotar menos, pero nunca más de lo que falta cobrar. El `400` del backend es
   * la red, no la primera línea de defensa.
   */
  it('no deja anotar más de lo que falta cobrar', () => {
    const resultado = crearConfirmarAvisoSchema(5000).safeParse(valido);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0].path).toEqual(['monto']);
    }
  });

  it('el monto tiene que ser mayor que cero', () => {
    expect(crearConfirmarAvisoSchema(30000).safeParse({ ...valido, monto: '0' }).success).toBe(
      false,
    );
  });
});

describe('aConfirmarAvisoPayload', () => {
  /**
   * ⚠️ **El monto va como número crudo y la fecha en formato de API.** En el
   * formulario se escribe "8.810,50" y "31/08/2026", y eso tal cual es un `400`.
   */
  it('convierte el formulario al cuerpo del POST', () => {
    const payload = aConfirmarAvisoPayload('av-1', {
      monto: '8.810,50',
      fecha: '31/08/2026',
      nota: '  entró por caja de ahorro  ',
    });

    expect(payload).toEqual({
      avisoId: 'av-1',
      datos: { monto: 8810.5, fecha: '2026-08-31', nota: 'entró por caja de ahorro' },
    });
  });

  /** Los opcionales vacíos no viajan: mandar `nota: ""` es decir algo distinto. */
  it('omite la nota en blanco', () => {
    const payload = aConfirmarAvisoPayload('av-1', {
      monto: '100',
      fecha: '31/08/2026',
      nota: '   ',
    });
    expect('nota' in payload.datos).toBe(false);
  });
});

describe('rechazarAvisoSchema', () => {
  /**
   * ⚠️ **El motivo es obligatorio y no es burocracia**: es lo único que le
   * explica al cliente por qué avisó que pagó y le sigue figurando la deuda. Le
   * llega tal cual.
   */
  it('sin motivo no se puede rechazar', () => {
    expect(rechazarAvisoSchema.safeParse({ motivo: '' }).success).toBe(false);
  });

  it('un motivo de dos letras tampoco explica nada', () => {
    expect(rechazarAvisoSchema.safeParse({ motivo: 'no' }).success).toBe(false);
  });

  it('acepta un motivo real', () => {
    expect(rechazarAvisoSchema.safeParse({ motivo: 'No figura en el banco' }).success).toBe(true);
  });

  it('no deja pasar de 500 caracteres', () => {
    expect(rechazarAvisoSchema.safeParse({ motivo: 'x'.repeat(501) }).success).toBe(false);
  });
});
