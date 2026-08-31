import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto, mesCortoApi, tituloDeMesApi } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import type { PuntoEvolucion } from '../types';

export interface GraficoEvolucionProps {
  /** Del más viejo al más nuevo, tal como viene de la API. */
  puntos: readonly PuntoEvolucion[];
}

/** Alto del área de barras. Fijo: el gráfico no puede cambiar de alto al pasar de mes. */
const ALTO = 120;
/** Piso de una barra con movimiento, para que un mes flojo no desaparezca. */
const MINIMO_VISIBLE = 3;
/** Diámetro del punto de la referencia. */
const PUNTO = 8;

/**
 * Facturado contra cobrado, mes a mes.
 *
 * Se dibuja con views y no con una librería de gráficos: son doce barras y una
 * escala: sumar una dependencia nativa para esto sería pagar mucho por muy poco.
 *
 * **Los meses en cero se dibujan igual.** Vienen a propósito desde la API: un mes
 * sin facturación también es un dato, y salteándolo el gráfico mostraría marzo
 * pegado a junio como si fueran consecutivos.
 *
 * ⚠️ Las dos series **no son la misma plata**: lo cobrado en junio puede ser de
 * facturas de mayo. Que la línea de cobros vaya por debajo no significa que falte
 * cobrar exactamente esa diferencia — para eso está "plata en la calle".
 */
function GraficoEvolucionComponent({ puntos }: GraficoEvolucionProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  /**
   * La escala sale del máximo de **las dos series juntas**: con una escala por
   * serie, un mes de $1.000 cobrados se vería igual de alto que uno de $500.000
   * facturados.
   */
  const techo = useMemo(
    () => puntos.reduce((mayor, punto) => Math.max(mayor, punto.facturado, punto.cobrado), 0),
    [puntos],
  );

  const alto = (valor: number) => {
    if (valor <= 0) {
      return 0;
    }
    // `techo` no puede ser 0 acá: si hay un valor > 0, el máximo también lo es.
    return Math.max(MINIMO_VISIBLE, (valor / techo) * ALTO);
  };

  return (
    <View style={styles.tarjeta}>
      <Text variant="small" weight="semibold">
        Facturado y cobrado
      </Text>
      <Text variant="caption" color="textMuted">
        Los últimos 6 meses
      </Text>

      <View style={styles.referencia}>
        <Marca etiqueta="Facturado" color={theme.colors.primary} styles={styles} />
        <Marca etiqueta="Cobrado" color={theme.colors.success} styles={styles} />
      </View>

      {techo === 0 ? (
        <View style={styles.vacio}>
          <Text variant="caption" color="textMuted" align="center">
            No hubo movimiento en estos seis meses.
          </Text>
        </View>
      ) : (
        <View style={styles.grafico}>
          {puntos.map((punto) => (
            <View
              key={punto.mes}
              style={styles.columna}
              // Cada mes se lee como una frase entera: un lector de pantalla no
              // puede "ver" el alto de una barra.
              accessible
              accessibilityLabel={`${tituloDeMesApi(punto.mes)}: facturado ${formatMonto(
                punto.facturado,
              )}, cobrado ${formatMonto(punto.cobrado)}.`}
            >
              <View style={styles.barras}>
                <View
                  style={[
                    styles.barra,
                    { height: alto(punto.facturado), backgroundColor: theme.colors.primary },
                  ]}
                />
                <View
                  style={[
                    styles.barra,
                    { height: alto(punto.cobrado), backgroundColor: theme.colors.success },
                  ]}
                />
              </View>
              <Text variant="micro" color="textMuted">
                {mesCortoApi(punto.mes)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface MarcaProps {
  etiqueta: string;
  color: string;
  styles: ReturnType<typeof createStyles>;
}

/** Una entrada de la referencia: el punto de color y qué serie es. */
function Marca({ etiqueta, color, styles }: MarcaProps) {
  return (
    // Decorativo: cada columna ya dice en palabras qué es cada número.
    <View
      style={styles.marca}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.punto, { backgroundColor: color }]} />
      <Text variant="micro" color="textMuted">
        {etiqueta}
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

    referencia: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingTop: theme.spacing.xs,
    },
    marca: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    punto: { width: PUNTO, height: PUNTO, borderRadius: theme.radius.full },

    grafico: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.md,
    },
    columna: { flex: 1, alignItems: 'center', gap: theme.spacing.xs },
    /** Las dos barras del mes, apoyadas en la misma línea de base. */
    barras: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 2,
      height: ALTO,
    },
    barra: {
      flex: 1,
      // Solo arriba: abajo la barra tiene que apoyar en la base, no flotar.
      borderTopLeftRadius: theme.radius.sm,
      borderTopRightRadius: theme.radius.sm,
    },

    vacio: { height: ALTO, alignItems: 'center', justifyContent: 'center' },
  });

export const GraficoEvolucion = memo(GraficoEvolucionComponent);
