import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto } from '@/shared/utils';
import { useTheme, type Theme, type ThemeColors } from '@/theme';
import { textoDelMasViejo, type EnLaCalle } from '../types';

export interface PlataEnLaCalleProps {
  datos: EnLaCalle;
  /**
   * A qué fecha corresponde la foto, ya escrita ("a hoy", "al 31/07/2026").
   *
   * **Nunca es un adorno**: en el tablero la deuda es la de hoy y en el ticket
   * la del cierre del mes, y son números distintos. Sin esta línea, la del
   * ticket se lee como si fuera la de ahora.
   */
  corte?: string;
  /**
   * La foto es de una fecha **que ya pasó** (el cierre de un mes anterior).
   *
   * Cambia cómo se cuenta el vencimiento más viejo: los días vienen contados
   * contra el corte, así que "venció hace 56 días" —que se lee contra hoy— pasa
   * a ser "llevaba 56 días vencida".
   */
  historico?: boolean;
}

/** Diámetro del punto de color. El mismo que usa el tablero de facturación. */
const PUNTO = 8;

/**
 * El número grande del panel: **cuánta plata hay prestada** a la fecha del
 * corte.
 *
 * ⚠️ En el tablero **no lo mueve el selector de mes**, y esta tarjeta tiene que
 * dejarlo claro: elegir marzo no muestra cuánto se debía en marzo. Por eso el
 * corte va escrito arriba —"a hoy"— y la tarjeta queda separada del bloque del
 * mes, que es lo que el doc pide expresamente.
 *
 * En el ticket de un mes es la misma tarjeta con otra fecha: ahí el corte es el
 * último día del período (`alCierre.al`) y la deuda, la que quedaba entonces.
 *
 * "Vencido" lleva el mismo rojo que los badges del tablero y "Por vencer" el
 * mismo naranja: es el mismo semáforo en todas las pantallas.
 */
function PlataEnLaCalleComponent({
  datos,
  corte = 'a hoy',
  historico = false,
}: PlataEnLaCalleProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const masVieja = textoDelMasViejo(datos.diasDelMasViejo, { alCorte: historico });

  return (
    <View
      style={styles.tarjeta}
      accessible
      accessibilityLabel={[
        `Plata en la calle ${corte}: ${formatMonto(datos.deuda)}.`,
        `Vencido: ${formatMonto(datos.vencido)}, ${datos.facturasVencidas} facturas.`,
        `Por vencer: ${formatMonto(datos.porVencer)}.`,
        masVieja ? `${masVieja}.` : '',
      ].join(' ')}
    >
      <Text variant="caption" color="textMuted">
        {`Plata en la calle · ${corte}`}
      </Text>
      <Text variant="display" weight="bold">
        {formatMonto(datos.deuda)}
      </Text>
      <Text variant="caption" color="textMuted">
        {datos.facturasImpagas === 1
          ? '1 factura sin saldar'
          : `${datos.facturasImpagas} facturas sin saldar`}
      </Text>

      <View style={styles.desglose}>
        <Parte
          etiqueta="Vencido"
          monto={datos.vencido}
          detalle={
            datos.facturasVencidas === 1 ? '1 factura' : `${datos.facturasVencidas} facturas`
          }
          color="statusLate"
          styles={styles}
        />
        <Parte
          etiqueta="Por vencer"
          monto={datos.porVencer}
          // Las impagas menos las vencidas: lo que todavía está en tiempo.
          detalle={
            datos.facturasImpagas - datos.facturasVencidas === 1
              ? '1 factura'
              : `${datos.facturasImpagas - datos.facturasVencidas} facturas`
          }
          color="statusSoon"
          styles={styles}
        />
      </View>

      {/* Solo si hay algo vencido: con la cuenta al día no hay nada que decir. */}
      {masVieja && (
        <Text variant="caption" color="statusLate" weight="medium">
          {masVieja}
        </Text>
      )}
    </View>
  );
}

interface ParteProps {
  etiqueta: string;
  monto: number;
  detalle: string;
  color: keyof ThemeColors;
  styles: ReturnType<typeof createStyles>;
}

/** Una mitad del desglose, con el punto del color de su estado. */
function Parte({ etiqueta, monto, detalle, color, styles }: ParteProps) {
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
      <Text variant="body" weight="semibold">
        {formatMonto(monto)}
      </Text>
      <Text variant="micro" color="textMuted">
        {detalle}
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

export const PlataEnLaCalle = memo(PlataEnLaCalleComponent);
