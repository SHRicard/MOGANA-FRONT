import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Text } from '@/shared/ui/atoms/Text';
import {
  DIAS_SEMANA,
  esAnteriorAPantalla,
  esPosteriorAPantalla,
  generarMes,
  hoyPantalla,
  moverMeses,
  tituloDeMes,
  type DiaDelMes,
} from '@/shared/utils';
import { useTheme } from '@/theme';
import { createStyles } from './Calendario.styles';
import type { CalendarioProps } from './Calendario.types';

const ICON_SIZE = 20;

/**
 * Calendario de un mes: se toca un día y se elige.
 *
 * Está hecho a mano en vez de traer una librería porque el proyecto ya tiene
 * Luxon y un theme con tokens: así se pinta igual que el resto de la app —claro
 * y oscuro incluidos—, no agrega código nativo (no hay que recompilar) y la
 * regla de la fecha mínima es la misma que valida el formulario.
 *
 * Sin lógica de negocio: recibe el día elegido y el mínimo por props, y avisa
 * cuál se tocó. No sabe qué se está fechando.
 */
function CalendarioComponent({
  value,
  onChange,
  fechaMinima,
  fechaMaxima,
  accessibilityLabel,
}: CalendarioProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const hoy = useMemo(() => hoyPantalla(), []);

  /**
   * Qué mes se está mirando. Arranca en el del día elegido —o en el actual si
   * todavía no hay ninguno— y después es independiente: hojear el calendario no
   * cambia la fecha, recién la cambia el toque en un día.
   */
  const [mes, setMes] = useState(() => value || hoy);

  const mesAnterior = useCallback(() => setMes((actual) => moverMeses(actual, -1)), []);
  const mesSiguiente = useCallback(() => setMes((actual) => moverMeses(actual, 1)), []);

  const dias = useMemo(() => generarMes(mes), [mes]);

  /**
   * Si TODO el mes que se está mirando queda antes del mínimo, no hay nada para
   * elegir ahí atrás: la flecha se apaga en vez de dejar hojear a la nada.
   */
  const puedeRetroceder =
    fechaMinima === undefined || !esAnteriorAPantalla(dias[dias.length - 1]!.fecha, fechaMinima);

  /** Lo mismo del otro lado: si todo el mes siguiente se pasa del tope. */
  const puedeAvanzar =
    fechaMaxima === undefined || !esPosteriorAPantalla(dias[0]!.fecha, fechaMaxima);

  return (
    <View style={styles.container} accessibilityLabel={accessibilityLabel}>
      <View style={styles.header}>
        <Pressable
          onPress={mesAnterior}
          disabled={!puedeRetroceder}
          style={({ pressed }) => [
            styles.flecha,
            !puedeRetroceder && styles.flechaApagada,
            pressed && puedeRetroceder && styles.presionado,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          accessibilityState={{ disabled: !puedeRetroceder }}
        >
          <ChevronLeft size={ICON_SIZE} color={theme.colors.text} />
        </Pressable>

        <Text variant="body" weight="semibold" accessibilityRole="header">
          {tituloDeMes(mes)}
        </Text>

        <Pressable
          onPress={mesSiguiente}
          disabled={!puedeAvanzar}
          style={({ pressed }) => [
            styles.flecha,
            !puedeAvanzar && styles.flechaApagada,
            pressed && puedeAvanzar && styles.presionado,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          accessibilityState={{ disabled: !puedeAvanzar }}
        >
          <ChevronRight size={ICON_SIZE} color={theme.colors.text} />
        </Pressable>
      </View>

      {/* Las iniciales son decorativas: cada día ya dice su fecha completa al
          lector de pantalla, así que leerlas antes de la grilla sería ruido. */}
      <View
        style={styles.semana}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {DIAS_SEMANA.map((inicial, indice) => (
          <View key={`${inicial}-${indice}`} style={styles.celda}>
            <Text variant="caption" color="textMuted">
              {inicial}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.grilla}>
        {dias.map((dia) => (
          <Dia
            key={dia.fecha}
            dia={dia}
            elegido={dia.fecha === value}
            esHoy={dia.fecha === hoy}
            deshabilitado={
              (fechaMinima !== undefined && esAnteriorAPantalla(dia.fecha, fechaMinima)) ||
              (fechaMaxima !== undefined && esPosteriorAPantalla(dia.fecha, fechaMaxima))
            }
            onPress={onChange}
          />
        ))}
      </View>
    </View>
  );
}

interface DiaProps {
  dia: DiaDelMes;
  elegido: boolean;
  esHoy: boolean;
  deshabilitado: boolean;
  onPress: (fecha: string) => void;
}

/** Una celda de la grilla. */
const Dia = memo(function DiaComponent({
  dia,
  elegido,
  esHoy,
  deshabilitado,
  onPress,
}: DiaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const elegir = useCallback(() => onPress(dia.fecha), [onPress, dia.fecha]);

  // Los días de relleno y los anteriores al mínimo se ven apagados. El estado no
  // se comunica solo con eso: van también con `disabled` para el lector de
  // pantalla, que no ve opacidades.
  const apagado = deshabilitado || dia.deOtroMes;

  return (
    <Pressable
      onPress={elegir}
      disabled={deshabilitado}
      style={styles.celda}
      accessibilityRole="button"
      // La fecha completa: "17/09/2026" se entiende suelto, un "17" no.
      accessibilityLabel={dia.fecha}
      accessibilityState={{ selected: elegido, disabled: deshabilitado }}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.dia,
            esHoy && !elegido && styles.hoy,
            elegido && styles.elegido,
            pressed && !elegido && !deshabilitado && styles.presionado,
          ]}
        >
          <Text
            variant="small"
            weight={elegido || esHoy ? 'semibold' : 'regular'}
            color={elegido ? 'onPrimary' : apagado ? 'textMuted' : 'text'}
          >
            {String(dia.numero)}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

export const Calendario = memo(CalendarioComponent);
