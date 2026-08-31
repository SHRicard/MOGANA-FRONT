import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import { Text } from '@/shared/ui/atoms/Text';
import { formatMonto, tituloDeMesApi } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { ChipTendencia } from './ChipTendencia';
import {
  textoDiasSinVenderse,
  textoEstacionalidad,
  textoUnidades,
  type EspecieGlobal,
} from '../mercaderia';
import { formatTasa } from '../types';

const ICON_SIZE = 16;

export interface EspecieGlobalItemProps {
  especie: EspecieGlobal;
  /**
   * Si se muestra el acumulado del Pareto. **Solo tiene sentido con el orden por
   * monto**: con los otros, la lista no está ordenada por plata y la suma
   * corrida no dice nada.
   */
  mostrarAcumulada: boolean;
}

/**
 * Una especie en el acumulado de todo el período.
 *
 * El renglón se abre para mostrar **los productos de adentro**, que es el nivel
 * que la especie tapa: *"vendo mucha agua"* está bien, pero adentro puede ser
 * todo bidones de 20 litros y ni uno de 12 — y eso cambia qué se le compra al
 * proveedor.
 *
 * ⚠️ Una especie **que nunca se vendió** viene con todo en cero y
 * `diasSinVenderse: null`. No es un renglón roto: es el catálogo muerto, y es
 * justo lo que no aparece en ninguna otra pantalla.
 */
function EspecieGlobalItemComponent({ especie, mostrarAcumulada }: EspecieGlobalItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [abierto, setAbierto] = useState(false);
  const alternar = useCallback(() => setAbierto((actual) => !actual), []);

  const hayDetalle = especie.productos.length > 0;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={alternar}
        disabled={!hayDetalle}
        style={({ pressed }) => [styles.encabezado, pressed && hayDetalle && styles.presionado]}
        accessibilityRole={hayDetalle ? 'button' : undefined}
        accessibilityState={hayDetalle ? { expanded: abierto } : undefined}
        accessibilityLabel={[
          `${especie.puesto}.`,
          `${especie.nombre}:`,
          `${formatMonto(especie.monto)}, el ${formatTasa(especie.participacion)} del período.`,
          `${textoUnidades(especie.cantidad)} en ${especie.facturas} facturas,`,
          `a ${especie.clientes} ${especie.clientes === 1 ? 'cliente' : 'clientes'}.`,
          `${textoDiasSinVenderse(especie.diasSinVenderse)}.`,
        ].join(' ')}
      >
        <View style={styles.puesto}>
          <Text variant="caption" weight="bold" color="textMuted">
            {`${especie.puesto}`}
          </Text>
        </View>

        <View style={styles.identidad}>
          <Text variant="body" weight="semibold" numberOfLines={2}>
            {especie.nombre}
          </Text>
          <Text variant="micro" color="textMuted" numberOfLines={1}>
            {`${textoUnidades(especie.cantidad)} · ${
              especie.clientes === 1 ? '1 cliente' : `${especie.clientes} clientes`
            } · ${textoDiasSinVenderse(especie.diasSinVenderse).toLowerCase()}`}
          </Text>
        </View>

        <View style={styles.numeros}>
          <Text variant="small" weight="semibold" numberOfLines={1}>
            {formatMonto(especie.monto)}
          </Text>
          <Text variant="micro" color="textMuted">
            {formatTasa(especie.participacion)}
          </Text>
          <ChipTendencia tendencia={especie.tendencia} />
        </View>

        {hayDetalle &&
          (abierto ? (
            <ChevronUp size={ICON_SIZE} color={theme.colors.textMuted} />
          ) : (
            <ChevronDown size={ICON_SIZE} color={theme.colors.textMuted} />
          ))}
      </Pressable>

      {/* El Pareto solo con el orden por monto: es la única lista que va de
          mayor a menor y donde el acumulado dibuja la curva. */}
      {mostrarAcumulada && especie.participacionAcumulada !== null && (
        <Text variant="micro" color="textMuted">
          {`Acumulado hasta acá: ${formatTasa(especie.participacionAcumulada)}`}
        </Text>
      )}

      {abierto && (
        <View style={styles.detalle}>
          <Text variant="micro" color="textMuted">
            {especie.mejorMes
              ? `Su mejor mes fue ${tituloDeMesApi(especie.mejorMes.mes)} · ${textoEstacionalidad(
                  especie.estacionalidad,
                )} lo de un mes promedio · ${especie.mesesConVenta} ${
                  especie.mesesConVenta === 1 ? 'mes con venta' : 'meses con venta'
                }`
              : 'Todavía no tuvo ningún mes con venta.'}
          </Text>

          {especie.productos.map((producto) => (
            <View key={producto.producto} style={styles.producto}>
              <Text variant="caption" color="textMuted" numberOfLines={2}>
                {producto.producto}
              </Text>
              <Text variant="caption" color="textMuted">
                {`${textoUnidades(producto.cantidad)} · ${formatTasa(producto.participacion)}`}
              </Text>
            </View>
          ))}

          {especie.productosDistintos > especie.productos.length && (
            <Text variant="micro" color="textMuted">
              {`Y ${especie.productosDistintos - especie.productos.length} producto${
                especie.productosDistintos - especie.productos.length === 1 ? '' : 's'
              } más.`}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    presionado: { opacity: 0.7 },

    encabezado: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    /** El número del ranking, para poder barrer la lista de arriba abajo. */
    puesto: {
      minWidth: 20,
      paddingTop: theme.spacing.xxs,
      alignItems: 'center',
    },
    /** `flex: 1` para que los importes queden alineados a la derecha. */
    identidad: { flex: 1, gap: theme.spacing.xxs },
    numeros: { alignItems: 'flex-end', gap: theme.spacing.xxs },

    detalle: {
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    producto: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
  });

export const EspecieGlobalItem = memo(EspecieGlobalItemComponent);
