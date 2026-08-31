import {
  buscarEspeciePorNombre,
  catalogoEspeciesSchema,
  claveDeEspecie,
  especieFormSchema,
  filtrarEspecies,
  sePuedeBorrar,
  textoUsos,
  yaExisteEspecie,
  type Especie,
} from './types';

/** El catálogo del doc, tal cual. */
const CATALOGO = {
  total: 4,
  datos: [
    { id: 'dd14', nombre: 'Agua', usos: 7, createdAt: '2026-08-21T14:18:01.594Z' },
    { id: '24a1', nombre: 'Cerveza', usos: 0, createdAt: '2026-08-21T14:21:00.956Z' },
    { id: '81c9', nombre: 'Envío', usos: 2, createdAt: '2026-08-21T14:18:01.608Z' },
    { id: '8d01', nombre: 'Gaseosa', usos: 1, createdAt: '2026-08-21T14:18:01.604Z' },
  ],
};

const ESPECIES: readonly Especie[] = catalogoEspeciesSchema.parse(CATALOGO).datos;

describe('catalogoEspeciesSchema', () => {
  it('acepta el catálogo del doc', () => {
    expect(catalogoEspeciesSchema.parse(CATALOGO)).toEqual(CATALOGO);
  });

  /** El catálogo arranca vacío: es como empieza todo negocio, no un error. */
  it('acepta un catálogo vacío', () => {
    expect(() => catalogoEspeciesSchema.parse({ total: 0, datos: [] })).not.toThrow();
  });
});

describe('claveDeEspecie', () => {
  /**
   * La misma regla que la base: minúsculas, sin tildes y sin espacios de más.
   * Es lo que hace que "Gaseosa", "gaseosa " y "Gaséosa" sean una sola especie.
   */
  it('ignora mayúsculas, tildes y espacios de más', () => {
    expect(claveDeEspecie('Gaseosa')).toBe('gaseosa');
    expect(claveDeEspecie('GASEOSA')).toBe('gaseosa');
    expect(claveDeEspecie('  gaseosa  ')).toBe('gaseosa');
    expect(claveDeEspecie('Gaséosa')).toBe('gaseosa');
    expect(claveDeEspecie('Agua  mineral')).toBe('agua mineral');
  });

  /**
   * **Los plurales no se tocan.** Adivinar eso terminaría uniendo cosas que no
   * van juntas, y el catálogo es chico como para ver el duplicado y renombrar.
   */
  it('no une plurales', () => {
    expect(claveDeEspecie('gaseosa')).not.toBe(claveDeEspecie('gaseosas'));
  });
});

describe('filtrarEspecies', () => {
  it('encuentra sin distinguir tildes ni mayúsculas', () => {
    expect(filtrarEspecies(ESPECIES, 'envio').map((e) => e.nombre)).toEqual(['Envío']);
    expect(filtrarEspecies(ESPECIES, 'GASE').map((e) => e.nombre)).toEqual(['Gaseosa']);
  });

  it('sin texto devuelve el catálogo entero', () => {
    expect(filtrarEspecies(ESPECIES, '   ')).toHaveLength(4);
  });
});

describe('buscarEspeciePorNombre', () => {
  /** Es lo que evita ofrecer "crear Gaseosa" cuando ya existe `gaseosa`. */
  it('reconoce la que ya está aunque se escriba distinto', () => {
    expect(buscarEspeciePorNombre(ESPECIES, ' GASEOSA ')?.id).toBe('8d01');
  });

  it('no encuentra la que no está', () => {
    expect(buscarEspeciePorNombre(ESPECIES, 'Vino')).toBeUndefined();
  });
});

describe('yaExisteEspecie', () => {
  it('avisa del duplicado', () => {
    expect(yaExisteEspecie(ESPECIES, 'gaseosa')).toBe(true);
    expect(yaExisteEspecie(ESPECIES, 'Vino')).toBe(false);
  });

  /**
   * Cambiarle solo las mayúsculas a la misma especie —"gaseosa" → "Gaseosa"—
   * **no** es un choque consigo misma: eso se puede arreglar siempre.
   */
  it('no se choca consigo misma al renombrar', () => {
    expect(yaExisteEspecie(ESPECIES, 'GASEOSA', '8d01')).toBe(false);
    expect(yaExisteEspecie(ESPECIES, 'Agua', '8d01')).toBe(true);
  });
});

describe('sePuedeBorrar', () => {
  /**
   * Solo la que no se usó nunca: borrar una en uso dejaría renglones sin
   * clasificar y facturas que ya no se pueden explicar.
   */
  it('solo la que no se usó nunca', () => {
    expect(sePuedeBorrar(ESPECIES[1] as Especie)).toBe(true);
    expect(sePuedeBorrar(ESPECIES[0] as Especie)).toBe(false);
  });
});

describe('textoUsos', () => {
  it('concuerda el singular y no dice "0 renglones"', () => {
    expect(textoUsos(0)).toBe('Sin usar');
    expect(textoUsos(1)).toBe('En 1 renglón');
    expect(textoUsos(7)).toBe('En 7 renglones');
  });
});

describe('especieFormSchema', () => {
  it('acepta un nombre normal', () => {
    expect(especieFormSchema.safeParse({ nombre: 'Gaseosa' }).success).toBe(true);
  });

  /** Los mismos topes del backend, para marcar el campo en vez de gastar un request. */
  it('rechaza el nombre demasiado corto o demasiado largo', () => {
    expect(especieFormSchema.safeParse({ nombre: 'a' }).success).toBe(false);
    expect(especieFormSchema.safeParse({ nombre: '  ' }).success).toBe(false);
    expect(especieFormSchema.safeParse({ nombre: 'x'.repeat(61) }).success).toBe(false);
  });

  it('recorta los espacios de los costados', () => {
    const resultado = especieFormSchema.safeParse({ nombre: '  Gaseosa  ' });
    expect(resultado.success && resultado.data.nombre).toBe('Gaseosa');
  });
});
