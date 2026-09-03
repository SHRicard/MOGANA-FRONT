import { useCallback, useEffect, useMemo, useRef, type ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Lock from 'lucide-react-native/icons/lock';
import MessageSquare from 'lucide-react-native/icons/message-square';
import Search from 'lucide-react-native/icons/search';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { RootRoutes } from '@/app/navigation/routes';
import { useRefrescar } from '@/shared/hooks';
import { Button } from '@/shared/ui/atoms/Button';
import { Chip } from '@/shared/ui/atoms/Chip';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { Input } from '@/shared/ui/atoms/Input';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { ConversacionItem } from '../components';
import { useBandejaDeMensajes } from '../hooks';
import type { Conversacion } from '../types';

const keyExtractor = (conversacion: Conversacion) => conversacion.clienteId;

const Separador = () => {
  const theme = useTheme();
  return <View style={{ height: theme.spacing.sm }} />;
};

/**
 * **La bandeja de mensajes del panel** (`/admin/mensajes`).
 *
 * Un renglón por cliente que escribió alguna vez, el más reciente arriba.
 *
 * ⚠️ **Es una bandeja compartida.** Leer un hilo lo deja leído para todos los
 * administradores, igual que la de avisos de pago y por el mismo motivo: quién
 * atiende depende del día, y un hilo que sigue en negrita para el otro es una
 * invitación a contestar dos veces lo mismo. Cada renglón dice quién lo miró
 * último, que es lo que evita ese choque.
 *
 * La búsqueda es **por el cliente** —nombre, correo o documento—, nunca por el
 * texto de los mensajes: buscar adentro de conversaciones ajenas es otra cosa y
 * el backend no la ofrece.
 */
export function BandejaDeMensajesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const navigation = useNavigation();
  const bandeja = useBandejaDeMensajes();
  const refresco = useRefrescar(bandeja.refrescar);

  const abrir = useCallback(
    (conversacion: Conversacion) => {
      navigation.navigate(RootRoutes.HILO_DEL_CLIENTE, { clienteId: conversacion.clienteId });
    },
    [navigation],
  );

  /** Cambiar de página tiene que empezar arriba, o la primera fila queda fuera. */
  const listaRef = useRef<FlatList<Conversacion>>(null);
  useEffect(() => {
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [bandeja.pagina]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Conversacion>) => (
      <ConversacionItem conversacion={item} onPress={abrir} />
    ),
    [abrir],
  );

  const header: ReactElement = (
    <View style={styles.filtros}>
      <Input
        value={bandeja.busqueda}
        onChangeText={bandeja.onBusquedaChange}
        placeholder="Buscar por nombre, correo o DNI"
        leftIcon={<Search size={18} color={theme.colors.textMuted} />}
        onClear={() => bandeja.onBusquedaChange('')}
        autoCapitalize="none"
        accessibilityLabel="Buscar un cliente"
      />

      <View style={styles.pestanas}>
        <Chip
          label="Todas"
          onPress={() => bandeja.onSoloSinLeerChange(false)}
          selected={!bandeja.soloSinLeer}
          accessibilityLabel="Ver todas las conversaciones"
        />
        <Chip
          label={
            bandeja.sinLeerEnTotal > 0 ? `Sin contestar (${bandeja.sinLeerEnTotal})` : 'Sin contestar'
          }
          onPress={() => bandeja.onSoloSinLeerChange(true)}
          selected={bandeja.soloSinLeer}
          accessibilityLabel="Ver solo lo que falta contestar"
        />
      </View>
    </View>
  );

  const vacio: ReactElement = (
    <EmptyState
      icon={<MessageSquare size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
      title={
        bandeja.busqueda.trim()
          ? 'Ningún cliente coincide'
          : bandeja.soloSinLeer
            ? 'No queda nada sin contestar'
            : 'Todavía no te escribió nadie'
      }
      description={
        bandeja.busqueda.trim()
          ? 'Probá con otro nombre, correo o documento.'
          : bandeja.soloSinLeer
            ? 'Todos los hilos están atendidos.'
            : 'Cuando un cliente escriba, su conversación aparece acá.'
      }
    />
  );

  if (bandeja.sinPermiso) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <EmptyState
          icon={<Lock size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="Esto es del panel"
          description="Solo las cuentas de administración pueden ver los mensajes de los clientes."
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTexts}>
          <Text variant="title" weight="semibold" accessibilityRole="header">
            Mensajes
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {bandeja.sinLeerEnTotal > 0
              ? `${bandeja.sinLeerEnTotal} sin contestar`
              : 'Lo que te escriben los clientes'}
          </Text>
        </View>

        <View style={styles.headerAction}>
          {bandeja.isFetching && !bandeja.isLoading && !refresco.refrescando && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Actualizando la bandeja"
            />
          )}
        </View>
      </View>

      {bandeja.mensajeError ? (
        <EmptyState
          icon={<WifiOff size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
          title="No pudimos traer la bandeja"
          description={bandeja.mensajeError}
          action={<Button label="Reintentar" onPress={bandeja.reintentar} />}
        />
      ) : bandeja.isLoading ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listaRef}
          data={bandeja.conversaciones}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={Separador}
          ListHeaderComponent={header}
          ListEmptyComponent={vacio}
          contentContainerStyle={[
            styles.content,
            bandeja.paginas > 1 ? styles.contentConPie : styles.contentSinPie,
          ]}
          refreshControl={refresco.control}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {bandeja.paginas > 1 && (
        <View style={styles.pie}>
          <Paginacion
            pagina={bandeja.pagina}
            paginas={bandeja.paginas}
            onCambiar={bandeja.irAPagina}
            accessibilityLabel="Páginas de la bandeja"
          />
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    headerTexts: { flex: 1, gap: theme.spacing.xxs },
    headerAction: { width: 24, alignItems: 'center' },

    filtros: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
    pestanas: { flexDirection: 'row', gap: theme.spacing.sm },

    content: { paddingHorizontal: theme.spacing.lg, flexGrow: 1 },
    contentSinPie: { paddingBottom: theme.spacing.lg },
    contentConPie: { paddingBottom: theme.spacing.md },

    centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    pie: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
  });
