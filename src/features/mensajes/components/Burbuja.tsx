import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import FileText from 'lucide-react-native/icons/file-text';
import { Link } from '@/shared/ui/atoms/Link';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import type { ContextoDelMensaje } from '../types';

export interface BurbujaProps {
  texto: string;
  /** `true` si lo escribió quien está mirando. Decide de qué lado va. */
  propio: boolean;
  /** La hora, ya formateada. Vacío en los que todavía no salieron. */
  hora?: string;
  /** De qué cuelga, si cuelga de algo. */
  sobre?: ContextoDelMensaje | null;
  onSobrePress?: (sobre: ContextoDelMensaje) => void;

  /** Todavía no llegó al servidor. Se pinta apagado. */
  enVuelo?: boolean;
  /** No se pudo mandar. Trae el texto de por qué. */
  problema?: string | null;
  onReintentar?: () => void;
  onDescartar?: () => void;
}

const ICON_SIZE = 13;

/**
 * **Un mensaje del hilo.**
 *
 * Sirve para los dos lados del mostrador: el que mira pasa `propio` y el
 * componente no necesita saber si es el cliente o el negocio. Así el globito se
 * ve exactamente igual en las dos pantallas, que es lo que uno espera de un
 * chat.
 *
 * ⚠️ **De qué lado va no se dice solo con el color.** El globito propio va a la
 * derecha y el ajeno a la izquierda, y además el ajeno lleva borde: quien no
 * distingue el azul del gris tiene que poder seguir la conversación igual.
 *
 * ⚠️ **El texto se pinta como texto, nunca como marcado.** Lo escribió una
 * persona del otro lado y el backend lo guarda crudo a propósito —escapar al
 * guardar dejaría `&amp;` donde alguien escribió `&`—. Escapar es del que
 * renderiza, y `<Text>` de React Native ya no interpreta nada.
 */
function BurbujaComponent({
  texto,
  propio,
  hora,
  sobre,
  onSobrePress,
  enVuelo = false,
  problema = null,
  onReintentar,
  onDescartar,
}: BurbujaProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const fallo = problema !== null;

  return (
    <View style={[styles.fila, propio ? styles.filaPropia : styles.filaAjena]}>
      <View
        style={[
          styles.burbuja,
          propio ? styles.propia : styles.ajena,
          enVuelo && styles.enVuelo,
          fallo && styles.fallada,
        ]}
      >
        {/*
          El chip de contexto va ARRIBA del texto: dice de qué se está hablando
          antes de que se lea el mensaje, que es el orden en que sirve.
        */}
        {sobre ? (
          <Pressable
            onPress={onSobrePress ? () => onSobrePress(sobre) : undefined}
            disabled={!onSobrePress}
            style={[styles.chip, propio ? styles.chipPropio : styles.chipAjeno]}
            accessibilityRole={onSobrePress ? 'button' : 'text'}
            accessibilityLabel={`Sobre ${sobre.etiqueta}`}
          >
            <FileText
              size={ICON_SIZE}
              color={propio ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text variant="caption" color={propio ? 'primary' : 'textMuted'} weight="medium">
              {sobre.etiqueta}
            </Text>
          </Pressable>
        ) : null}

        <Text variant="body" color={propio ? 'onPrimary' : 'text'}>
          {texto}
        </Text>

        {hora ? (
          <View style={styles.pie}>
            <Text variant="micro" color={propio ? 'onPrimary' : 'textMuted'}>
              {hora}
            </Text>
          </View>
        ) : null}
      </View>

      {/*
        El problema va FUERA del globito y con las dos salidas a la vista.
        Adentro competiría con el mensaje; y sin "descartar", un mensaje que el
        local no va a aceptar nunca —el canal cortado, por ejemplo— se queda
        pegado abajo de la pantalla para siempre.
      */}
      {fallo ? (
        <View style={styles.problema}>
          <Text variant="caption" color="error">
            {problema}
          </Text>
          <View style={styles.salidas}>
            {onReintentar ? (
              <Link label="Reintentar" variant="caption" onPress={onReintentar} />
            ) : null}
            {onDescartar ? (
              <Link label="Descartar" variant="caption" onPress={onDescartar} />
            ) : null}
          </View>
        </View>
      ) : null}

      {enVuelo && !fallo ? (
        <Text variant="micro" color="textMuted">
          Enviando…
        </Text>
      ) : null}
    </View>
  );
}

/** Memo: el hilo se vuelve a dibujar entero cada ocho segundos. */
export const Burbuja = memo(BurbujaComponent);

/** Cuánto del ancho puede ocupar un globito. Deja ver de qué lado está. */
const ANCHO_MAXIMO = '82%';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fila: { gap: theme.spacing.xxs, maxWidth: ANCHO_MAXIMO },
    filaPropia: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    filaAjena: { alignSelf: 'flex-start', alignItems: 'flex-start' },

    burbuja: {
      gap: theme.spacing.xxs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
    },
    /**
     * La esquina de abajo sin redondear apunta a quien lo escribió. Es la
     * segunda señal, después de la alineación, de quién dijo qué.
     */
    propia: { backgroundColor: theme.colors.primary, borderBottomRightRadius: theme.radius.sm },
    ajena: {
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderBottomLeftRadius: theme.radius.sm,
    },

    enVuelo: { opacity: 0.6 },
    fallada: { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.error },

    pie: { alignSelf: 'flex-end', opacity: 0.75 },

    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xxs,
      alignSelf: 'flex-start',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.radius.full,
    },
    /**
     * ⚠️ Fondo claro y letra de marca, **no `primaryMuted` con letra blanca**:
     * el globito propio ya es `primary`, y un chip apenas más claro con texto
     * `onPrimary` encima da un celeste sobre celeste que no se lee.
     */
    chipPropio: { backgroundColor: theme.colors.surface },
    chipAjeno: { backgroundColor: theme.colors.surfaceVariant },

    problema: { alignItems: 'flex-end', gap: theme.spacing.xxs },
    salidas: { flexDirection: 'row', gap: theme.spacing.md },
  });
