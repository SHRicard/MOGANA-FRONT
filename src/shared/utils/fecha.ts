import { DateTime } from 'luxon';
import { z } from 'zod';

/**
 * Fechas: conversión entre lo que viaja por la API y lo que se muestra.
 *
 * La API usa dos formatos distintos y NO son intercambiables:
 *
 *  - **Fechas de negocio** (`fechaEmision`, `fechaFin`, `pagadaEn`) →
 *    `"2026-08-18"`, día **sin hora y sin zona**. Son un día del calendario, no
 *    un instante: el 18 de agosto es el 18 de agosto sin importar el huso.
 *
 *    ⚠️ Por eso **nunca** se convierten con `new Date("2026-08-18")`: eso las
 *    lee como medianoche UTC y en Argentina las corre un día para atrás. Acá se
 *    parsean con `fromFormat`, que las trata como fecha local y no como
 *    instante.
 *
 *  - **Fechas de auditoría** (`createdAt`, `lastLoginAt`) → ISO completo con
 *    hora. Ahí sí importa el instante, y se muestra en la hora local del
 *    dispositivo.
 */

/** Formato de las fechas de negocio, tal como las espera y devuelve la API. */
const FORMATO_FECHA_API = 'yyyy-MM-dd';

/** Formato para mostrar y para tipear: `"13/08/2026"`. */
const FORMATO_FECHA_PANTALLA = 'dd/MM/yyyy';

/** `true` si el texto es una fecha de negocio válida y realmente existe. */
function esFechaApiValida(fecha: string): boolean {
  // `fromFormat` es estricto: rechaza "2026-13-45" y también "2026-02-30", que
  // un regex de forma daría por buena (la API contesta justo eso: "La fecha de
  // inicio no existe: 2026-02-30.").
  return DateTime.fromFormat(fecha, FORMATO_FECHA_API).isValid;
}

/**
 * Regla de Zod para las fechas de negocio que **llegan** de la API. Se reutiliza
 * en la validación de las respuestas para que no entre una fecha imposible.
 */
export const fechaApiSchema = z
  .string()
  .refine(esFechaApiValida, 'Ingresá una fecha válida (día/mes/año)');

/** `"2026-08-13"` → `"13/08/2026"`. Devuelve el original si no se puede parsear. */
export function formatFecha(fecha: string): string {
  const parsed = DateTime.fromFormat(fecha, FORMATO_FECHA_API);
  return parsed.isValid ? parsed.toFormat(FORMATO_FECHA_PANTALLA) : fecha;
}

/**
 * Lo que tipeó una persona → formato de API: `"13/08/2026"` → `"2026-08-13"`.
 * Devuelve `null` si no es una fecha real.
 *
 * Existe porque no hay date picker nativo en el proyecto: las fechas de los
 * formularios se escriben a mano en el formato que se lee acá (día/mes/año), y
 * a la API viajan en ISO corto. `fromFormat` es estricto, así que un
 * `"31/02/2026"` no pasa.
 */
export function parseFechaPantalla(texto: string): string | null {
  const parsed = DateTime.fromFormat(texto.trim(), FORMATO_FECHA_PANTALLA);
  return parsed.isValid ? parsed.toFormat(FORMATO_FECHA_API) : null;
}

/** `true` si el texto es una fecha válida escrita como `"13/08/2026"`. */
export function esFechaPantallaValida(texto: string): boolean {
  return parseFechaPantalla(texto) !== null;
}

/**
 * Regla de Zod para las fechas **tipeadas en un formulario** (día/mes/año). La
 * conversión a formato de API la hace quien arma el payload.
 */
export const fechaPantallaSchema = z
  .string()
  .min(1, 'Ingresá la fecha')
  .refine(esFechaPantallaValida, 'Escribila como día/mes/año, por ejemplo 13/08/2026');

/**
 * `true` si la fecha tipeada es hoy o más adelante.
 *
 * Es lo que evita gastar un request que volvería con `La factura no puede
 * terminar antes de emitirse: el fin es hoy o más adelante.`, y además permite
 * marcar el campo exacto. El `400` es la red, no la primera línea de defensa.
 *
 * Se compara por **día**, no por instante: una fecha de hoy tiene que pasar a
 * cualquier hora, y `DateTime.now()` a las 19:15 es posterior a "hoy a las 00:00".
 */
export function esHoyOPosteriorPantalla(texto: string): boolean {
  const fecha = DateTime.fromFormat(texto.trim(), FORMATO_FECHA_PANTALLA);
  return fecha.isValid && fecha.startOf('day') >= DateTime.now().startOf('day');
}

/**
 * Fecha de auditoría (ISO con hora) → `"13/08/2026 19:15"`, en hora local.
 * Devuelve el original si no se puede parsear.
 */
export function formatFechaHora(iso: string): string {
  const parsed = DateTime.fromISO(iso);
  return parsed.isValid ? parsed.toFormat(`${FORMATO_FECHA_PANTALLA} HH:mm`) : iso;
}

/**
 * **Solo la hora** de un instante ISO: `"14:32"`.
 *
 * Existe aparte de `formatFechaHora` por el chat: adentro de un globito la fecha
 * ya la dice el separador del día, y repetirla en cada mensaje llena la columna
 * de números que no cambian.
 */
export function formatHora(iso: string): string {
  const parsed = DateTime.fromISO(iso);
  return parsed.isValid ? parsed.toFormat('HH:mm') : iso;
}

/**
 * **El día de un instante ISO, como lo diría una persona**: `"hoy"`, `"ayer"`,
 * o la fecha larga si fue antes.
 *
 * Es el separador que parte un chat en días. "Hoy" y "ayer" son lo que alguien
 * busca al recorrer una conversación hacia arriba; una fecha exacta obliga a
 * calcular cuántos días pasaron.
 */
export function diaRelativo(iso: string): string {
  const fecha = DateTime.fromISO(iso);
  if (!fecha.isValid) {
    return iso;
  }

  const dias = fecha.startOf('day').diff(DateTime.now().startOf('day'), 'days').days;

  if (dias === 0) {
    return 'hoy';
  }
  if (dias === -1) {
    return 'ayer';
  }
  return formatFechaLargaPantalla(fecha.toFormat(FORMATO_FECHA_PANTALLA));
}

/** Hoy, en formato de pantalla. */
export function hoyPantalla(): string {
  return DateTime.now().toFormat(FORMATO_FECHA_PANTALLA);
}

/**
 * La fecha de dentro de N días, ya escrita como se tipea (`"17/09/2026"`).
 *
 * La pantalla de facturar la usa para **proponer** el vencimiento: el campo
 * queda editable porque el backend no tiene ningún default, pero abrir el
 * formulario con la fecha ya puesta es un paso menos en la pantalla que más se
 * repite.
 */
export function enDiasPantalla(dias: number): string {
  return DateTime.now().plus({ days: dias }).toFormat(FORMATO_FECHA_PANTALLA);
}

/**
 * La fecha de dentro de N años, ya escrita como se tipea.
 *
 * Se suma en años y no en 365 días porque los bisiestos correrían el tope un día
 * según el año: el backend valida "a lo sumo dentro de un año" con la misma
 * cuenta de calendario.
 */
export function enAniosPantalla(anios: number): string {
  return DateTime.now().plus({ years: anios }).toFormat(FORMATO_FECHA_PANTALLA);
}

// ─────────────────────────────────────────────────────────────
// Grilla del calendario
// ─────────────────────────────────────────────────────────────
/**
 * Nombres de los meses y de los días, escritos a mano.
 *
 * No salen de `toFormat` con locale ni de `Intl`: en Android el resultado
 * depende del idioma del dispositivo y de si el motor trae los datos de ICU, así
 * que un mismo calendario diría "September" en un celular y "septiembre" en
 * otro. Con plata y fechas, eso no es aceptable — misma razón por la que
 * `money.ts` formatea a mano.
 */
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

/** Los mismos, abreviados. Para los ejes de un gráfico, donde no entra el largo. */
const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

/** Iniciales de los días, **arrancando en lunes** como se lee un calendario acá. */
export const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/** Nombres completos, en el mismo orden: lunes primero. */
const DIAS_LARGOS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

/**
 * Celdas de la grilla: 6 semanas completas, siempre.
 *
 * Es fijo a propósito. Un mes ocupa 4, 5 o 6 filas según en qué día caiga el 1,
 * y dibujar solo las necesarias hace que el calendario cambie de alto al pasar
 * de mes: los botones de abajo se mueven bajo el dedo.
 */
const CELDAS_DEL_MES = 42;

/** Una celda del calendario. */
export interface DiaDelMes {
  /** Fecha en formato de pantalla: es lo que se devuelve al elegirla. */
  fecha: string;
  /** Número del día, 1 a 31. */
  numero: number;
  /** `true` si es relleno: cae en el mes anterior o en el siguiente. */
  deOtroMes: boolean;
}

/**
 * Las 42 celdas del mes que contiene a `ancla`, de lunes a domingo.
 *
 * Con una fecha inválida cae en el mes en curso: el calendario tiene que
 * dibujarse igual, aunque lo que venga del formulario esté a medio escribir.
 */
export function generarMes(ancla: string): DiaDelMes[] {
  const base = DateTime.fromFormat(ancla.trim(), FORMATO_FECHA_PANTALLA);
  const mes = (base.isValid ? base : DateTime.now()).startOf('month');

  // `weekday` es 1 = lunes … 7 = domingo, así que esto retrocede hasta el lunes
  // de la semana en la que cae el día 1.
  const primeraCelda = mes.minus({ days: mes.weekday - 1 });

  return Array.from({ length: CELDAS_DEL_MES }, (_, indice) => {
    const dia = primeraCelda.plus({ days: indice });
    return {
      fecha: dia.toFormat(FORMATO_FECHA_PANTALLA),
      numero: dia.day,
      deOtroMes: dia.month !== mes.month,
    };
  });
}

/** Encabezado del calendario: `"Septiembre 2026"`. */
export function tituloDeMes(ancla: string): string {
  const base = DateTime.fromFormat(ancla.trim(), FORMATO_FECHA_PANTALLA);
  const mes = base.isValid ? base : DateTime.now();
  return `${MESES[mes.month - 1]} ${mes.year}`;
}

/**
 * Corre el calendario N meses: `moverMeses('17/09/2026', -1)` → `'01/08/2026'`.
 *
 * Devuelve el día 1 y no el mismo día del mes siguiente: el 31 de enero más un
 * mes no es "el 31 de febrero", y lo que se mueve acá es la página del
 * calendario, no la fecha elegida.
 */
export function moverMeses(ancla: string, cantidad: number): string {
  const base = DateTime.fromFormat(ancla.trim(), FORMATO_FECHA_PANTALLA);
  const mes = base.isValid ? base : DateTime.now();
  return mes.startOf('month').plus({ months: cantidad }).toFormat(FORMATO_FECHA_PANTALLA);
}

/**
 * `true` si `fecha` es anterior a `limite`, las dos en formato de pantalla. Es
 * lo que apaga los días que el calendario no deja elegir.
 */
export function esAnteriorAPantalla(fecha: string, limite: string): boolean {
  const dia = DateTime.fromFormat(fecha.trim(), FORMATO_FECHA_PANTALLA);
  const tope = DateTime.fromFormat(limite.trim(), FORMATO_FECHA_PANTALLA);
  return dia.isValid && tope.isValid && dia.startOf('day') < tope.startOf('day');
}

/**
 * `true` si `fecha` es posterior a `limite`, las dos en formato de pantalla. Es
 * el espejo de `esAnteriorAPantalla`: apaga los días pasados del tope.
 *
 * Con una fecha o un tope inválidos devuelve `false` —"no me consta que se
 * pase"—, igual que su espejo: la grilla del calendario se dibuja igual mientras
 * el formulario tenga algo a medio escribir.
 */
export function esPosteriorAPantalla(fecha: string, limite: string): boolean {
  const dia = DateTime.fromFormat(fecha.trim(), FORMATO_FECHA_PANTALLA);
  const tope = DateTime.fromFormat(limite.trim(), FORMATO_FECHA_PANTALLA);
  return dia.isValid && tope.isValid && dia.startOf('day') > tope.startOf('day');
}

/**
 * La fecha elegida, escrita entera: `"17/09/2026"` → `"Jueves 17 de septiembre
 * de 2026"`.
 *
 * Va debajo del número en el campo de fecha. Un `17/09` se puede leer mal —o
 * confundirse con `09/17`— y acá lo que se está fijando es cuándo hay que
 * cobrar: conviene que la confirmación no tenga ninguna ambigüedad.
 */
export function formatFechaLargaPantalla(texto: string): string {
  const fecha = DateTime.fromFormat(texto.trim(), FORMATO_FECHA_PANTALLA);
  if (!fecha.isValid) {
    return texto;
  }
  const dia = DIAS_LARGOS[fecha.weekday - 1];
  const mes = MESES[fecha.month - 1].toLowerCase();
  return `${dia} ${fecha.day} de ${mes} de ${fecha.year}`;
}

// ─────────────────────────────────────────────────────────────
// Meses de la API (AAAA-MM)
// ─────────────────────────────────────────────────────────────
/**
 * El **tercer** formato de fecha de la API, además de los dos de arriba: un mes
 * entero, sin día. Es el período de las métricas y el eje del gráfico
 * (`docs/flujo_metricas.md`).
 */
const FORMATO_MES_API = 'yyyy-MM';

/** El mes parseado, o `null` si el texto no es un mes real. */
function parseMesApi(mes: string): DateTime | null {
  const parsed = DateTime.fromFormat(mes.trim(), FORMATO_MES_API);
  return parsed.isValid ? parsed : null;
}

/**
 * Regla de Zod para los meses que **llegan** de la API.
 *
 * `fromFormat` es estricto de verdad: rechaza `"2026-13"` y también `"2026-8"`,
 * que es justo lo que el backend contesta con un `400` ("El mes va como
 * 2026-08.").
 */
export const mesApiSchema = z
  .string()
  .refine((mes) => parseMesApi(mes) !== null, 'El mes va como 2026-08.');

/** El mes en curso, en formato de API: `"2026-08"`. */
export function mesActualApi(): string {
  return DateTime.now().toFormat(FORMATO_MES_API);
}

/** Corre N meses: `moverMesApi('2026-08', -1)` → `'2026-07'`. */
export function moverMesApi(mes: string, cantidad: number): string {
  const base = parseMesApi(mes) ?? DateTime.now();
  return base.plus({ months: cantidad }).toFormat(FORMATO_MES_API);
}

/** Para un encabezado: `"2026-08"` → `"Agosto 2026"`. */
export function tituloDeMesApi(mes: string): string {
  const parsed = parseMesApi(mes);
  return parsed ? `${MESES[parsed.month - 1]} ${parsed.year}` : mes;
}

/** Para meterlo en una frase: `"2026-08"` → `"agosto"`. */
export function nombreDeMesApi(mes: string): string {
  const parsed = parseMesApi(mes);
  return parsed ? MESES[parsed.month - 1].toLowerCase() : mes;
}

/** Para el eje de un gráfico, donde no entra el nombre largo: `"Ago"`. */
export function mesCortoApi(mes: string): string {
  const parsed = parseMesApi(mes);
  return parsed ? MESES_CORTOS[parsed.month - 1] : mes;
}

/**
 * `true` si `mes` es posterior a `limite`. Es lo que apaga la flecha de
 * "siguiente" cuando ya se llegó al mes en curso: adelante no hay nada que
 * mirar, y la API contestaría un período entero en cero.
 *
 * Con un mes inválido devuelve `false` —"no me consta que se pase"—, igual que
 * sus equivalentes de día.
 */
export function esMesPosteriorApi(mes: string, limite: string): boolean {
  const uno = parseMesApi(mes);
  const otro = parseMesApi(limite);
  return uno !== null && otro !== null && uno > otro;
}
