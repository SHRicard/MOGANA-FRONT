import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto, mesCortoApi, tituloDeMesApi } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { ChipTendencia } from './ChipTendencia';
import { Variacion } from './Variacion';
import { textoUnidades, type EspecieDeTendencia } from '../mercaderia';
import { formatTasa, Tendencias } from '../types';

export interface EspecieDeTendenciaItemProps {
  especie: EspecieDeTendencia;
  /** Contra qué mes se compara, ya escrito: "julio". */
  contra: string;
}

/** Alto del área de barras. Fijo: la fila no puede cambiar de alto entre meses. */
const ALTO = 36;
/** Piso de una barra con movimiento, para que un mes flojo no desaparezca. */
const MINIMO_VISIBLE = 2;

/**
 * Una especie en la tendencia del mes: **cuántas unidades salieron** y cómo
 * viene la serie.
 *
 * El número grande es la **cantidad, no la plata**: así se piensa la mercadería,
 * y es también con lo que se decide el chip. La plata va al lado, para leer las
 * dos cosas juntas —"vendí las mismas 100 remeras pero entró un 30 % menos"—.
 *
 * ⚠️ Una especie con todo en cero y el chip `parada` **no es un renglón vacío**:
 * es el que dice que dejaron de llevarla, y es justamente para lo que existe
 * esta pantalla.
 */
function EspecieDeTendenciaItemComponent({ especie, contra }: EspecieDeTendenciaItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const parada = especie.tendencia === Tendencias.PARADA;

  /** La escala sale del máximo de su propia serie: cada fila se lee sola. */
  const techo = useMemo(
    () => especie.serie.reduce((mayor, punto) => Math.max(mayor, punto.cantidad), 0),
    [especie.serie],
  );

  /** El alto de una barra. Un mes flojo tiene piso para que no desaparezca. */
  const alto = (cantidad: number) => {
    if (cantidad <= 0 || techo === 0) {
      return 0;
    }
    return Math.max(MINIMO_VISIBLE, (cantidad / techo) * ALTO);
  };

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={[
        `${especie.nombre}:`,
        `${textoUnidades(especie.cantidad)} por ${formatMonto(especie.monto)},`,
        `el ${formatTasa(especie.participacion)} del mes.`,
        `Se la llevaron ${especie.clientes} ${especie.clientes === 1 ? 'cliente' : 'clientes'}.`,
        parada
          ? `Este mes no salió ninguna. En ${contra} habían sido ${textoUnidades(
              especie.anterior.cantidad,
            )}.`
          : `En ${contra} habían sido ${textoUnidades(especie.anterior.cantidad)}.`,
      ].join(' ')}
    >
      <View style={styles.encabezado}>
        <View style={styles.identidad}>
          <Text variant="body" weight="semibold" numberOfLines={2}>
            {especie.nombre}
          </Text>
          <Text variant="micro" color="textMuted" numberOfLines={1}>
            {`${formatMonto(especie.monto)} · ${formatTasa(especie.participacion)} del mes · ${
              especie.clientes === 1 ? '1 cliente' : `${especie.clientes} clientes`
            }`}
          </Text>
        </View>

        <View style={styles.cantidad}>
          <Text
            variant="subtitle"
            weight="bold"
            color={parada ? 'textMuted' : undefined}
            numberOfLines={1}
          >
            {textoUnidades(especie.cantidad)}
          </Text>
          <ChipTendencia tendencia={especie.tendencia} />
        </View>
      </View>

      <View style={styles.pie}>
        {/* La serie de la ventana. Decorativa: el renglón ya se lee entero. */}
        <View
          style={styles.serie}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {especie.serie.map((punto) => (
            <View key={punto.mes} style={styles.columna}>
              <View
                style={[
                  styles.barra,
                  { height: alto(punto.cantidad), backgroundColor: theme.colors.primary },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.contra}>
          {/*
            ⚠️ La que se frenó **no lleva porcentaje**. Viene con
            `variacionCantidad: -100`, y mostrarla como "bajó un 100 %" se lee
            como una caída fuerte cuando lo que pasó es otra cosa: dejó de
            moverse. Lo que hay que decir es eso.
          */}
          {parada ? (
            <Text variant="micro" weight="medium" color="statusLate" numberOfLines={1}>
              No salió ninguna
            </Text>
          ) : (
            // La variación es de unidades, que es con lo que se decide el chip.
            <Variacion valor={especie.variacionCantidad} />
          )}
          <Text variant="micro" color="textMuted" numberOfLines={1}>
            {parada ? `sí en ${contra}` : `vs. ${contra}`}
          </Text>
        </View>
      </View>

      {/* El eje: solo el primero y el último, que es lo que entra en un
          celular sin volverse ilegible. */}
      {especie.serie.length > 1 && (
        <Text variant="micro" color="textMuted">
          {`${mesCortoApi(especie.serie[0]?.mes ?? '')} → ${tituloDeMesApi(
            especie.serie[especie.serie.length - 1]?.mes ?? '',
          )}`}
        </Text>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },

    encabezado: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    /** `flex: 1` para que la cantidad quede pegada al borde derecho. */
    identidad: { flex: 1, gap: theme.spacing.xxs },
    cantidad: { alignItems: 'flex-end', gap: theme.spacing.xxs },

    pie: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.md,
    },
    /** Las barras de la ventana, apoyadas en la misma base. */
    serie: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 2,
      height: ALTO,
    },
    columna: { flex: 1, justifyContent: 'flex-end' },
    barra: {
      // Solo arriba: abajo la barra tiene que apoyar en la base, no flotar.
      borderTopLeftRadius: theme.radius.sm,
      borderTopRightRadius: theme.radius.sm,
    },
    contra: { alignItems: 'flex-end', gap: theme.spacing.xxs },
  });

export const EspecieDeTendenciaItem = memo(EspecieDeTendenciaItemComponent);
