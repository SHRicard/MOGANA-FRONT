import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { ControlledInputField } from '@/shared/ui/atoms/ControlledInputField';
import type { InputFieldProps } from '@/shared/ui/atoms/InputField';
import { LARGO_CODIGO } from '../types';

type CampoCodigoProps<TValues extends FieldValues> = {
  control: Control<TValues>;
  /** Texto de ayuda debajo. Cambia según de qué código se trate. */
  helperText?: string;
} & Pick<InputFieldProps, 'returnKeyType' | 'onSubmitEditing' | 'editable'>;

/**
 * El código de 6 dígitos que llega al correo (`docs/flujo_login.md`).
 *
 * Está acá y no repetido en las dos pantallas porque las dos piden el mismo dato
 * con el mismo teclado: si en una se corrige el `autoComplete` y en la otra no,
 * el teléfono deja de ofrecer el código en una de las dos y nadie se entera.
 *
 * `one-time-code` es lo que hace que iOS **sugiera el código arriba del teclado**
 * apenas llega el mail, sin que la persona salga de la app. Es gratis y se nota.
 *
 * ⚠️ No hay `maxLength` de 6 sino de un poco más: el backend acepta el código
 * con espacios o guiones (`"482 913"`), y cortar en 6 haría que pegar el código
 * copiado del mail se coma los últimos dígitos.
 */
export function CampoCodigo<TValues extends FieldValues>({
  control,
  helperText,
  ...inputProps
}: CampoCodigoProps<TValues>) {
  // El cast es inevitable y es seguro: los dos formularios declaran `codigo`,
  // pero TypeScript no puede probarlo sobre un `TValues` genérico. Lo garantiza
  // el schema, que es de donde salen los dos tipos.
  const name = 'codigo' as FieldPath<TValues>;

  return (
    <ControlledInputField
      control={control}
      name={name}
      label="Código"
      placeholder="482913"
      helperText={helperText ?? `Los ${LARGO_CODIGO} números que te llegaron al correo.`}
      keyboardType="number-pad"
      autoComplete="one-time-code"
      textContentType="oneTimeCode"
      autoCorrect={false}
      maxLength={LARGO_CODIGO * 2}
      {...inputProps}
    />
  );
}
