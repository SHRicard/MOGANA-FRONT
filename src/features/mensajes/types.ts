import { z } from 'zod';

/**
 * **El chat entre el cliente y el local.**
 *
 * Una feature y dos pantallas porque son **un solo dominio visto desde los dos
 * lados del mostrador**: el cliente tiene un hilo (`/mi/mensajes`) y el panel
 * tiene una bandeja con un hilo por cliente (`/admin/mensajes`). Los mensajes
 * son los mismos, el globito se pinta igual, y separarlo en dos features
 * obligaría a subir a `shared/` la mitad de este archivo.
 *
 * ⚠️ **No hay websocket, y no es una carencia.** El backend expone dos endpoints
 * de resumen —baratos, sin páginas— pensados para preguntarlos cada tantos
 * segundos. Una conversación que se contesta en veinte minutos no gana nada con
 * una conexión abierta, y sí pierde: batería, reconexiones y un estado más que
 * puede quedar desincronizado.
 */

// ─────────────────────────────────────────────────────────────
// De qué lado se escribió
// ─────────────────────────────────────────────────────────────
/**
 * **De qué lado del mostrador salió el mensaje.**
 *
 * Es `negocio` y no `administrador` a propósito, y el motivo es del negocio, no
 * técnico: para el cliente el interlocutor es **el local**, no Ana ni Beto. Si
 * supiera quién le contestó empezaría a pedir por esa persona, y el día que no
 * está, una bandeja compartida deja de funcionar. Quién contestó se guarda del
 * lado del backend, pero no sale nunca hacia el cliente.
 */
export const LadosDelMensaje = {
  CLIENTE: 'cliente',
  NEGOCIO: 'negocio',
} as const;

export type LadoDelMensaje = (typeof LadosDelMensaje)[keyof typeof LadosDelMensaje];

/**
 * De qué puede colgar un mensaje. Vacío es un mensaje suelto, que es lo normal:
 * *"¿abren el sábado?"* no cuelga de nada.
 */
export const ContextosDeMensaje = {
  FACTURA: 'factura',
  PAGO_INFORMADO: 'pago_informado',
} as const;

export type ContextoDeMensaje = (typeof ContextosDeMensaje)[keyof typeof ContextosDeMensaje];

// ─────────────────────────────────────────────────────────────
// Constantes del contrato
// ─────────────────────────────────────────────────────────────
/**
 * El tope de un mensaje, **el mismo que valida el backend**.
 *
 * 2000 es una decisión suya y no un número al azar: 500 corta una explicación
 * honesta —*"te pagué el viernes desde la cuenta de mi hermana, el alias es…"*—
 * y 10000 invita a pegar un documento en una pantalla hecha de globitos.
 *
 * ⚠️ Se cuenta con `.length`, que son unidades UTF-16, **igual que el backend**.
 * Un mensaje de emojis llega al tope antes de los 2000 caracteres que contaría
 * una persona; contarlo distinto acá haría que el contador mienta justo cuando
 * importa.
 */
export const LARGO_MAXIMO_DEL_MENSAJE = 2000;

/** Cuánto antes del tope se le empieza a mostrar el contador a la persona. */
export const AVISAR_LARGO_DESDE = LARGO_MAXIMO_DEL_MENSAJE - 200;

/**
 * Mensajes por página.
 *
 * Treinta y no ocho como el resto de los listados: un chat se lee hacia arriba y
 * pedir de a ocho convierte "leer la conversación de ayer" en cuatro toques. El
 * backend acepta hasta 100.
 */
export const MENSAJES_LIMITE = 30;

/** Conversaciones por página en la bandeja del panel, como el resto del panel. */
export const CONVERSACIONES_LIMITE = 8;

/**
 * Cuánto espera la búsqueda de la bandeja antes de salir a preguntar.
 *
 * Sin esto, escribir "Rodríguez" son nueve requests y ocho respuestas que ya no
 * le importan a nadie. Es el mismo plazo que usan los otros buscadores del
 * panel.
 */
export const BUSQUEDA_DEBOUNCE_MS = 400;

/**
 * Cada cuánto se vuelve a preguntar, en milisegundos.
 *
 * Es lo que reemplaza al websocket. Ocho segundos es el punto donde una
 * respuesta se siente inmediata sin que la pantalla pregunte cientos de veces
 * en una sesión.
 *
 * ⚠️ **Solo mientras la pantalla está en foco.** Un chat que sigue preguntando
 * con la app en segundo plano es batería regalada: para eso está la campanita,
 * que el backend ya dispara con cada mensaje.
 */
export const REFRESCO_MS = 8000;

// ─────────────────────────────────────────────────────────────
// Un mensaje
// ─────────────────────────────────────────────────────────────
/**
 * De qué cuelga el mensaje. La `etiqueta` **viene ya redactada** —"Factura
 * #1070"— y se muestra tal cual: armarla acá sería tener el mismo texto escrito
 * en dos lugares.
 */
export const contextoSchema = z.object({
  /**
   * Se valida como texto libre y no como enum, igual que el `tipo` de la
   * campanita: un contexto nuevo del backend no puede tirar abajo el hilo
   * entero. Lo peor que pasa es que el chip no sepa a dónde llevar.
   */
  tipo: z.string(),
  id: z.string(),
  etiqueta: z.string(),
});

export type ContextoDelMensaje = z.infer<typeof contextoSchema>;

/**
 * **El mensaje como lo ve el cliente.**
 *
 * Dos cosas que el backend deliberadamente NO manda de este lado:
 *
 * - **quién contestó** — ver `LadosDelMensaje`;
 * - **el visto** — *"te leyeron hace dos horas y no te contestaron"* no es
 *   información que ayude a nadie, es un reclamo esperando a pasar. El dato se
 *   guarda igual porque el panel lo necesita para no contestar dos veces.
 *
 * No los pidas ni los muestres del lado del cliente: no van a venir.
 */
export const miMensajeSchema = z.object({
  id: z.string(),
  /** Texto libre por lo mismo que `contexto.tipo`: ver `esDelNegocio`. */
  lado: z.string(),
  texto: z.string(),
  sobre: contextoSchema.nullish(),
  createdAt: z.string(),
});

export type MiMensaje = z.infer<typeof miMensajeSchema>;

/** El hilo del cliente. **Del más nuevo al más viejo**, como la campanita. */
export const miHiloSchema = z.object({
  datos: z.array(miMensajeSchema),
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
  paginas: z.number(),
  /** Los del local que todavía no abrí. */
  sinLeer: z.number(),
  /**
   * `true` cuando el local cortó este canal. La pantalla **tiene que esconder el
   * campo de escribir** y decir por dónde seguir: si no, la persona escribe,
   * recibe un `403` y no entiende qué pasó.
   */
  silenciada: z.boolean(),
});

export type MiHilo = z.infer<typeof miHiloSchema>;

/** Lo que se pregunta cada tantos segundos: barato y sin páginas. */
export const resumenDelHiloSchema = z.object({
  sinLeer: z.number(),
  ultimoMensajeEn: z.string().nullish(),
  silenciada: z.boolean(),
});

export type ResumenDelHilo = z.infer<typeof resumenDelHiloSchema>;

// ─────────────────────────────────────────────────────────────
// La bandeja del panel
// ─────────────────────────────────────────────────────────────
/** Quién es el cliente del hilo, con lo justo para reconocerlo y buscarlo. */
export const personaDelHiloSchema = z.object({
  id: z.string(),
  displayName: z.string().nullish(),
  email: z.string().nullish(),
  dni: z.string().nullish(),
});

export type PersonaDelHilo = z.infer<typeof personaDelHiloSchema>;

/** Quién del panel miró el hilo. `null` es que todavía no lo miró nadie. */
export const miradoPorSchema = z.object({
  id: z.string(),
  displayName: z.string().nullish(),
});

/** Un renglón de la bandeja: un cliente que escribió alguna vez. */
export const conversacionSchema = z.object({
  clienteId: z.string(),
  cliente: personaDelHiloSchema,
  /** El recorte del último mensaje. `null` si el hilo está vacío. */
  adelanto: z.string().nullish(),
  ultimoMensajeEn: z.string().nullish(),
  ultimoLado: z.string().nullish(),
  /** Mensajes del cliente que el panel no leyó. */
  sinLeer: z.number(),
  silenciada: z.boolean(),
  /**
   * Quién del panel lo miró último.
   *
   * ⚠️ **La bandeja es compartida**: si un administrador lee un hilo, queda
   * leído para todos. Este campo es lo que evita el otro problema —dos personas
   * contestando lo mismo— mostrando quién ya pasó por ahí.
   */
  leidoPor: miradoPorSchema.nullish(),
});

export type Conversacion = z.infer<typeof conversacionSchema>;

export const listaConversacionesSchema = z.object({
  datos: z.array(conversacionSchema),
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
  paginas: z.number(),
  /**
   * **El globito del panel**: todos los mensajes de clientes sin leer, no los de
   * esta página ni los del filtro. Misma convención que `noLeidas` en la
   * campanita — si no, filtrar bajaría un número que no cambió.
   */
  sinLeerEnTotal: z.number(),
});

export type ListaConversaciones = z.infer<typeof listaConversacionesSchema>;

/** El mensaje como lo ve el panel: **con autor**, que es auditoría del negocio. */
export const mensajeDelPanelSchema = miMensajeSchema.extend({
  /** Cuándo lo leyó el otro lado. `null` es sin leer. */
  leidoEn: z.string().nullish(),
  autor: miradoPorSchema.nullish(),
});

export type MensajeDelPanel = z.infer<typeof mensajeDelPanelSchema>;

export const hiloDelPanelSchema = z.object({
  datos: z.array(mensajeDelPanelSchema),
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
  paginas: z.number(),
  sinLeer: z.number(),
  silenciada: z.boolean(),
  cliente: personaDelHiloSchema,
  leidoPor: miradoPorSchema.nullish(),
  leidoEnElPanel: z.string().nullish(),
});

export type HiloDelPanel = z.infer<typeof hiloDelPanelSchema>;

export const resumenDeLaBandejaSchema = z.object({
  sinLeerEnTotal: z.number(),
  conversacionesSinLeer: z.number(),
  ultimoMensajeEn: z.string().nullish(),
});

export type ResumenDeLaBandeja = z.infer<typeof resumenDeLaBandejaSchema>;

/** Lo que devuelve marcar leído, de los dos lados. Idempotente: la segunda vez, `0`. */
export const leidosSchema = z.object({ leidos: z.number() });

// ─────────────────────────────────────────────────────────────
// Escribir
// ─────────────────────────────────────────────────────────────
/**
 * Lo que se manda al escribir.
 *
 * El `trim` está antes del `min` a propósito: un mensaje de puros espacios es un
 * mensaje vacío, y el backend lo limpia igual antes de guardarlo. Cortarlo acá
 * evita el viaje.
 */
export const escribirMensajeSchema = z.object({
  texto: z
    .string()
    .trim()
    .min(1, 'Escribí algo antes de enviar.')
    .max(LARGO_MAXIMO_DEL_MENSAJE, `El mensaje no puede pasar de ${LARGO_MAXIMO_DEL_MENSAJE} caracteres.`),
});

export interface SobreQue {
  tipo: ContextoDeMensaje;
  id: string;
}

export interface EscribirMensajePayload {
  texto: string;
  /**
   * De qué cuelga. **Tiene que ser del que escribe**: mandar la factura de otro
   * es un `400`, así que esto sale de una pantalla que ya estaba mostrando algo
   * suyo, nunca de un campo que se tipea.
   */
  sobre?: SobreQue;
}

/** Escribirle a un cliente desde el panel: lo mismo, más de quién es el hilo. */
export interface EscribirDelPanelPayload extends EscribirMensajePayload {
  clienteId: string;
}

export interface SilenciarPayload {
  clienteId: string;
  silenciar: boolean;
}

export interface ListarMensajesParams {
  pagina?: number;
  limite?: number;
}

export interface ListarConversacionesParams extends ListarMensajesParams {
  /** Por nombre, correo o documento. **Nunca por el texto de los mensajes.** */
  q?: string;
  soloSinLeer?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Ayudas de lectura
// ─────────────────────────────────────────────────────────────
/**
 * `true` si el mensaje lo escribió el local.
 *
 * Se pregunta por `negocio` y no por `cliente` porque es lo que decide el dibujo:
 * un lado desconocido —uno que agregue el backend mañana— cae del lado del
 * cliente, que es el que se alinea a la derecha. Se ve raro pero se lee; al
 * revés, un mensaje propio aparecería como si lo hubiera mandado el local.
 */
export function esDelNegocio(mensaje: { lado: string }): boolean {
  return mensaje.lado === LadosDelMensaje.NEGOCIO;
}

/** Cómo llamar a alguien cuando la cuenta no tiene nombre cargado. */
export function nombreDelCliente(persona: PersonaDelHilo): string {
  const nombre = persona.displayName?.trim();
  if (nombre) {
    return nombre;
  }
  return persona.email?.trim() || (persona.dni ? `DNI ${persona.dni}` : 'Cliente sin nombre');
}

/**
 * **Junta las páginas de un hilo en una sola lista, sin repetidos.**
 *
 * Hace falta porque las dos cosas que hace la pantalla pelean entre sí: se
 * piden páginas hacia atrás para leer lo viejo, y se vuelve a pedir la página 1
 * cada ocho segundos para ver lo nuevo. Cuando llega un mensaje nuevo, **las
 * páginas se corren**: el último de la 1 pasa a ser el primero de la 2, y sin
 * juntar por `id` ese mensaje aparecería dos veces.
 *
 * Ordena por fecha descendente —el más nuevo primero— porque así lo manda el
 * backend y así lo consume la lista invertida.
 *
 * ⚠️ El desempate por `id` no es decorativo: dos mensajes pueden compartir el
 * milisegundo, y sin un segundo criterio el orden cambiaría entre renders,
 * haciendo saltar la lista sola.
 */
export function fusionarMensajes<T extends { id: string; createdAt: string }>(
  paginas: readonly (readonly T[])[],
): T[] {
  const porId = new Map<string, T>();

  for (const pagina of paginas) {
    for (const mensaje of pagina) {
      porId.set(mensaje.id, mensaje);
    }
  }

  return [...porId.values()].sort((a, b) => {
    if (a.createdAt === b.createdAt) {
      return b.id.localeCompare(a.id);
    }
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

/**
 * `true` si hay que dibujar la fecha encima de este mensaje.
 *
 * La lista viene **del más nuevo al más viejo**, así que el "anterior" en el
 * arreglo es el mensaje *posterior* en el tiempo: el separador va sobre el
 * primero de cada día, que en este orden es el último que se encuentra de ese
 * día. Por eso se compara contra el SIGUIENTE del arreglo y no contra el previo.
 */
export function abreUnDia(mensajes: readonly { createdAt: string }[], indice: number): boolean {
  const actual = mensajes[indice];
  const siguiente = mensajes[indice + 1];

  if (!actual) {
    return false;
  }
  if (!siguiente) {
    return true;
  }
  return diaDe(actual.createdAt) !== diaDe(siguiente.createdAt);
}

/** El día calendario de un ISO, para comparar sin la hora. */
function diaDe(iso: string): string {
  return iso.slice(0, 10);
}
