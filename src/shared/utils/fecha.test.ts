import {
  DIAS_SEMANA,
  enDiasPantalla,
  esAnteriorAPantalla,
  esHoyOPosteriorPantalla,
  formatFecha,
  formatFechaLargaPantalla,
  generarMes,
  hoyPantalla,
  esMesPosteriorApi,
  mesActualApi,
  mesApiSchema,
  mesCortoApi,
  moverMeses,
  moverMesApi,
  nombreDeMesApi,
  parseFechaPantalla,
  tituloDeMes,
  tituloDeMesApi,
} from './fecha';

describe('parseFechaPantalla', () => {
  it('convierte al formato de la API', () => {
    expect(parseFechaPantalla('17/09/2026')).toBe('2026-09-17');
    expect(formatFecha('2026-09-17')).toBe('17/09/2026');
  });

  it('rechaza un día que no existe', () => {
    // `fromFormat` es estricto: un regex de forma daría por buena esta fecha.
    expect(parseFechaPantalla('30/02/2026')).toBeNull();
    expect(parseFechaPantalla('45/13/2026')).toBeNull();
  });
});

describe('esHoyOPosteriorPantalla', () => {
  it('acepta hoy y lo que viene después', () => {
    // Se compara por DÍA: una fecha de hoy tiene que pasar a cualquier hora.
    expect(esHoyOPosteriorPantalla(hoyPantalla())).toBe(true);
    expect(esHoyOPosteriorPantalla(enDiasPantalla(1))).toBe(true);
    expect(esHoyOPosteriorPantalla(enDiasPantalla(365))).toBe(true);
  });

  it('rechaza ayer: una factura no puede nacer vencida', () => {
    expect(esHoyOPosteriorPantalla(enDiasPantalla(-1))).toBe(false);
  });

  it('rechaza lo que no es una fecha', () => {
    expect(esHoyOPosteriorPantalla('')).toBe(false);
    expect(esHoyOPosteriorPantalla('30/02/2099')).toBe(false);
  });
});

describe('generarMes', () => {
  // Septiembre de 2026 arranca un martes, así que la grilla empieza el lunes
  // 31/08 y termina el domingo 11/10.
  const septiembre = generarMes('17/09/2026');

  it('dibuja siempre seis semanas completas', () => {
    // Fijo a propósito: si el alto cambiara según el mes, los botones de abajo
    // se moverían bajo el dedo al pasar de página.
    expect(septiembre).toHaveLength(42);
    expect(septiembre.length % DIAS_SEMANA.length).toBe(0);
  });

  it('arranca en lunes y completa hasta el domingo', () => {
    expect(septiembre[0]?.fecha).toBe('31/08/2026');
    expect(septiembre[41]?.fecha).toBe('11/10/2026');
  });

  it('marca como relleno los días que no son del mes', () => {
    expect(septiembre[0]?.deOtroMes).toBe(true);
    expect(septiembre[41]?.deOtroMes).toBe(true);

    const primeroDeSeptiembre = septiembre.find((dia) => dia.fecha === '01/09/2026');
    expect(primeroDeSeptiembre?.deOtroMes).toBe(false);
    expect(primeroDeSeptiembre?.numero).toBe(1);
  });

  it('con una fecha a medio escribir se dibuja igual', () => {
    // El calendario no puede quedar en blanco porque el input todavía no vale.
    expect(generarMes('')).toHaveLength(42);
    expect(generarMes('17/')).toHaveLength(42);
  });
});

describe('tituloDeMes', () => {
  it('escribe el mes en castellano, sin depender del idioma del celular', () => {
    // A propósito no sale de `Intl`: en Android el resultado depende del
    // dispositivo, y el mismo calendario diría "September" en otro teléfono.
    expect(tituloDeMes('17/09/2026')).toBe('Septiembre 2026');
    expect(tituloDeMes('01/01/2027')).toBe('Enero 2027');
  });
});

describe('moverMeses', () => {
  it('hojea el calendario, no la fecha elegida', () => {
    expect(moverMeses('17/09/2026', -1)).toBe('01/08/2026');
    expect(moverMeses('17/09/2026', 1)).toBe('01/10/2026');
  });

  it('no inventa un 31 de febrero', () => {
    // Devuelve el día 1: lo que se mueve es la página del calendario.
    expect(moverMeses('31/01/2026', 1)).toBe('01/02/2026');
  });

  it('cruza el año', () => {
    expect(moverMeses('15/12/2026', 1)).toBe('01/01/2027');
  });
});

describe('esAnteriorAPantalla', () => {
  it('compara por día', () => {
    expect(esAnteriorAPantalla('16/09/2026', '17/09/2026')).toBe(true);
    expect(esAnteriorAPantalla('17/09/2026', '17/09/2026')).toBe(false);
    expect(esAnteriorAPantalla('18/09/2026', '17/09/2026')).toBe(false);
  });
});

describe('formatFechaLargaPantalla', () => {
  it('escribe la fecha entera para que no se lea al revés', () => {
    expect(formatFechaLargaPantalla('17/09/2026')).toBe('Jueves 17 de septiembre de 2026');
  });

  it('devuelve el original si no puede parsearla', () => {
    expect(formatFechaLargaPantalla('17/')).toBe('17/');
  });
});

// ─────────────────────────────────────────────────────────────
// Meses de la API (AAAA-MM)
// ─────────────────────────────────────────────────────────────

describe('mesApiSchema', () => {
  it('acepta un mes real', () => {
    expect(mesApiSchema.parse('2026-08')).toBe('2026-08');
  });

  /**
   * Los tres que el backend rechaza con un 400 ("El mes va como 2026-08."). El
   * `2026-8` es el que más engaña: un regex de forma flojo lo daría por bueno.
   */
  it('rechaza los que la API rechaza', () => {
    expect(() => mesApiSchema.parse('2026-13')).toThrow();
    expect(() => mesApiSchema.parse('2026-8')).toThrow();
    expect(() => mesApiSchema.parse('agosto')).toThrow();
  });
});

describe('moverMesApi', () => {
  it('corre un mes para atrás y para adelante', () => {
    expect(moverMesApi('2026-08', -1)).toBe('2026-07');
    expect(moverMesApi('2026-08', 1)).toBe('2026-09');
  });

  it('cruza el año sin ayuda', () => {
    expect(moverMesApi('2026-01', -1)).toBe('2025-12');
    expect(moverMesApi('2026-12', 1)).toBe('2027-01');
  });
});

describe('nombres de mes', () => {
  it('los tres formatos salen del mismo mes', () => {
    expect(tituloDeMesApi('2026-08')).toBe('Agosto 2026');
    expect(nombreDeMesApi('2026-08')).toBe('agosto');
    expect(mesCortoApi('2026-08')).toBe('Ago');
  });

  /** Nunca se rompe la pantalla por un mes raro: se muestra tal cual vino. */
  it('devuelve el original si no puede parsearlo', () => {
    expect(tituloDeMesApi('agosto')).toBe('agosto');
    expect(mesCortoApi('')).toBe('');
  });
});

describe('esMesPosteriorApi', () => {
  it('compara por mes', () => {
    expect(esMesPosteriorApi('2026-09', '2026-08')).toBe(true);
    expect(esMesPosteriorApi('2026-08', '2026-08')).toBe(false);
    expect(esMesPosteriorApi('2026-07', '2026-08')).toBe(false);
  });

  it('cruza el año', () => {
    expect(esMesPosteriorApi('2027-01', '2026-12')).toBe(true);
  });

  /** Con un mes inválido: "no me consta que se pase", igual que su par de días. */
  it('con un mes inválido no afirma nada', () => {
    expect(esMesPosteriorApi('agosto', '2026-08')).toBe(false);
  });
});

describe('mesActualApi', () => {
  it('tiene la forma que espera la API', () => {
    expect(mesActualApi()).toMatch(/^\d{4}-\d{2}$/);
  });
});
