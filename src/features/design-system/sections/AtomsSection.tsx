import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm } from 'react-hook-form';
import Check from 'lucide-react-native/icons/check';
import UserRoundPen from 'lucide-react-native/icons/user-round-pen';
import Inbox from 'lucide-react-native/icons/inbox';
import Search from 'lucide-react-native/icons/search';
import { Badge } from '@/shared/ui/atoms/Badge';
import { Button } from '@/shared/ui/atoms/Button';
import { Calendario } from '@/shared/ui/atoms/Calendario';
import { Checkbox } from '@/shared/ui/atoms/Checkbox';
import { Chip } from '@/shared/ui/atoms/Chip';
import { CampoFecha } from '@/shared/ui/atoms/CampoFecha';
import { Dialogo, DIALOGO_ICON_SIZE } from '@/shared/ui/atoms/Dialogo';
import { EmptyState, EMPTY_STATE_ICON_SIZE } from '@/shared/ui/atoms/EmptyState';
import { EstadoBadge } from '@/shared/ui/atoms/EstadoBadge';
import { FiltroEstado, type OpcionEstado } from '@/shared/ui/atoms/FiltroEstado';
import { FiltroFechas } from '@/shared/ui/atoms/FiltroFechas';
import { Input } from '@/shared/ui/atoms/Input';
import { InputField } from '@/shared/ui/atoms/InputField';
import { Logo } from '@/shared/ui/atoms/Logo';
import { Paginacion } from '@/shared/ui/atoms/Paginacion';
import { Text } from '@/shared/ui/atoms/Text';
import type { TextVariant } from '@/shared/ui/atoms/Text';
import { hoyPantalla } from '@/shared/utils';
import { useTheme } from '@/theme';
import { ShowcaseItem, ShowcaseSection } from '../components';

const TEXT_VARIANTS: readonly TextVariant[] = [
  'display',
  'heading',
  'title',
  'subtitle',
  'body',
  'small',
  'caption',
  'micro',
];

const noop = () => {};

/**
 * Opciones de ejemplo para el filtro. El atom no conoce ningún estado: los
 * catálogos viven en cada feature, y esto es uno de mentira para el catálogo.
 */
const OPCIONES_DE_EJEMPLO: readonly OpcionEstado<string>[] = [
  { value: null, label: 'Todas', color: null },
  { value: 'vencida', label: 'Vencida', color: 'statusLate' },
  { value: 'proxima_a_vencer', label: 'Vence pronto', color: 'statusSoon' },
  { value: 'pendiente', label: 'Pendiente', color: 'statusWait' },
  { value: 'pagada', label: 'Pagada', color: 'statusOk' },
];

export function AtomsSection() {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fecha, setFecha] = useState(hoyPantalla);
  const [pagina, setPagina] = useState(6);
  const [dialogo, setDialogo] = useState(false);
  const [bloqueo, setBloqueo] = useState(false);
  const [estado, setEstado] = useState<string | null>(null);
  const [desde, setDesde] = useState<string | null>(null);
  const [hasta, setHasta] = useState<string | null>(null);
  // `CampoFecha` es un campo de formulario: necesita un `control` de React Hook
  // Form, así que el catálogo arma uno de mentira para poder mostrarlo.
  const { control } = useForm<{ fecha: string }>({ defaultValues: { fecha: hoyPantalla() } });

  return (
    <>
      <ShowcaseSection
        title="Logo"
        description="Imagotipo de la marca en SVG (símbolo + nombre). NO se recolorea: trae su propia paleta y se ve igual en claro y en oscuro. Para cambiarlo, reemplazá shared/assets/logo/logo-morgana.svg."
        importPath="@/shared/ui/atoms/Logo"
      >
        <ShowcaseItem label="Tamaños (el alto se calcula solo, no se deforma)">
          <Logo size="sm" />
          <Logo size="md" />
          <Logo size="lg" />
        </ShowcaseItem>

        <ShowcaseItem label="Ancho a medida">
          <Logo width={280} />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Text"
        description="Único modo de escribir texto en la app. Garantiza que tamaño, peso y color salgan del theme."
        importPath="@/shared/ui/atoms/Text"
      >
        <ShowcaseItem label="Variantes">
          {TEXT_VARIANTS.map((variant) => (
            <Text key={variant} variant={variant}>
              {variant}
            </Text>
          ))}
        </ShowcaseItem>

        <ShowcaseItem label="Pesos">
          <Text weight="regular">regular</Text>
          <Text weight="medium">medium</Text>
          <Text weight="semibold">semibold</Text>
          <Text weight="bold">bold</Text>
        </ShowcaseItem>

        <ShowcaseItem label="Colores semánticos">
          <Text color="text">text</Text>
          <Text color="textMuted">textMuted</Text>
          <Text color="primary">primary</Text>
          <Text color="error">error</Text>
          <Text color="success">success</Text>
          <Text color="warning">warning</Text>
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Button"
        description="Acción principal. Memoizado y accesible; el tamaño sm se dibuja chico pero se toca grande (hitSlop)."
        importPath="@/shared/ui/atoms/Button"
      >
        <ShowcaseItem label="Variantes" row>
          <Button label="primary" onPress={noop} />
          <Button label="secondary" variant="secondary" onPress={noop} />
          <Button label="ghost" variant="ghost" onPress={noop} />
          {/* Para lo que destruye o no se puede deshacer: anular una factura. */}
          <Button label="danger" variant="danger" onPress={noop} />
        </ShowcaseItem>

        <ShowcaseItem label="Tamaños" row>
          <Button label="md (default)" onPress={noop} />
          <Button label="sm" size="sm" onPress={noop} />
          <Button label="sm secondary" variant="secondary" size="sm" onPress={noop} />
        </ShowcaseItem>

        <ShowcaseItem label="Estados" row>
          <Button label="disabled" onPress={noop} disabled />
          <Button label="cargando" onPress={noop} loading />
          <Button label="secondary disabled" variant="secondary" onPress={noop} disabled />
        </ShowcaseItem>

        <ShowcaseItem label="fullWidth">
          <Button label="Ocupa todo el ancho" onPress={noop} fullWidth />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Input"
        description="Campo de texto crudo. En formularios se usa vía InputField, que le agrega label y error."
        importPath="@/shared/ui/atoms/Input"
      >
        <ShowcaseItem label="Normal (tocá para ver el foco)">
          <Input value={text} onChangeText={setText} placeholder="Escribí algo..." />
        </ShowcaseItem>

        <ShowcaseItem label="Buscador: ícono adentro y ✕ para vaciarlo">
          <Input
            value={text}
            onChangeText={setText}
            placeholder="Buscá algo..."
            leftIcon={<Search size={18} color={theme.colors.textMuted} />}
            onClear={() => setText('')}
          />
        </ShowcaseItem>

        <ShowcaseItem label="Con error">
          <Input value="valor inválido" onChangeText={noop} hasError />
        </ShowcaseItem>

        <ShowcaseItem label="Contraseña (con ojo para revelar)">
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            secureTextEntry
            toggleSecureEntry
          />
        </ShowcaseItem>

        <ShowcaseItem label="Deshabilitado">
          <Input value="No editable" onChangeText={noop} editable={false} />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="InputField"
        description="Input + etiqueta + error/ayuda. Es lo que se usa en los formularios reales; el Input pelado casi nunca se usa directo."
        importPath="@/shared/ui/atoms/InputField"
      >
        <ShowcaseItem label="Normal">
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </ShowcaseItem>

        <ShowcaseItem label="Con texto de ayuda">
          <InputField
            label="Contraseña"
            value=""
            onChangeText={noop}
            placeholder="Mínimo 8 caracteres"
            helperText="Al menos 8 caracteres, con una mayúscula, una minúscula y un número."
            secureTextEntry
            toggleSecureEntry
          />
        </ShowcaseItem>

        <ShowcaseItem label="Con error">
          <InputField
            label="Email"
            value="no-es-un-mail"
            onChangeText={noop}
            error="Ingresá un email válido"
          />
        </ShowcaseItem>

        <ShowcaseItem label="Deshabilitado">
          <InputField label="Usuario" value="ana.perez" onChangeText={noop} editable={false} />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Badge"
        description="Contador chico que se monta sobre otro elemento (el ícono de un tab, un avatar). No se posiciona solo: lo ubica quien lo usa."
        importPath="@/shared/ui/atoms/Badge"
      >
        <ShowcaseItem label="Cantidades (en 0 no renderiza nada)" row>
          <Badge count={1} />
          <Badge count={12} />
          <Badge count={99} />
          <Badge count={1250} />
          <Badge count={0} />
        </ShowcaseItem>

        <ShowcaseItem label="Tono" row>
          <Badge count={3} tone="error" />
          <Badge count={3} tone="primary" />
        </ShowcaseItem>

        <ShowcaseItem label="Dot: 'hay algo nuevo' sin decir cuánto" row>
          <Badge dot />
          <Badge dot tone="primary" />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Chip"
        description="Etiqueta corta y redonda. Sin onPress es informativa (el rol de un usuario, un 'Inactivo'); con onPress es un filtro que se prende y se apaga."
        importPath="@/shared/ui/atoms/Chip"
      >
        <ShowcaseItem label="Informativos (no son tocables)" row>
          <Chip label="Administrador" tone="brand" />
          {/* Advertencia que acompaña a un dato: un cliente al que no se le fía. */}
          <Chip label="Falta el DNI" tone="warning" />
          <Chip label="No se le fía" tone="danger" />
          <Chip label="Contraseña" />
          <Chip label="Inactivo" />
        </ShowcaseItem>

        <ShowcaseItem label="Filtro: seleccionado invierte el fondo, no solo el color" row>
          <Chip label="Todos" selected onPress={noop} />
          <Chip label="Usuario" onPress={noop} />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Checkbox"
        description="Casilla de selección. El estado no se comunica solo con el color: tildada se rellena y aparece el tilde. 'indeterminado' es el 'seleccionar todo' a medias — sin él, 'ninguno' y 'algunos' se ven igual."
        importPath="@/shared/ui/atoms/Checkbox"
      >
        <ShowcaseItem label="Los tres estados" row>
          <Checkbox checked={false} onChange={noop} accessibilityLabel="Sin marcar" />
          <Checkbox checked onChange={noop} accessibilityLabel="Marcada" />
          <Checkbox checked="indeterminado" onChange={noop} accessibilityLabel="Algunos" />
          <Checkbox checked disabled onChange={noop} accessibilityLabel="Apagada" />
        </ShowcaseItem>

        <ShowcaseItem label="Con texto al lado">
          <Checkbox checked onChange={noop} label="Incluir los ya liberados" />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="EmptyState"
        description="Sección sin contenido: lista sin resultados, feature todavía sin implementar. Ocupa el alto que le den, por eso acá va dentro de una caja."
        importPath="@/shared/ui/atoms/EmptyState"
      >
        <ShowcaseItem label="Con ícono y descripción">
          <View style={styles.emptyStateCanvas}>
            <EmptyState
              icon={<Inbox size={EMPTY_STATE_ICON_SIZE} color={theme.colors.textMuted} />}
              title="No hay nada por acá"
              description="Cuando tengas facturas emitidas, las vas a ver en esta sección."
            />
          </View>
        </ShowcaseItem>

        <ShowcaseItem label="Con acción">
          <View style={styles.emptyStateCanvas}>
            <EmptyState
              title="No encontramos resultados"
              description="Probá con otras palabras."
              action={<Button label="Limpiar filtros" variant="secondary" onPress={noop} />}
            />
          </View>
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Calendario"
        description="Elegir un día sin tipearlo. Hecho con Luxon (sin librería de calendario ni código nativo): los meses van en castellano fijo, no según el idioma del dispositivo."
        importPath="@/shared/ui/atoms/Calendario"
      >
        <ShowcaseItem label="Con mínimo en hoy: lo anterior queda apagado">
          <Calendario value={fecha} onChange={setFecha} fechaMinima={hoyPantalla()} />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="CampoFecha"
        description="El calendario como campo de un formulario: muestra el día elegido y lo despliega para cambiarlo. No se tipea la fecha, así que no hay forma de elegir un día que no exista ni uno fuera del rango."
        importPath="@/shared/ui/atoms/CampoFecha"
      >
        <ShowcaseItem label="Con tope en hoy: lo de más adelante queda apagado">
          <CampoFecha
            control={control}
            name="fecha"
            label="Día del pago"
            helperText="Si fue otro día, cambialo"
            fechaMaxima={hoyPantalla()}
          />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="EstadoBadge"
        description="El semáforo de la app: de “todo bien” a “ya se pasó”. Va relleno porque es lo que se busca de un vistazo con veinte renglones en pantalla, y lleva el texto además del color — quien no distingue rojo de naranja lo tiene que poder leer. No conoce ningún estado: recibe la palabra y el tono."
        importPath="@/shared/ui/atoms/EstadoBadge"
      >
        <ShowcaseItem label="La escala, de mejor a peor" row>
          <EstadoBadge label="Al día" tono="ok" />
          <EstadoBadge label="Pendiente" tono="espera" />
          <EstadoBadge label="Vence pronto" tono="pronto" />
          <EstadoBadge label="Vencida" tono="tarde" />
        </ShowcaseItem>

        <ShowcaseItem label="Apagado: lo que está fuera de la escala">
          <EstadoBadge label="Anulada" tono="apagado" />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="FiltroEstado"
        description="Lista desplegable para filtrar por estado. Ocupa una línea cuando no se usa —que es casi siempre— y cada opción lleva el color de su estado, el mismo del badge de los renglones. Se despliega en línea y no en un Modal."
        importPath="@/shared/ui/atoms/FiltroEstado"
      >
        <ShowcaseItem label="Con las opciones de una factura">
          <FiltroEstado
            label="Estado"
            opciones={OPCIONES_DE_EJEMPLO}
            estado={estado}
            onChange={setEstado}
          />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="FiltroFechas"
        description="Rango de fechas con dos botones y un solo calendario: se toca el extremo que se quiere mover y el de abajo lo edita. Los dos extremos entran, y los topes se cuidan solos — eligiendo el desde no se puede pasar del hasta."
        importPath="@/shared/ui/atoms/FiltroFechas"
      >
        <ShowcaseItem label="Sin nada elegido: dice “cualquiera”">
          <FiltroFechas
            label="Emitidas"
            desde={desde}
            hasta={hasta}
            onDesdeChange={setDesde}
            onHastaChange={setHasta}
          />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Paginacion"
        description="Pasos de página de un listado: dos botones grandes y en qué página estás. Mide el ancho que le dan y, si no alcanza para las palabras, deja las flechas solas. Con una sola página no dibuja nada."
        importPath="@/shared/ui/atoms/Paginacion"
      >
        <ShowcaseItem label="En el medio: los dos pasos disponibles">
          <Paginacion pagina={pagina} paginas={12} onCambiar={setPagina} />
        </ShowcaseItem>

        <ShowcaseItem label="Al principio: “Anterior” apagado">
          <Paginacion pagina={1} paginas={12} onCambiar={setPagina} />
        </ShowcaseItem>

        <ShowcaseItem label="Al final: “Siguiente” apagado">
          <Paginacion pagina={12} paginas={12} onCambiar={setPagina} />
        </ShowcaseItem>

        <ShowcaseItem label="Angosto: se cae a las flechas solas">
          <View style={styles.paginacionAngosta}>
            <Paginacion pagina={pagina} paginas={12} onCambiar={setPagina} />
          </View>
        </ShowcaseItem>

        <ShowcaseItem label="Una sola página: no se dibuja">
          <Paginacion pagina={1} paginas={1} onCambiar={setPagina} />
        </ShowcaseItem>
      </ShowcaseSection>

      <ShowcaseSection
        title="Dialogo"
        description="Reemplaza al Alert del sistema: conoce el theme, acepta contenido adentro y anda igual en los dos temas. ⚠️ Es una view absoluta que cubre a su PADRE (no usa el Modal de React Native, que rompe el edge-to-edge), así que en una pantalla va como hermano del contenido. Acá se demuestra adentro de una caja para poder verlo en el catálogo."
        importPath="@/shared/ui/atoms/Dialogo"
      >
        <ShowcaseItem label="Confirmación de algo que salió bien">
          <View style={styles.dialogoCanvas}>
            <View style={styles.dialogoFondo}>
              <Button label="Abrir el diálogo" onPress={() => setDialogo(true)} />
            </View>

            <Dialogo
              visible={dialogo}
              onClose={() => setDialogo(false)}
              tono="exito"
              icono={<Check size={DIALOGO_ICON_SIZE} color={theme.colors.success} />}
              titulo="Factura #12"
              descripcion="Quedó emitida y ya aparece en la cuenta del cliente."
              acciones={[
                { label: 'Listo', onPress: () => setDialogo(false) },
                { label: 'Ver la factura', onPress: () => setDialogo(false), variant: 'secondary' },
              ]}
            />
          </View>
        </ShowcaseItem>

        <ShowcaseItem label="Bloqueante: el fondo y el «atrás» no lo cierran">
          <View style={styles.dialogoCanvas}>
            <View style={styles.dialogoFondo}>
              <Button label="Abrir el bloqueo" onPress={() => setBloqueo(true)} />
            </View>

            {/*
              Con `bloqueante` no lleva `onClose`: la única salida son sus
              botones. Acá el botón cierra para poder seguir mirando el catálogo;
              en la app, uno de los botones tiene que RESOLVER lo que traba
              (guardar) y el otro dejar salir (cerrar sesión).
            */}
            <Dialogo
              visible={bloqueo}
              bloqueante
              icono={<UserRoundPen size={DIALOGO_ICON_SIZE} color={theme.colors.primary} />}
              titulo="Completá tu perfil"
              descripcion="Un bloqueo se usa cuando la app no puede seguir hasta que la persona resuelva algo. Probá tocar el fondo: no pasa nada."
              acciones={[{ label: 'Entendido', onPress: () => setBloqueo(false) }]}
            />
          </View>
        </ShowcaseItem>
      </ShowcaseSection>
    </>
  );
}

const styles = StyleSheet.create({
  // El EmptyState es flex:1 (se estira al alto disponible). En el catálogo no
  // hay pantalla que llenar, así que le damos una caja de alto fijo para verlo.
  emptyStateCanvas: { height: 200 },
  // La paginación se adapta al ancho que le dan: esta caja angosta es para ver
  // el caso en el que las palabras de los botones no entran.
  paginacionAngosta: { width: 220 },

  // El diálogo cubre a su padre: en una pantalla es la pantalla entera, acá una
  // caja, para poder verlo sin salir del catálogo.
  dialogoCanvas: { height: 340, overflow: 'hidden' },
  dialogoFondo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
