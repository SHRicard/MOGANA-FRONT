import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Controller, type Control, type FieldPath } from 'react-hook-form';
import Trash2 from 'lucide-react-native/icons/trash-2';
// El selector lo pone la feature especies, que es la dueña del catálogo. Acá
// llega como un campo más del renglón (`docs/flujo_especies.md` §9).
import { SelectorDeEspecie, type Especie } from '@/features/especies';
import { Input } from '@/shared/ui/atoms/Input';
import { Text } from '@/shared/ui/atoms/Text';
import { calcularSubtotal, formatMonto, parseAMonto, parseCantidad } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import type { NuevaFacturaFormValues } from '../types';

export interface ItemFacturaRowProps {
  control: Control<NuevaFacturaFormValues>;
  index: number;
  onQuitar: (index: number) => void;
  /** El último renglón no se puede quitar: la factura necesita al menos uno. */
  puedeQuitar: boolean;
  /** Lo que se tipeó en esta fila, para poder mostrar su subtotal. */
  cantidad: string;
  precioUnitario: string;

  // ── La especie del renglón (`docs/flujo_especies.md`) ──
  /** El catálogo entero, ya traído una sola vez por el formulario. */
  especies: readonly Especie[];
  /** El nombre de una especie nueva escrito en ESTA fila. */
  especieNombre: string;
  especiesCargando: boolean;
  onElegirEspecie: (index: number, especie: Especie) => void;
  onCrearEspecie: (index: number, nombre: string) => void;
}

const ICON_SIZE = 18;

/**
 * Un renglón de la factura: producto, cantidad y precio por unidad.
 *
 * Sin etiquetas arriba de cada campo a propósito: con tres campos por fila y
 * varias filas, las etiquetas triplican el alto de la pantalla. El significado
 * lo dan los placeholders, y el lector de pantalla lo recibe por
 * `accessibilityLabel`, que sí está en los tres.
 *
 * ⚠️ `producto` es **texto libre**: no hay catálogo de productos. El nombre y el
 * precio quedan copiados en la factura (`docs/flujo_pagos.md`).
 *
 * La **especie** sí sale de un catálogo y es **obligatoria**
 * (`docs/flujo_especies.md`): es la etiqueta con la que después se puede sumar
 * —"12 Coca de 500ml" es el producto, "Gaseosa" es la especie—. Va en su propia
 * línea y no apretada con la cantidad y el precio: es un combo con búsqueda que
 * se despliega, y en el ancho de un celular no entra al lado de nada.
 */
function ItemFacturaRowComponent({
  control,
  index,
  onQuitar,
  puedeQuitar,
  cantidad,
  precioUnitario,
  especies,
  especieNombre,
  especiesCargando,
  onElegirEspecie,
  onCrearEspecie,
}: ItemFacturaRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const elegirEspecie = useCallback(
    (especie: Especie) => onElegirEspecie(index, especie),
    [onElegirEspecie, index],
  );

  const crearEspecie = useCallback(
    (nombre: string) => onCrearEspecie(index, nombre),
    [onCrearEspecie, index],
  );

  // Subtotal de la fila. Mientras esté a medio escribir no se muestra nada: un
  // "$0,00" ahí parece un precio cargado en cero.
  const subtotal = useMemo(() => {
    const unidades = parseCantidad(cantidad);
    const precio = parseAMonto(precioUnitario);
    return unidades !== null && precio !== null ? calcularSubtotal(unidades, precio) : null;
  }, [cantidad, precioUnitario]);

  return (
    <View style={styles.row}>
      <View style={styles.linea}>
        <View style={styles.producto}>
          <CampoItem
            control={control}
            name={`items.${index}.producto`}
            placeholder="Qué le cobrás"
            accessibilityLabel={`Producto del renglón ${index + 1}`}
          />
        </View>

        <Pressable
          onPress={() => onQuitar(index)}
          disabled={!puedeQuitar}
          hitSlop={theme.spacing.sm}
          style={({ pressed }) => [
            styles.quitar,
            !puedeQuitar && styles.quitarDeshabilitado,
            pressed && puedeQuitar && styles.presionado,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Quitar el renglón ${index + 1}`}
          accessibilityState={{ disabled: !puedeQuitar }}
        >
          <Trash2 size={ICON_SIZE} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.linea}>
        <View style={styles.cantidad}>
          <CampoItem
            control={control}
            name={`items.${index}.cantidad`}
            placeholder="Cant."
            // `number-pad` y no `decimal-pad`: la cantidad es entera, no hay
            // medias unidades.
            keyboardType="number-pad"
            accessibilityLabel={`Cantidad del renglón ${index + 1}`}
          />
        </View>

        <View style={styles.precio}>
          <CampoItem
            control={control}
            name={`items.${index}.precioUnitario`}
            placeholder="Precio por unidad"
            keyboardType="decimal-pad"
            accessibilityLabel={`Precio por unidad del renglón ${index + 1}, en pesos`}
          />
        </View>
      </View>

      {/*
        La especie del renglón. El error del par —ninguna especie, o las dos— se
        cuelga de `especieId`, que es el campo que el selector escribe cuando se
        elige del catálogo.
      */}
      <Controller
        control={control}
        name={`items.${index}.especieId`}
        render={({ field, fieldState }) => (
          <View style={styles.especie}>
            <SelectorDeEspecie
              especies={especies}
              especieId={field.value}
              especieNombre={especieNombre}
              onElegir={elegirEspecie}
              onCrear={crearEspecie}
              cargando={especiesCargando}
              hasError={fieldState.error !== undefined}
              accessibilityLabel={`Especie del renglón ${index + 1}`}
            />
            {fieldState.error?.message ? (
              <Text variant="caption" color="error">
                {fieldState.error.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      {subtotal !== null && (
        <Text variant="caption" color="textMuted" align="right">
          {`Subtotal ${formatMonto(subtotal)}`}
        </Text>
      )}
    </View>
  );
}

interface CampoItemProps {
  control: Control<NuevaFacturaFormValues>;
  name: FieldPath<NuevaFacturaFormValues>;
  placeholder: string;
  accessibilityLabel: string;
  keyboardType?: 'number-pad' | 'decimal-pad';
}

/** Input de una celda de la fila, con su mensaje de error debajo. */
function CampoItem({
  control,
  name,
  placeholder,
  accessibilityLabel,
  keyboardType,
}: CampoItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createCampoStyles(theme), [theme]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={styles.campo}>
          <Input
            value={typeof field.value === 'string' ? field.value : ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder={placeholder}
            keyboardType={keyboardType}
            hasError={fieldState.error !== undefined}
            accessibilityLabel={accessibilityLabel}
          />
          {/* El error no se comunica solo con el borde rojo: va también el texto. */}
          {fieldState.error?.message ? (
            <Text variant="caption" color="error">
              {fieldState.error.message}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

const createCampoStyles = (theme: Theme) =>
  StyleSheet.create({
    // El error va pegado a su campo: con más aire se lee como texto suelto de la
    // fila y no como el mensaje de ESE input.
    campo: { gap: theme.spacing.xxs },
  });

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    linea: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    producto: { flex: 1 },
    /** El error va pegado al selector, como en el resto de los campos. */
    especie: { gap: theme.spacing.xxs },
    /** La cantidad es corta; el precio se queda con el resto del ancho. */
    cantidad: { width: 92 },
    precio: { flex: 1 },

    quitar: {
      width: 44,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quitarDeshabilitado: { opacity: 0.3 },
    presionado: { opacity: 0.6 },
  });

export const ItemFacturaRow = memo(ItemFacturaRowComponent);
