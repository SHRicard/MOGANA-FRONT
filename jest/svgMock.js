const React = require('react');

/**
 * Mock de los archivos `.svg` en tests.
 *
 * En la app, Metro usa `react-native-svg-transformer` y un `.svg` es un
 * COMPONENTE de React. Jest no usa Metro: su preset trata los `.svg` como
 * asset y devuelve `{ testUri: '...' }`.
 *
 * Sin este mock, `<LogoMark />` recibe un objeto como tipo de elemento y el
 * test pasa en falso (o falla por un motivo confuso). Acá devolvemos un
 * componente real, para que el árbol renderizado en tests sea el mismo que en
 * la app.
 */
function SvgMock(props) {
  return React.createElement('SvgMock', props, props.children);
}

SvgMock.displayName = 'SvgMock';

module.exports = SvgMock;
module.exports.default = SvgMock;
