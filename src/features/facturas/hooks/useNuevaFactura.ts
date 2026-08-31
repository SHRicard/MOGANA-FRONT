import { useCallback, useMemo } from 'react';
import { useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
// El catálogo lo trae la feature especies: acá se pide UNA vez por formulario y
// se reparte a todos los renglones (`docs/flujo_especies.md` §9).
import { useEspecies, type Especie } from '@/features/especies';
import {
  calcularSubtotal,
  enAniosPantalla,
  enDiasPantalla,
  getApiErrorMessage,
  getApiErrorStatus,
  hoyPantalla,
  parseAMonto,
  parseCantidad,
  sumarMontos,
} from '@/shared/utils';
import { useCrearFacturaMutation } from '../api';
import {
  aNuevaFacturaPayload,
  DIAS_VENCIMIENTO_SUGERIDO,
  MAX_ANIOS_VENCIMIENTO,
  MAX_ITEMS_FACTURA,
  nuevaFacturaSchema,
  type Factura,
  type NuevaFacturaFormValues,
  type NuevaFacturaItemFormValues,
} from '../types';

/** Un renglón vacío, el que se agrega al tocar "Agregar producto". */
const ITEM_VACIO: NuevaFacturaItemFormValues = {
  producto: '',
  cantidad: '1',
  precioUnitario: '',
  // Sin especie: es obligatoria y no hay una razonable para proponer. Elegir
  // "la primera del catálogo" haría que se facturen bidones como gaseosa.
  especieId: '',
  especieNombre: '',
};

export interface NuevaFactura {
  control: Control<NuevaFacturaFormValues>;
  /** Las filas de renglones. Las maneja `useFieldArray`; el `id` es su key. */
  items: readonly { id: string }[];
  /** Lo tipeado en cada fila, para que cada una pueda mostrar su subtotal. */
  valoresItems: readonly NuevaFacturaItemFormValues[];
  agregarItem: () => void;
  quitarItem: (index: number) => void;
  /** La API acepta hasta 100 renglones: pasado ese tope no se ofrece agregar. */
  puedeAgregarItem: boolean;

  // ── El catálogo de especies (`docs/flujo_especies.md`) ──
  /**
   * El catálogo entero, **pedido una sola vez para todo el formulario**. Cada
   * renglón lo recibe por props: una request por selector sería una por fila.
   */
  especies: readonly Especie[];
  especiesCargando: boolean;
  /** El catálogo no se pudo traer. El renglón igual deja escribir una nueva. */
  especiesError: string | null;
  /** Se eligió una del catálogo: ese renglón sale con `especieId`. */
  elegirEspecie: (index: number, especie: Especie) => void;
  /** Se escribió una que no existe: ese renglón sale con `especie`. */
  crearEspecie: (index: number, nombre: string) => void;

  /**
   * Total en vivo, en pesos. Es una **copia** de la cuenta del backend para que
   * la persona vea lo que está por cobrar; el total que vale es el del `201`.
   */
  totalPrevio: number;

  /**
   * Entre qué días se puede elegir el vencimiento: de hoy a dentro de un año.
   *
   * Son las dos reglas del backend (`La factura no puede terminar antes de
   * emitirse` y `El vencimiento no puede estar a más de un año`) traídas al
   * calendario, para que los días que no se pueden elegir estén apagados en vez
   * de fallar al mandar.
   */
  fechaMinima: string;
  fechaMaxima: string;

  enviar: () => void;
  isSubmitting: boolean;
  mensajeError: string | null;
  /**
   * `404`: ese id no es de un cliente (o es de un administrador, que acá adentro
   * es lo mismo). No se arregla reintentando: hay que volver al listado.
   */
  clienteInexistente: boolean;
}

/**
 * Alta de una factura (`docs/flujo_pagos.md` §6).
 *
 * Toda la lógica del formulario vive acá: valores propuestos, validación,
 * total en vivo, conversión a lo que espera la API y lectura del error. La
 * pantalla solo arma la UI.
 *
 * @param clienteId a quién se le factura. Viaja en la URL, nunca en el body.
 * @param onCreada se llama con el `201` ya validado; la pantalla decide a dónde ir.
 */
export function useNuevaFactura(
  clienteId: string,
  onCreada: (factura: Factura) => void,
): NuevaFactura {
  const [crearFactura, { isLoading, error, reset }] = useCrearFacturaMutation();

  /**
   * Se propone un vencimiento a 30 días, pero el campo queda editable: el
   * backend no tiene ningún default y el que decide hasta cuándo hay tiempo de
   * pagar es quien factura.
   *
   * La fecha de emisión no está acá porque **no se carga**: la pone el servidor
   * el día en que se crea la factura.
   */
  const defaultValues = useMemo<NuevaFacturaFormValues>(
    () => ({
      fechaFin: enDiasPantalla(DIAS_VENCIMIENTO_SUGERIDO),
      notas: '',
      // Arranca con un renglón: la factura necesita al menos uno, y obligar a
      // tocar "agregar" antes de escribir es un paso de más.
      items: [{ ...ITEM_VACIO }],
    }),
    [],
  );

  const { control, handleSubmit, setValue } = useForm<NuevaFacturaFormValues>({
    resolver: zodResolver(nuevaFacturaSchema),
    defaultValues,
    mode: 'onBlur',
  });

  /**
   * El catálogo de especies, una sola vez para el formulario entero.
   *
   * Se vuelve a pedir al montar porque una factura anterior pudo haber creado
   * especies nuevas: el renglón de ahora tiene que poder elegirlas del selector
   * en vez de crear un duplicado.
   */
  const catalogo = useEspecies();

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // `useWatch` y no `watch()`: re-renderiza solo lo que depende de estos
  // valores, y no el formulario entero con cada tecla.
  const valoresItems = useWatch({ control, name: 'items' });

  /**
   * El total se calcula en el cliente **solo para mostrarlo**. Los renglones a
   * medio escribir suman cero en vez de romper la cuenta, y la suma pasa por
   * centavos enteros para no mostrar un `$70.07000000000001`.
   */
  const totalPrevio = useMemo(() => {
    const subtotales = (valoresItems ?? []).map((item) => {
      const cantidad = parseCantidad(item?.cantidad ?? '');
      const precio = parseAMonto(item?.precioUnitario ?? '');
      if (cantidad === null || precio === null) {
        return 0;
      }
      return calcularSubtotal(cantidad, precio);
    });
    return sumarMontos(subtotales);
  }, [valoresItems]);

  /** Los dos topes del vencimiento, ya en formato de pantalla. */
  const rango = useMemo(
    () => ({ minima: hoyPantalla(), maxima: enAniosPantalla(MAX_ANIOS_VENCIMIENTO) }),
    [],
  );

  const agregarItem = useCallback(() => append({ ...ITEM_VACIO }), [append]);
  const quitarItem = useCallback((index: number) => remove(index), [remove]);

  /**
   * Las dos formas de poner la especie **se pisan entre sí a propósito**: el
   * renglón manda `especieId` o `especie`, nunca las dos, así que elegir una del
   * catálogo tiene que borrar el nombre tipeado y viceversa. Mandarlas juntas es
   * un `400` del backend, y el schema del formulario lo corta antes.
   *
   * `shouldValidate` para que el error del renglón —"Cada renglón necesita una
   * especie"— desaparezca en cuanto se elige, sin esperar al submit.
   */
  const elegirEspecie = useCallback(
    (index: number, especie: Especie) => {
      setValue(`items.${index}.especieId`, especie.id, { shouldValidate: true });
      setValue(`items.${index}.especieNombre`, '', { shouldValidate: true });
    },
    [setValue],
  );

  const crearEspecie = useCallback(
    (index: number, nombre: string) => {
      setValue(`items.${index}.especieNombre`, nombre, { shouldValidate: true });
      setValue(`items.${index}.especieId`, '', { shouldValidate: true });
    },
    [setValue],
  );

  const enviar = useMemo(
    () =>
      handleSubmit(async (valores) => {
        // Un intento nuevo tiene que empezar sin el cartel del anterior.
        reset();
        const creada = await crearFactura(aNuevaFacturaPayload(clienteId, valores)).unwrap();
        onCreada(creada);
      }),
    // El `.unwrap()` rechaza cuando la API falla; el error ya queda en el hook de
    // la mutation, así que no hace falta un catch que lo duplique.
    [handleSubmit, crearFactura, clienteId, onCreada, reset],
  );

  const enviarSeguro = useCallback(() => {
    // `handleSubmit` devuelve una promesa que ya no rechaza (RHF atrapa el error
    // del submit). Se descarta a propósito: el `onPress` de un botón no espera
    // nada, y devolverla haría que React avise de una promesa colgada.
    enviar().catch(() => {});
  }, [enviar]);

  return {
    control,
    items: fields,
    valoresItems: valoresItems ?? [],
    agregarItem,
    quitarItem,
    puedeAgregarItem: fields.length < MAX_ITEMS_FACTURA,

    especies: catalogo.especies,
    especiesCargando: catalogo.isLoading,
    especiesError: catalogo.mensajeError,
    elegirEspecie,
    crearEspecie,

    totalPrevio,

    // Se calculan una vez por montaje: el formulario no sobrevive a un cambio
    // de día.
    fechaMinima: rango.minima,
    fechaMaxima: rango.maxima,

    enviar: enviarSeguro,
    isSubmitting: isLoading,
    mensajeError: getApiErrorMessage(error),
    clienteInexistente: getApiErrorStatus(error) === 404,
  };
}
