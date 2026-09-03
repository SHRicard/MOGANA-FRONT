import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import SendHorizontal from 'lucide-react-native/icons/send-horizontal';
import X from 'lucide-react-native/icons/x';
import { Text } from '@/shared/ui/atoms/Text';
import { useTheme, type Theme } from '@/theme';
import { AVISAR_LARGO_DESDE, LARGO_MAXIMO_DEL_MENSAJE, type ContextoDelMensaje } from '../types';

export interface CampoDeMensajeProps {
  onEnviar: (texto: string) => void;
  /** De qué va a colgar lo que se escriba. Se muestra arriba y se puede sacar. */
  sobre?: ContextoDelMensaje | null;
  onQuitarSobre?: () => void;
  placeholder?: string;
}

const ICON_SIZE = 18;
/** Alto del botón redondo de enviar. También es su ancho. */
const BOTON = 40;
/** Hasta dónde crece el campo antes de empezar a hacer scroll adentro. */
const ALTO_MAXIMO = 120;

/**
 * **El campo de escribir del chat.**
 *
 * ⚠️ **No usa el atom `Input`**, y es la única excepción de la app. `Input` es
 * de una línea, con label y error debajo — la forma de un campo de formulario.
 * Esto es otra cosa: crece con el texto, tiene el botón de enviar adentro y no
 * valida nada al perder el foco. Forzarlo dentro de `Input` habría significado
 * agregarle a ese atom tres props que ningún formulario usa.
 *
 * ⚠️ **El texto se guarda acá adentro, no en el hook.** Un chat que sube cada
 * tecla al estado del padre redibuja el hilo entero con cada letra, y en una
 * conversación larga eso se siente al escribir.
 *
 * El contador aparece **recién cerca del tope**. Mostrarlo desde el primer
 * carácter le pone un límite a la vista a alguien que quería contar qué le pasó.
 */
function CampoDeMensajeComponent({
  onEnviar,
  sobre,
  onQuitarSobre,
  placeholder = 'Escribí tu mensaje…',
}: CampoDeMensajeProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [texto, setTexto] = useState('');

  const hayAlgo = texto.trim().length > 0;
  const seExcede = texto.length > LARGO_MAXIMO_DEL_MENSAJE;
  const sePuedeEnviar = hayAlgo && !seExcede;

  const enviar = useCallback(() => {
    if (!sePuedeEnviar) {
      return;
    }
    onEnviar(texto);
    // Se vacía sin esperar respuesta: el mensaje ya se ve en la lista como "en
    // vuelo", y dejar el texto puesto invita a mandarlo dos veces.
    setTexto('');
  }, [sePuedeEnviar, onEnviar, texto]);

  return (
    <View style={styles.contenedor}>
      {sobre ? (
        <View style={styles.sobre}>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            Sobre {sobre.etiqueta}
          </Text>
          {onQuitarSobre ? (
            <Pressable
              onPress={onQuitarSobre}
              hitSlop={theme.spacing.sm}
              accessibilityRole="button"
              accessibilityLabel="Escribir sin referirse a esto"
            >
              <X size={ICON_SIZE - 4} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.fila}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.campo}
          multiline
          /*
            ⚠️ `blurOnSubmit` en `false` con `multiline`: sin esto, el "enter"
            del teclado cierra el teclado en vez de bajar de renglón, y escribir
            dos párrafos se vuelve imposible. Se manda con el botón, que es lo
            que se espera en un teléfono.
          */
          blurOnSubmit={false}
          textAlignVertical="top"
          accessibilityLabel="Mensaje"
        />

        <Pressable
          onPress={enviar}
          disabled={!sePuedeEnviar}
          style={[styles.enviar, !sePuedeEnviar && styles.enviarApagado]}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
          accessibilityState={{ disabled: !sePuedeEnviar }}
        >
          <SendHorizontal
            size={ICON_SIZE}
            color={sePuedeEnviar ? theme.colors.onPrimary : theme.colors.textMuted}
          />
        </Pressable>
      </View>

      {texto.length >= AVISAR_LARGO_DESDE ? (
        <Text variant="caption" color={seExcede ? 'error' : 'textMuted'} align="right">
          {texto.length} / {LARGO_MAXIMO_DEL_MENSAJE}
        </Text>
      ) : null}
    </View>
  );
}

export const CampoDeMensaje = memo(CampoDeMensajeComponent);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    contenedor: {
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },

    sobre: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceVariant,
    },

    fila: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm },

    campo: {
      flex: 1,
      maxHeight: ALTO_MAXIMO,
      minHeight: BOTON,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      fontSize: theme.typography.body,
      ...theme.fonts.regular,
    },

    enviar: {
      width: BOTON,
      height: BOTON,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
    },
    enviarApagado: { backgroundColor: theme.colors.surfaceVariant },
  });
