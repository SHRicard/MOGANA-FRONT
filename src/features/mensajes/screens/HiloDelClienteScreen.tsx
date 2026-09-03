import { useCallback, useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import BellOff from 'lucide-react-native/icons/bell-off';
import BellRing from 'lucide-react-native/icons/bell-ring';
import MessageSquare from 'lucide-react-native/icons/message-square';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { RootRoutes } from '@/app/navigation/routes';
import type { RootStackParamList } from '@/app/navigation/types';
import { Button } from '@/shared/ui/atoms/Button';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Link } from '@/shared/ui/atoms/Link';
import { Text } from '@/shared/ui/atoms/Text';
import { diaRelativo, formatHora } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { Burbuja, CampoDeMensaje } from '../components';
import { useHiloDelPanel, type MensajeEnVuelo } from '../hooks';
import { abreUnDia, esDelNegocio, nombreDelCliente, type MensajeDelPanel } from '../types';

type HiloRoute = RouteProp<RootStackParamList, typeof RootRoutes.HILO_DEL_CLIENTE>;

type Renglon =
  | { clase: 'mensaje'; mensaje: MensajeDelPanel; abreDia: boolean }
  | { clase: 'enVuelo'; pendiente: MensajeEnVuelo };

const keyExtractor = (renglon: Renglon) =>
  renglon.clase === 'mensaje' ? renglon.mensaje.id : renglon.pendiente.id;

const ICON_SIZE = 20;

/**
 * **El hilo de un cliente, desde el panel.**
 *
 * El gemelo de `MisMensajesScreen`, con las mismas decisiones de lista —va
 * invertida, se pide lo viejo al llegar arriba— y dos cosas que solo existen de
 * este lado:
 *
 * - **Quién lo miró último**, arriba de todo. La bandeja es compartida y ese
 *   renglón es lo único que evita que dos personas contesten lo mismo.
 * - **Silenciar**, que corta que el cliente escriba pero **no** que se le
 *   escriba: por eso el campo de abajo sigue estando aunque el hilo esté
 *   silenciado. Es la diferencia entre cortar un canal y bloquear a alguien, y
 *   la pantalla tiene que dejarla clara — el cartel de confirmación lo dice con
 *   todas las letras.
 */
export function HiloDelClienteScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const navigation = useNavigation();
  const { params } = useRoute<HiloRoute>();
  const hilo = useHiloDelPanel(params.clienteId);

  const [confirmandoSilencio, setConfirmandoSilencio] = useState(false);

  const renglones: Renglon[] = useMemo(() => {
    const delServidor: Renglon[] = hilo.mensajes.map((mensaje, indice) => ({
      clase: 'mensaje',
      mensaje,
      abreDia: abreUnDia(hilo.mensajes, indice),
    }));

    return [
      ...hilo.enVuelo.map((pendiente): Renglon => ({ clase: 'enVuelo', pendiente })),
      ...delServidor,
    ];
  }, [hilo.mensajes, hilo.enVuelo]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Renglon>) => {
      if (item.clase === 'enVuelo') {
        return (
          <Burbuja
            texto={item.pendiente.texto}
            propio
            enVuelo
            problema={item.pendiente.problema}
            onReintentar={() => hilo.reintentar(item.pendiente.id)}
            onDescartar={() => hilo.descartar(item.pendiente.id)}
          />
        );
      }

      const { mensaje } = item;

      return (
        <View style={styles.conDia}>
          {item.abreDia ? (
            <View style={styles.dia}>
              <Text variant="caption" color="textMuted">
                {diaRelativo(mensaje.createdAt)}
              </Text>
            </View>
          ) : null}

          {/* Acá "propio" es el negocio: es al revés que en la pantalla del cliente. */}
          <Burbuja
            texto={mensaje.texto}
            propio={esDelNegocio(mensaje)}
            hora={formatHora(mensaje.createdAt)}
            sobre={mensaje.sobre}
          />
        </View>
      );
    },
    [hilo, styles],
  );

  const pie: ReactElement | null = hilo.hayAnteriores ? (
    <View style={styles.anteriores}>
      {hilo.cargandoAnteriores ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Link label="Ver mensajes anteriores" variant="caption" onPress={hilo.verAnteriores} />
      )}
    </View>
  ) : null;

  const nombre = hilo.cliente ? nombreDelCliente(hilo.cliente) : 'Cliente';

  if (hilo.sinPermiso) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <EmptyState
          icon={<MessageSquare size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Esto es del panel"
          description="Solo las cuentas de administración pueden ver los mensajes de los clientes."
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={theme.spacing.sm}
          accessibilityRole="button"
          accessibilityLabel="Volver a la bandeja"
        >
          <ArrowLeft size={ICON_SIZE} color={theme.colors.text} />
        </Pressable>

        <View style={styles.headerTexts}>
          <Text variant="subtitle" weight="semibold" numberOfLines={1} accessibilityRole="header">
            {nombre}
          </Text>
          {/*
            Quién ya pasó por acá. Es lo primero que hay que saber antes de
            escribir: si lo miró otro hace un minuto, capaz ya está contestando.
          */}
          {hilo.miradoPor ? (
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              Lo miró {hilo.miradoPor}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => setConfirmandoSilencio(true)}
          hitSlop={theme.spacing.sm}
          disabled={hilo.cambiandoSilencio}
          accessibilityRole="button"
          accessibilityLabel={
            hilo.silenciada ? 'Devolverle la palabra a este cliente' : 'Silenciar a este cliente'
          }
        >
          {hilo.silenciada ? (
            <BellOff size={ICON_SIZE} color={theme.colors.warning} />
          ) : (
            <BellRing size={ICON_SIZE} color={theme.colors.textMuted} />
          )}
        </Pressable>
      </View>

      {/*
        El estado silenciado va a la vista todo el tiempo, no solo en el ícono:
        se le puede seguir escribiendo, así que sin este renglón alguien contesta
        durante días sin enterarse de que del otro lado no pueden responder.
      */}
      {hilo.silenciada ? (
        <View style={styles.avisoSilencio}>
          <Text variant="caption" color="onWarningMuted">
            Este cliente no puede escribirte. Vos sí podés escribirle.
          </Text>
        </View>
      ) : null}

      {hilo.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer la conversación"
          description={hilo.mensajeError}
          action={<Button label="Reintentar" onPress={hilo.reintentarCarga} />}
        />
      ) : hilo.isLoading ? (
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
          ListEmptyComponent={
            <EmptyState
              icon={<MessageSquare size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
              title="Sin mensajes"
              description={`Todavía no hablaron. Podés escribirle a ${nombre} desde acá.`}
            />
          }
          contentContainerStyle={[styles.content, renglones.length === 0 && styles.contentVacio]}
          onEndReached={hilo.verAnteriores}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <View style={{ paddingBottom: insets.bottom + theme.spacing.sm }}>
        <CampoDeMensaje
          onEnviar={hilo.escribir}
          placeholder={`Contestarle a ${nombre}…`}
        />
      </View>

      <Dialogo
        visible={confirmandoSilencio}
        onClose={() => setConfirmandoSilencio(false)}
        tono={hilo.silenciada ? 'info' : 'peligro'}
        icono={
          hilo.silenciada ? (
            <BellRing size={DIALOGO_ICON_SIZE} color={theme.colors.primary} />
          ) : (
            <BellOff size={DIALOGO_ICON_SIZE} color={theme.colors.error} />
          )
        }
        titulo={hilo.silenciada ? `Devolverle la palabra a ${nombre}` : `Silenciar a ${nombre}`}
        descripcion={
          hilo.silenciada
            ? 'Va a poder volver a escribirte por acá.'
            : 'Deja de poder escribirte y de recibir avisos de este canal. El hilo no se borra y vos le podés seguir escribiendo.'
        }
        acciones={[
          {
            label: hilo.silenciada ? 'Devolverle la palabra' : 'Silenciar',
            onPress: () => {
              hilo.silenciar(!hilo.silenciada);
              setConfirmandoSilencio(false);
            },
            variant: hilo.silenciada ? 'primary' : 'danger',
            disabled: hilo.cambiandoSilencio,
          },
          {
            label: 'Cancelar',
            onPress: () => setConfirmandoSilencio(false),
            variant: 'secondary',
          },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerTexts: { flex: 1, gap: theme.spacing.xxs },

    avisoSilencio: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.warningMuted,
    },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    contentVacio: { flexGrow: 1, justifyContent: 'center' },

    conDia: { gap: theme.spacing.sm },
    dia: { alignItems: 'center', paddingVertical: theme.spacing.xs },

    anteriores: { alignItems: 'center', paddingVertical: theme.spacing.md },
    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
