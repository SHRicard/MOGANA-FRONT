/**
 * API pública de la feature especies. Importar SOLO desde acá.
 *
 * Una **especie** es la etiqueta con la que se agrupa lo que se vende
 * (`docs/flujo_especies.md`): "12 Coca de 500ml" es el producto, "Gaseosa" es la
 * especie. El producto lo escribe el mostrador y cambia de forma cada vez, así
 * que sumar por ese texto no dice nada; la especie sí.
 *
 * Es una feature aparte y no una carpeta adentro de facturas porque el catálogo
 * es **su propio apartado del panel** —se lista, se crea, se renombra y se
 * borra— y porque su dueño es uno solo: la factura lo consume, no lo maneja.
 * Por eso `facturas` importa de acá el selector y el catálogo, y nunca al revés.
 */
export { EspeciesScreen } from './screens/EspeciesScreen';

export { SelectorDeEspecie } from './components';
export type { SelectorDeEspecieProps } from './components';

export { useEspecies, useCatalogoEspecies } from './hooks';
export type { Catalogo, CatalogoBuscable } from './hooks';

export { especieSchema, catalogoEspeciesSchema, especieDeItemSchema } from './types';
export {
  MIN_LARGO_ESPECIE,
  MAX_LARGO_ESPECIE,
  claveDeEspecie,
  filtrarEspecies,
  buscarEspeciePorNombre,
  yaExisteEspecie,
  sePuedeBorrar,
  textoUsos,
} from './types';
export type { Especie, CatalogoEspecies, EspecieDeItem } from './types';
