import {
  esCuentaDadaDeBaja,
  esErrorDePerfilIncompleto,
  getApiErrorMessage,
  getApiErrorStatus,
} from './apiError';

/** Arma un error de RTK Query con la forma que devuelve la API. */
function apiError(status: number, data: unknown) {
  return { status, data } as const;
}

describe('getApiErrorStatus', () => {
  it('devuelve el status para poder decidir la reacción', () => {
    // El 403 esconde un apartado entero y el 404 manda de vuelta al listado: son
    // reacciones distintas, y lo único que las separa es el número.
    expect(
      getApiErrorStatus(apiError(403, { message: 'No tenés permiso para esta acción.' })),
    ).toBe(403);
    expect(getApiErrorStatus(apiError(404, { message: 'No encontramos ese cliente.' }))).toBe(404);
  });

  it('devuelve null cuando el fallo no llegó a tener status', () => {
    expect(getApiErrorStatus({ status: 'FETCH_ERROR', error: 'falló' })).toBeNull();
    expect(getApiErrorStatus({ message: 'error de JS' })).toBeNull();
    expect(getApiErrorStatus(undefined)).toBeNull();
  });
});

describe('getApiErrorMessage', () => {
  it('muestra el message del backend tal cual: ya viene redactado', () => {
    const error = apiError(400, {
      message: 'El período termina antes de empezar: revisá las fechas.',
    });
    expect(getApiErrorMessage(error)).toBe(
      'El período termina antes de empezar: revisá las fechas.',
    );
  });

  it('no pierde el detalle que solo sabe el backend', () => {
    // "La fecha de inicio no existe: 2026-02-30." no se puede deducir de un 400:
    // por eso el texto del servidor gana siempre.
    const error = apiError(400, { message: 'La fecha de inicio no existe: 2026-02-30.' });
    expect(getApiErrorMessage(error)).toBe('La fecha de inicio no existe: 2026-02-30.');
  });

  it('cae a un texto por status cuando no vino message', () => {
    expect(getApiErrorMessage(apiError(403, {}))).toBe('No tenés permiso para esta acción.');
    expect(getApiErrorMessage(apiError(401, {}))).toBe('Tu sesión expiró. Volvé a iniciar sesión.');
    expect(getApiErrorMessage(apiError(500, {}))).toBe(
      'El servidor no está respondiendo. Intentá más tarde.',
    );
  });

  it('no se rompe con un body que no es de la API', () => {
    // Un 502 de nginx devuelve HTML: leer un error nunca puede tirar.
    expect(getApiErrorMessage(apiError(502, '<html>Bad Gateway</html>'))).toBe(
      'El servidor no está respondiendo. Intentá más tarde.',
    );
    expect(getApiErrorMessage(apiError(500, null))).toBe(
      'El servidor no está respondiendo. Intentá más tarde.',
    );
  });

  it('traduce los fallos de red', () => {
    expect(getApiErrorMessage({ status: 'FETCH_ERROR', error: 'Network request failed' })).toBe(
      'No pudimos conectarnos. Revisá tu conexión a internet.',
    );
    expect(getApiErrorMessage({ status: 'TIMEOUT_ERROR', error: 'timeout' })).toBe(
      'La solicitud tardó demasiado. Intentá de nuevo.',
    );
  });

  it('devuelve null si no hay error', () => {
    expect(getApiErrorMessage(undefined)).toBeNull();
  });
});

describe('esErrorDePerfilIncompleto — los dos 403 que hay que separar', () => {
  it('reconoce el del DNI: la reacción es volver al cartel, no una pantalla de error', () => {
    expect(
      esErrorDePerfilIncompleto(
        apiError(403, { message: 'Para usar la app necesitás cargar tu DNI en tu perfil.' }),
      ),
    ).toBe(true);
  });

  it('NO confunde el de permisos, que sí es una pantalla de error', () => {
    expect(
      esErrorDePerfilIncompleto(apiError(403, { message: 'No tenés permiso para esta acción.' })),
    ).toBe(false);
  });

  it('no reacciona a otros status ni a un 403 sin mensaje', () => {
    expect(esErrorDePerfilIncompleto(apiError(401, { message: 'Falta el DNI' }))).toBe(false);
    expect(esErrorDePerfilIncompleto(apiError(403, {}))).toBe(false);
    expect(esErrorDePerfilIncompleto(apiError(403, '<html>Forbidden</html>'))).toBe(false);
    expect(esErrorDePerfilIncompleto(undefined)).toBe(false);
  });
});

describe('esCuentaDadaDeBaja — los dos 401 que hay que separar', () => {
  /** El mensaje exacto del backend (`README_FRONT_BAJA_DE_CUENTA.md` §5). */
  const DADA_DE_BAJA =
    'Esta cuenta está dada de baja. Si tenías algo pendiente, escribinos para resolverlo.';

  /**
   * Los cuatro caminos por los que se puede volver a intentar entrar contestan
   * este mismo texto, así que alcanza con reconocerlo una vez.
   */
  it('reconoce el de la cuenta dada de baja', () => {
    expect(esCuentaDadaDeBaja(apiError(401, { message: DADA_DE_BAJA }))).toBe(true);
  });

  /**
   * La reacción es la contraria: al de sesión vencida se lo arregla volviendo a
   * entrar, y al otro no lo arregla nadie desde el login.
   */
  it('NO confunde el 401 de sesión vencida', () => {
    expect(
      esCuentaDadaDeBaja(apiError(401, { message: 'Tu sesión expiró. Volvé a iniciar sesión.' })),
    ).toBe(false);
    expect(esCuentaDadaDeBaja(apiError(401, {}))).toBe(false);
  });

  it('no reacciona a otros status ni a una respuesta que no es JSON', () => {
    expect(esCuentaDadaDeBaja(apiError(403, { message: DADA_DE_BAJA }))).toBe(false);
    expect(esCuentaDadaDeBaja(apiError(401, '<html>Unauthorized</html>'))).toBe(false);
    expect(esCuentaDadaDeBaja(undefined)).toBe(false);
  });

  /**
   * El texto se sigue mostrando tal cual: lo que este chequeo decide es DÓNDE se
   * muestra, no qué dice.
   */
  it('el mensaje que se muestra sigue siendo el del backend', () => {
    expect(getApiErrorMessage(apiError(401, { message: DADA_DE_BAJA }))).toBe(DADA_DE_BAJA);
  });
});
