import { useMemo } from 'react';
import { selectRol } from '@/features/auth';
import { useAppSelector } from '@/store';
import { MENU_ITEMS, type MenuItem } from '../menuItems';

/**
 * Filas del panel "Más" que le corresponden a la sesión actual.
 *
 * Un solo gate y **niega por defecto**: la fila con `roles` declarados se
 * muestra únicamente si el rol de la sesión está en la lista. Sin rol —o con uno
 * que la app no conoce— quedan solo las filas que no piden ninguno.
 *
 * La lógica vive acá y no en el componente: `MenuSheet` solo pinta lo que le
 * devuelve este hook y no sabe nada de roles.
 */
export function useMenuItems(): readonly MenuItem[] {
  const rol = useAppSelector(selectRol);

  return useMemo(
    () =>
      MENU_ITEMS.filter(
        (item: MenuItem) => item.roles === undefined || (rol !== null && item.roles.includes(rol)),
      ),
    [rol],
  );
}
