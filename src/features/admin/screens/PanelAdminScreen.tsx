import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import type { RootRoute } from '@/app/navigation/routes';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { PANEL_ITEMS } from '../panelItems';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;
/** Lado de la caja redonda del ícono de cada fila. */
const CAJA_ICONO = 40;

/**
 * El panel de administración: la puerta a las dos herramientas del negocio.
 *
 * Es una pantalla de paso a propósito, y no un tab: se entra pocas veces por día
 * —a mirar cómo va el mes o a mandar un aviso— y meterla en la barra le sacaría
 * lugar a lo que sí se usa todo el tiempo.
 *
 * Las filas **con `route`** navegan; las que no tienen se pintan apagadas: esa
 * pantalla todavía no existe y fingir que lleva a algún lado es peor que decirlo
 * (mismo criterio que el panel "Más").
 */
export function PanelAdminScreen() {
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
            Panel de administración
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Cómo va el negocio y qué avisarle a la gente
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
          {PANEL_ITEMS.map(({ id, label, description, icon: Icon, route }, indice) => {
            const contenido = (
              <>
                <View style={[styles.icono, route === undefined && styles.iconoApagado]}>
                  <Icon
                    size={ICON_SIZE}
                    color={route ? theme.colors.primary : theme.colors.textMuted}
                  />
                </View>

                <View style={styles.textos}>
                  <Text variant="body" color={route ? 'text' : 'textMuted'}>
                    {label}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {description}
                  </Text>
                </View>

                {/* La flecha es la promesa de que tocar hace algo: en la fila que
                    todavía no tiene pantalla va la palabra, no la flecha. */}
                {route ? (
                  <ChevronRight size={ICON_SIZE} color={theme.colors.textMuted} />
                ) : (
                  <Text variant="micro" color="textMuted">
                    Pronto
                  </Text>
                )}
              </>
            );

            if (route === undefined) {
              return (
                <View
                  key={id}
                  style={[styles.fila, indice > 0 && styles.filaConBorde]}
                  // La fila es UNA unidad para el lector de pantalla.
                  accessible
                  accessibilityLabel={`${label}. ${description}. Todavía no está disponible.`}
                >
                  {contenido}
                </View>
              );
            }

            return (
              <Pressable
                key={id}
                onPress={() => abrir(route)}
                style={({ pressed }) => [
                  styles.fila,
                  indice > 0 && styles.filaConBorde,
                  pressed && styles.presionada,
                ]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${label}. ${description}`}
              >
                {contenido}
              </Pressable>
            );
          })}
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
    /** La fila sin pantalla no lleva el color de marca: no invita a tocarla. */
    iconoApagado: { backgroundColor: theme.colors.surfaceVariant },

    /** `flex: 1` para que la flecha quede pegada al borde derecho. */
    textos: { flex: 1, gap: theme.spacing.xxs },
  });
