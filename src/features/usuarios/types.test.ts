import {
  aBloquearFiadoPayload,
  aCargarDniPayload,
  bloquearFiadoSchema,
  cargarDniSchema,
  esFacturable,
  faltaDni,
  nombreUsuario,
  rolLabel,
  ROL_LABEL,
  sinFiado,
  usuarioSchema,
  usuariosPaginaSchema,
} from './types';
import { Roles } from '@/features/auth';

/** Payload de `GET /api/admin/clientes` tal como está en `docs/s.roles.md`. */
const respuestaReal = {
  datos: [
    {
      id: '55654c67-8f1e-4a2b-9c3d-1e2f3a4b5c6d',
      email: null,
      dni: '38180903',
      displayName: 'Ana Cliente',
      rol: 'cliente',
      tieneGoogle: false,
      tienePassword: true,
      createdAt: '2026-08-18T02:41:10.512Z',
      lastLoginAt: '2026-08-18T02:41:11.004Z',
    },
  ],
  total: 2,
  pagina: 1,
  limite: 20,
  paginas: 1,
};

describe('usuariosPaginaSchema', () => {
  it('valida la respuesta documentada del listado', () => {
    expect(usuariosPaginaSchema.safeParse(respuestaReal).success).toBe(true);
  });

  it('acepta el listado vacío: sin resultados es un 200, no un 404', () => {
    const result = usuariosPaginaSchema.safeParse({
      datos: [],
      total: 0,
      pagina: 1,
      limite: 20,
      paginas: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe('usuarioSchema', () => {
  const usuario = respuestaReal.datos[0];

  it('acepta la cuenta sin nombre y sin último ingreso', () => {
    // `displayName: null` → la pantalla muestra el email o el DNI.
    // `lastLoginAt: null` → "nunca entró".
    const result = usuarioSchema.safeParse({
      ...usuario,
      displayName: null,
      lastLoginAt: null,
    });
    expect(result.success).toBe(true);
  });

  it('acepta la cuenta con email y sin DNI, y al revés', () => {
    // Las dos formas de registrarse conviven en el mismo listado.
    expect(usuarioSchema.safeParse({ ...usuario, email: 'ana@mail.com', dni: null }).success).toBe(
      true,
    );
    expect(usuarioSchema.safeParse({ ...usuario, email: null, dni: '38180903' }).success).toBe(
      true,
    );
  });

  it('un email con forma rara no tira abajo la fila', () => {
    // En un LISTADO, validar el email como `z.email()` dejaría al encargado sin
    // ver a NADIE por una sola dirección mal cargada. Acá el email se muestra,
    // no se usa para decidir.
    expect(usuarioSchema.safeParse({ ...usuario, email: 'sin-arroba' }).success).toBe(true);
  });

  it('acepta que entre con las dos cosas: Google y contraseña', () => {
    const result = usuarioSchema.safeParse({ ...usuario, tieneGoogle: true, tienePassword: true });
    expect(result.success).toBe(true);
  });

  it('un rol que la app no conoce no tira abajo la fila', () => {
    // Se muestra el slug crudo antes que dejar al encargado sin listado.
    expect(usuarioSchema.safeParse({ ...usuario, rol: 'contador' }).success).toBe(true);
    expect(rolLabel('contador')).toBe('contador');
  });
});

describe('ROL_LABEL', () => {
  it('cada rol del sistema tiene su texto', () => {
    Object.values(Roles).forEach((rol) => {
      expect(ROL_LABEL[rol]).toBeTruthy();
    });
  });

  it('usa los slugs del backend', () => {
    // `GET /api/super-admin/usuarios?rol=administrador`. Un slug distinto
    // devolvería una lista vacía sin ningún error visible.
    expect(rolLabel(Roles.SUPER_ADMIN)).toBe('Super admin');
    expect(Roles.ADMINISTRADOR).toBe('administrador');
  });
});

describe('nombreUsuario', () => {
  const usuario = respuestaReal.datos[0]!;

  it('usa el nombre cargado', () => {
    expect(nombreUsuario(usuario)).toBe('Ana Cliente');
  });

  it('sin nombre, muestra con qué se identifica la cuenta', () => {
    // Una fila en blanco no le sirve a nadie: va el email, o el DNI si la
    // cuenta se creó con documento.
    expect(nombreUsuario({ ...usuario, displayName: null })).toBe('38180903');
    expect(nombreUsuario({ ...usuario, displayName: null, dni: null, email: 'ana@mail.com' })).toBe(
      'ana@mail.com',
    );
    expect(nombreUsuario({ ...usuario, displayName: '  ', dni: null, email: null })).toBe(
      'Sin nombre',
    );
  });
});

describe('esFacturable', () => {
  const usuario = respuestaReal.datos[0]!;

  it('solo se le factura a los clientes', () => {
    // El listado del super admin trae también cuentas de administración, y
    // facturarle a una da 404 (`docs/flujo_pagos.md`).
    expect(esFacturable(usuario)).toBe(true);
    expect(esFacturable({ ...usuario, rol: Roles.ADMINISTRADOR })).toBe(false);
    expect(esFacturable({ ...usuario, rol: Roles.SUPER_ADMIN })).toBe(false);
    expect(esFacturable({ ...usuario, rol: 'contador' })).toBe(false);
  });
});

describe('fiado', () => {
  const CLIENTE = respuestaReal.datos[0]!;

  it('lee la marca y su motivo', () => {
    const bloqueado = {
      ...CLIENTE,
      seLeFia: false,
      motivoSinFiado: 'Debe desde julio y no atiende el teléfono',
    };
    const resultado = usuarioSchema.safeParse(bloqueado);

    expect(resultado.success).toBe(true);
    expect(resultado.data?.seLeFia).toBe(false);
    expect(resultado.data?.motivoSinFiado).toBe('Debe desde julio y no atiende el teléfono');
  });

  it('sin el campo, se le fía: es como arranca todo el mundo', () => {
    // El mismo schema lee el listado del super admin, que el doc no menciona
    // entre los endpoints que lo devuelven: sin el campo la fila tiene que
    // dibujarse igual.
    const resultado = usuarioSchema.safeParse(CLIENTE);

    expect(resultado.success).toBe(true);
    expect(sinFiado(resultado.data!)).toBe(false);
  });

  it('sinFiado solo es true con el bloqueo explícito', () => {
    expect(sinFiado({ seLeFia: false })).toBe(true);
    expect(sinFiado({ seLeFia: true })).toBe(false);
    expect(sinFiado({ seLeFia: null })).toBe(false);
    expect(sinFiado({})).toBe(false);
  });

  it('exige el motivo para bloquear: sin él la marca no dice nada', () => {
    expect(bloquearFiadoSchema.safeParse({ motivo: '' }).success).toBe(false);
    expect(bloquearFiadoSchema.safeParse({ motivo: '   ' }).success).toBe(false);
    expect(bloquearFiadoSchema.safeParse({ motivo: 'Debe desde julio' }).success).toBe(true);
  });

  it('corta el motivo en 300 caracteres', () => {
    expect(bloquearFiadoSchema.safeParse({ motivo: 'x'.repeat(300) }).success).toBe(true);
    expect(bloquearFiadoSchema.safeParse({ motivo: 'x'.repeat(301) }).success).toBe(false);
  });

  it('el payload bloquea y manda el motivo sin espacios de los costados', () => {
    const payload = aBloquearFiadoPayload('c-1', { motivo: '  Debe desde julio  ' });

    expect(payload).toEqual({ clienteId: 'c-1', seLeFia: false, motivo: 'Debe desde julio' });
  });
});

describe('faltaDni — el bloqueo de la app, visto desde el panel', () => {
  it('mira el estado que manda el backend, no si tiene dni', () => {
    expect(faltaDni({ estado: 'bloqueado' })).toBe(true);
    expect(faltaDni({ estado: 'activo' })).toBe(false);
  });

  /**
   * El listado del super admin comparte este schema y el doc no lo nombra entre
   * los que devuelven `estado`. Sin el campo, la fila no muestra la marca — que
   * es lo que no molesta a nadie.
   */
  it('sin el campo no marca nada', () => {
    expect(faltaDni({})).toBe(false);
    expect(faltaDni({ estado: null })).toBe(false);
  });
});

describe('cargarDniSchema — cargar o corregir el documento desde el mostrador', () => {
  const carga = { dni: '38.180.903', motivo: 'Lo cargó mal, faltaba un dígito' };

  it('acepta el documento con puntos y lo deja limpio', () => {
    const result = cargarDniSchema.safeParse(carga);
    expect(result.success && result.data.dni).toBe('38180903');
  });

  /**
   * Cambiar el documento con el que se identifica a alguien tiene que dejar
   * rastro: el motivo queda guardado con quién lo hizo y cuándo.
   */
  it('exige el motivo', () => {
    expect(cargarDniSchema.safeParse({ ...carga, motivo: '   ' }).success).toBe(false);
    expect(cargarDniSchema.safeParse({ ...carga, motivo: 'x'.repeat(301) }).success).toBe(false);
  });

  it('rechaza un documento que el backend no aceptaría', () => {
    expect(cargarDniSchema.safeParse({ ...carga, dni: '12345' }).success).toBe(false);
  });

  it('arma el payload con el id en el cuerpo del hook, no en el formulario', () => {
    expect(aCargarDniPayload('c1', { dni: '38180903', motivo: '  Faltaba un dígito ' })).toEqual({
      clienteId: 'c1',
      dni: '38180903',
      motivo: 'Faltaba un dígito',
    });
  });
});
