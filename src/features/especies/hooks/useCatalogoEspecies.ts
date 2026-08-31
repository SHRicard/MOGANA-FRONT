import { useCallback, useMemo, useState } from 'react';
import { filtrarEspecies, type Especie } from '../types';
import { useEspecies, type Catalogo } from './useEspecies';

/** Todo lo que necesita `EspeciesScreen`. La pantalla no calcula nada. */
export interface CatalogoBuscable extends Catalogo {
  /** Las que quedan después de filtrar por lo tipeado. */
  especies: readonly Especie[];
  /** El catálogo completo, para saber si un nombre nuevo ya existe. */
  todas: readonly Especie[];
  texto: string;
  onTextoChange: (texto: string) => void;
  limpiarBusqueda: () => void;
  hayBusqueda: boolean;
  /** Cuántas hay en total, sin el filtro. */
  total: number;
}

/**
 * El catálogo con su buscador (`docs/flujo_especies.md` §3).
 *
 * **El filtro es en memoria y sin debounce**, a diferencia del listado de
 * clientes: acá la lista entera ya está en el teléfono, así que no hay request
 * que ahorrar y el resultado sale con cada tecla. Ignora mayúsculas y tildes,
 * igual que el `?q=` del backend: `limon` encuentra a `Limón`.
 */
export function useCatalogoEspecies(): CatalogoBuscable {
  const catalogo = useEspecies();
  const [texto, setTexto] = useState('');

  const especies = useMemo(
    () => filtrarEspecies(catalogo.especies, texto),
    [catalogo.especies, texto],
  );

  const limpiarBusqueda = useCallback(() => setTexto(''), []);

  return {
    ...catalogo,
    especies,
    todas: catalogo.especies,
    texto,
    onTextoChange: setTexto,
    limpiarBusqueda,
    hayBusqueda: texto.trim().length > 0,
    total: catalogo.especies.length,
  };
}
