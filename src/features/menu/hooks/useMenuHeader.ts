import { useMemo } from 'react';
import { selectCurrentUser } from '@/features/auth';
import { useAppSelector } from '@/store';

interface MenuHeader {
  title: string;
  subtitle: string;
}

/**
 * Encabezado del panel "Más": identifica a la persona logueada en vez de
 * repetir el nombre del tab.
 *
 * Los textos se arman acá y no en el componente: `MenuSheet` solo los pinta.
 */
export function useMenuHeader(): MenuHeader {
  const user = useAppSelector(selectCurrentUser);

  return useMemo(() => {
    const name = user?.name.trim();

    return {
      // Sin usuario cargado no hay a quién nombrar: se cae a un título neutro.
      title: name || 'Tu cuenta',
      // Una cuenta creada con DNI no tiene email: ahí se muestra el documento,
      // que es igual de identificatorio para quien está mirando.
      subtitle: user?.email || user?.dni || 'Gestioná tu cuenta y tus preferencias',
    };
  }, [user]);
}
