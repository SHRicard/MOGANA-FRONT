import { useCallback, useRef, useState } from 'react';
import { useRol, type Rol } from '@/features/auth';
import { useDebouncedValue } from '@/shared/hooks';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/utils';
import { useListarClientesQuery, useListarUsuariosQuery } from '../api';
import { USUARIOS_DEBOUNCE_MS, USUARIOS_LIMITE, type Usuario } from '../types';

/**
 * Todo lo que necesita `UsuariosScreen` para dibujarse. La pantalla no calcula
 * nada: pinta esto.
 */
export interface ListadoUsuarios {
  // ── Filtros ──
  /** Lo que se ve en el input, sin atrasar (la API se llama con debounce). */
  texto: string;
  onTextoChange: (texto: string) => void;
  /**
   * El texto con el que se buscó de verdad (ya con debounce). Es el que nombra
   * el estado vacío: decir "no hay resultados para X" con lo que todavía se está
   * tipeando muestra un texto que nunca se buscó.
   */
  busqueda: string;
  /**
   * Filtro por rol. Solo lo tiene el super admin: el listado del administrador
   * son todos clientes, así que filtrar por rol ahí no separa nada (y la API
   * ignora el parámetro).
   */
  puedeFiltrarPorRol: boolean;
  /** `null` = todos los roles. Sin `puedeFiltrarPorRol`, siempre `null`. */
  rol: Rol | null;
  onRolChange: (rol: Rol | null) => void;
  /** Vacía solo el buscador. Es la "✕" del campo. */
  limpiarBusqueda: () => void;
  /** Borra el texto y el rol: es el "volver al listado completo". */
  limpiarFiltros: () => void;
  /** `true` si hay un texto buscado. Cambia qué dice el estado vacío. */
  hayBusqueda: boolean;
  /** `true` si hay texto o rol elegido. Es lo que puede dejar la lista vacía. */
  hayFiltros: boolean;

  /**
   * A qué ficha lleva tocar una fila.
   *
   * `true` para el super admin: su listado trae **los tres roles**, y la ficha
   * del administrador (`/admin/clientes/:id`) solo existe para los clientes —a
   * una cuenta de administración le contesta `404`—. La suya es la del panel del
   * sistema, que existe para las tres y es desde donde se mueve un rol
   * (`docs/README_FRONT_SUPER_ADMIN.md` §5). De ahí se pasa a la del cliente
   * cuando la cuenta es un cliente.
   */
  fichaDelSistema: boolean;

  // ── Resultados ──
  usuarios: readonly Usuario[];
  total: number;
  pagina: number;
  paginas: number;
  /** A qué página ir. Los bordes los cuida la paginación, que sabe cuántas hay. */
  irAPagina: (pagina: number) => void;

  // ── Estados ──
  /** Primera carga, sin nada que mostrar todavía. */
  isLoading: boolean;
  /** Hay una request en vuelo (incluye cambiar de página o buscar). */
  isFetching: boolean;
  /** `403`: el rol de quien mira no alcanza. Se esconde el apartado. */
  sinPermiso: boolean;
  /** Texto ya redactado del error, o `null`. */
  mensajeError: string | null;
  reintentar: () => void;
  /**
   * Vuelve a pedirle los datos a la API, igual que `reintentar`, pero
   * **devolviendo la promesa**: es lo que usa el "tirar para abajo" para dejar
   * la rueda girando hasta que la respuesta llega.
   */
  refrescar: () => Promise<void>;
}

/**
 * Listado del apartado Administrador: buscador con debounce, paginación y —solo
 * para el super admin— filtro por rol. Ver `docs/s.roles.md`.
 *
 * **El rol elige el endpoint**: el administrador ve clientes
 * (`/admin/clientes`) y el super admin ve todas las cuentas
 * (`/super-admin/usuarios`). Es la misma pantalla con dos alcances.
 *
 * Toda la lógica del apartado vive acá — la pantalla solo arma la UI.
 */
export function useListadoUsuarios(): ListadoUsuarios {
  const { esSuperAdmin } = useRol();
  const [texto, setTexto] = useState('');
  const [rol, setRol] = useState<Rol | null>(null);
  const [pagina, setPagina] = useState(1);

  // Lo que realmente viaja a la API. Se busca sin espacios de los costados: un
  // teclado móvil los agrega solo y cambiarían el resultado sin que se vean.
  const q = useDebouncedValue(texto.trim(), USUARIOS_DEBOUNCE_MS);

  /**
   * Volver a la página 1 cuando cambia el filtro.
   *
   * Se ajusta **durante el render** y no en un `useEffect` a propósito: con el
   * efecto, este render todavía pediría la página vieja (buscar algo nuevo
   * estando en la 3 saldría a buscar "página 3 de la búsqueda nueva") y recién
   * el siguiente pediría la 1. Son dos requests, y una es basura.
   */
  const filtroPrevio = useRef({ q, rol });
  if (filtroPrevio.current.q !== q || filtroPrevio.current.rol !== rol) {
    filtroPrevio.current = { q, rol };
    setPagina(1);
  }

  /**
   * Las dos queries se declaran siempre —los hooks no pueden llamarse dentro de
   * un `if`— y `skip` deja viva solo la que corresponde al rol. La otra no sale
   * a la red: sin esto, un administrador pediría `/super-admin/usuarios` y se
   * comería un `403` en cada búsqueda.
   */
  const clientes = useListarClientesQuery(
    { q, pagina, limite: USUARIOS_LIMITE },
    {
      skip: esSuperAdmin,
    },
  );
  const usuarios = useListarUsuariosQuery(
    { q, rol: rol ?? undefined, pagina, limite: USUARIOS_LIMITE },
    { skip: !esSuperAdmin },
  );

  const { data, error, isLoading, isFetching, refetch } = esSuperAdmin ? usuarios : clientes;

  /**
   * Cada combinación de params es una entrada de cache distinta, así que `data`
   * vuelve a ser `undefined` en cuanto cambia una letra del buscador. Sin esto,
   * la lista desaparecería y volvería en cada búsqueda y en cada cambio de
   * página: se guarda la última página que llegó para dejarla puesta mientras
   * carga la nueva (el spinner del header avisa que se está actualizando).
   */
  const ultimaPagina = useRef<{ datos: readonly Usuario[]; total: number; paginas: number }>({
    datos: [],
    total: 0,
    paginas: 0,
  });
  if (data) {
    ultimaPagina.current = { datos: data.datos, total: data.total, paginas: data.paginas };
  }

  // Con error manda el cartel: una lista vieja que ya no representa nada es peor
  // que no mostrar lista.
  const resultado = error ? { datos: [], total: 0, paginas: 0 } : ultimaPagina.current;

  const irAPagina = useCallback((destino: number) => setPagina(destino), []);

  const limpiarBusqueda = useCallback(() => setTexto(''), []);

  const limpiarFiltros = useCallback(() => {
    setTexto('');
    setRol(null);
  }, []);

  const reintentar = useCallback(() => {
    refetch();
  }, [refetch]);

  /**
   * Lo mismo que `reintentar`, pero esperable. Son dos porque se usan distinto:
   * el botón de reintentar dispara y se olvida, y el gesto de refrescar necesita
   * saber cuándo terminó para bajar la rueda.
   */
  const refrescar = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    texto,
    onTextoChange: setTexto,
    busqueda: q,
    puedeFiltrarPorRol: esSuperAdmin,
    rol,
    onRolChange: setRol,
    limpiarBusqueda,
    limpiarFiltros,
    hayBusqueda: q.length > 0,
    hayFiltros: q.length > 0 || rol !== null,
    fichaDelSistema: esSuperAdmin,

    usuarios: resultado.datos,
    total: resultado.total,
    pagina,
    paginas: resultado.paginas,
    irAPagina,

    isLoading,
    isFetching,
    /**
     * El `403` esconde el apartado: el rol no alcanza. Se mira el status y no el
     * `error.codigo`: el status llega siempre, el código puede no venir.
     */
    sinPermiso: getApiErrorStatus(error) === 403,
    mensajeError: getApiErrorMessage(error),
    reintentar,
    refrescar,
  };
}
