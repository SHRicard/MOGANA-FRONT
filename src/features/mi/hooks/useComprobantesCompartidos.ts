import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que es justamente quien monta este hook → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { shareIntentService } from '@/services/share';
import { useAppDispatch, useAppSelector } from '@/store';
import { comprobanteRecibido, selectComprobantePendiente } from '../store';
import { REGLA_DEL_COMPROBANTE } from '../types';

export interface ComprobantesCompartidos {
  /** Si el navegador tiene que mostrar el comprobante que está esperando. */
  hayPendiente: boolean;
}

/**
 * La entrada por la **hoja de compartir** (`docs/compartir_comprobante.md`).
 *
 * Vive en el `RootNavigator` porque tiene que estar montado antes de saber si
 * hay sesión: el caso más común de todos es compartir con la sesión vencida, y
 * si la imagen se descarta en el camino al login el cliente tiene que volver a
 * Mercado Pago y compartir de nuevo (§5.1).
 *
 * Hace tres cosas, en este orden:
 *
 * 1. **Levanta lo compartido**, al montar y cada vez que la app vuelve a primer
 *    plano. Son los dos casos que hay que cubrir sí o sí (§2.2): con la app
 *    **cerrada** el intent llega en el arranque y lo levanta el montaje; con la
 *    app **en segundo plano** llega mientras corre, y traerla al frente es
 *    justamente lo que dispara el `active`. Preguntar de más es gratis: el
 *    nativo entrega y borra en el mismo paso, así que nada se procesa dos veces.
 *
 * 2. **Lo guarda antes de mirar la sesión.** El pendiente vive en el storage,
 *    así que sobrevive al login, al DNI y a que la app se cierre en el medio.
 *
 * 3. **Abre la pantalla de elegir factura cuando se puede**: con sesión y con el
 *    perfil completo. Mientras falte alguna de las dos, el `RootNavigator` ya
 *    está mostrando el login o el cartel del DNI, y el comprobante espera —que
 *    es exactamente lo que piden §5.1 y §5.2.
 *
 * ⚠️ **Abre una sola vez por comprobante.** Si el cliente vuelve atrás sin
 * mandarlo, el pendiente queda para el próximo arranque pero la pantalla no se
 * le vuelve a plantar encima: eso se leería como una app trabada.
 */
export function useComprobantesCompartidos(
  navegacion: NavigationContainerRef<RootStackParamList>,
  /** Con sesión y con el perfil completo: recién ahí hay adónde navegar. */
  puedeAbrir: boolean,
): ComprobantesCompartidos {
  const dispatch = useAppDispatch();
  const pendiente = useAppSelector(selectComprobantePendiente);

  const levantar = useCallback(async () => {
    // La regla del archivo va de acá para allá: el puente aplica el tope y los
    // formatos, pero quien conoce el contrato del backend es esta feature.
    const compartido = await shareIntentService.tomarComprobante(REGLA_DEL_COMPROBANTE);
    if (compartido) {
      dispatch(comprobanteRecibido(compartido));
    }
  }, [dispatch]);

  useEffect(() => {
    // Al montar: cubre la app **cerrada**, donde el intent llegó en el arranque
    // y quedó en la cola del módulo nativo mucho antes de que JS existiera.
    levantar();

    const suscripcion = AppState.addEventListener('change', (estado: AppStateStatus) => {
      if (estado === 'active') {
        levantar();
      }
    });

    return () => suscripcion.remove();
  }, [levantar]);

  /**
   * Cuál fue el último comprobante que se llegó a abrir. El archivo alcanza como
   * identidad: el nativo le pone la marca de tiempo al nombre, así que dos
   * comprobantes distintos nunca comparten ruta.
   */
  const abierto = useRef<string | null>(null);

  useEffect(() => {
    if (!pendiente || !puedeAbrir || abierto.current === pendiente.archivo) {
      return;
    }
    if (!navegacion.isReady()) {
      return;
    }
    abierto.current = pendiente.archivo;
    navegacion.navigate(RootRoutes.ELEGIR_FACTURA);
  }, [pendiente, puedeAbrir, navegacion]);

  return { hayPendiente: pendiente !== null };
}
