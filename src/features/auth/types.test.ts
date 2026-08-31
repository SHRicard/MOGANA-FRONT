import {
  estaBloqueado,
  EstadosAcceso,
  forgotPasswordSchema,
  loginSchema,
  nuevaClaveSchema,
  verificarCorreoSchema,
  registerSchema,
  Roles,
  toEstadoAcceso,
  toRol,
  toUser,
  userApiSchema,
  userSchema,
  type User,
} from './types';

/** Devuelve los mensajes de error por campo, para asertar sin acoplarse a Zod. */
function errorsOf(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((issue) => String(issue.path[0])) ?? [];
}

describe('loginSchema — entrar', () => {
  const credenciales = { email: 'ana@mail.com', password: 'loquesea' };

  it('acepta credenciales válidas', () => {
    expect(loginSchema.safeParse(credenciales).success).toBe(true);
  });

  it('normaliza el email a minúsculas y sin espacios', () => {
    const result = loginSchema.safeParse({ ...credenciales, email: '  ANA@Mail.com ' });
    expect(result.success && result.data.email).toBe('ana@mail.com');
  });

  it('rechaza un email inválido', () => {
    expect(errorsOf(loginSchema.safeParse({ ...credenciales, email: 'no-es-un-mail' }))).toContain(
      'email',
    );
  });

  it('NO exige contraseña fuerte: un usuario viejo tiene que poder intentar entrar', () => {
    expect(loginSchema.safeParse({ ...credenciales, password: 'abc' }).success).toBe(true);
  });

  /**
   * El DNI dejó de ser una forma de entrar (`docs/flujo_login.md`). Si se colara
   * en el body, la API contesta `400`, así que el schema no puede dejarlo pasar.
   */
  it('no deja pasar un dni al body', () => {
    const result = loginSchema.safeParse({ ...credenciales, dni: '38180903' });
    expect(result.success && 'dni' in result.data).toBe(false);
  });
});

describe('registerSchema', () => {
  const alta = {
    email: 'ana@mail.com',
    displayName: 'Ana',
    password: 'unaClave123',
    confirmPassword: 'unaClave123',
  };

  it('acepta un alta con email', () => {
    expect(registerSchema.safeParse(alta).success).toBe(true);
  });

  /** Pedir el documento en el alta espanta gente: se pide adentro de la app. */
  it('no deja pasar un dni: mandarlo al backend es 400', () => {
    const result = registerSchema.safeParse({ ...alta, dni: '38180903' });
    expect(result.success && 'dni' in result.data).toBe(false);
  });

  it('exige el email: es la única forma de crear la cuenta', () => {
    expect(errorsOf(registerSchema.safeParse({ ...alta, email: '' }))).toContain('email');
  });

  it('marca el error en confirmPassword cuando las contraseñas no coinciden', () => {
    expect(
      errorsOf(registerSchema.safeParse({ ...alta, confirmPassword: 'otraClave123' })),
    ).toEqual(['confirmPassword']);
  });

  it('el nombre es opcional, pero con algo escrito pide al menos 2 caracteres', () => {
    expect(registerSchema.safeParse({ ...alta, displayName: '' }).success).toBe(true);
    expect(errorsOf(registerSchema.safeParse({ ...alta, displayName: 'a' }))).toContain(
      'displayName',
    );
  });
});

describe('forgotPasswordSchema', () => {
  it('solo pide un email válido', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'ana@mail.com' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false);
  });
});

describe('toUser — las dos formas en que la API manda un usuario', () => {
  /**
   * Payloads REALES del backend (capturados con curl contra el dev local).
   *
   * ⚠️ Los endpoints **no coinciden entre sí**: login manda `name`, `/users/me`
   * manda `displayName`. Es el bug que hacía fallar `getMe` con "La respuesta
   * del servidor no tiene el formato esperado": el schema exigía `name` y en
   * `/users/me` ese campo no existe.
   */
  const respuestaLogin = {
    id: '341081c6-2619-4254-a07b-d5c24978f1c2',
    name: 'Prueba Front',
    email: 'prueba@mail.com',
    dni: '99999999',
    rol: 'cliente',
    estado: 'activo',
    motivoBloqueo: null,
  };

  const respuestaMe = {
    id: '341081c6-2619-4254-a07b-d5c24978f1c2',
    email: 'prueba@mail.com',
    dni: '99999999',
    displayName: 'Prueba Front',
    googleId: null,
    rol: 'cliente',
    estado: 'activo',
    motivoBloqueo: null,
    tieneGoogle: false,
    tienePassword: true,
    createdAt: '2026-08-18T02:25:22.672Z',
    updatedAt: '2026-08-18T02:25:38.177Z',
    lastLoginAt: '2026-08-18T02:25:38.176Z',
  };

  it('valida las dos respuestas reales', () => {
    expect(userApiSchema.safeParse(respuestaLogin).success).toBe(true);
    expect(userApiSchema.safeParse(respuestaMe).success).toBe(true);
  });

  it('las deja en la MISMA forma: la app no se entera de la diferencia', () => {
    const desdeLogin = toUser(userApiSchema.parse(respuestaLogin));
    const desdeMe = toUser(userApiSchema.parse(respuestaMe));

    expect(desdeLogin).toEqual(desdeMe);
    expect(desdeMe).toEqual({
      id: '341081c6-2619-4254-a07b-d5c24978f1c2',
      name: 'Prueba Front',
      email: 'prueba@mail.com',
      dni: '99999999',
      rol: Roles.CLIENTE,
      estado: EstadosAcceso.ACTIVO,
      motivoBloqueo: null,
    });
  });

  it('lo normalizado cumple el schema con el que trabaja la app', () => {
    expect(userSchema.safeParse(toUser(userApiSchema.parse(respuestaMe))).success).toBe(true);
  });

  it('sin nombre cargado usa el usuario del email, y si no hay, el DNI', () => {
    const base = userApiSchema.parse({ ...respuestaMe, displayName: null, email: null });
    expect(toUser(base).name).toBe('99999999');
    expect(toUser({ ...base, email: 'ana@mail.com' }).name).toBe('ana');
    // Ni nombre, ni email, ni DNI: la sesión igual entra, con un título neutro.
    expect(toUser({ ...base, dni: null }).name).toBe('Tu cuenta');
  });

  /**
   * El alta y el login de una cuenta nueva ya vienen con el bloqueo puesto: la
   * pantalla del DNI se abre con eso, sin pedir nada más.
   */
  it('trae el bloqueo y su motivo tal como los manda el backend', () => {
    const user = toUser(
      userApiSchema.parse({
        ...respuestaLogin,
        dni: null,
        estado: 'bloqueado',
        motivoBloqueo: 'Para usar la app necesitás cargar tu DNI en tu perfil.',
      }),
    );

    expect(user.estado).toBe(EstadosAcceso.BLOQUEADO);
    expect(estaBloqueado(user)).toBe(true);
    expect(user.motivoBloqueo).toBe('Para usar la app necesitás cargar tu DNI en tu perfil.');
    expect(userSchema.safeParse(user).success).toBe(true);
  });

  it('un rol que la app no conoce se degrada a null, no invalida la sesión', () => {
    // Mínimo privilegio: se entra igual, pero sin ver nada de administración.
    const user = toUser(userApiSchema.parse({ ...respuestaMe, rol: 'contador' }));
    expect(user.rol).toBeNull();
    expect(userSchema.safeParse(user).success).toBe(true);
  });

  it('reconoce los tres roles del sistema', () => {
    expect(toUser(userApiSchema.parse({ ...respuestaMe, rol: 'super_admin' })).rol).toBe(
      Roles.SUPER_ADMIN,
    );
    expect(toUser(userApiSchema.parse({ ...respuestaMe, rol: 'administrador' })).rol).toBe(
      Roles.ADMINISTRADOR,
    );
  });

  it('acepta una cuenta creada con email, sin dni', () => {
    const { dni: _dni, ...sinDni } = respuestaLogin;
    const user = toUser(userApiSchema.parse({ ...sinDni, email: 'ana@mail.com' }));
    expect(user).toMatchObject({ email: 'ana@mail.com', dni: null });
  });
});

describe('toRol', () => {
  it('acota el rol crudo a los tres conocidos', () => {
    expect(toRol('super_admin')).toBe(Roles.SUPER_ADMIN);
    expect(toRol('administrador')).toBe(Roles.ADMINISTRADOR);
    expect(toRol('cliente')).toBe(Roles.CLIENTE);
  });

  it('devuelve null cuando no hay rol o no lo reconoce', () => {
    // `null` es el mínimo privilegio: nunca abre un panel de administración.
    expect(toRol(undefined)).toBeNull();
    expect(toRol(null)).toBeNull();
    expect(toRol('admin')).toBeNull();
    expect(toRol('')).toBeNull();
  });
});

describe('toEstadoAcceso — el estado que manda el backend', () => {
  it('reconoce los dos estados del contrato', () => {
    expect(toEstadoAcceso('activo')).toBe(EstadosAcceso.ACTIVO);
    expect(toEstadoAcceso('bloqueado')).toBe(EstadosAcceso.BLOQUEADO);
  });

  /**
   * Al revés que el rol, que ante la duda niega: acá el error caro es dejar a
   * alguien mirando un cartel que no puede sacar porque llegó un estado que esta
   * versión no conoce. Si de verdad está bloqueado, la API contesta `403` igual
   * y el interceptor lo devuelve al cartel; al revés no hay vuelta.
   */
  it.each([null, undefined, '', 'suspendido'])('deja pasar lo que no reconoce (%p)', (estado) => {
    expect(toEstadoAcceso(estado)).toBe(EstadosAcceso.ACTIVO);
  });
});

describe('estaBloqueado', () => {
  const user: User = {
    id: 'u1',
    name: 'Ana',
    email: 'ana@mail.com',
    dni: null,
    rol: Roles.CLIENTE,
    estado: EstadosAcceso.BLOQUEADO,
    motivoBloqueo: 'Para usar la app necesitás cargar tu DNI en tu perfil.',
  };

  it('mira el estado, NO si tiene dni', () => {
    // El día que el perfil pida un dato más, el backend cambia el estado y esto
    // sigue andando sin tocarse.
    expect(estaBloqueado(user)).toBe(true);
    expect(estaBloqueado({ ...user, estado: EstadosAcceso.ACTIVO })).toBe(false);
    expect(estaBloqueado({ ...user, estado: EstadosAcceso.ACTIVO, dni: null })).toBe(false);
  });

  /** Alcanza a todos los roles: un administrador sin DNI tampoco entra. */
  it.each([Roles.ADMINISTRADOR, Roles.SUPER_ADMIN])('vale también para un %s', (rol) => {
    expect(estaBloqueado({ ...user, rol })).toBe(true);
  });

  it('sin sesión no bloquea nada: sería una app que no deja ni entrar', () => {
    expect(estaBloqueado(null)).toBe(false);
  });
});

describe('el código de 6 dígitos que llega al correo', () => {
  const valida = { codigo: '482913', password: 'unaClave123', confirmPassword: 'unaClave123' };

  it('acepta el código y una contraseña que cumple las reglas', () => {
    expect(nuevaClaveSchema.safeParse(valida).success).toBe(true);
    expect(verificarCorreoSchema.safeParse({ codigo: '482913' }).success).toBe(true);
  });

  /**
   * El backend acepta el código con espacios o guiones, así que **no se limpia
   * antes de mandarlo**: normalizarlo acá sería cambiarle el valor bajo los
   * dedos a quien lo está tipeando.
   */
  it.each(['482 913', '482-913', ' 482913 '])('acepta %p y lo manda tal cual', (codigo) => {
    const result = verificarCorreoSchema.safeParse({ codigo });
    expect(result.success).toBe(true);
    expect(result.success && result.data.codigo).toBe(codigo.trim());
  });

  it('rechaza lo que no tiene 6 dígitos', () => {
    expect(verificarCorreoSchema.safeParse({ codigo: '4829' }).success).toBe(false);
    expect(verificarCorreoSchema.safeParse({ codigo: '4829134' }).success).toBe(false);
    expect(verificarCorreoSchema.safeParse({ codigo: 'abcdef' }).success).toBe(false);
    expect(verificarCorreoSchema.safeParse({ codigo: '' }).success).toBe(false);
  });

  it('pide las mismas reglas de contraseña que el registro', () => {
    expect(errorsOf(nuevaClaveSchema.safeParse({ ...valida, password: 'corta' }))).toContain(
      'password',
    );
  });

  /**
   * La repetición se valida **solo acá**: la API recibe una sola contraseña. Es
   * la única red contra un error de tipeo en algo que no se ve mientras se
   * escribe, y por eso no puede faltar.
   */
  it('marca el error en confirmPassword cuando no coinciden', () => {
    expect(
      errorsOf(nuevaClaveSchema.safeParse({ ...valida, confirmPassword: 'otraClave123' })),
    ).toEqual(['confirmPassword']);
  });

  /**
   * El email no es parte del formulario: viene de la pantalla anterior, la que
   * pidió el código, para que nadie lo tipee dos veces.
   */
  it('no espera el email', () => {
    const result = nuevaClaveSchema.safeParse({ ...valida, email: 'ana@mail.com' });
    expect(result.success && 'email' in result.data).toBe(false);
  });
});
