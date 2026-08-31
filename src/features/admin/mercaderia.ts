import { z } from 'zod';
import { fechaApiSchema, mesApiSchema } from '@/shared/utils';

/**
 * **Las pantallas que miran la mercadería** y no la plata
 * (`docs/flujo_metricas.md` §5 y §6).
 *
 * Son dos, y contestan cosas distintas —conviene no elegir al azar:
 *
 * ```
 * ticket (§4)      → qué se vendió EN JULIO
 * tendencia (§5)   → cómo viene MES A MES
 * productos (§6)   → qué manda EN TODO EL PERÍODO
 * ```
 *
 * Las dos salen del catálogo de especies: sin una etiqueta por renglón habría
 * que agrupar por el texto del producto, que el mostrador escribe distinto cada
 * vez. Viven en su propio archivo y no en `types.ts` porque son un apartado
 * entero, no un campo más del tablero.
 */

/** Un importe en pesos. Igual que en el resto del panel: puede ser cero. */
const importe = z.number();

/** Un porcentaje de 0 a 100, o `null` si no hay contra qué calcularlo. */
const porcentaje = z.number().nullable();

/** Unidades vendidas. No siempre son enteras: no todo se vende por unidad. */
const unidades = z.number();

// ─────────────────────────────────────────────────────────────
// §5. La tendencia de compra
// ─────────────────────────────────────────────────────────────

/** Cuántos meses trae la serie si no se pide otra cosa. */
export const MESES_DE_TENDENCIA = 12;
/** Dos años es todo lo que un gráfico de barras por mes puede mostrar. */
export const MESES_MAXIMOS = 24;
export const MESES_MINIMOS = 2;

/**
 * Por qué se ordena la tendencia. Cada uno ya viene con la dirección en la que
 * sirve, igual que en el listado de clientes.
 */
export const OrdenesDeTendencia = {
  MONTO: 'monto',
  CANTIDAD: 'cantidad',
  CRECIMIENTO: 'crecimiento',
  CAIDA: 'caida',
} as const;

export type OrdenDeTendencia = (typeof OrdenesDeTendencia)[keyof typeof OrdenesDeTendencia];

/** Qué aparece primero con cada orden. */
export const ORDEN_TENDENCIA_LABEL: Record<OrdenDeTendencia, string> = {
  [OrdenesDeTendencia.MONTO]: 'La que más plata dejó',
  [OrdenesDeTendencia.CANTIDAD]: 'La que más unidades movió',
  [OrdenesDeTendencia.CRECIMIENTO]: 'La que más subió',
  [OrdenesDeTendencia.CAIDA]: 'La que más se derrumbó',
};

/** Para qué sirve mirar cada uno. */
export const ORDEN_TENDENCIA_AYUDA: Record<OrdenDeTendencia, string> = {
  [OrdenesDeTendencia.MONTO]: 'De qué vive el negocio',
  [OrdenesDeTendencia.CANTIDAD]: 'Qué es lo que más sale por la puerta',
  [OrdenesDeTendencia.CRECIMIENTO]: 'Qué empujar',
  [OrdenesDeTendencia.CAIDA]: 'Qué se está apagando',
};

/** Un punto de la serie de una especie. Los meses en cero vienen igual. */
export const puntoDeSerieSchema = z.object({
  mes: mesApiSchema,
  cantidad: unidades,
  monto: importe,
});

/** Una especie en la tendencia del mes elegido. */
export const especieDeTendenciaSchema = z.object({
  especieId: z.string(),
  nombre: z.string(),

  /** **Cuántas unidades salieron.** Las 100 zapatillas. */
  cantidad: unidades,
  monto: importe,
  facturas: z.number().int(),
  /**
   * **Cuántos clientes distintos se la llevaron** — cabezas, no facturas.
   *
   * Es el que separa dos negocios que se ven iguales: una especie que se
   * llevaron veinte personas y otra que se llevó una sola en veinte facturas
   * suman lo mismo. Si un solo cliente sostiene una especie, el día que se vaya
   * se va la especie entera.
   */
  clientes: z.number().int(),

  /** Qué parte del monto del mes se llevó, de 0 a 100. */
  participacion: porcentaje,
  /**
   * `monto / cantidad`. ⚠️ **No es el precio de lista**: ahí entran juntas las
   * remeras de $8.000 y las de $20.000. Sirve para leer un cambio, no para saber
   * cuánto sale una. `null` si este mes no se vendió ninguna.
   */
  precioPromedio: importe.nullable(),

  /** Lo del mes anterior, que es contra lo que se compara. */
  anterior: z.object({ cantidad: unidades, monto: importe }),
  /** `null` si el mes anterior fue cero: para ese caso está el chip `nueva`. */
  variacionCantidad: porcentaje,
  variacionMonto: porcentaje,
  /** `nueva`, `sube`, `estable`, `baja` o `parada`. */
  tendencia: z.string(),

  /** Los mismos meses del eje, en el mismo orden y rellenados con `0`. */
  serie: z.array(puntoDeSerieSchema),
});

export const totalesDeTendenciaSchema = z.object({
  cantidad: unidades,
  monto: importe,
  especies: z.number().int(),
  facturas: z.number().int(),
  clientes: z.number().int(),
});

export const tendenciaDeCompraSchema = z.object({
  hoy: fechaApiSchema,
  mes: mesApiSchema,
  desde: fechaApiSchema,
  hasta: fechaApiSchema,
  /** En `false` el mes todavía no terminó: la comparación es parcial. */
  cerrado: z.boolean(),
  mesAnterior: mesApiSchema,
  /** **El eje del gráfico.** Todas las series vienen con estos meses. */
  meses: z.array(mesApiSchema),
  totales: totalesDeTendenciaSchema,
  /**
   * ⚠️ **No es "lo que se vendió este mes"**: es todo lo que se movió en la
   * ventana, con los números de este mes. Una especie que se vendía todos los
   * meses y este no aparece viene igual, en cero y con `tendencia: "parada"` —y
   * *"dejaron de llevar remeras"* es exactamente el dato que esta pantalla tiene
   * que dar.
   */
  especies: z.array(especieDeTendenciaSchema),
});

export type PuntoDeSerie = z.infer<typeof puntoDeSerieSchema>;
export type EspecieDeTendencia = z.infer<typeof especieDeTendenciaSchema>;
export type TotalesDeTendencia = z.infer<typeof totalesDeTendenciaSchema>;
export type TendenciaDeCompra = z.infer<typeof tendenciaDeCompraSchema>;

/** Params de `GET /api/admin/metricas/tendencia`. */
export interface TendenciaParams {
  mes?: string;
  meses?: number;
  orden?: OrdenDeTendencia;
}

// ─────────────────────────────────────────────────────────────
// §6. La métrica global de productos
// ─────────────────────────────────────────────────────────────

/** Por qué se ordena la global. */
export const OrdenesDeProducto = {
  MONTO: 'monto',
  CANTIDAD: 'cantidad',
  CLIENTES: 'clientes',
  CRECIMIENTO: 'crecimiento',
  CAIDA: 'caida',
  OLVIDADAS: 'olvidadas',
} as const;

export type OrdenDeProducto = (typeof OrdenesDeProducto)[keyof typeof OrdenesDeProducto];

export const ORDEN_PRODUCTO_LABEL: Record<OrdenDeProducto, string> = {
  [OrdenesDeProducto.MONTO]: 'La que más plata dejó',
  [OrdenesDeProducto.CANTIDAD]: 'La que más unidades movió',
  [OrdenesDeProducto.CLIENTES]: 'La que le compra más gente',
  [OrdenesDeProducto.CRECIMIENTO]: 'La que más subió',
  [OrdenesDeProducto.CAIDA]: 'La que más se derrumbó',
  [OrdenesDeProducto.OLVIDADAS]: 'La que hace más que no se vende',
};

export const ORDEN_PRODUCTO_AYUDA: Record<OrdenDeProducto, string> = {
  [OrdenesDeProducto.MONTO]: 'De qué vive el negocio',
  [OrdenesDeProducto.CANTIDAD]: 'Qué es lo que más sale por la puerta',
  [OrdenesDeProducto.CLIENTES]: 'Qué es transversal y qué lo sostiene uno solo',
  [OrdenesDeProducto.CRECIMIENTO]: 'Qué empujar',
  [OrdenesDeProducto.CAIDA]: 'Qué se está apagando',
  [OrdenesDeProducto.OLVIDADAS]: 'Qué dejar de comprar',
};

/** Un producto concreto dentro de una especie. */
export const productoDeEspecieSchema = z.object({
  /** El texto que tipeó el mostrador, agrupado ignorando mayúsculas y espacios. */
  producto: z.string(),
  cantidad: unidades,
  monto: importe,
  facturas: z.number().int(),
  /** Su parte **dentro de la especie**, no del negocio. */
  participacion: porcentaje,
});

export const mesDestacadoSchema = z.object({
  mes: mesApiSchema,
  cantidad: unidades,
  monto: importe,
});

/** Una especie en el acumulado de todo el período. */
export const especieGlobalSchema = z.object({
  especieId: z.string(),
  nombre: z.string(),
  /** Su lugar en el ranking, **según el orden que se pidió**. */
  puesto: z.number().int(),

  cantidad: unidades,
  monto: importe,
  facturas: z.number().int(),
  clientes: z.number().int(),
  /** Cuántos productos concretos se facturaron con esta etiqueta. */
  productosDistintos: z.number().int(),

  participacion: porcentaje,
  /**
   * **El Pareto**: la suma de las participaciones hasta este renglón.
   *
   * ⚠️ Solo significa algo con el orden por monto, que es el único que deja la
   * lista de mayor a menor. Con los otros, la lista no está ordenada por plata y
   * el acumulado no dice nada.
   */
  participacionAcumulada: porcentaje,
  precioPromedio: importe.nullable(),

  primeraVenta: fechaApiSchema.nullable(),
  ultimaVenta: fechaApiSchema.nullable(),
  /** ⚠️ **`null` es "nunca se vendió"**, no "recién". */
  diasSinVenderse: z.number().int().nullable(),
  mesesConVenta: z.number().int(),
  /** Su mejor mes en unidades, con la plata de ese mes. */
  mejorMes: mesDestacadoSchema.nullable(),
  /**
   * Cuántas veces lo de un mes promedio vendió en su mejor mes: la respuesta en
   * un número a *"¿esto se vende todo el año o vive de una temporada?"*. Un
   * `1,2` es pareja; un `8,7`, una que vende en enero y nada más.
   */
  estacionalidad: z.number().nullable(),

  /** Los últimos 90 días del período, y los 90 anteriores. */
  reciente: z.object({ cantidad: unidades, monto: importe }),
  previo: z.object({ cantidad: unidades, monto: importe }),
  variacionCantidad: porcentaje,
  variacionMonto: porcentaje,
  tendencia: z.string(),

  /** Hasta 5 productos concretos. **Es el nivel que la especie tapa.** */
  productos: z.array(productoDeEspecieSchema),
});

export const totalesGlobalesSchema = z.object({
  cantidad: unidades,
  monto: importe,
  facturas: z.number().int(),
  clientes: z.number().int(),
  especies: z.number().int(),
  especiesConVenta: z.number().int(),
  productos: z.number().int(),
});

/** De cuántas cosas vive el negocio. */
export const concentracionSchema = z.object({
  /** Qué parte del monto se lleva la especie más grande. */
  primera: porcentaje,
  tresPrimeras: porcentaje,
  /**
   * **Cuántas especies hacen falta para llegar a la mitad de la facturación.**
   * Un `1` es un negocio de un solo producto, con todo lo que eso implica el día
   * que ese producto falte. `null` si no se vendió nada.
   */
  paraLaMitad: z.number().int().nullable(),
  /** Cuántas especies del catálogo no se vendieron en el período. */
  sinVenta: z.number().int(),
});

export const productosGlobalesSchema = z.object({
  hoy: fechaApiSchema,
  /** El período **efectivo**: sin filtro, el mes de la primera venta. */
  desde: mesApiSchema,
  /** Nunca pasa de hoy, aunque se pida un mes que todavía no terminó. */
  hasta: mesApiSchema,
  meses: z.number().int(),
  totales: totalesGlobalesSchema,
  concentracion: concentracionSchema,
  /**
   * ⚠️ **Trae el catálogo completo, incluso lo que no se vendió nunca**: la
   * consulta arranca en el catálogo y no en las ventas. El catálogo muerto —lo
   * que se cargó y nadie compró— es justamente lo que hay que dejar de comprarle
   * al proveedor, y no aparece en ninguna otra pantalla.
   */
  especies: z.array(especieGlobalSchema),
});

export type ProductoDeEspecie = z.infer<typeof productoDeEspecieSchema>;
export type MesDestacado = z.infer<typeof mesDestacadoSchema>;
export type EspecieGlobal = z.infer<typeof especieGlobalSchema>;
export type TotalesGlobales = z.infer<typeof totalesGlobalesSchema>;
export type Concentracion = z.infer<typeof concentracionSchema>;
export type ProductosGlobales = z.infer<typeof productosGlobalesSchema>;

/** Params de `GET /api/admin/metricas/productos`. */
export interface ProductosParams {
  desde?: string;
  hasta?: string;
  orden?: OrdenDeProducto;
}

// ─────────────────────────────────────────────────────────────
// Textos
// ─────────────────────────────────────────────────────────────

/**
 * Hace cuánto que no se vende, en palabras.
 *
 * ⚠️ **`null` es "nunca se vendió", no "recién"**: es una especie del catálogo
 * que nadie compró nunca, y es el dato que esta pantalla existe para dar.
 */
export function textoDiasSinVenderse(dias: number | null): string {
  if (dias === null) {
    return 'Nunca se vendió';
  }
  if (dias === 0) {
    return 'Se vendió hoy';
  }
  return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
}

/** De cuántas etiquetas vive la mitad del negocio, en palabras. */
export function textoParaLaMitad(especies: number | null): string {
  if (especies === null) {
    return '—';
  }
  return especies === 1 ? '1 especie' : `${especies} especies`;
}

/**
 * Qué tan estacional es, en palabras: un `1,2` es pareja y un `8,7` vive de una
 * temporada. `null` cuando no se vendió nunca.
 */
export function textoEstacionalidad(valor: number | null): string {
  if (valor === null) {
    return '—';
  }
  return `${valor.toFixed(1).replace('.', ',')} ×`;
}

/** Unidades vendidas, sin inventar decimales: `24 u`. */
export function textoUnidades(cantidad: number): string {
  return `${cantidad} u`;
}
