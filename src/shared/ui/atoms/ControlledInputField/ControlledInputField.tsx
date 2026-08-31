import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { InputField, type InputFieldProps } from '@/shared/ui/atoms/InputField';

export type ControlledInputFieldProps<TValues extends FieldValues> = Omit<
  InputFieldProps,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> & {
  control: Control<TValues>;
  name: FieldPath<TValues>;
};

/**
 * Puente entre React Hook Form y el `InputField` del design system: conecta un
 * campo del formulario y muestra su error, sin que la pantalla tenga que cablear
 * `value` / `onChangeText` / `onBlur` a mano.
 *
 * Nació en auth y subió acá cuando el alta de facturas lo necesitó (regla de
 * promoción del `CLAUDE.md`). Depende de React Hook Form, que es el manejador de
 * formularios del stack, así que la dependencia no ata la app a nada nuevo.
 * `InputField` sigue siendo agnóstico: recibe todo por props.
 */
export function ControlledInputField<TValues extends FieldValues>({
  control,
  name,
  ...fieldProps
}: ControlledInputFieldProps<TValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <InputField
          {...fieldProps}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
