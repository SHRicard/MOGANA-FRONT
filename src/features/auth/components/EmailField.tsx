import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { ControlledInputField } from '@/shared/ui/atoms/ControlledInputField';
import type { InputFieldProps } from '@/shared/ui/atoms/InputField';

type EmailFieldProps<TValues extends FieldValues> = {
  control: Control<TValues>;
} & Pick<InputFieldProps, 'returnKeyType' | 'onSubmitEditing'>;

/**
 * El campo de correo de login y registro.
 *
 * Está acá y no repetido en cada pantalla porque las dos piden el mismo dato con
 * el mismo teclado y las mismas ayudas: si en una se corrige el `textContentType`
 * y en la otra no, el autocompletado del teléfono empieza a ofrecer cosas
 * distintas en cada pantalla.
 *
 * Reemplaza al viejo `IdentificadorField`, que dibujaba email **o** DNI según un
 * selector: desde `docs/flujo_login.md` el documento ya no es una forma de
 * entrar, así que no hay nada que elegir.
 */
export function EmailField<TValues extends FieldValues>({
  control,
  ...inputProps
}: EmailFieldProps<TValues>) {
  // El cast es inevitable y es seguro: los dos formularios de auth declaran
  // `email`, pero TypeScript no puede probarlo sobre un `TValues` genérico. Lo
  // garantiza el schema, que es de donde salen los dos tipos.
  const name = 'email' as FieldPath<TValues>;

  return (
    <ControlledInputField
      control={control}
      name={name}
      label="Email"
      placeholder="tu@email.com"
      keyboardType="email-address"
      autoCapitalize="none"
      autoComplete="email"
      textContentType="emailAddress"
      {...inputProps}
    />
  );
}
