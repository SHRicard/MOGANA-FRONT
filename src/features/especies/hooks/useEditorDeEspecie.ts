import { useCallback, useMemo, useState } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getApiErrorMessage } from '@/shared/utils';
import { useCrearEspecieMutation, useRenombrarEspecieMutation } from '../api';
import { especieFormSchema, type Especie, type EspecieFormValues } from '../types';

/** El alta y el renombre, que son el mismo formulario con dos destinos. */
export interface EditorDeEspecie {
  visible: boolean;
  /** `true` cuando se está renombrando una que ya existe. */
  esRenombre: boolean;
  /** La que se está renombrando, para poder excluirla del chequeo de repetidos. */
  especie: Especie | null;

  control: Control<EspecieFormValues>;
  /** Lo tipeado, para avisar de un nombre repetido antes de mandarlo. */
  nombre: string;

  abrirNueva: () => void;
  abrirRenombre: (especie: Especie) => void;
  cerrar: () => void;
  guardar: () => void;

  isSubmitting: boolean;
  /** Error de la API, ya redactado. El `409` explica el choque de nombres. */
  mensajeError: string | null;
}

/**
 * Crear y renombrar una especie (`docs/flujo_especies.md` §4).
 *
 * Es **un solo formulario** porque las dos operaciones llevan exactamente lo
 * mismo —el nombre— y separarlas en dos hooks duplicaría la validación y el
 * manejo del error para no cambiar nada.
 *
 * ⚠️ El renombre **cambia el nombre también en las facturas viejas**, y es a
 * propósito: la especie es una clasificación, no lo que se cobró. Corregir
 * "gaseoza" tiene que arreglar los renglones que ya se escribieron mal, o el
 * agrupado queda partido en dos para siempre.
 */
export function useEditorDeEspecie(): EditorDeEspecie {
  const [especie, setEspecie] = useState<Especie | null>(null);
  const [visible, setVisible] = useState(false);

  const [crear, alta] = useCrearEspecieMutation();
  const [renombrar, renombre] = useRenombrarEspecieMutation();

  const { control, handleSubmit, reset, watch } = useForm<EspecieFormValues>({
    resolver: zodResolver(especieFormSchema),
    defaultValues: { nombre: '' },
    mode: 'onBlur',
  });

  const abrirNueva = useCallback(() => {
    // Se limpia al abrir y no al cerrar: así el campo arranca vacío aunque el
    // intento anterior haya quedado a medias.
    reset({ nombre: '' });
    alta.reset();
    renombre.reset();
    setEspecie(null);
    setVisible(true);
  }, [reset, alta, renombre]);

  const abrirRenombre = useCallback(
    (aRenombrar: Especie) => {
      // Con el nombre puesto: renombrar casi siempre es corregir una letra, no
      // escribir todo de nuevo.
      reset({ nombre: aRenombrar.nombre });
      alta.reset();
      renombre.reset();
      setEspecie(aRenombrar);
      setVisible(true);
    },
    [reset, alta, renombre],
  );

  const cerrar = useCallback(() => setVisible(false), []);

  const enviar = useMemo(
    () =>
      handleSubmit(async (valores) => {
        const nombre = valores.nombre.trim();

        if (especie) {
          await renombrar({ id: especie.id, nombre }).unwrap();
        } else {
          await crear({ nombre }).unwrap();
        }

        // Recién con el `2xx` se cierra: si la API rechazó —un `409` por nombre
        // repetido—, el diálogo queda abierto con lo escrito y el cartel al pie.
        setVisible(false);
      }),
    // El `.unwrap()` rechaza cuando la API falla; el error ya queda en el hook de
    // la mutation, así que no hace falta un catch que lo duplique.
    [handleSubmit, especie, crear, renombrar],
  );

  const guardar = useCallback(() => {
    // `handleSubmit` devuelve una promesa que ya no rechaza (RHF atrapa el error
    // del submit). Se descarta a propósito: el `onPress` de un botón no espera
    // nada.
    enviar().catch(() => {});
  }, [enviar]);

  return {
    visible,
    esRenombre: especie !== null,
    especie,

    control,
    nombre: watch('nombre'),

    abrirNueva,
    abrirRenombre,
    cerrar,
    guardar,

    isSubmitting: alta.isLoading || renombre.isLoading,
    mensajeError: getApiErrorMessage(alta.error) ?? getApiErrorMessage(renombre.error),
  };
}
