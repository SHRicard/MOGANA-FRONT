import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto } from '@/shared/utils';
import { useTheme, type Theme, type ThemeColors } from '@/theme';
import type { TotalesTablero } from '../types';

export interface TotalesDeudaProps {
  totales: TotalesTablero;
  /** `true` mientras se está filtrando: cambia el texto, no los números. */
  hayFiltros: boolean;
}

/** Diámetro del punto de color. Chico: acompaña al texto, no compite con él. */
const PUNTO = 8;

/**
 * Cuánto hay para cobrar, arriba del tablero: el total, y cuánto de eso ya está
 * vencido.
 *
 * Los tres números **vienen calculados por la API sobre el filtro entero**, no
 * sobre la página: sumar los ocho renglones que se ven daría un número más chico
 * y falso. Por eso también cambian al filtrar — es lo correcto: con "Vencida"
 * puesto, lo que se muestra es lo vencido de esos clientes.
 *
 * "Vencido" lleva el mismo rojo que los badges de los renglones y "Por vencer"
 * el mismo naranja: es el mismo semáforo, arriba en total y abajo por persona.
 */
function TotalesDeudaComponent({ totales, hayFiltros }: TotalesDeudaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={styles.tarjeta}
      accessible
      accessibilityLabel={[
        `${hayFiltros ? 'Por cobrar en el filtro' : 'Por cobrar'}: ${formatMonto(totales.deuda)}.`,
        `Vencido: ${formatMonto(totales.vencido)}.`,
        `Por vencer: ${formatMonto(totales.porVencer)}.`,
      ].join(' ')}
    >
      <Text variant="caption" color="textMuted">
        {hayFiltros ? 'Por cobrar en el filtro' : 'Por cobrar'}
      </Text>
      <Text variant="heading" weight="bold">
        {formatMonto(totales.deuda)}
      </Text>

      <View style={styles.desglose}>
        <Parte etiqueta="Vencido" monto={totales.vencido} color="statusLate" styles={styles} />
        <Parte etiqueta="Por vencer" monto={totales.porVencer} color="statusSoon" styles={styles} />
      </View>
    </View>
  );
}

interface ParteProps {
  etiqueta: string;
  monto: number;
  color: keyof ThemeColors;
  styles: ReturnType<typeof createStyles>;
}

/** Una mitad del desglose, con el punto del color de su estado. */
function Parte({ etiqueta, monto, color, styles }: ParteProps) {
  const theme = useTheme();

  return (
    // Decorativo: la tarjeta entera ya se lee como una frase.
    <View
      style={styles.parte}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.encabezadoParte}>
        <View style={[styles.punto, { backgroundColor: theme.colors[color] }]} />
        <Text variant="caption" color="textMuted">
          {etiqueta}
        </Text>
      </View>
      <Text variant="small" weight="semibold">
        {formatMonto(monto)}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tarjeta: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },

    desglose: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    parte: { flex: 1, gap: theme.spacing.xxs },
    encabezadoParte: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    punto: { width: PUNTO, height: PUNTO, borderRadius: theme.radius.full },
  });

export const TotalesDeuda = memo(TotalesDeudaComponent);
