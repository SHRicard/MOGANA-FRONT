import { z } from 'zod';
import { Roles, type Rol } from '@/features/auth';
import { usuarioSchema } from '@/features/usuarios';
import { fechaApiSchema } from '@/shared/utils';

/**
 * **El panel del sistema** (`docs/README_FRONT_SUPER_ADMIN.md`).
 *
 * ⚠️ Esto NO es el panel del negocio. El super admin puede todo lo que puede el
 * administrador —la facturación, las métricas, la bandeja de mensajes— y eso ya
 * vive en `@/features/admin`, bajo `/api/admin/*`, con su mismo token. Acá está
 * **lo otro**: el sistema. El estado de la instalación, todas las cuentas (las
 * tres, no solo los clientes), mover a alguien de rol y el historial de esos
 * movimientos.
 *
 * ⚠️ **Nada de plata acá adentro, a propósito.** Lo facturado y lo cobrado lo
 * contesta `GET /api/admin/metricas`; tener dos pantallas con los mismos números
 * calculados distinto termina siempre en dos números que no coinciden y nadie
 * sabe cuál creer.
 *
 * Los cinco endpoints piden rol `super_admin`: con otro es `403`, sin token
 * `401`.
 */

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────
/**
 * Renglones por página de la auditoría.
 *
 * Ocho, igual que el listado de cuentas: una página se recorre de un vistazo y
 * se pasa de página con el paginador fijo abajo. La API acepta de 1 a 100 y usa
 * 20 si no se le manda nada.
 */
export const AUDITORIA_LIMITE = 8;

/** Largo máximo del motivo con el que se cambia un rol. Lo impone el backend. */
export const MAX_LARGO_MOTIVO_DE_ROL = 300;

// ─────────────────────────────────────────────────────────────
// §3 — El tablero del sistema
// ─────────────────────────────────────────────────────────────
/**
 * Cuánto del store está usado, según **el servidor**.
 *
 * ⚠️ Se guarda como `string` crudo y no como un `z.enum`: los umbrales son
 * configurables del otro lado (`STORE_UMBRAL_ALTO`, `STORE_UMBRAL_CRITICO`) y un
 * nivel nuevo no puede tirar abajo el tablero entero. Para pintarlo va
 * `semaforoDelStore()`, que lo que no conoce lo trata como holgado.
 */
export const NivelesDelStore = {
  ALTO: 'alto',
  CRITICO: 'critico',
} as const;

export const storeDelSistemaSchema = z.object({
  /**
   * ⚠️ **Puede ser `null` con el `store` presente**: quiere decir "no hay contra
   * qué medir" —ni cuota de Cloudinary ni `STORE_LIMITE_MB`—, y ahí `nivel`
   * viene `null` también. No es "está todo bien": es "no se midió".
   */
  porcentajeUsado: z.number().nullish(),
  nivel: z.string().nullish(),
  /** Estos dos sí son exactos siempre: salen de la base, no de un tercero. */
  comprobantes: z.number(),
  bytes: z.number(),
  liberables: z.number(),
  bytesLiberables: z.number(),
});

export const resumenDelSistemaSchema = z.object({
  /** El día **del servidor**, no el del teléfono. */
  hoy: fechaApiSchema,

  cuentas: z.object({
    total: z.number(),
    /**
     * Cuántas hay de cada rol. Se lee como un diccionario abierto y no con los
     * tres roles fijos: un rol nuevo del backend suma una fila, no rompe el
     * tablero.
     */
    porRol: z.record(z.string(), z.number()),
    activas: z.number(),
    /**
     * ⚠️ **No es una alarma.** Es quien se registró y nunca cargó el DNI: el
     * embudo del alta. Un número alto dice que hay que mejorar el onboarding,
     * no que algo se rompió.
     */
    bloqueadas: z.number(),
    /**
     * ⚠️ `conGoogle` y `conPassword` **se pisan**: una cuenta puede tener las
     * dos, así que no suman `total` y no van en una torta.
     */
    conGoogle: z.number(),
    conPassword: z.number(),
    emailSinVerificar: z.number(),
    sinFiado: z.number(),
  }),

  altas: z.object({ hoy: z.number(), ultimos7: z.number(), ultimos30: z.number() }),

  /**
   * ⚠️ Sale de `lastLoginAt`, o sea **de los logins**. Quien deja la sesión
   * abierta y entra todos los días sin volver a loguearse no aparece acá. Por
   * eso la pantalla dice "entradas", no "usuarios activos": lo segundo promete
   * otra cosa.
   */
  actividad: z.object({
    activos7: z.number(),
    activos30: z.number(),
    nuncaEntraron: z.number(),
    ultimoIngreso: z.string().nullish(),
  }),

  /**
   * ⚠️ **Puede venir `null` entero**: Cloudinary sin configurar, o que no
   * contestó. La pantalla se dibuja igual con esa tarjeta en "no se pudo medir"
   * — el super admin entró justamente a ver si el sistema está bien, y una
   * pantalla en blanco porque un tercero está lento es lo peor que se le puede
   * dar.
   */
  store: storeDelSistemaSchema.nullish(),

  servidor: z.object({
    entorno: z.string(),
    /** `null` = `APP_VERSION` no está puesta del otro lado. Se dice, no se esconde. */
    version: z.string().nullish(),
    uptimeSegundos: z.number(),
    arrancadoEn: z.string(),
    /** La hora del servidor, para compararla contra el reloj del que mira. */
    hora: z.string(),
  }),
});

export type StoreDelSistema = z.infer<typeof storeDelSistemaSchema>;
export type ResumenDelSistema = z.infer<typeof resumenDelSistemaSchema>;

/**
 * Cómo se pinta la tarjeta del store.
 *
 * `sin_medir` no es un estado del store: es que **no hay contra qué medirlo**.
 * Va aparte de `holgado` porque pintarlo verde diría "está bien" cuando lo
 * cierto es que nadie lo sabe.
 */
export const SemaforosDelStore = {
  CRITICO: 'critico',
  ALTO: 'alto',
  HOLGADO: 'holgado',
  SIN_MEDIR: 'sin_medir',
} as const;

export type SemaforoDelStore = (typeof SemaforosDelStore)[keyof typeof SemaforosDelStore];

/**
 * El semáforo del store, **decidido por `nivel` y no por el porcentaje**.
 *
 * Los umbrales son configurables en el servidor. Si el front los repitiera, el
 * día que se muevan la pantalla diría "todo bien" mientras salen los avisos:
 *
 * ```ts
 * semaforoDelStore(store);                            // ✅
 * store.porcentajeUsado > 90 ? 'rojo' : 'verde';      // ❌ nunca
 * ```
 */
export function semaforoDelStore(store: StoreDelSistema): SemaforoDelStore {
  if (store.nivel === NivelesDelStore.CRITICO) {
    return SemaforosDelStore.CRITICO;
  }
  if (store.nivel === NivelesDelStore.ALTO) {
    return SemaforosDelStore.ALTO;
  }
  // Sin nivel Y sin porcentaje: no se midió. Con porcentaje y sin nivel —o con
  // un nivel que esta versión no conoce— se cae del lado de "está holgado", que
  // es lo que el backend estaría diciendo al no marcar nada.
  if (store.nivel == null && store.porcentajeUsado == null) {
    return SemaforosDelStore.SIN_MEDIR;
  }
  return SemaforosDelStore.HOLGADO;
}

/** Qué dice la tarjeta del store al lado de la barra. */
export const SEMAFORO_DEL_STORE_LABEL: Record<SemaforoDelStore, string> = {
  critico: 'Casi sin lugar',
  alto: 'Se está llenando',
  holgado: 'Tenés lugar',
  sin_medir: 'Sin medir',
};

/**
 * A partir de qué diferencia contra el reloj del teléfono vale la pena avisar
 * que el servidor tiene la hora corrida.
 *
 * Dos minutos: medio sistema depende de qué día es hoy —los vencimientos, los
 * meses de las métricas, el cron de las 8— y un servidor corrido produce números
 * que no cierran **sin que nada falle**. Por debajo de eso es la latencia de la
 * request y el redondeo del reloj del teléfono.
 */
export const DESFASE_QUE_IMPORTA_MS = 2 * 60 * 1000;

/**
 * Cuánto se aparta la hora del servidor de la de este teléfono, en milisegundos
 * y con signo (positivo = el servidor va adelante). `null` si la hora no se
 * puede leer.
 *
 * @param ahora se pasa por parámetro para poder testearlo sin tocar el reloj.
 */
export function desfaseDeReloj(horaDelServidor: string, ahora: number = Date.now()): number | null {
  const servidor = Date.parse(horaDelServidor);
  return Number.isNaN(servidor) ? null : servidor - ahora;
}

/** `true` si esa diferencia ya merece mostrarse en pantalla. */
export function relojCorrido(horaDelServidor: string, ahora: number = Date.now()): boolean {
  const desfase = desfaseDeReloj(horaDelServidor, ahora);
  return desfase !== null && Math.abs(desfase) >= DESFASE_QUE_IMPORTA_MS;
}

/**
 * Hace cuánto que el servidor está levantado, escrito para leer: `4 d 23 h`,
 * `3 h 12 min`, `8 min`.
 *
 * Dos unidades como mucho: la pregunta es "¿se reinició hace poco?", y para eso
 * los segundos de un uptime de cinco días no aportan nada.
 */
export function formatUptime(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 60) {
    return 'menos de un minuto';
  }

  const totalMinutos = Math.floor(segundos / 60);
  const dias = Math.floor(totalMinutos / (60 * 24));
  const horas = Math.floor((totalMinutos % (60 * 24)) / 60);
  const minutos = totalMinutos % 60;

  if (dias > 0) {
    return `${dias} d ${horas} h`;
  }
  if (horas > 0) {
    return `${horas} h ${minutos} min`;
  }
  return `${minutos} min`;
}

// ─────────────────────────────────────────────────────────────
// §5 — La ficha de una cuenta
// ─────────────────────────────────────────────────────────────
/** Quien hizo algo, ya resuelto por el backend. */
export const personaDelRastroSchema = z.object({
  id: z.string(),
  displayName: z.string().nullish(),
  email: z.string().nullish(),
});

/**
 * Quién le tocó qué a esta cuenta y por qué. Los tres bloques —`cambioDeRol`,
 * `fiado` y `documento`— tienen esta misma forma y se leen igual.
 *
 * ⚠️ Los cuatro campos en `null` **no es un dato faltante**: es una cuenta a la
 * que nunca le pasó nada. Ahí el bloque se esconde en vez de mostrar cuatro
 * guiones (`hayRastro()`).
 */
export const rastroSchema = z.object({
  /** Cuándo, ISO. `null` = nunca pasó. */
  en: z.string().nullish(),
  porId: z.string().nullish(),
  /**
   * ⚠️ **Puede ser `null` con `porId` cargado**: un id que ya no resuelve a
   * ninguna cuenta. Ahí se muestra el id crudo — *"lo hizo alguien que ya no
   * está"* es información, un guion no.
   */
  por: personaDelRastroSchema.nullish(),
  /**
   * ⚠️ En `fiado`, el motivo **se borra al devolverle el fiado**: queda con
   * fecha y sin motivo, y está bien — "se lo devolvieron" no necesita
   * explicación.
   */
  motivo: z.string().nullish(),
});

export type PersonaDelRastro = z.infer<typeof personaDelRastroSchema>;
export type Rastro = z.infer<typeof rastroSchema>;

/** `true` si a esta cuenta le pasó algo. Con `false`, el bloque no se dibuja. */
export function hayRastro(rastro: Rastro): boolean {
  return (
    rastro.en != null || rastro.porId != null || rastro.por != null || rastro.motivo != null
  );
}

/**
 * Cómo se nombra a quien hizo el cambio.
 *
 * Devuelve también si **ya no está**: es la diferencia entre mostrar un nombre y
 * mostrar un uuid crudo, y la pantalla tiene que poder explicar el segundo caso.
 * `null` cuando no hay ni id (no lo hizo nadie: el bloque ni se dibuja).
 */
export function quienLoHizo(rastro: Rastro): { nombre: string; yaNoEsta: boolean } | null {
  if (rastro.por) {
    return {
      nombre: rastro.por.displayName?.trim() || rastro.por.email || rastro.por.id,
      yaNoEsta: false,
    };
  }
  return rastro.porId ? { nombre: rastro.porId, yaNoEsta: true } : null;
}

/** Un rol que esta cuenta **no** puede tomar hoy, con el porqué ya redactado. */
export const rolImposibleSchema = z.object({
  rol: z.string(),
  /** ⚠️ Es **el mismo texto** que devolvería el error. Se muestra tal cual. */
  motivo: z.string(),
});

/**
 * La ficha completa: el renglón del listado más lo que solo tiene sentido en
 * este panel.
 *
 * Se extiende del `usuarioSchema` del listado a propósito: es la misma cuenta y
 * las dos pantallas tienen que decir lo mismo de ella.
 */
export const cuentaDelSistemaSchema = usuarioSchema.extend({
  emailVerificadoEn: z.string().nullish(),
  updatedAt: z.string().nullish(),

  cambioDeRol: rastroSchema,
  fiado: rastroSchema,
  documento: rastroSchema,

  /** Para explicar el `409` **antes** de que pase. Las anuladas frenan igual. */
  facturas: z.object({ total: z.number(), vigentes: z.number(), anuladas: z.number() }),

  /**
   * El backend ya evaluó **todas** las reglas: qué se puede y qué no, con el
   * motivo escrito. `rolesPosibles` **siempre incluye el rol actual**.
   *
   * Se leen como texto y no con el enum de roles: un rol nuevo del otro lado no
   * puede tirar abajo la ficha entera. El selector recorre los que esta versión
   * conoce y cruza contra estas dos listas.
   */
  rolesPosibles: z.array(z.string()),
  rolesImposibles: z.array(rolImposibleSchema),
});

export type RolImposible = z.infer<typeof rolImposibleSchema>;
export type CuentaDelSistema = z.infer<typeof cuentaDelSistemaSchema>;

/** Una opción del selector de rol, ya resuelta contra las reglas del backend. */
export interface OpcionDeRol {
  rol: Rol;
  /** El que tiene hoy: nunca se ofrece como cambio, se muestra como actual. */
  actual: boolean;
  /**
   * Por qué no se puede pasar a este rol, tal como lo redactó el backend, o
   * `null` si se puede. **Se muestra debajo del selector, no en un tooltip**:
   * una opción gris que no se explica sola se lee como un bug.
   */
  bloqueo: string | null;
}

/**
 * Las tres opciones del selector, en orden fijo y con su bloqueo resuelto.
 *
 * Recorre los roles que **esta versión conoce** y los cruza contra
 * `rolesImposibles`: uno que la app no conoce no se ofrece, que es el resultado
 * seguro. Un rol que no está en ninguna de las dos listas se trata como
 * bloqueado sin motivo escrito: ante la duda no se ofrece.
 *
 * ⚠️ Esto **no reemplaza al manejo de errores**: la lista se calculó hace unos
 * segundos y la base pudo cambiar. El servidor valida todo de nuevo.
 */
export function opcionesDeRol(cuenta: CuentaDelSistema): readonly OpcionDeRol[] {
  return Object.values(Roles).map((rol) => {
    const imposible = cuenta.rolesImposibles.find((item) => item.rol === rol);
    const posible = cuenta.rolesPosibles.includes(rol);

    return {
      rol,
      actual: cuenta.rol === rol,
      bloqueo: imposible ? imposible.motivo : posible ? null : 'Hoy no se puede pasar a este rol.',
    };
  });
}

/** Cómo se lee el renglón de facturas: `2 facturas (1 vigente, 1 anulada)`. */
export function resumenDeFacturas(facturas: CuentaDelSistema['facturas']): string {
  if (facturas.total === 0) {
    return 'Sin facturas';
  }

  const total = facturas.total === 1 ? '1 factura' : `${facturas.total} facturas`;
  const partes = [
    facturas.vigentes === 1 ? '1 vigente' : `${facturas.vigentes} vigentes`,
    facturas.anuladas === 1 ? '1 anulada' : `${facturas.anuladas} anuladas`,
  ];

  return `${total} (${partes.join(', ')})`;
}

// ─────────────────────────────────────────────────────────────
// §6 — Cambiar el rol
// ─────────────────────────────────────────────────────────────
/**
 * El formulario del cambio: **solo el motivo**, y es obligatorio.
 *
 * A qué rol pasa no es un campo del formulario — se elige tocando el rol en la
 * ficha, y ese toque es el que abre este diálogo.
 *
 * Los textos son **los mismos que devuelve el backend** cuando el body está mal:
 * así la explicación no se escribe dos veces y no se pueden desincronizar.
 */
export const cambiarRolSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, 'Contá en una línea por qué se le cambia el rol.')
    .max(MAX_LARGO_MOTIVO_DE_ROL, 'El motivo no puede pasar de 300 caracteres.'),
});

export type CambiarRolFormValues = z.infer<typeof cambiarRolSchema>;

/** Cuerpo de `PATCH /api/super-admin/usuarios/:id/rol`. Devuelve la ficha entera. */
export type CambiarRolPayload = {
  cuentaId: string;
  rol: Rol;
  motivo: string;
};

/**
 * Qué pierde o qué gana la persona con el cambio, **en una línea y en concreto**.
 *
 * Va en el diálogo de confirmación y no es relleno: "pasa a cliente" no le dice
 * a nadie que esa persona deja de ver la facturación de todo el negocio. La
 * decisión se toma leyendo esto, no el nombre del rol.
 */
export function consecuenciaDelCambio(actual: string, nuevo: Rol): string {
  if (nuevo === Roles.CLIENTE) {
    return 'Va a perder el acceso al panel de facturación, a las métricas y a la bandeja de mensajes.';
  }
  if (nuevo === Roles.SUPER_ADMIN) {
    return 'Va a poder todo lo que podés vos: ver todas las cuentas, cambiarle el rol a cualquiera y entrar a este panel.';
  }
  // A administrador. Desde super admin es una baja —pierde este panel— y desde
  // cliente es un alta. El mismo rol de destino significa cosas opuestas.
  return actual === Roles.SUPER_ADMIN
    ? 'Deja de ver el panel del sistema: las cuentas, los cambios de rol y el historial. El panel del negocio lo sigue teniendo entero.'
    : 'Va a poder ver la facturación de todo el negocio, las métricas y los mensajes de los clientes.';
}

/**
 * ⚠️ El cambio **pega en el request siguiente de esa persona, no en su próximo
 * login**: el rol se lee de la base en cada request y no del token. Si tiene la
 * app abierta, su próxima pantalla ya le contesta `403`. Es a propósito — si el
 * cambio es una baja urgente, no hace falta esperar a nada.
 */
export const CUANDO_PEGA_EL_CAMBIO =
  'Le pega en su próxima pantalla, no cuando vuelva a entrar.';

/** Formulario → cuerpo del PATCH. Asume que ya pasó por `cambiarRolSchema`. */
export function aCambiarRolPayload(
  cuentaId: string,
  rol: Rol,
  valores: CambiarRolFormValues,
): CambiarRolPayload {
  return { cuentaId, rol, motivo: valores.motivo.trim() };
}

// ─────────────────────────────────────────────────────────────
// §7 — La auditoría
// ─────────────────────────────────────────────────────────────
/**
 * Hoy `accion` tiene un solo valor, `cambio_de_rol`, pero se lee como texto
 * libre: va a haber más, y el filtro se arma **desde los datos que llegan**, no
 * desde una lista hardcodeada acá.
 */
export const AccionesDeAuditoria = {
  CAMBIO_DE_ROL: 'cambio_de_rol',
} as const;

/** El texto de una acción, o el slug crudo si esta versión no la conoce. */
export const ACCION_LABEL: Record<string, string> = {
  cambio_de_rol: 'Cambio de rol',
};

export function accionLabel(accion: string): string {
  return ACCION_LABEL[accion] ?? accion;
}

export const renglonDeAuditoriaSchema = z.object({
  id: z.string(),
  accion: z.string(),
  fecha: z.string(),
  /**
   * ⚠️ `actor` y `objetivo` **pueden ser `null`**: esa cuenta ya no existe. El
   * renglón sobrevive a la persona, que es exactamente lo que se le pide a una
   * auditoría. Cuando pasa se usa el id, que siempre está.
   */
  actorId: z.string(),
  actor: personaDelRastroSchema.nullish(),
  objetivoId: z.string(),
  objetivo: personaDelRastroSchema.nullish(),
  antes: z.string().nullish(),
  despues: z.string().nullish(),
  motivo: z.string().nullish(),
});

export const auditoriaPaginaSchema = z.object({
  datos: z.array(renglonDeAuditoriaSchema),
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
  paginas: z.number(),
});

export type RenglonDeAuditoria = z.infer<typeof renglonDeAuditoriaSchema>;
export type AuditoriaPagina = z.infer<typeof auditoriaPaginaSchema>;

/**
 * Cómo se nombra a alguien en un renglón del historial. Sin la persona resuelta
 * queda el id: el renglón vale igual, y decir "—" sería perder el único dato que
 * quedó.
 */
export function nombreEnElRastro(persona: PersonaDelRastro | null | undefined, id: string): string {
  return persona?.displayName?.trim() || persona?.email || id;
}

/** Query de `GET /api/super-admin/auditoria`. Todo opcional. */
export type ListarAuditoriaParams = {
  accion?: string;
  /** A quién le pasó. Es el filtro que se abre desde la ficha de una cuenta. */
  objetivoId?: string;
  /** Quién lo hizo. */
  actorId?: string;
  pagina?: number;
  limite?: number;
};
