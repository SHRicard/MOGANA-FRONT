import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Text } from '@/shared/ui/atoms/Text';
import { tituloDeMesApi } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';

const ICON_SIZE = 20;
/** Área táctil de cada flecha. */
const FLECHA = 44;

export interface SelectorDeMesProps {
  /** `AAAA-MM`. */
  mes: string;
  onAnterior: () => void;
  onSiguiente: () => void;
  /** En el mes en curso la flecha de adelante se apaga. */
  esUltimoMes: boolean;
}

/**
 * Elegir el período: ‹ Agosto 2026 ›.
 *
 * **Solo mueve lo del mes.** La plata en la calle y los morosos son la foto de
 * hoy y no cambian con esto — por eso el selector va pegado al bloque del mes y
 * no arriba de todo, donde se leería como si mandara sobre la pantalla entera.
 *
 * Adelante del mes en curso no se puede ir: no hay nada que mirar y la API
 * devolvería un período entero en cero.
 */
function SelectorDeMesComponent({ mes, onAnterior, onSiguiente, esUltimoMes }: SelectorDeMesProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const titulo = tituloDeMesApi(mes);

  return (
    <View style={styles.barra}>
      <Pressable
        onPress={onAnterior}
        style={({ pressed }) => [styles.flecha, pressed && styles.presionada]}
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
      >
        <ChevronLeft size={ICON_SIZE} color={theme.colors.text} />
      </Pressable>

      <View style={styles.titulo}>
        <Text variant="body" weight="semibold" align="center" numberOfLines={1}>
          {titulo}
        </Text>
      </View>

      <Pressable
        onPress={onSiguiente}
        disabled={esUltimoMes}
        style={({ pressed }) => [styles.flecha, pressed && styles.presionada]}
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
        // El estado se comunica también al lector de pantalla, no solo con el
        // color más apagado del ícono.
        accessibilityState={{ disabled: esUltimoMes }}
      >
        <ChevronRight
          size={ICON_SIZE}
          color={esUltimoMes ? theme.colors.textMuted : theme.colors.text}
        />
      </Pressable>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    barra: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    flecha: {
      width: FLECHA,
      height: FLECHA,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presionada: { opacity: 0.6 },
    titulo: { flex: 1 },
  });

export const SelectorDeMes = memo(SelectorDeMesComponent);
