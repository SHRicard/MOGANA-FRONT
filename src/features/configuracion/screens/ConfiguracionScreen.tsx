import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { Text } from '@/shared/ui/atoms/Text';
import { useFont, useTheme, useThemeMode, type Theme } from '@/theme';
import { ListaDeOpciones } from '../components';
import { OPCIONES_TEMA, OPCIONES_TIPOGRAFIA, resumenTema } from '../types';

const ICON_SIZE = 20;
/** Alto del área táctil de los íconos del encabezado. */
const HEADER_ACTION_SIZE = 44;

/**
 * Configuración: cómo se ve la app en este teléfono.
 *
 * Hoy tiene dos apartados —**el tema y la letra**—, que son independientes: pasar
 * de claro a oscuro no tiene por qué tocar la tipografía. Se llega desde el
 * panel "Más" y la ve cualquier rol: no hay nada acá que dependa de permisos.
 *
 * ⚠️ Sin datos de la API → **sin tirar para abajo**. La regla de refrescar es
 * para las pantallas que muestran algo del servidor; acá todo sale del
 * `ThemeProvider` y ya está en memoria, así que el gesto no tendría qué traer.
 *
 * Sin lógica propia: el estado y su persistencia viven en el `ThemeProvider`,
 * que es quien lo guarda en el storage.
 */
export function ConfiguracionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { mode, preference, setPreference } = useThemeMode();
  // Va aparte de `useThemeMode` a propósito: son dos ajustes distintos, y así
  // cambiar uno no vuelve a renderizar lo que depende del otro.
  const { font, setFont } = useFont();

  const volver = useCallback(() => navigation.goBack(), [navigation]);

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
            Configuración
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Cómo se ve la app en este teléfono
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
        <View style={styles.seccion}>
          <View style={styles.seccionTitulo}>
            <Text variant="small" weight="semibold">
              Tema
            </Text>
            {/* Con "Automático", lo elegido y lo que se ve no son lo mismo:
                esta línea dice cómo quedó la pantalla ahora. */}
            <Text variant="caption" color="textMuted">
              {resumenTema(preference, mode)}
            </Text>
          </View>

          <ListaDeOpciones
            opciones={OPCIONES_TEMA}
            valor={preference}
            onSeleccionar={setPreference}
          />
        </View>

        <View style={styles.seccion}>
          <View style={styles.seccionTitulo}>
            <Text variant="small" weight="semibold">
              Tipografía
            </Text>
            {/* Sin resumen como el del tema: acá lo elegido y lo que se ve son
                siempre lo mismo, y además está a la vista en esta misma lista,
                que se repinta con la letra nueva. */}
            <Text variant="caption" color="textMuted">
              Con qué letra se escribe toda la app
            </Text>
          </View>

          <ListaDeOpciones opciones={OPCIONES_TIPOGRAFIA} valor={font} onSeleccionar={setFont} />
        </View>

        {/*
          Vale para los dos ajustes: se dice que son de este teléfono y no de la
          cuenta —quien entre con el mismo usuario en otro dispositivo lo va a
          ver como lo dejó allá—. No viajan a la API.
        */}
        <Text variant="caption" color="textMuted">
          Las dos elecciones quedan guardadas en este teléfono.
        </Text>
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
      gap: theme.spacing.xl,
    },

    seccion: { gap: theme.spacing.sm },
    seccionTitulo: { gap: theme.spacing.xxs },
  });
