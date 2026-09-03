import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/shared/ui/atoms/Button';
import { Text } from '@/shared/ui/atoms/Text';
import { formatBytes } from '@/shared/utils';
import { useTheme, type Theme } from '@/theme';
import { MESES_DEL_TRAMO, TRAMO_LABEL, type TramoDelStore } from '../types';

export interface TramosDelStoreProps {
  tramos: readonly TramoDelStore[];
  /** Mirar qué se llevaría una limpieza de este tramo. **No borra**: abre el cartel. */
  onMirar: (meses: number) => void;
  deshabilitado: boolean;
}

/**
 * **Qué hay, por antigüedad**, con el botón de limpiar de cada tramo
 * (`MORGANA-BACK/docs/flujo_comprobantes.md` §5.1).
 *
 * ⚠️ **El botón dice `borrables`, no `comprobantes`**, y esa es la decisión que
 * sostiene todo el componente. Los dos números vienen del backend y no son el
 * mismo: `borrables` descuenta los pendientes, que están protegidos. Poniendo el
 * otro, alguien aprieta esperando liberar 49 MB, libera 47, y esa diferencia no
 * tiene explicación en ninguna parte de la pantalla.
 *
 * ⚠️ **"De este mes" no tiene botón.** El backend exige treinta días de
 * antigüedad para un barrido —es la guarda contra el error de tipeo— así que
 * ofrecerlo sería ofrecer un `400`.
 *
 * El botón **no borra**: abre la vista previa. Borrar es el paso siguiente, con
 * el número delante.
 */
function TramosDelStoreComponent({ tramos, onMirar, deshabilitado }: TramosDelStoreProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.lista}>
      {tramos.map((tramo) => (
        <Tramo key={tramo.tramo} tramo={tramo} onMirar={onMirar} deshabilitado={deshabilitado} />
      ))}
    </View>
  );
}

interface TramoProps {
  tramo: TramoDelStore;
  onMirar: (meses: number) => void;
  deshabilitado: boolean;
}

function Tramo({ tramo, onMirar, deshabilitado }: TramoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const meses = MESES_DEL_TRAMO[tramo.tramo];
  const mirar = useCallback(() => {
    if (meses !== null) {
      onMirar(meses);
    }
  }, [onMirar, meses]);

  // Un tramo vacío se muestra igual —los cuatro vienen siempre, rellenados en
  // cero— porque su ausencia también es información: no hay nada de esa época.
  const vacio = tramo.comprobantes === 0;
  const protegidos = tramo.comprobantes - tramo.borrables;

  return (
    <View style={[styles.fila, vacio && styles.filaVacia]}>
      <View style={styles.datos}>
        <Text variant="small" weight="medium">
          {TRAMO_LABEL[tramo.tramo]}
        </Text>
        <Text variant="caption" color="textMuted">
          {vacio
            ? 'Nada de esta época.'
            : `${tramo.comprobantes} ${
                tramo.comprobantes === 1 ? 'archivo' : 'archivos'
              } · ${formatBytes(tramo.bytes)}`}
        </Text>
        {/*
          Los que el criterio agarra pero la guarda frena. Se dice: un número que
          no cierra se lee como un bug.
        */}
        {protegidos > 0 ? (
          <Text variant="caption" color="textMuted">
            {`${protegidos} sin resolver quedan afuera.`}
          </Text>
        ) : null}
      </View>

      {meses !== null && tramo.borrables > 0 ? (
        <Button
          // El número del botón es el que se va a llevar de verdad.
          label={`Liberar ${formatBytes(tramo.bytesBorrables)}`}
          variant="secondary"
          size="sm"
          onPress={mirar}
          disabled={deshabilitado}
          accessibilityLabel={`Ver qué se borraría de ${TRAMO_LABEL[tramo.tramo].toLowerCase()}: ${
            tramo.borrables
          } archivos`}
        />
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    lista: { gap: theme.spacing.sm },

    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    /** Un tramo sin nada se ve más apagado: está, pero no hay nada que hacer ahí. */
    filaVacia: { backgroundColor: theme.colors.surfaceVariant },
    /** `flex: 1` para que el texto baje de línea en vez de empujar al botón. */
    datos: { flex: 1, gap: theme.spacing.xxs },
  });

export const TramosDelStore = memo(TramosDelStoreComponent);
