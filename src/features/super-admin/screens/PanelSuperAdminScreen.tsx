import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import type { RootRoute } from '@/app/navigation/routes';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { PANEL_SISTEMA_ITEMS } from '../panelSistemaItems';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;
/** Lado de la caja redonda del ícono de cada fila. */
const CAJA_ICONO = 40;

/**
 * **El panel del sistema** (`docs/README_FRONT_SUPER_ADMIN.md`).
 *
 * Es una pantalla de paso, igual que el panel del negocio: se entra pocas veces
 * —a ver cómo está el sistema o a mover a alguien de rol— y meterla en la barra
 * le sacaría lugar a lo que sí se usa todo el día.
 *
 * ⚠️ Da acceso a **las dos cosas que ve el super admin**: sus pantallas propias
 * y el panel del administrador entero, que es suyo también. Todas las filas
 * llevan a alguna parte: acá no hay pantallas por hacer.
 */
export function PanelSuperAdminScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const volver = useCallback(() => navigation.goBack(), [navigation]);

  /**
   * Se despacha `CommonActions.navigate` en vez de `navigation.navigate(route)`
   * porque el nombre de la ruta es un **dato** que viene del catálogo: con la
   * firma tipada de `navigate`, un nombre de tipo unión no compila. Ninguna fila
   * lleva params.
   */
  const abrir = useCallback(
    (route: RootRoute) => navigation.dispatch(CommonActions.navigate(route)),
    [navigation],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={volver}
          style={styles.headerAction}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={ICON_SIZE} color={theme.colors.text} />
        </Pressable>

        <View style={styles.headerTexts}>
          <Text variant="title" weight="semibold" accessibilityRole="header">
            Panel del sistema
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Las cuentas y la instalación, no el negocio
          </Text>
        </View>

        {/* Ocupa el mismo lugar que el botón de volver para que el título quede
            centrado igual que en el resto de las pantallas. */}
        <View style={styles.headerAction} />
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + theme.spacing.xl },
        ]}
      >
        <View style={styles.lista}>
          {PANEL_SISTEMA_ITEMS.map(({ id, label, description, icon: Icon, route }, indice) => (
            <Pressable
              key={id}
              onPress={() => abrir(route)}
              style={({ pressed }) => [
                styles.fila,
                indice > 0 && styles.filaConBorde,
                pressed && styles.presionada,
              ]}
              // La fila es UNA unidad para el lector de pantalla.
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${label}. ${description}`}
            >
              <View style={styles.icono}>
                <Icon size={ICON_SIZE} color={theme.colors.primary} />
              </View>

              <View style={styles.textos}>
                <Text variant="body">{label}</Text>
                <Text variant="caption" color="textMuted">
                  {description}
                </Text>
              </View>

              <ChevronRight size={ICON_SIZE} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
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
      paddingHorizontal: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    headerAction: {
      width: HEADER_ACTION_SIZE,
      height: HEADER_ACTION_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTexts: { flex: 1, gap: theme.spacing.xxs },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },

    lista: {
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      minHeight: 72,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    /** Línea entre filas, menos arriba de la primera. */
    filaConBorde: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    presionada: { opacity: 0.7 },

    icono: {
      width: CAJA_ICONO,
      height: CAJA_ICONO,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primaryMuted,
    },

    /** `flex: 1` para que la flecha quede pegada al borde derecho. */
    textos: { flex: 1, gap: theme.spacing.xxs },
  });
