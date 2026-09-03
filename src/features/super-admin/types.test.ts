import { Roles } from '@/features/auth';
import {
  accionLabel,
  auditoriaPaginaSchema,
  cambiarRolSchema,
  consecuenciaDelCambio,
  cuentaDelSistemaSchema,
  desfaseDeReloj,
  DESFASE_QUE_IMPORTA_MS,
  formatUptime,
  hayRastro,
  MAX_LARGO_MOTIVO_DE_ROL,
  nombreEnElRastro,
  opcionesDeRol,
  quienLoHizo,
  relojCorrido,
  resumenDelSistemaSchema,
  resumenDeFacturas,
  SemaforosDelStore,
  semaforoDelStore,
  type CuentaDelSistema,
} from './types';

/**
 * Los payloads son los de `docs/README_FRONT_SUPER_ADMIN.md`, copiados tal cual
 * —el doc aclara que salieron de la API corriendo—: si el backend cambia una
 * forma, el test tiene que romper acá y no en producción.
 */
const resumen = {
  hoy: '2026-09-02',
  cuentas: {
    total: 214,
    porRol: { super_admin: 1, administrador: 2, cliente: 211 },
    activas: 187,
    bloqueadas: 27,
    conGoogle: 96,
    conPassword: 143,
    emailSinVerificar: 41,
    sinFiado: 8,
  },
  altas: { hoy: 3, ultimos7: 19, ultimos30: 62 },
  actividad: {
    activos7: 44,
    activos30: 121,
    nuncaEntraron: 12,
    ultimoIngreso: '2026-09-02T14:31:08.221Z',
  },
  store: {
    porcentajeUsado: 73.4,
    nivel: 'alto',
    comprobantes: 312,
    bytes: 88080384,
    liberables: 140,
    bytesLiberables: 47000000,
  },
  servidor: {
    entorno: 'production',
    version: '1.4.2',
    uptimeSegundos: 431209,
    arrancadoEn: '2026-08-28T14:24:22.002Z',
    hora: '2026-09-02T14:31:11.380Z',
  },
};

const ficha = {
  id: '33333333-3333-4333-8333-333333333333',
  email: null,
  dni: '38180903',
  displayName: 'Zoraida Pérez',
  telefono: '3416001122',
  direccion: null,
  rol: 'cliente',
  estado: 'activo',
  tieneGoogle: false,
  tienePassword: true,
  seLeFia: false,
  motivoSinFiado: 'Debe desde marzo',
  createdAt: '2026-08-18T02:41:10.512Z',
  lastLoginAt: '2026-08-17T20:00:00.000Z',

  emailVerificadoEn: null,
  updatedAt: '2026-08-18T02:41:10.512Z',

  cambioDeRol: { en: null, porId: null, por: null, motivo: null },
  fiado: {
    en: '2026-08-10T14:00:00.000Z',
    porId: '22222222-2222-4222-8222-222222222222',
    por: {
      id: '22222222-2222-4222-8222-222222222222',
      displayName: 'Ana Operadora',
      email: 'ana@mail.com',
    },
    motivo: 'Debe desde marzo',
  },
  documento: { en: null, porId: null, por: null, motivo: null },

  facturas: { total: 2, vigentes: 1, anuladas: 1 },

  rolesPosibles: ['cliente'],
  rolesImposibles: [
    {
      rol: 'super_admin',
      motivo:
        'Esta cuenta tiene 2 facturas. Si deja de ser cliente, esas facturas desaparecen del panel de facturación y de las métricas. Para darle el panel, creale una cuenta aparte con otro correo.',
    },
    {
      rol: 'administrador',
      motivo:
        'Esta cuenta tiene 2 facturas. Si deja de ser cliente, esas facturas desaparecen del panel de facturación y de las métricas. Para darle el panel, creale una cuenta aparte con otro correo.',
    },
  ],
};

const auditoria = {
  datos: [
    {
      id: '702d18e6-9f32-402f-a69b-ed2deeb84ede',
      accion: 'cambio_de_rol',
      fecha: '2026-09-02T18:54:32.303Z',
      actorId: '11111111-1111-4111-8111-111111111111',
      actor: {
        id: '11111111-1111-4111-8111-111111111111',
        displayName: 'Ricardo Ramírez',
        email: 'ricardo.ramirez.dev@gmail.com',
      },
      objetivoId: '22222222-2222-4222-8222-222222222222',
      objetivo: {
        id: '22222222-2222-4222-8222-222222222222',
        displayName: 'Ana Operadora',
        email: 'ana@mail.com',
      },
      antes: 'administrador',
      despues: 'cliente',
      motivo: 'Dejó el negocio en agosto',
    },
  ],
  total: 1,
  pagina: 1,
  limite: 20,
  paginas: 1,
};

describe('resumenDelSistemaSchema', () => {
  it('acepta la respuesta del doc tal cual', () => {
    expect(resumenDelSistemaSchema.parse(resumen).cuentas.total).toBe(214);
  });

  /**
   * El caso que tira abajo la pantalla si no se contempla: Cloudinary sin
   * configurar, o que no contestó. El tablero tiene que seguir dibujándose.
   */
  it('acepta el store en null entero', () => {
    const sinStore = resumenDelSistemaSchema.parse({ ...resumen, store: null });
    expect(sinStore.store).toBeNull();
  });

  /** `APP_VERSION` sin poner del otro lado. Se dice en pantalla, no se esconde. */
  it('acepta la versión en null', () => {
    const parsed = resumenDelSistemaSchema.parse({
      ...resumen,
      servidor: { ...resumen.servidor, version: null },
    });
    expect(parsed.servidor.version).toBeNull();
  });

  /**
   * Un rol nuevo del backend suma una fila del diccionario; no puede tirar abajo
   * el tablero entero.
   */
  it('acepta un rol que la app todavía no conoce en porRol', () => {
    const parsed = resumenDelSistemaSchema.parse({
      ...resumen,
      cuentas: { ...resumen.cuentas, porRol: { ...resumen.cuentas.porRol, contador: 3 } },
    });
    expect(parsed.cuentas.porRol.contador).toBe(3);
  });
});

describe('semaforoDelStore', () => {
  it('lo decide el nivel del servidor, nunca el porcentaje', () => {
    // 95% con nivel holgado: el servidor sabe contra qué límite mide y la app
    // no. Si acá saliera "crítico", el día que muevan los umbrales la pantalla
    // gritaría sola.
    expect(semaforoDelStore({ ...resumen.store, porcentajeUsado: 95, nivel: null })).toBe(
      SemaforosDelStore.HOLGADO,
    );
    expect(semaforoDelStore({ ...resumen.store, nivel: 'critico' })).toBe(
      SemaforosDelStore.CRITICO,
    );
    expect(semaforoDelStore({ ...resumen.store, nivel: 'alto' })).toBe(SemaforosDelStore.ALTO);
  });

  /**
   * El caso raro pero real: no hay contra qué medir —ni cuota de Cloudinary ni
   * `STORE_LIMITE_MB`—. **No es verde**: no es "está bien", es "no se midió".
   */
  it('sin porcentaje y sin nivel no es holgado: es sin medir', () => {
    expect(
      semaforoDelStore({ ...resumen.store, porcentajeUsado: null, nivel: null }),
    ).toBe(SemaforosDelStore.SIN_MEDIR);
  });

  /** Un nivel nuevo que esta versión no conoce no puede pintarse de rojo por las dudas. */
  it('un nivel desconocido no inventa una alarma', () => {
    expect(semaforoDelStore({ ...resumen.store, nivel: 'moderado' })).toBe(
      SemaforosDelStore.HOLGADO,
    );
  });
});

describe('el reloj del servidor', () => {
  const hora = '2026-09-02T14:31:11.380Z';
  const mismoInstante = Date.parse(hora);

  it('mide la diferencia con signo: positivo es el servidor adelantado', () => {
    expect(desfaseDeReloj(hora, mismoInstante)).toBe(0);
    expect(desfaseDeReloj(hora, mismoInstante - 60_000)).toBe(60_000);
    expect(desfaseDeReloj(hora, mismoInstante + 60_000)).toBe(-60_000);
  });

  it('un minuto de diferencia no se avisa: es la latencia y el redondeo', () => {
    expect(relojCorrido(hora, mismoInstante - 60_000)).toBe(false);
  });

  /**
   * Medio sistema depende de qué día es hoy —los vencimientos, los meses de las
   * métricas, el cron de las 8—: un servidor corrido da números que no cierran
   * sin que nada falle.
   */
  it('a partir del umbral se avisa, esté adelantado o atrasado', () => {
    expect(relojCorrido(hora, mismoInstante - DESFASE_QUE_IMPORTA_MS)).toBe(true);
    expect(relojCorrido(hora, mismoInstante + DESFASE_QUE_IMPORTA_MS)).toBe(true);
  });

  it('una hora ilegible no inventa un desfase', () => {
    expect(desfaseDeReloj('mañana')).toBeNull();
    expect(relojCorrido('mañana')).toBe(false);
  });
});

describe('formatUptime', () => {
  it('usa dos unidades como mucho: la pregunta es si se reinició hace poco', () => {
    expect(formatUptime(431209)).toBe('4 d 23 h');
    expect(formatUptime(3600 * 3 + 60 * 12)).toBe('3 h 12 min');
    expect(formatUptime(60 * 8)).toBe('8 min');
  });

  it('menos de un minuto se dice con palabras, no con un cero', () => {
    expect(formatUptime(12)).toBe('menos de un minuto');
  });
});

describe('cuentaDelSistemaSchema', () => {
  it('acepta la ficha del doc tal cual', () => {
    const parsed = cuentaDelSistemaSchema.parse(ficha);
    expect(parsed.facturas.total).toBe(2);
    expect(parsed.rolesPosibles).toEqual(['cliente']);
  });

  /** Un rol nuevo del backend no puede tirar abajo la ficha entera. */
  it('acepta un rol que la app no conoce en las listas de roles', () => {
    const parsed = cuentaDelSistemaSchema.parse({
      ...ficha,
      rolesPosibles: ['cliente', 'contador'],
    });
    expect(parsed.rolesPosibles).toContain('contador');
  });
});

describe('hayRastro / quienLoHizo', () => {
  /**
   * Los cuatro en `null` no es un dato faltante: es una cuenta a la que nunca le
   * pasó nada. Cuatro guiones en cuatro filas se leen como un error de carga.
   */
  it('sin nada que contar, el bloque no se dibuja', () => {
    expect(hayRastro({ en: null, porId: null, por: null, motivo: null })).toBe(false);
    expect(hayRastro(ficha.fiado)).toBe(true);
  });

  it('con la persona resuelta, la nombra', () => {
    expect(quienLoHizo(ficha.fiado)).toEqual({ nombre: 'Ana Operadora', yaNoEsta: false });
  });

  /**
   * `por` en null con `porId` cargado: un id que ya no resuelve a ninguna
   * cuenta. Mostrar el id es información; un guion no.
   */
  it('sin la persona pero con el id, avisa que ya no está', () => {
    expect(quienLoHizo({ en: '2026-08-10T14:00:00.000Z', porId: 'abc', por: null, motivo: null }))
      .toEqual({ nombre: 'abc', yaNoEsta: true });
  });

  it('sin id no hay a quién nombrar', () => {
    expect(quienLoHizo({ en: null, porId: null, por: null, motivo: null })).toBeNull();
  });

  /** Sin nombre cargado queda el email, que es con lo que se identifica la cuenta. */
  it('sin displayName usa el email', () => {
    expect(
      quienLoHizo({
        en: null,
        porId: 'id-1',
        por: { id: 'id-1', displayName: null, email: 'ana@mail.com' },
        motivo: null,
      }),
    ).toEqual({ nombre: 'ana@mail.com', yaNoEsta: false });
  });
});

describe('opcionesDeRol', () => {
  const cuenta = cuentaDelSistemaSchema.parse(ficha) as CuentaDelSistema;

  it('marca el rol actual y bloquea los otros con el motivo del backend', () => {
    const opciones = opcionesDeRol(cuenta);

    expect(opciones.map((opcion) => opcion.rol)).toEqual([
      Roles.SUPER_ADMIN,
      Roles.ADMINISTRADOR,
      Roles.CLIENTE,
    ]);

    const cliente = opciones.find((opcion) => opcion.rol === Roles.CLIENTE);
    expect(cliente?.actual).toBe(true);
    expect(cliente?.bloqueo).toBeNull();

    // El motivo se muestra tal cual: es el mismo texto que devolvería el 409.
    const admin = opciones.find((opcion) => opcion.rol === Roles.ADMINISTRADOR);
    expect(admin?.bloqueo).toContain('creale una cuenta aparte con otro correo');
  });

  /**
   * Ante la duda no se ofrece: un rol que el backend no puso en ninguna de las
   * dos listas no es una invitación a probar.
   */
  it('un rol que no está en ninguna lista queda bloqueado', () => {
    const sinListas = { ...cuenta, rolesPosibles: ['cliente'], rolesImposibles: [] };
    const admin = opcionesDeRol(sinListas).find((opcion) => opcion.rol === Roles.ADMINISTRADOR);

    expect(admin?.bloqueo).not.toBeNull();
  });

  it('con todo permitido, los tres quedan disponibles', () => {
    const libre = {
      ...cuenta,
      rol: 'administrador',
      rolesPosibles: ['super_admin', 'administrador', 'cliente'],
      rolesImposibles: [],
    };
    const opciones = opcionesDeRol(libre);

    expect(opciones.filter((opcion) => opcion.bloqueo === null)).toHaveLength(3);
    expect(opciones.find((opcion) => opcion.actual)?.rol).toBe(Roles.ADMINISTRADOR);
  });
});

describe('resumenDeFacturas', () => {
  it('se lee como un renglón, con los singulares en su lugar', () => {
    expect(resumenDeFacturas({ total: 2, vigentes: 1, anuladas: 1 })).toBe(
      '2 facturas (1 vigente, 1 anulada)',
    );
    expect(resumenDeFacturas({ total: 1, vigentes: 0, anuladas: 1 })).toBe(
      '1 factura (0 vigentes, 1 anulada)',
    );
  });

  it('sin facturas lo dice con palabras', () => {
    expect(resumenDeFacturas({ total: 0, vigentes: 0, anuladas: 0 })).toBe('Sin facturas');
  });
});

describe('consecuenciaDelCambio', () => {
  /**
   * El mismo rol de destino significa cosas opuestas según de dónde venga: a
   * administrador desde cliente es un alta, y desde super admin es una baja.
   */
  it('a administrador dice lo contrario según de dónde venga', () => {
    expect(consecuenciaDelCambio(Roles.CLIENTE, Roles.ADMINISTRADOR)).toContain('Va a poder ver');
    expect(consecuenciaDelCambio(Roles.SUPER_ADMIN, Roles.ADMINISTRADOR)).toContain('Deja de ver');
  });

  it('a cliente avisa lo que pierde', () => {
    expect(consecuenciaDelCambio(Roles.ADMINISTRADOR, Roles.CLIENTE)).toContain(
      'perder el acceso',
    );
  });
});

describe('cambiarRolSchema', () => {
  /**
   * Los textos son los mismos que devuelve el backend cuando el body está mal:
   * así la explicación no se escribe dos veces y no se pueden desincronizar.
   */
  it('el motivo es obligatorio, con el mensaje del backend', () => {
    const resultado = cambiarRolSchema.safeParse({ motivo: '   ' });

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0].message).toBe(
      'Contá en una línea por qué se le cambia el rol.',
    );
  });

  it('no pasa de 300 caracteres', () => {
    const largo = cambiarRolSchema.safeParse({ motivo: 'x'.repeat(MAX_LARGO_MOTIVO_DE_ROL + 1) });

    expect(largo.success).toBe(false);
    expect(largo.error?.issues[0].message).toBe('El motivo no puede pasar de 300 caracteres.');
  });

  it('recorta los espacios de los costados', () => {
    expect(cambiarRolSchema.parse({ motivo: '  Dejó el negocio  ' }).motivo).toBe(
      'Dejó el negocio',
    );
  });
});

describe('auditoriaPaginaSchema', () => {
  it('acepta la respuesta del doc tal cual', () => {
    expect(auditoriaPaginaSchema.parse(auditoria).datos[0].despues).toBe('cliente');
  });

  /**
   * El renglón sobrevive a la persona: es exactamente lo que se le pide a una
   * auditoría, y por eso `actor` y `objetivo` pueden faltar.
   */
  it('acepta el actor y el objetivo en null', () => {
    const parsed = auditoriaPaginaSchema.parse({
      ...auditoria,
      datos: [{ ...auditoria.datos[0], actor: null, objetivo: null }],
    });

    expect(parsed.datos[0].actorId).toBe('11111111-1111-4111-8111-111111111111');
    expect(nombreEnElRastro(parsed.datos[0].actor, parsed.datos[0].actorId)).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
  });
});

describe('accionLabel', () => {
  it('traduce lo que conoce', () => {
    expect(accionLabel('cambio_de_rol')).toBe('Cambio de rol');
  });

  /** Mostrar el slug es peor que el texto, pero mucho mejor que una fila en blanco. */
  it('deja pasar el slug crudo de una acción nueva', () => {
    expect(accionLabel('baja_de_cuenta')).toBe('baja_de_cuenta');
  });
});
