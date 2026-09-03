import { useCallback, useMemo, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import BellOff from 'lucide-react-native/icons/bell-off';
import MessageSquare from 'lucide-react-native/icons/message-square';
import WifiOff from 'lucide-react-native/icons/wifi-off';
// Rutas profundas y no el barrel `@/app/navigation`: ese barrel arrastra el
// RootNavigator, que registra esta pantalla → ciclo en runtime.
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { Button } from '@/shared/ui/atoms/Button';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Link } from '@/shared/ui/atoms/Link';
import { Text } from '@/shared/ui/atoms/Text';
import { diaRelativo, formatHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { Burbuja, CampoDeMensaje } from '../components';
import { useMiChat, type MensajeEnVuelo } from '../hooks';
import {
  abreUnDia,
  ContextosDeMensaje,
  esDelNegocio,
  type ContextoDelMensaje,
  type MiMensaje,
} from '../types';

type MisMensajesRoute = RouteProp<RootStackParamList, typeof RootRoutes.MIS_MENSAJES>;

/**
 * Un renglón de la lista. Los dos casos se dibujan con el mismo globito: lo que
 * cambia es que el de en vuelo todavía no tiene hora ni existe del otro lado.
 */
type Renglon =
  | { clase: 'mensaje'; mensaje: MiMensaje; abreDia: boolean }
  | { clase: 'enVuelo'; pendiente: MensajeEnVuelo };

const keyExtractor = (renglon: Renglon) =>
  renglon.clase === 'mensaje' ? renglon.mensaje.id : renglon.pendiente.id;

/**
 * **Mis mensajes con el local** (`/mi/mensajes`).
 *
 * Un solo hilo, para siempre: el cliente no elige con quién habla, habla con el
 * negocio. Del otro lado contesta quien esté atendiendo ese día, y por eso los
 * mensajes que llegan **no dicen quién los escribió** — es el local, no Ana.
 *
 * ⚠️ **La lista va invertida.** El backend manda del más nuevo al más viejo, que
 * es exactamente lo que consume una `FlatList` con `inverted`: el último mensaje
 * queda abajo sin tener que dar vuelta el arreglo ni saltar al final después de
 * dibujar. Y como efecto, `onEndReached` se dispara al llegar **arriba**, que es
 * donde se pide lo viejo.
 *
 * ⚠️ **Sin gesto de tirar para abajo**, y es a propósito aunque haya datos de la
 * API: en una lista invertida ese gesto queda en el extremo de los mensajes
 * viejos —el lugar donde uno espera cargar más historia, no recargar— y encima
 * la pantalla ya se refresca sola cada ocho segundos.
 *
 * Toda la lógica vive en `useMiChat`.
 */
export function MisMensajesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const navigation = useNavigation();
  const { params } = useRoute<MisMensajesRoute>();
  const chat = useMiChat();

  /**
   * De qué va a colgar lo que se escriba, si se entró desde una factura o un
   * aviso. Viene por parámetro y no se elige acá: el backend exige que sea de
   * quien escribe, así que sale de una pantalla que **ya estaba mostrando algo
   * suyo**.
   */
  const sobre = params?.sobre ?? null;

  const renglones: Renglon[] = useMemo(() => {
    const delServidor: Renglon[] = chat.mensajes.map((mensaje, indice) => ({
      clase: 'mensaje',
      mensaje,
      abreDia: abreUnDia(chat.mensajes, indice),
    }));

    // Los que todavía no salieron van primero: en una lista invertida, primero
    // es abajo de todo, que es donde uno espera ver lo que acaba de escribir.
    return [
      ...chat.enVuelo.map((pendiente): Renglon => ({ clase: 'enVuelo', pendiente })),
      ...delServidor,
    ];
  }, [chat.mensajes, chat.enVuelo]);

  /** Abrir la factura o el aviso del que habla un mensaje. */
  const abrirContexto = useCallback(
    (contexto: ContextoDelMensaje) => {
      if (contexto.tipo === ContextosDeMensaje.FACTURA) {
        navigation.navigate(RootRoutes.MI_FACTURA, { facturaId: contexto.id });
        return;
      }
      /*
        Un aviso de pago no tiene pantalla propia: se ve en la lista de avisos.
        Llevar ahí es mejor que no hacer nada — el chip se ve tocable y tiene que
        cumplir— y es donde está el aviso del que se habla.
      */
      if (contexto.tipo === ContextosDeMensaje.PAGO_INFORMADO) {
        navigation.navigate(RootRoutes.MIS_AVISOS);
      }
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Renglon>) => {
      if (item.clase === 'enVuelo') {
        return (
          <Burbuja
            texto={item.pendiente.texto}
            propio
            enVuelo
            problema={item.pendiente.problema}
            onReintentar={() => chat.reintentar(item.pendiente.id)}
            onDescartar={() => chat.descartar(item.pendiente.id)}
          />
        );
      }

      const { mensaje } = item;

      return (
        <View style={styles.conDia}>
          {/*
            El separador va ANTES del globito en el JSX y aparece ARRIBA en la
            pantalla: la lista está invertida, no el contenido de cada fila.
          */}
          {item.abreDia ? (
            <View style={styles.dia}>
              <Text variant="caption" color="textMuted">
                {diaRelativo(mensaje.createdAt)}
              </Text>
            </View>
          ) : null}

          <Burbuja
            texto={mensaje.texto}
            propio={!esDelNegocio(mensaje)}
            hora={formatHora(mensaje.createdAt)}
            sobre={mensaje.sobre}
            onSobrePress={abrirContexto}
          />
        </View>
      );
    },
    [chat, styles, abrirContexto],
  );

  /** En una lista invertida el "footer" se dibuja arriba: ahí va lo viejo. */
  const pie: ReactElement | null = chat.hayAnteriores ? (
    <View style={styles.anteriores}>
      {chat.cargandoAnteriores ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Link label="Ver mensajes anteriores" variant="caption" onPress={chat.verAnteriores} />
      )}
    </View>
  ) : null;

  const vacio: ReactElement = (
    <EmptyState
      icon={<MessageSquare size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title="Escribinos"
      description="Dudas con una factura, un pago que no aparece, o cualquier cosa del local. Te contestamos por acá."
    />
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      // En Android el teclado ya lo resuelve `windowSoftInputMode`; forzar
      // `padding` acá deja un hueco del alto del teclado abajo de todo.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text variant="title" weight="semibold" accessibilityRole="header">
          Mensajes
        </Text>
        <Text variant="caption" color="textMuted">
          Hablás con el local
        </Text>
      </View>

      {chat.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer tus mensajes"
          description={chat.mensajeError}
          action={<Button label="Reintentar" onPress={chat.reintentarCarga} />}
        />
      ) : chat.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={renglones}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          inverted={renglones.length > 0}
          ListFooterComponent={pie}
          ListEmptyComponent={vacio}
          contentContainerStyle={[styles.content, renglones.length === 0 && styles.contentVacio]}
          onEndReached={chat.verAnteriores}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/*
        ⚠️ **Silenciado esconde el campo, no lo apaga.** Un campo deshabilitado
        invita a tocarlo para ver por qué; sacarlo y poner el motivo en su lugar
        contesta la pregunta antes de que se haga. El texto dice **por dónde
        seguir**, que es lo único accionable que le queda a la persona.
      */}
      {chat.silenciada ? (
        <View style={[styles.silencio, { paddingBottom: insets.bottom + theme.spacing.md }]}>
          <BellOff size={EMPTY_STATE_ICON_SIZE / 2} color={theme.colors.textMuted} />
          <View style={styles.silencioTexto}>
            <Text variant="small" weight="medium">
              Este canal está cerrado
            </Text>
            <Text variant="caption" color="textMuted">
              Por ahora no se puede escribir por acá. Pasá por el local y lo vemos.
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ paddingBottom: insets.bottom + theme.spacing.sm }}>
          <CampoDeMensaje
            onEnviar={(texto) => chat.escribir(texto, sobre ?? undefined)}
            sobre={
              sobre ? { tipo: sobre.tipo, id: sobre.id, etiqueta: sobre.etiqueta } : null
            }
            onQuitarSobre={
              sobre ? () => navigation.setParams({ sobre: undefined }) : undefined
            }
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },

    header: {
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    /** Sin mensajes la lista no va invertida: el cartel tiene que quedar arriba. */
    contentVacio: { flexGrow: 1, justifyContent: 'center' },

    conDia: { gap: theme.spacing.sm },
    dia: { alignItems: 'center', paddingVertical: theme.spacing.xs },

    anteriores: { alignItems: 'center', paddingVertical: theme.spacing.md },
    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    silencio: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceVariant,
    },
    silencioTexto: { flex: 1, gap: theme.spacing.xxs },
  });
