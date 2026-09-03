import { z } from 'zod';
import {
  fechaApiSchema,
  fechaPantallaSchema,
  montoSchema,
  parseAMonto,
  parseFechaPantalla,
  formatMonto,
} from '@/shared/utils';

/**
 * **La bandeja de avisos de pago del administrador.**
 *
 * ⚠️ Lo primero, porque le da forma a toda la feature: **un aviso no es un
 * cobro**. Es lo que el cliente *dice* que pagó. Mientras esté acá la deuda
 * sigue entera; confirmarlo es lo que anota el cobro de verdad, contra el
 * resumen del banco.
 *
 * Es el otro lado de `features/mi`: ahí el cliente avisa, acá alguien decide.
 */

// ─────────────────────────────────────────────────────────────
// En qué puede estar un aviso
// ─────────────────────────────────────────────────────────────
export const EstadosDeAvisoDePago = {
  PENDIENTE: 'pendiente',
  CONFIRMADO: 'confirmado',
  RECHAZADO: 'rechazado',
} as const;

export const estadoDeAvisoDePagoSchema = z.enum(EstadosDeAvisoDePago);
export type EstadoDeAvisoDePago = z.infer<typeof estadoDeAvisoDePagoSchema>;

/** Cómo se escribe cada estado. La API manda el slug. */
export const ESTADO_DE_AVISO_LABEL: Record<EstadoDeAvisoDePago, string> = {
  [EstadosDeAvisoDePago.PENDIENTE]: 'Esperando respuesta',
  [EstadosDeAvisoDePago.CONFIRMADO]: 'Cobro anotado',
  [EstadosDeAvisoDePago.RECHAZADO]: 'No se tomó',
};

/**
 * Los cinco medios, iguales que en el lado del cliente.
 *
 * Se declaran de nuevo acá y no se importan de `features/mi`: son dos features
 * que hablan con endpoints distintos, y atarlas haría que tocar una arrastre a
 * la otra. Es la misma lista escrita dos veces a propósito.
 */
export const medioDePagoSchema = z.enum([
  'transferencia',
  'efectivo',
  'mercado_pago',
  'deposito',
  'otro',
]);
export type MedioDePago = z.infer<typeof medioDePagoSchema>;

export const MEDIO_DE_PAGO_LABEL: Record<MedioDePago, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  mercado_pago: 'Mercado Pago',
  deposito: 'Depósito',
  otro: 'Otro',
};

// ─────────────────────────────────────────────────────────────
// El comprobante
// ─────────────────────────────────────────────────────────────
/** Por qué se soltó una imagen del store. */
export const MotivosDeBorrado = {
  RECHAZO: 'rechazo',
  ANTIGUEDAD: 'antiguedad',
  MANUAL: 'manual',
} as const;

export type MotivoDeBorrado = (typeof MotivosDeBorrado)[keyof typeof MotivosDeBorrado];

/** Qué decirle a quien mira, según por qué ya no está la imagen. */
export const MOTIVO_DE_BORRADO_LABEL: Record<MotivoDeBorrado, string> = {
  rechazo: 'se borró al rechazar el aviso',
  antiguedad: 'se borró por antigüedad',
  manual: 'lo borraron desde el panel',
};

/**
 * **La captura que mandó el cliente.**
 *
 * ⚠️ **`url` y `miniatura` se vencen en una hora.** Vienen firmadas y caducan a
 * propósito: un comprobante muestra el alias, el banco y a veces el nombre
 * completo de una persona, así que un link filtrado tiene que morirse solo.
 *
 * De eso salen tres reglas, y las tres son de la UI:
 *
 * 1. **No se guardan.** Ni en un slice, ni en el storage, ni en caché de
 *    imágenes en disco.
 * 2. Se usan **al renderizar**. Si la pantalla estuvo abierta mucho rato, se
 *    vuelve a pedir la lista para tener links nuevos.
 * 3. Si una imagen no carga, **casi siempre es esto**: recargar antes de
 *    mostrar un error.
 *
 * `estado` y `borradoPor` son laxos a propósito: la pantalla ramifica por si hay
 * `url`, no por el texto, y un valor nuevo del backend no tiene por qué tirar
 * abajo la bandeja entera.
 */
export const comprobanteSchema = z.object({
  estado: z.string(),
  bytes: z.number().nullish(),
  formato: z.string().nullish(),
  subidoEn: z.string().nullish(),
  /** Firmada y de una hora. `null` si la imagen ya se borró. */
  url: z.string().nullish(),
  miniatura: z.string().nullish(),
  borradoEn: z.string().nullish(),
  borradoPor: z.string().nullish(),
});

export type Comprobante = z.infer<typeof comprobanteSchema>;

/** `true` si todavía hay imagen para mostrar. */
export function hayImagen(comprobante: Comprobante | null | undefined): boolean {
  return Boolean(comprobante && (comprobante.url || comprobante.miniatura));
}

/**
 * Por qué ya no está la imagen, escrito para mostrar.
 *
 * Un comprobante borrado **no es lo mismo que un aviso sin comprobante**: hubo
 * uno y ya no está, y quien mira el archivo tiene que poder distinguirlo de
 * alguien que avisó un pago en efectivo sin adjuntar nada.
 */
export function textoDelBorrado(comprobante: Comprobante): string {
  const motivo = comprobante.borradoPor;
  const explicacion =
    motivo && motivo in MOTIVO_DE_BORRADO_LABEL
      ? MOTIVO_DE_BORRADO_LABEL[motivo as MotivoDeBorrado]
      : 'ya no está disponible';

  return `El comprobante ${explicacion}.`;
}

// ─────────────────────────────────────────────────────────────
// El aviso
// ─────────────────────────────────────────────────────────────
export const clienteQueInformaSchema = z.object({
  id: z.string(),
  displayName: z.string().nullish(),
  email: z.string().nullish(),
  dni: z.string().nullish(),
});

export const facturaDelAvisoSchema = z.object({
  id: z.string(),
  numero: z.number(),
  total: montoSchema,
  /** Lo que se debía **cuando se leyó el aviso**, no cuando se informó. */
  saldo: montoSchema,
  fechaFin: fechaApiSchema,
});

/**
 * Un aviso de pago como lo ve el panel.
 *
 * Trae dos cosas que el lado del cliente no tiene y que son las que permiten
 * decidir sin salir de la pantalla: **el saldo de hoy** de la factura y
 * **`entraEnElSaldo`**.
 */
export const avisoDePagoSchema = z.object({
  id: z.string(),
  estado: estadoDeAvisoDePagoSchema,
  /** Cuánto **dice** que pagó. */
  monto: montoSchema,
  /** El día que dice que pagó, que puede no ser el día en que avisó. */
  fecha: fechaApiSchema,
  medio: medioDePagoSchema,
  /** El número de operación o el alias: con esto se lo busca en el banco. */
  referencia: z.string().nullish(),
  nota: z.string().nullish(),
  /** Cuándo mandó el aviso, en ISO. */
  informadoEn: z.string(),
  cliente: clienteQueInformaSchema,
  factura: facturaDelAvisoSchema,
  /**
   * ⚠️ **Si el monto informado entra en el saldo de hoy.** En `false`,
   * confirmarlo tal cual **va a fallar**: o el cliente se equivocó, o alguien ya
   * anotó ese cobro a mano. Lo calcula el backend al leer, así que es el de
   * ahora y no el de cuando se avisó.
   */
  entraEnElSaldo: z.boolean(),
  resueltoEn: z.string().nullish(),
  resueltoPor: z.object({ id: z.string(), displayName: z.string().nullish() }).nullish(),
  /** Por qué se rechazó. `null` en los pendientes y en los confirmados. */
  motivoRechazo: z.string().nullish(),
  pagoId: z.string().nullish(),
  /**
   * **Lo que se anotó de verdad**, que puede no ser lo que informó el cliente:
   * dijo $30.000 y entraron $28.500. `null` mientras no esté confirmado.
   */
  montoCobrado: montoSchema.nullish(),
  fechaCobrada: fechaApiSchema.nullish(),
  comprobante: comprobanteSchema.nullish(),
});

export type AvisoDePago = z.infer<typeof avisoDePagoSchema>;

/** Una página de la bandeja. */
export const avisosDePagoPaginaSchema = z.object({
  datos: z.array(avisoDePagoSchema),
  total: z.number(),
  pagina: z.number(),
  limite: z.number(),
  paginas: z.number(),
  /** Cuántos esperan respuesta, **del filtro entero**: es el globito. */
  pendientes: z.number(),
});

export type AvisosDePagoPagina = z.infer<typeof avisosDePagoPaginaSchema>;

/**
 * `true` si lo que se anotó no es lo que el cliente informó.
 *
 * Cuando pasa hay que mostrar **los dos números**: el aviso guarda lo que dijo
 * el cliente y el cobro lo que vio el negocio, y esa diferencia es justamente lo
 * que después hay que poder explicar.
 */
export function seAnotoDistinto(aviso: AvisoDePago): boolean {
  return (
    aviso.montoCobrado !== null &&
    aviso.montoCobrado !== undefined &&
    aviso.montoCobrado !== aviso.monto
  );
}

/** Cómo se llama a quien avisó, con algo que decir siempre. */
export function nombreDelCliente(aviso: AvisoDePago): string {
  return aviso.cliente.displayName?.trim() || aviso.cliente.email?.trim() || 'Cliente sin nombre';
}

// ─────────────────────────────────────────────────────────────
// Los parámetros de la lista
// ─────────────────────────────────────────────────────────────
export type ListarAvisosDePagoParams = {
  /**
   * **Sin esto trae los pendientes**, que es la bandeja: la pantalla se abre
   * para ver lo que hay que resolver, no el archivo entero.
   */
  estado?: EstadoDeAvisoDePago;
  pagina?: number;
  /** De 1 a 100. La API usa su default si no se manda. */
  limite?: number;
};

/** Cuántos avisos por página. Son tarjetas altas: más no entra en una pantalla. */
export const AVISOS_DE_PAGO_LIMITE = 10;

// ─────────────────────────────────────────────────────────────
// Confirmar y rechazar
// ─────────────────────────────────────────────────────────────
/** `POST /admin/pagos-informados/:id/confirmar`. Todo opcional. */
export type ConfirmarAvisoPayload = {
  avisoId: string;
  datos: {
    /** Lo que realmente entró. Sin esto, lo que informó el cliente. */
    monto?: number;
    /** `AAAA-MM-DD`. Sin esto, el día que informó el cliente. */
    fecha?: string;
    nota?: string;
  };
};

/** `POST /admin/pagos-informados/:id/rechazar`. El motivo es obligatorio. */
export type RechazarAvisoPayload = {
  avisoId: string;
  datos: { motivo: string };
};

export const MIN_LARGO_MOTIVO = 5;
export const MAX_LARGO_MOTIVO = 500;
export const MAX_LARGO_NOTA_COBRO = 500;

/**
 * El formulario de confirmar.
 *
 * **Los dos campos vienen precargados con lo que informó el cliente**, que es lo
 * normal: confirmar es abrir y tocar el botón. Se corrigen cuando lo que
 * apareció en el banco no es exactamente eso —dijo $50.000 y entraron $45.000, o
 * dijo el viernes y el movimiento es del jueves—. Lo corregido va al **cobro**;
 * el aviso se queda con lo que dijo el cliente, así los dos números quedan
 * escritos.
 */
const confirmarBaseSchema = z.object({
  monto: z.string().refine((texto) => {
    const monto = parseAMonto(texto);
    return monto !== null && monto > 0;
  }, 'El monto tiene que ser mayor que cero, con hasta dos decimales.'),
  fecha: fechaPantallaSchema,
  nota: z.string().trim().max(MAX_LARGO_NOTA_COBRO, `Máximo ${MAX_LARGO_NOTA_COBRO} caracteres`),
});

export type ConfirmarAvisoFormValues = z.infer<typeof confirmarBaseSchema>;

/**
 * El schema de confirmar **para un aviso concreto**: hace falta el saldo, que es
 * el tope de lo que se puede anotar.
 *
 * Validarlo acá evita gastar un request que volvería con ese mismo texto, y
 * además marca el campo exacto en vez de dejar un cartel suelto arriba.
 */
export function crearConfirmarAvisoSchema(saldo: number) {
  return confirmarBaseSchema.refine(
    (valores) => {
      const monto = parseAMonto(valores.monto);
      return monto === null || monto <= saldo;
    },
    {
      path: ['monto'],
      message: `No podés anotar más de ${formatMonto(saldo)}, que es lo que falta de esta factura.`,
    },
  );
}

/** Formulario → cuerpo del POST. Los opcionales vacíos no viajan. */
export function aConfirmarAvisoPayload(
  avisoId: string,
  valores: ConfirmarAvisoFormValues,
): ConfirmarAvisoPayload {
  const nota = valores.nota.trim();

  return {
    avisoId,
    datos: {
      monto: parseAMonto(valores.monto) ?? 0,
      fecha: parseFechaPantalla(valores.fecha) ?? undefined,
      ...(nota ? { nota } : {}),
    },
  };
}

/**
 * El motivo del rechazo.
 *
 * **Es obligatorio y no es burocracia**: es lo único que le explica al cliente
 * por qué avisó que pagó y le sigue figurando la deuda. Le llega tal cual. Un
 * rechazo sin motivo es un aviso que desaparece.
 */
export const rechazarAvisoSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(
      MIN_LARGO_MOTIVO,
      'Escribí por qué no se toma el pago: "no figura en el banco", "el monto no coincide".',
    )
    .max(MAX_LARGO_MOTIVO, `El motivo no puede pasar de ${MAX_LARGO_MOTIVO} caracteres.`),
});

export type RechazarAvisoFormValues = z.infer<typeof rechazarAvisoSchema>;
