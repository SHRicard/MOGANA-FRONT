import {
  aActualizarPerfilPayload,
  aCambiosDePerfil,
  aValoresDeFormulario,
  bajaHechaSchema,
  CaminosDeBaja,
  CamposDelPerfil,
  completarPerfilSchema,
  confirmacionCoincide,
  esCallejonSinSalida,
  esTelefonoValido,
  miCuentaSchema,
  motivoCampoFijo,
  perfilSchema,
  quedanDatos,
  vistaPreviaDeBajaSchema,
  type Perfil,
} from './types';

/** El perfil tal cual lo documenta `docs/flujo_mi_cuenta.md`. */
const respuesta = {
  id: 'cc11dafb-d55c-4f9e-ac06-a1f2cd4337ca',
  name: 'Ana Pérez',
  displayName: 'Ana Pérez',
  email: 'ana@mail.com',
  emailVerificado: false,
  dni: '38180903',
  telefono: '3814567890',
  direccion: 'Av. San Martín 123',
  camposFijos: [
    { campo: 'email', motivo: 'El correo no se cambia desde acá: es con lo que entrás.' },
    { campo: 'dni', motivo: 'Tu DNI ya está cargado y no se cambia desde la app.' },
  ],
  rol: 'cliente',
  estado: 'activo',
  motivoBloqueo: null,
  tieneGoogle: false,
  tienePassword: true,
  createdAt: '2026-08-20T13:34:55.832Z',
  lastLoginAt: '2026-08-20T13:35:23.695Z',
};

const perfil: Perfil = perfilSchema.parse(respuesta);

describe('completarPerfilSchema — el DNI que destraba la cuenta', () => {
  it('acepta un documento de 7 a 9 dígitos', () => {
    expect(completarPerfilSchema.safeParse({ dni: '38180903' }).success).toBe(true);
    expect(completarPerfilSchema.safeParse({ dni: '1234567' }).success).toBe(true);
  });

  /**
   * La gente lo escribe con puntos y el teclado numérico de iOS los ofrece:
   * rechazarlos sería pelearse con el usuario. El backend también los acepta.
   */
  it('deja escribirlo con puntos y los saca antes de mandarlo', () => {
    const result = completarPerfilSchema.safeParse({ dni: ' 38.180.903 ' });
    expect(result.success && result.data.dni).toBe('38180903');
  });

  it('rechaza lo que el backend rechazaría, sin gastar una request', () => {
    expect(completarPerfilSchema.safeParse({ dni: '' }).success).toBe(false);
    expect(completarPerfilSchema.safeParse({ dni: '12345' }).success).toBe(false);
    expect(completarPerfilSchema.safeParse({ dni: '1234567890' }).success).toBe(false);
    // Un error de tipeo tiene que verse, no colarse como válido.
    expect(completarPerfilSchema.safeParse({ dni: '38a180903' }).success).toBe(false);
  });
});

describe('aActualizarPerfilPayload', () => {
  it('manda solo el dni, que es lo único que destraba', () => {
    expect(aActualizarPerfilPayload({ dni: '38180903' })).toEqual({ dni: '38180903' });
  });
});

describe('esCallejonSinSalida — cuándo dejar de ofrecer reintentar', () => {
  /**
   * Los dos `409` son casos en los que la persona no puede seguir sola: el
   * documento ya está cargado, o ya es de otra cuenta. Reintentar no va a andar;
   * lo que corresponde es mandarla al local.
   */
  it('los dos 409 del documento', () => {
    expect(esCallejonSinSalida(409)).toBe(true);
  });

  it('lo demás se puede reintentar', () => {
    expect(esCallejonSinSalida(400)).toBe(false);
    expect(esCallejonSinSalida(500)).toBe(false);
    // Sin status: se cortó la conexión. Reintentar es justo lo que hay que hacer.
    expect(esCallejonSinSalida(null)).toBe(false);
  });
});

describe('perfilSchema', () => {
  it('valida la respuesta real de la API', () => {
    expect(perfilSchema.safeParse(respuesta).success).toBe(true);
  });

  /** Una cuenta recién creada: sin nombre, sin contacto y sin DNI. */
  it('acepta una cuenta nueva, con todo en null', () => {
    const nueva = {
      ...respuesta,
      displayName: null,
      dni: null,
      telefono: null,
      direccion: null,
      camposFijos: [{ campo: 'email', motivo: '...' }],
      estado: 'bloqueado',
    };
    expect(perfilSchema.safeParse(nueva).success).toBe(true);
  });
});

describe('motivoCampoFijo — qué se puede editar lo decide el backend', () => {
  it('devuelve el motivo del campo bloqueado, para mostrarlo debajo del input', () => {
    expect(motivoCampoFijo(perfil, CamposDelPerfil.EMAIL)).toContain('no se cambia');
    expect(motivoCampoFijo(perfil, CamposDelPerfil.DNI)).toContain('ya está cargado');
  });

  /**
   * Lo importante de esta función: el DNI **aparece en `camposFijos` recién
   * cuando ya está cargado**. Sin motivo, el input se puede editar — y la app no
   * replica en ningún lado la regla de cuándo se puede tocar.
   */
  it('sin DNI cargado no hay motivo: el campo se edita', () => {
    const sinDni: Perfil = {
      ...perfil,
      dni: null,
      camposFijos: [{ campo: 'email', motivo: '...' }],
    };
    expect(motivoCampoFijo(sinDni, CamposDelPerfil.DNI)).toBeNull();
    expect(motivoCampoFijo(sinDni, CamposDelPerfil.EMAIL)).toBe('...');
  });

  it('sin `camposFijos` no rompe: todo queda editable y el backend rechaza igual', () => {
    expect(motivoCampoFijo({ ...perfil, camposFijos: null }, CamposDelPerfil.EMAIL)).toBeNull();
  });
});

describe('esTelefonoValido', () => {
  it('acepta cómo escribe el teléfono una persona', () => {
    expect(esTelefonoValido('3814567890')).toBe(true);
    expect(esTelefonoValido('(381) 456-7890')).toBe(true);
    expect(esTelefonoValido('+54 381 456 7890')).toBe(true);
  });

  /** Nadie está obligado a tener uno, y vaciarlo es la forma de borrarlo. */
  it('vacío es válido', () => {
    expect(esTelefonoValido('')).toBe(true);
    expect(esTelefonoValido('   ')).toBe(true);
  });

  it('rechaza lo que no es un teléfono', () => {
    expect(esTelefonoValido('llamame')).toBe(false);
    expect(esTelefonoValido('12345')).toBe(false);
    expect(esTelefonoValido('1234567890123456')).toBe(false);
  });
});

describe('miCuentaSchema', () => {
  const valores = aValoresDeFormulario(perfil);

  it('el nombre no puede quedar vacío: sin él la persona no tiene cómo mostrarse', () => {
    expect(miCuentaSchema.safeParse({ ...valores, displayName: '   ' }).success).toBe(false);
  });

  it('el teléfono y la dirección sí pueden quedar vacíos: así se borran', () => {
    expect(miCuentaSchema.safeParse({ ...valores, telefono: '', direccion: '' }).success).toBe(
      true,
    );
  });

  /**
   * El backend guarda el teléfono limpio (`(381) 456-7890` → `3814567890`), así
   * que normalizarlo acá sería hacer dos veces el mismo trabajo — y cambiaría
   * bajo los dedos lo que se está tipeando.
   */
  it('no toca el teléfono: viaja como lo escribió la persona', () => {
    const result = miCuentaSchema.safeParse({ ...valores, telefono: '(381) 456-7890' });
    expect(result.success && result.data.telefono).toBe('(381) 456-7890');
  });
});

describe('aCambiosDePerfil — se manda solo lo que cambió', () => {
  const valores = aValoresDeFormulario(perfil);

  /** El body vacío es `400`: hay que saber si hay algo antes de salir a la red. */
  it('sin cambios devuelve null', () => {
    expect(aCambiosDePerfil(valores, perfil)).toBeNull();
  });

  it('manda únicamente el campo tocado', () => {
    expect(aCambiosDePerfil({ ...valores, direccion: 'Otra calle 456' }, perfil)).toEqual({
      direccion: 'Otra calle 456',
    });
  });

  it('el teléfono vacío viaja: es exactamente cómo se borra', () => {
    expect(aCambiosDePerfil({ ...valores, telefono: '' }, perfil)).toEqual({ telefono: '' });
  });

  /**
   * Vaciar el DNI no es una operación que exista: mandar `dni: ""` en una cuenta
   * sin documento sería pedirle al backend que borre algo que no se borra.
   */
  it('el DNI vacío NO viaja', () => {
    const sinDni: Perfil = { ...perfil, dni: null, camposFijos: [] };
    expect(aCambiosDePerfil({ ...aValoresDeFormulario(sinDni), dni: '' }, sinDni)).toBeNull();
  });

  it('el DNI viaja cuando se escribió uno nuevo en una cuenta que no lo tenía', () => {
    const sinDni: Perfil = { ...perfil, dni: null, camposFijos: [] };
    expect(aCambiosDePerfil({ ...aValoresDeFormulario(sinDni), dni: '38180903' }, sinDni)).toEqual({
      dni: '38180903',
    });
  });

  it('junta todo lo que cambió en un solo body', () => {
    expect(
      aCambiosDePerfil({ ...valores, displayName: 'Ana P.', telefono: '3815550000' }, perfil),
    ).toEqual({ displayName: 'Ana P.', telefono: '3815550000' });
  });
});

describe('aValoresDeFormulario', () => {
  it('los null del perfil abren el formulario con inputs vacíos', () => {
    const vacio: Perfil = { ...perfil, displayName: null, telefono: null, direccion: null };
    expect(aValoresDeFormulario(vacio)).toEqual({
      displayName: '',
      telefono: '',
      direccion: '',
      dni: '38180903',
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Dar de baja la cuenta (`docs/README_FRONT_BAJA_DE_CUENTA.md`)
// ─────────────────────────────────────────────────────────────
/**
 * Los payloads son los del doc, copiados tal cual —el doc aclara que salieron de
 * la API corriendo—: si el backend cambia una forma, el test tiene que romper acá
 * y no en producción.
 */
const vistaPreviaSinDeuda = {
  camino: 'total',
  deuda: 0,
  facturas: 0,
  titulo: 'Se va a borrar tu cuenta',
  mensaje:
    'No debés nada, así que se borra todo. No vas a poder volver a entrar con esta cuenta y no se puede deshacer.',
  seBorra: [
    'Tu perfil: nombre, documento, correo, teléfono y dirección',
    'Tu forma de entrar: la contraseña y el vínculo con Google',
    'Todas tus notificaciones',
    'Tu conversación con el negocio y todos los mensajes',
    'Las imágenes de los comprobantes que mandaste',
  ],
  seRetiene: [],
  paraCompletarla: null,
  confirmacion: 'ELIMINAR',
};

const vistaPreviaConDeuda = {
  ...vistaPreviaSinDeuda,
  camino: 'con_deuda',
  deuda: 8000,
  facturas: 1,
  titulo: 'Tenés una deuda de $8000.00',
  mensaje:
    'Podés darte de baja igual y no vas a poder volver a entrar. Pero la deuda no se borra: vamos a seguir guardando tu nombre, tu documento y tu correo para poder avisarte, y nada más. Cuando termines de pagar se borra todo solo.',
  seRetiene: [
    {
      dato: 'Tu nombre y tu documento',
      motivo: 'Es lo que identifica la deuda mientras no esté saldada.',
    },
    {
      dato: 'Tu correo',
      motivo:
        'Es por donde te van a seguir llegando los avisos de lo que debés. No lo usamos para nada más.',
    },
    {
      dato: 'Tus facturas y los pagos anotados',
      motivo: 'Es el registro contable del negocio y queda aunque la deuda se salde.',
    },
  ],
  paraCompletarla:
    'Cuando saldes los $8000.00 que debés, se borra solo lo que haya quedado. No tenés que volver a pedir nada.',
};

describe('vistaPreviaDeBajaSchema', () => {
  it('acepta el camino sin deuda del doc tal cual', () => {
    const parsed = vistaPreviaDeBajaSchema.parse(vistaPreviaSinDeuda);

    expect(parsed.camino).toBe(CaminosDeBaja.TOTAL);
    expect(parsed.seBorra).toHaveLength(5);
    // Sin deuda ni compras no queda nada guardado: es el único caso en el que la
    // lista que la política obliga a mostrar está vacía.
    expect(parsed.seRetiene).toEqual([]);
    expect(parsed.paraCompletarla).toBeNull();
  });

  it('acepta el camino con deuda del doc tal cual', () => {
    const parsed = vistaPreviaDeBajaSchema.parse(vistaPreviaConDeuda);

    expect(parsed.camino).toBe(CaminosDeBaja.CON_DEUDA);
    expect(parsed.seRetiene).toHaveLength(3);
    expect(parsed.paraCompletarla).toContain('se borra solo');
  });

  /** Sin deuda pero con compras hechas: cambia una sola cosa. */
  it('el camino total también puede retener datos', () => {
    const parsed = vistaPreviaDeBajaSchema.parse({
      ...vistaPreviaSinDeuda,
      facturas: 1,
      seRetiene: [
        {
          dato: 'El registro de tus compras',
          motivo:
            'Queda en la contabilidad del negocio pero sin tu nombre ni ningún dato tuyo: no hay forma de volver a vincularlo con vos.',
        },
      ],
    });

    expect(parsed.camino).toBe(CaminosDeBaja.TOTAL);
    expect(parsed.seRetiene).toHaveLength(1);
  });

  /**
   * Un camino nuevo del backend no puede dejar a alguien sin poder borrar su
   * cuenta: es justo lo que Google Play exige que exista.
   */
  it('un camino que la app no conoce no rompe la pantalla', () => {
    expect(vistaPreviaDeBajaSchema.parse({ ...vistaPreviaSinDeuda, camino: 'diferido' }).camino).toBe(
      'diferido',
    );
  });
});

describe('bajaHechaSchema', () => {
  it('acepta la despedida sin deuda del doc tal cual', () => {
    const parsed = bajaHechaSchema.parse({
      camino: 'total',
      titulo: 'Listo, tu cuenta se borró',
      mensaje:
        'No quedó ningún dato tuyo. Si algún día querés volver, vas a tener que registrarte de nuevo.',
      deuda: 0,
      avisosA: null,
      sesionCerrada: true,
    });

    expect(parsed.avisosA).toBeNull();
    expect(parsed.sesionCerrada).toBe(true);
  });

  it('acepta la despedida con deuda del doc tal cual', () => {
    const parsed = bajaHechaSchema.parse({
      camino: 'con_deuda',
      titulo: 'Tu cuenta quedó dada de baja',
      mensaje:
        'Todavía debés $8000.00. Guardamos tu nombre, tu documento y tu correo solo para poder avisarte, y nada más. Cuando termines de pagar se borra todo solo.',
      deuda: 8000,
      avisosA: 'zoraida@mail.com',
      sesionCerrada: true,
    });

    expect(parsed.avisosA).toBe('zoraida@mail.com');
  });
});

describe('confirmacionCoincide', () => {
  /**
   * Se acepta con espacios y en minúscula, igual que el backend: el teclado del
   * teléfono corrige solo y pelear con eso no protege de nada.
   */
  it('no distingue mayúsculas ni espacios de los costados', () => {
    expect(confirmacionCoincide('ELIMINAR', 'ELIMINAR')).toBe(true);
    expect(confirmacionCoincide(' eliminar ', 'ELIMINAR')).toBe(true);
    expect(confirmacionCoincide('Eliminar', 'ELIMINAR')).toBe(true);
  });

  it('no alcanza con otra palabra ni con el campo vacío', () => {
    expect(confirmacionCoincide('', 'ELIMINAR')).toBe(false);
    expect(confirmacionCoincide('borrar', 'ELIMINAR')).toBe(false);
    expect(confirmacionCoincide('elimina', 'ELIMINAR')).toBe(false);
  });

  /**
   * La palabra sale de la respuesta y **no está escrita en el front**: el día que
   * el backend la cambie, la pantalla la sigue sin que haya que tocar nada.
   */
  it('sigue la palabra que mande el servidor, sea cual sea', () => {
    expect(confirmacionCoincide('borrar mi cuenta', 'BORRAR MI CUENTA')).toBe(true);
    expect(confirmacionCoincide('ELIMINAR', 'BORRAR MI CUENTA')).toBe(false);
  });
});

describe('quedanDatos', () => {
  const despedida = {
    camino: 'total',
    titulo: 'Listo',
    mensaje: 'No quedó nada.',
    deuda: 0,
    avisosA: null,
    sesionCerrada: true,
  };

  it('sin correo de avisos y sin deuda no quedó nada', () => {
    expect(quedanDatos(despedida)).toBe(false);
  });

  it('con un correo al que le van a escribir, sí', () => {
    expect(quedanDatos({ ...despedida, avisosA: 'zoraida@mail.com', deuda: 8000 })).toBe(true);
  });
});
