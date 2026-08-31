import { useCallback, useState } from 'react';
import { useLogout } from '@/features/auth';

export interface CierreDeSesion {
  /** Cierra la sesión. No navega: el stack raíz se reemplaza solo. */
  cerrar: () => void;
  /** Hay un cierre en curso: el botón se bloquea para que no se toque dos veces. */
  cerrando: boolean;
}

/**
 * Cerrar sesión desde el panel "Más".
 *
 * Usa `useLogout` de auth, que hace las tres cosas que hay que hacer —cerrar la
 * sesión de Google, borrar token y usuario, y vaciar el cache de RTK Query— y
 * **no despacha `logout()` suelto**, que dejaría datos del usuario anterior en
 * la app.
 *
 * No hay a dónde navegar después: al quedar sin sesión, el `RootNavigator`
 * cambia de stack solo. Por lo mismo, `cerrando` no se vuelve a apagar en el
 * caso feliz — para cuando la promesa termina, este panel ya no está montado.
 *
 * El `cerrando` no es adorno: cerrar la sesión de Google es una llamada nativa y
 * tarda lo suficiente como para que alguien toque dos veces.
 */
export function useCerrarSesion(): CierreDeSesion {
  const logout = useLogout();
  const [cerrando, setCerrando] = useState(false);

  const cerrar = useCallback(() => {
    if (cerrando) {
      return;
    }
    setCerrando(true);
    // `useLogout` no rechaza —lo de Google es best-effort y se traga su error—,
    // así que el `catch` es una red por si eso cambia: sin él, el panel quedaría
    // trabado con el botón girando para siempre.
    logout().catch(() => setCerrando(false));
  }, [cerrando, logout]);

  return { cerrar, cerrando };
}
