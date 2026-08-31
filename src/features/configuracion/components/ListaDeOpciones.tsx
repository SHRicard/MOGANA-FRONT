import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import type { OpcionDeAjuste } from '../types';

const ICON_SIZE = 20;
/** Alto mínimo de cada opción: por encima de los 44pt de área táctil. */
const ALTO_OPCION = 60;
/** Lado de la caja redonda del ícono. */
const CAJA_ICONO = 40;

export interface ListaDeOpcionesProps<T extends string> {
  /** Las opciones, en el orden en que se muestran. */
  opciones: readonly OpcionDeAjuste<T>[];
  /** Lo elegido. En el tema es la preferencia, no el modo que se ve. */
  valor: T;
  onSeleccionar: (valor: T) => void;
}

/**
 * Un ajuste de una sola elección: la lista completa a la vista, con lo elegido
 * tildado.
 *
 * Sirve para los dos ajustes de la pantalla —el tema y la letra— porque el
 * dibujo es el mismo; lo que cambia son las opciones, que se pasan por props
 * (`OPCIONES_TEMA`, `OPCIONES_TIPOGRAFIA`).
 *
 * Se dibujan **todas a la vista** y no en un desplegable: son pocas, se eligen
 * una vez, y la gracia de esta pantalla es que el cambio se vea al toque —la
 * lista se repinta con el tema y la letra nuevos debajo del dedo—. Un
 * desplegable taparía justo eso.
 *
 * Sin lógica ni storage: recibe lo elegido y avisa el cambio. Quién lo guarda es
 * el `ThemeProvider`.
 *
 * Lo elegido se marca con **el tilde, la negrita y el borde**, no solo con el
 * color: en una pantalla que justamente cambia los colores, apoyarse en el tono
 * sería lo último que hay que hacer.
 */
function ListaDeOpcionesComponent<T extends string>({
  opciones,
  valor,
  onSeleccionar,
}: ListaDeOpcionesProps<T>) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    // Un grupo de una sola elección: el lector de pantalla lee "1 de 3" y no
    // tres botones sueltos que no se saben excluyentes.
    <View style={styles.lista} accessibilityRole="radiogroup">
      {opciones.map((opcion, indice) => {
        const elegida = opcion.valor === valor;
        const Icon = opcion.icon;

        return (
          <Pressable
            key={opcion.valor}
            onPress={() => onSeleccionar(opcion.valor)}
            style={({ pressed }) => [
              styles.opcion,
              indice > 0 && styles.opcionConBorde,
              pressed && styles.presionada,
            ]}
            accessible
            accessibilityRole="radio"
            accessibilityState={{ checked: elegida }}
            // El texto de apoyo entra en el label: suelto, el lector lo leería
            // como un elemento aparte sin relación con la opción.
            accessibilityLabel={`${opcion.label}. ${opcion.descripcion}`}
          >
            <View style={[styles.icono, elegida && styles.iconoElegido]}>
              <Icon size={ICON_SIZE} color={elegida ? theme.colors.primary : theme.colors.text} />
            </View>

            <View style={styles.textos}>
              <Text variant="body" weight={elegida ? 'semibold' : 'regular'}>
                {opcion.label}
              </Text>
              <Text variant="caption" color="textMuted">
                {opcion.descripcion}
              </Text>
            </View>

            {elegida && <Check size={ICON_SIZE} color={theme.colors.primary} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    lista: {
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
    },
    opcion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      minHeight: ALTO_OPCION,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    /** Línea entre opciones, menos arriba de la primera. */
    opcionConBorde: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    presionada: { opacity: 0.7 },

    icono: {
      width: CAJA_ICONO,
      height: CAJA_ICONO,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceVariant,
    },
    iconoElegido: { backgroundColor: theme.colors.primaryMuted },

    /** `flex: 1` para que el tilde quede pegado al borde derecho. */
    textos: { flex: 1, gap: theme.spacing.xxs },
  });

/**
 * El `memo` se pierde los genéricos, así que se le vuelve a poner el tipo del
 * componente: sin el cast, `ListaDeOpciones` dejaría de inferir `T` y habría que
 * anotarlo en cada uso (mismo truco que en `FiltroEstado`).
 */
export const ListaDeOpciones = memo(ListaDeOpcionesComponent) as typeof ListaDeOpcionesComponent;
