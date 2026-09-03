import { memo } from 'react';
import { rolLabel } from '@/features/usuarios';
import type { ResumenDelSistema } from '../types';
import { Dato } from './Dato';
import { Tarjeta } from './Tarjeta';

export interface TarjetaDeCuentasProps {
  cuentas: ResumenDelSistema['cuentas'];
  altas: ResumenDelSistema['altas'];
}

/**
 * **Cuántas cuentas hay y de qué tipo** (§3).
 *
 * ⚠️ Las bloqueadas van **acá y al lado de las altas**, no en rojo: no son una
 * alarma sino el embudo del alta —quien se registró y nunca cargó el DNI—. Un
 * número alto quiere decir que hay que mejorar el onboarding, no que algo falló.
 *
 * ⚠️ `conGoogle` y `conPassword` **se pisan**: una cuenta puede tener las dos, no
 * suman `total` y por eso van como dos renglones y nunca como una torta.
 */
function TarjetaDeCuentasComponent({ cuentas, altas }: TarjetaDeCuentasProps) {
  return (
    <Tarjeta titulo="Cuentas" bajada={`${cuentas.total} en total`}>
      {/* Por rol, leído del diccionario que manda el backend: un rol nuevo suma
          una fila en vez de romper el tablero. */}
      {Object.entries(cuentas.porRol).map(([rol, cantidad]) => (
        <Dato key={rol} etiqueta={rolLabel(rol)} valor={String(cantidad)} />
      ))}

      <Dato etiqueta="Pueden usar la app" valor={String(cuentas.activas)} />
      <Dato
        etiqueta="Se registraron y no cargaron el DNI"
        // No es una alarma: es el embudo del alta, y decirlo cambia qué se hace
        // con el número.
        nota="El embudo del alta, no una falla"
        valor={String(cuentas.bloqueadas)}
      />
      <Dato etiqueta="Sin verificar el correo" valor={String(cuentas.emailSinVerificar)} />
      <Dato etiqueta="Sin fiado" valor={String(cuentas.sinFiado)} />

      <Dato
        etiqueta="Entran con Google"
        nota="Una cuenta puede tener las dos formas"
        valor={String(cuentas.conGoogle)}
      />
      <Dato etiqueta="Entran con contraseña" valor={String(cuentas.conPassword)} />

      <Dato etiqueta="Altas de hoy" valor={String(altas.hoy)} />
      <Dato etiqueta="Altas de los últimos 7 días" valor={String(altas.ultimos7)} />
      <Dato etiqueta="Altas de los últimos 30 días" valor={String(altas.ultimos30)} />
    </Tarjeta>
  );
}

export const TarjetaDeCuentas = memo(TarjetaDeCuentasComponent);
