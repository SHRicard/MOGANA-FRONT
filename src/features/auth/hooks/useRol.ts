import { useMemo } from 'react';
import { useAppSelector } from '@/store';
import { Roles, type Rol } from '../types';
import { selectRol } from '../store';

export interface RolActual {
  /** `null` si no hay sesión o si el backend mandó un rol desconocido. */
  rol: Rol | null;
  esSuperAdmin: boolean;
  esAdministrador: boolean;
  esCliente: boolean;
  /**
   * Super admin **o** administrador: los dos entran a `/api/admin/*`.
   *
   * No es jerarquía automática: **cada endpoint declara quién entra**
   * (`docs/s.roles.md`), y este puntual acepta a los dos. Si mañana se separan,
   * se separa acá.
   */
  puedeAdministrar: boolean;
}

/**
 * El rol de la sesión, para esconder lo que no le corresponde:
 *
 * ```tsx
 * const { puedeAdministrar } = useRol();
 * {puedeAdministrar && <Button label="Abrir período" ... />}
 * ```
 *
 * Reemplaza al viejo `usePermissions`: ya no hay array de permisos, hay un rol
 * (`docs/s.roles.md`).
 *
 * ⚠️ Esto es UI, no seguridad: el backend valida igual y contesta `403`. Que
 * llegue ese error significa que la app mostró algo que no correspondía.
 */
export function useRol(): RolActual {
  const rol = useAppSelector(selectRol);

  return useMemo(() => {
    const esSuperAdmin = rol === Roles.SUPER_ADMIN;
    const esAdministrador = rol === Roles.ADMINISTRADOR;

    return {
      rol,
      esSuperAdmin,
      esAdministrador,
      esCliente: rol === Roles.CLIENTE,
      puedeAdministrar: esSuperAdmin || esAdministrador,
    };
  }, [rol]);
}
