import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { formatTasa, type Cumplimiento } from '../types';

export interface TasasDeCumplimientoProps {
  datos: Cumplimiento;
}

/**
 * Qué parte del negocio te paga: **tres cortes de la misma pregunta**.
 *
 * Dan números distintos a propósito, porque miden cosas distintas, y por eso
 * cada uno va con la pregunta que contesta al lado en vez de con su nombre
 * técnico: "porFacturas: 6,9%" no le dice nada a nadie.
 *
 * ⚠️ **También es foto de hoy**, no del mes elegido.
 *
 * Una raya no es un cero: es que todavía no hay nada que medir (ningún cliente
 * facturado, ninguna factura vencida). Mostrar `0 %` ahí haría que un negocio
 * recién abierto se vea fundido.
 */
function TasasDeCumplimientoComponent({ datos }: TasasDeCumplimientoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const hayRayas =
    datos.porClientes === null || datos.porFacturas === null || datos.porPlata === null;

  return (
    <View style={styles.tarjeta}>
      <Text variant="small" weight="semibold">
        Cumplimiento · a hoy
      </Text>

      <Fila
        etiqueta="Clientes que pagan en fecha"
        valor={formatTasa(datos.porClientes)}
        styles={styles}
      />
      <Fila
        etiqueta="Facturas pagadas de las que ya vencieron"
        valor={formatTasa(datos.porFacturas)}
        styles={styles}
      />
      <Fila
        etiqueta="Plata cobrada de todo lo facturado"
        valor={formatTasa(datos.porPlata)}
        styles={styles}
      />

      {/* Solo cuando hay alguna raya: explicar un símbolo que no está en
          pantalla es ruido. */}
      {hayRayas && (
        <Text variant="micro" color="textMuted">
          Una raya no es un cero: es que todavía no hay nada que medir.
        </Text>
      )}
    </View>
  );
}

interface FilaProps {
  etiqueta: string;
  valor: string;
  styles: ReturnType<typeof createStyles>;
}

function Fila({ etiqueta, valor, styles }: FilaProps) {
  return (
    // Una unidad para el lector de pantalla: la pregunta y su número juntos.
    <View style={styles.fila} accessible accessibilityLabel={`${etiqueta}: ${valor}.`}>
      <View style={styles.etiqueta}>
        <Text variant="caption" color="textMuted">
          {etiqueta}
        </Text>
      </View>
      <Text variant="body" weight="semibold">
        {valor}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tarjeta: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    /** `flex: 1` para que todos los porcentajes queden alineados a la derecha. */
    etiqueta: { flex: 1 },
  });

export const TasasDeCumplimiento = memo(TasasDeCumplimientoComponent);
