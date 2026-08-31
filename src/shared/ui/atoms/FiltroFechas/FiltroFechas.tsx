import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import CalendarIcon from 'lucide-react-native/icons/calendar';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import X from 'lucide-react-native/icons/x';
import { Calendario } from '@/shared/ui/atoms/Calendario';
import { Text } from '@/shared/ui/atoms/Text';
import { formatFechaLargaPantalla } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';

export interface FiltroFechasProps {
  /** Qué se está acotando: "Emitidas". */
  label: string;
  /** Los dos extremos, en formato de pantalla (`"01/08/2026"`), o `null`. */
  desde: string | null;
  hasta: string | null;
  onDesdeChange: (fecha: string | null) => void;
  onHastaChange: (fecha: string | null) => void;
}

const ICON_SIZE = 18;

/** Cuál de los dos extremos se está eligiendo, o ninguno. */
type ExtremoRango = 'desde' | 'hasta';

/**
 * Filtro por rango de fechas: dos botones y **un solo calendario**.
 *
 * Un calendario por campo ocupaba media pantalla y dejaba abrir los dos a la
 * vez; así se toca el extremo que se quiere mover y el calendario de abajo edita
 * ese. Los dos extremos entran en el rango — "del 1 al 31" incluye los dos días.
 *
 * **Los topes se cuidan solos**: eligiendo el desde no se puede pasar del hasta,
 * y al revés. Es el `400` `El rango de fechas termina antes de empezar` que
 * nunca llega a salir.
 *
 * Se despliega en línea y no en un `Modal`: en esta app los Modal se evitan
 * porque son una ventana nativa aparte que no hereda el edge-to-edge.
 *
 * Nació en el tablero de facturación y subió acá cuando lo necesitó una segunda
 * feature —la vista del cliente sobre sus propias facturas— (regla de promoción
 * del `CLAUDE.md`). Sin lógica de negocio: no sabe qué se está acotando, recibe
 * los dos extremos y avisa cuándo cambian.
 */
function FiltroFechasComponent({
  label,
  desde,
  hasta,
  onDesdeChange,
  onHastaChange,
}: FiltroFechasProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activo, setActivo] = useState<ExtremoRango | null>(null);

  const alternar = useCallback((extremo: ExtremoRango) => {
    setActivo((actual) => (actual === extremo ? null : extremo));
  }, []);

  const elegir = useCallback(
    (fecha: string) => {
      if (activo === 'desde') {
        onDesdeChange(fecha);
      } else {
        onHastaChange(fecha);
      }
      // Se cierra al elegir: el día ya quedó a la vista en el botón, y dejarlo
      // abierto empuja la lista fuera de la pantalla.
      setActivo(null);
    },
    [activo, onDesdeChange, onHastaChange],
  );

  const limpiar = useCallback(() => {
    onDesdeChange(null);
    onHastaChange(null);
    setActivo(null);
  }, [onDesdeChange, onHastaChange]);

  const hayRango = desde !== null || hasta !== null;

  return (
    <View style={styles.campo}>
      <View style={styles.encabezado}>
        <Text variant="small" weight="medium">
          {label}
        </Text>

        {/* Vaciar el rango, solo cuando hay algo que vaciar. */}
        {hayRango && (
          <Pressable
            onPress={limpiar}
            hitSlop={theme.spacing.sm}
            style={({ pressed }) => [styles.limpiar, pressed && styles.presionado]}
            accessibilityRole="button"
            accessibilityLabel="Quitar el filtro de fechas"
          >
            <X size={ICON_SIZE} color={theme.colors.textMuted} />
            <Text variant="caption" color="textMuted">
              Quitar
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.extremos}>
        <Extremo
          etiqueta="Desde"
          valor={desde}
          abierto={activo === 'desde'}
          onPress={() => alternar('desde')}
          styles={styles}
          theme={theme}
        />
        <Extremo
          etiqueta="Hasta"
          valor={hasta}
          abierto={activo === 'hasta'}
          onPress={() => alternar('hasta')}
          styles={styles}
          theme={theme}
        />
      </View>

      {activo && (
        <Calendario
          value={activo === 'desde' ? desde : hasta}
          onChange={elegir}
          // El desde no puede pasar del hasta, y el hasta no puede quedar antes
          // del desde: los días que romperían el rango quedan apagados.
          fechaMaxima={activo === 'desde' ? hasta ?? undefined : undefined}
          fechaMinima={activo === 'hasta' ? desde ?? undefined : undefined}
          accessibilityLabel={`Calendario para elegir ${
            activo === 'desde' ? 'desde' : 'hasta'
          } qué día`}
        />
      )}
    </View>
  );
}

interface ExtremoProps {
  etiqueta: string;
  valor: string | null;
  abierto: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}

/** Uno de los dos extremos del rango: dice su día o invita a elegirlo. */
function Extremo({ etiqueta, valor, abierto, onPress, styles, theme }: ExtremoProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.extremo,
        abierto && styles.extremoAbierto,
        pressed && styles.presionado,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        valor
          ? `${etiqueta} ${formatFechaLargaPantalla(valor)}`
          : `Elegir ${etiqueta.toLowerCase()} qué día`
      }
      accessibilityHint="Abre el calendario"
      accessibilityState={{ expanded: abierto }}
    >
      <CalendarIcon size={ICON_SIZE} color={theme.colors.textMuted} />

      <View style={styles.extremoTextos}>
        <Text variant="caption" color="textMuted">
          {etiqueta}
        </Text>
        <Text variant="small" weight="medium" numberOfLines={1}>
          {valor ?? 'Cualquiera'}
        </Text>
      </View>

      {abierto ? (
        <ChevronUp size={ICON_SIZE} color={theme.colors.textMuted} />
      ) : (
        <ChevronDown size={ICON_SIZE} color={theme.colors.textMuted} />
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    campo: { gap: theme.spacing.xs },

    encabezado: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    limpiar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xxs,
    },

    /** Los dos extremos se reparten el ancho: ninguno es "el chiquito". */
    extremos: { flexDirection: 'row', gap: theme.spacing.sm },
    extremo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      minHeight: 52,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    // Abierto engrosa el borde además de cambiar el color: el estado no se
    // comunica solo con el tono.
    extremoAbierto: { borderColor: theme.colors.primary, borderWidth: 2 },
    presionado: { opacity: 0.7 },

    /** `flex: 1` para que las flechas queden pegadas al borde. */
    extremoTextos: { flex: 1 },
  });

export const FiltroFechas = memo(FiltroFechasComponent);
